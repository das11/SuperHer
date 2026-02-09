from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Security
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.campaign import Campaign
from app.models.influencer import Influencer, CampaignInfluencer
from app.models.advertiser import Advertiser
from app.models.user import User, UserRole
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignUpdate
from app.schemas.influencer import InfluencerLinkResponse
from app.core.deps import get_current_active_user

router = APIRouter()

@router.post("/", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign: CampaignCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create a new campaign. Restricted to Advertiser scope."""
    
    # Determine Advertiser ID based on Role
    target_advertiser_id = campaign.advertiser_id
    
    if current_user.role == UserRole.ADVERTISER:
        if not current_user.advertiser_id:
            raise HTTPException(status_code=400, detail="User is not linked to an advertiser profile.")
        # Enforce their own ID
        target_advertiser_id = current_user.advertiser_id
    
    # If SuperRoot, we trust the ID passed in the body (or require it)

    # Validate Advertiser exists
    result = await db.execute(select(Advertiser).where(Advertiser.id == target_advertiser_id))
    advertiser = result.scalars().first()
    if not advertiser:
        raise HTTPException(status_code=404, detail="Advertiser not found")

    new_campaign = Campaign(
        name=campaign.name,
        status=campaign.status,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        budget=campaign.budget,
        advertiser_id=target_advertiser_id
    )
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)
    return new_campaign

from sqlalchemy import func, case, case
from app.models.customer_event import CustomerEvent

@router.get("/", response_model=List[CampaignResponse])
async def list_campaigns(
    skip: int = 0, 
    limit: int = 100, 
    advertiser_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """List all campaigns with aggregated revenue and estimated payout. Scoped."""
    
    # Calculate payout based on revenue share model
    # Join CustomerEvent -> CampaignInfluencer to get the rate/fee for that specific influencer-campaign pair
    payout_calc = func.sum(
        case(
            (CampaignInfluencer.revenue_share_type == 'percentage', 
             func.coalesce(CustomerEvent.revenue, 0) * func.coalesce(CampaignInfluencer.revenue_share_value, 0) / 100.0),
            (CampaignInfluencer.revenue_share_type == 'flat', 
             func.coalesce(CampaignInfluencer.revenue_share_value, 0)),
            else_=0.0
        )
    ).label("payout")

    query = (
        select(
            Campaign, 
            func.coalesce(func.sum(CustomerEvent.revenue), 0.0).label("revenue"),
            func.coalesce(payout_calc, 0.0).label("payout")
        )
        .outerjoin(CustomerEvent, CustomerEvent.campaign_id == Campaign.id)
        .outerjoin(
            CampaignInfluencer, 
            (CampaignInfluencer.campaign_id == Campaign.id) & 
            (CampaignInfluencer.influencer_id == CustomerEvent.influencer_id)
        )
        .group_by(Campaign.id)
    )
    
    # Scoping Logic
    if current_user.role == UserRole.ADVERTISER:
        # User sees ONLY their own campaigns
        query = query.where(Campaign.advertiser_id == current_user.advertiser_id)
    else:
        # SuperRoot: Can filter by specific ID or see all
        if advertiser_id:
            query = query.where(Campaign.advertiser_id == advertiser_id)
    
    result = await db.execute(query.offset(skip).limit(limit))
    rows = result.all()
    
    # Construct response with revenue and payout attached
    campaigns = []
    for row in rows:
        camp_dict = row.Campaign.__dict__.copy()
        camp_dict["revenue"] = row.revenue
        camp_dict["payout"] = row.payout
        campaigns.append(camp_dict)
        
    return campaigns

@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a specific campaign with aggregated revenue and payout. Scoped."""
    
    payout_calc = func.sum(
        case(
            (CampaignInfluencer.revenue_share_type == 'percentage', 
             func.coalesce(CustomerEvent.revenue, 0) * func.coalesce(CampaignInfluencer.revenue_share_value, 0) / 100.0),
            (CampaignInfluencer.revenue_share_type == 'flat', 
             func.coalesce(CampaignInfluencer.revenue_share_value, 0)),
            else_=0.0
        )
    ).label("payout")

    query = (
        select(
            Campaign, 
            func.coalesce(func.sum(CustomerEvent.revenue), 0.0).label("revenue"),
            func.coalesce(payout_calc, 0.0).label("payout")
        )
        .outerjoin(CustomerEvent, CustomerEvent.campaign_id == Campaign.id)
        .outerjoin(
            CampaignInfluencer, 
            (CampaignInfluencer.campaign_id == Campaign.id) & 
            (CampaignInfluencer.influencer_id == CustomerEvent.influencer_id)
        )
        .where(Campaign.id == campaign_id)
        .group_by(Campaign.id)
    )

    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    campaign = row.Campaign
    
    # Scoping Logic
    if current_user.role == UserRole.ADVERTISER:
        if campaign.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=404, detail="Campaign not found")

    # Manually attach aggregated fields to the model instance for the schema
    # (Since schema uses from_attributes=True, it will look for attributes on the object)
    setattr(campaign, "revenue", row.revenue)
    setattr(campaign, "payout", row.payout)

    return campaign

@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    campaign_update: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update a campaign. Scoped."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Scoping Logic
    if current_user.role == UserRole.ADVERTISER:
        if campaign.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=404, detail="Campaign not found")

    update_data = campaign_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(campaign, field, value)

    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign

@router.get("/{campaign_id}/influencers", response_model=List[InfluencerLinkResponse])
async def list_campaign_influencers(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """List influencers for a specific campaign with link details."""
    # Validate campaign
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if current_user.role == UserRole.ADVERTISER and campaign.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch links
    stmt = (
        select(CampaignInfluencer)
        .options(selectinload(CampaignInfluencer.influencer))
        .where(CampaignInfluencer.campaign_id == campaign_id)
    )
    result = await db.execute(stmt)
    links = result.scalars().all()
    
    # Flatten structure for response
    return [
        InfluencerLinkResponse(
            id=link.influencer.id,
            name=link.influencer.name,
            email=link.influencer.email,
            social_handle=link.influencer.social_handle,
            revenue_share_value=link.revenue_share_value if link.revenue_share_value is not None else 0.0,
            revenue_share_type=link.revenue_share_type if link.revenue_share_type is not None else 'percentage'
        ) for link in links
    ]
