from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Security
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.campaign import Campaign
from app.models.advertiser import Advertiser
from app.models.user import User, UserRole
from app.schemas.campaign import CampaignCreate, CampaignResponse, CampaignUpdate
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

from sqlalchemy import func
from app.models.customer_event import CustomerEvent

@router.get("/", response_model=List[CampaignResponse])
async def list_campaigns(
    skip: int = 0, 
    limit: int = 100, 
    advertiser_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """List all campaigns with aggregated revenue. Scoped to current user's advertiser."""
    
    query = (
        select(Campaign, func.coalesce(func.sum(CustomerEvent.revenue), 0.0).label("revenue"))
        .outerjoin(CustomerEvent, CustomerEvent.campaign_id == Campaign.id)
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
    
    # Construct response with revenue attached
    campaigns = []
    for row in rows:
        camp_dict = row.Campaign.__dict__.copy()
        camp_dict["revenue"] = row.revenue
        campaigns.append(camp_dict)
        
    return campaigns

@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a specific campaign. Scoped."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalars().first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Scoping Logic
    if current_user.role == UserRole.ADVERTISER:
        if campaign.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=404, detail="Campaign not found")

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
