from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, attributes
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_

from app.core.database import get_db
from app.models.influencer import Influencer, CampaignInfluencer
from app.models.campaign import Campaign
from app.models.tracking_link import TrackingLink
from app.models.user import User, UserRole
from app.core.deps import get_current_active_user
from app.schemas.influencer import InfluencerCreate, InfluencerResponse, InfluencerUpdate
from pydantic import BaseModel

router = APIRouter()

# --- Schemas for Actions ---
class AssignCampaignRequest(BaseModel):
    campaign_id: int
    revenue_share_value: Optional[float] = 0.0
    revenue_share_type: Optional[str] = 'percentage'

# --- CRUD ---

@router.post("/", response_model=InfluencerResponse, status_code=status.HTTP_201_CREATED)
async def create_influencer(
    influencer: InfluencerCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create a new influencer."""
    # Creation is open to all authenticated users for now
    # Or should it be restricted? Let's allow Advertisers to add influencers to the global pool? 
    # For now, yes.
    
    new_influencer = Influencer(
        name=influencer.name,
        email=influencer.email,
        social_handle=influencer.social_handle
    )
    
    if influencer.campaign_id:
        # Fetch Campaign
        camp_result = await db.execute(select(Campaign).where(Campaign.id == influencer.campaign_id))
        campaign = camp_result.scalars().first()
        if not campaign:
             raise HTTPException(status_code=404, detail="Campaign not found")
        
        # RBAC
        if current_user.role == UserRole.ADVERTISER and campaign.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=403, detail="Not authorized to assign to this campaign")
             
        # new_influencer.campaigns.append(campaign) # OLD
        link = CampaignInfluencer(campaign=campaign)
        new_influencer.campaign_links.append(link)

    db.add(new_influencer)
    try:
        await db.commit()
        await db.refresh(new_influencer)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Influencer with this email already exists."
        )
    
    # Safe return for Pydantic
    if not influencer.campaign_id:
        attributes.set_committed_value(new_influencer, "campaign_links", [])
    
    return new_influencer

@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def create_influencers_bulk(
    influencers: List[InfluencerCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Bulk Create Influencers. Skips duplicates (by email).
    Returns summary of results.
    """
    created_count = 0
    errors = []
    
    # Optional: Optimize by fetching all existing emails upfront
    # emails = [i.email for i in influencers]
    # existing_emails = ...
    
    # Process Loop (Transactional per item or full batch? Let's do partial success)
    for index, inf_data in enumerate(influencers):
        try:
            # Check existence
            result = await db.execute(select(Influencer).where(Influencer.email == inf_data.email))
            existing = result.scalars().first()
            
            if existing:
                # If campaign_id provided, link it even if existing
                if inf_data.campaign_id:
                     # Check if already linked logic...
                     # For now, let's treat existing as "Skipped creation, but maybe linked?"
                     # Let's keep it simple: Bulk Create only creates new. 
                     # Linking existing needs logic.
                     errors.append({"index": index, "email": inf_data.email, "error": "Already exists"})
                else:
                     errors.append({"index": index, "email": inf_data.email, "error": "Already exists"})
                continue

            new_inf = Influencer(
                name=inf_data.name,
                email=inf_data.email,
                social_handle=inf_data.social_handle
            )
            
            if inf_data.campaign_id:
                # Resolve Campaign
                camp_res = await db.execute(select(Campaign).where(Campaign.id == inf_data.campaign_id))
                campaign = camp_res.scalars().first()
                if campaign:
                     if current_user.role == UserRole.ADVERTISER and campaign.advertiser_id != current_user.advertiser_id:
                         pass # Skip linking if unauthorized
                     else:
                         # new_inf.campaigns.append(campaign)
                         link = CampaignInfluencer(campaign=campaign)
                         new_inf.campaign_links.append(link)

            db.add(new_inf)
            await db.commit() # Commit per item to allow partial success
            created_count += 1
            
        except Exception as e:
            await db.rollback()
            errors.append({"index": index, "email": inf_data.email, "error": str(e)})

    return {
        "total_received": len(influencers),
        "created": created_count,
        "errors": errors
    }

@router.get("/", response_model=List[InfluencerResponse])
async def list_influencers(
    skip: int = 0, 
    limit: int = 100, 
    advertiser_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """List all influencers. Scoped by Advertiser."""
    stmt = select(Influencer).options(selectinload(Influencer.campaign_links).selectinload(CampaignInfluencer.campaign))
    
    # Scoping Logic & Filtering
    
    # Scoping Logic & Filtering
    # STRICT MODE (Old): Advertiser only sees influencers they work with.
    # DISCOVERY MODE (New): Advertiser sees ALL influencers to allow linking.
    
    # if current_user.role == UserRole.ADVERTISER:
    #      # Advertiser sees influencers related to THEIR campaigns
    #      filter_adv_id = current_user.advertiser_id
    
    # Only filter if EXPLICITLY requested (e.g. "My Influencers" tab)
    # OR if we want to support Admin-impersonation (SuperRoot)
    
    if advertiser_id:
         # Explicit filter requested (e.g. SuperRoot or "My Influencers" toggle)
         filter_adv_id = advertiser_id
         
         # Use efficient EXISTS (any) clauses
         stmt = stmt.where(
            or_(
                Influencer.campaign_links.any(CampaignInfluencer.campaign.has(Campaign.advertiser_id == filter_adv_id)),
                Influencer.tracking_links.any(TrackingLink.campaign.has(Campaign.advertiser_id == filter_adv_id))
            )
         )
         stmt = stmt.distinct()
        
    stmt = stmt.offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    influencers = result.scalars().all()
    return influencers

@router.get("/{influencer_id}", response_model=InfluencerResponse)
async def get_influencer(
    influencer_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a specific influencer."""
    # Influencers are generally public/shared entities in this model?
    # Or should we hide them if they haven't worked with this advertiser?
    # For now, let's keep them viewable by any authenticated user
    # to facilitate "Discovery".
    
    result = await db.execute(
        select(Influencer)
        .options(selectinload(Influencer.campaign_links).selectinload(CampaignInfluencer.campaign))
        .where(Influencer.id == influencer_id)
    )
    inf = result.scalars().first()
    if not inf:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return inf

# --- Assignment Operations ---

@router.post("/{influencer_id}/campaigns", response_model=InfluencerResponse)
async def assign_influencer_to_campaign(
    influencer_id: int,
    request: AssignCampaignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Assign an influencer to a campaign. Scoped."""
    # 1. Fetch Influencer with campaign_links loaded
    result = await db.execute(
        select(Influencer)
        .options(selectinload(Influencer.campaign_links).selectinload(CampaignInfluencer.campaign))
        .where(Influencer.id == influencer_id)
    )
    inf = result.scalars().first()
    if not inf:
        raise HTTPException(status_code=404, detail="Influencer not found")

    # 2. Fetch Campaign & Validate Ownership
    camp_result = await db.execute(select(Campaign).where(Campaign.id == request.campaign_id))
    campaign = camp_result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Scoping: Can only assign to MY campaign
    if current_user.role == UserRole.ADVERTISER:
        if campaign.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=403, detail="Not authorized to modify this campaign")

    # 3. Assign or Update Link
    # Check if already assigned
    existing_link = next((link for link in inf.campaign_links if link.campaign_id == campaign.id), None)
    
    if existing_link:
        # Update existing link
        if request.revenue_share_value is not None:
            existing_link.revenue_share_value = request.revenue_share_value
        if request.revenue_share_type is not None:
            existing_link.revenue_share_type = request.revenue_share_type
    else:
        # Create new link
        new_link = CampaignInfluencer(
            campaign=campaign,
            revenue_share_value=request.revenue_share_value or 0.0,
            revenue_share_type=request.revenue_share_type or 'percentage'
        )
        inf.campaign_links.append(new_link)

    await db.commit()
    
    # Re-fetch with all option loads to avoid MissingGreenlet error on response model validation
    result = await db.execute(
        select(Influencer)
        .options(selectinload(Influencer.campaign_links).selectinload(CampaignInfluencer.campaign))
        .where(Influencer.id == influencer_id)
    )
    inf = result.scalars().first()
    
    return inf
