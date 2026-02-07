from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import List, Any, Dict
import string
import random

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.user import User, UserRole
from app.models.tracking_link import TrackingLink
from app.models.click_event import ClickEvent
from app.models.campaign import Campaign
from app.models.influencer import Influencer
from app.schemas.tracking import TrackingLinkCreate, TrackingLinkResponse, TrackingLinkEmailRequest
from app.services.email import email_service

router = APIRouter()


# ... existing code ...

@router.post("/notify", response_model=Dict[str, Any])

async def notify_influencers(
    item: TrackingLinkEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send emails to influencers with their assigned tracking links.
    """
    stmt = select(TrackingLink).join(Campaign).join(Influencer).options(
        selectinload(TrackingLink.campaign),
        selectinload(TrackingLink.influencer)
    ).where(Influencer.email.isnot(None))

    # Scoping
    if current_user.role == UserRole.ADVERTISER:
        stmt = stmt.where(Campaign.advertiser_id == current_user.advertiser_id)

    # Filter Logic
    if item.send_all:
        if item.campaign_id_filter:
            stmt = stmt.where(TrackingLink.campaign_id == item.campaign_id_filter)
    else:
        if not item.ids:
            return {"message": "No links selected", "sent_count": 0}
        stmt = stmt.where(TrackingLink.id.in_(item.ids))

    result = await db.execute(stmt)
    links = result.scalars().all()

    # Group by Influencer and Campaign
    grouped: Dict[tuple, List[TrackingLink]] = {}
    
    for link in links:
        key = (link.influencer_id, link.campaign_id)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(link)

    sent_count = 0
    failed_count = 0
    
    for (inf_id, camp_id), link_list in grouped.items():
        influencer = link_list[0].influencer
        campaign = link_list[0].campaign
        
        if influencer and influencer.email:
            success = email_service.send_links(
                influencer_name=influencer.name,
                influencer_email=influencer.email,
                campaign_name=campaign.name,
                links=link_list
            )
            if success:
                sent_count += 1
            else:
                failed_count += 1

    return {
        "message": f"Processed {len(links)} links.",
        "emails_sent": sent_count,
        "emails_failed": failed_count,
        "influencers_targeted": len(grouped)
    }


def generate_short_code(length: int = 6) -> str:
    """Generates a random short code."""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

@router.post("/", response_model=TrackingLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_tracking_link(
    item: TrackingLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create a new tracking link for a campaign.
    """
    # Validate Campaign
    result = await db.execute(select(Campaign).where(Campaign.id == item.campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Scoping
    if current_user.role == UserRole.ADVERTISER:
        if campaign.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=403, detail="Not authorized to access this campaign")

    # Validate Influencer if provided
    if item.influencer_id:
        result = await db.execute(select(Influencer).where(Influencer.id == item.influencer_id))
        influencer = result.scalar_one_or_none()
        if not influencer:
            raise HTTPException(status_code=404, detail="Influencer not found")

    # Generate Unique Short Code
    max_retries = 5
    for _ in range(max_retries):
        short_code = generate_short_code()
        # Check uniqueness
        result = await db.execute(select(TrackingLink).where(TrackingLink.short_code == short_code))
        existing = result.scalar_one_or_none()
        
        if not existing:
            new_link = TrackingLink(
                short_code=short_code,
                destination_url=str(item.destination_url),
                campaign_id=item.campaign_id,
                influencer_id=item.influencer_id,
                cpc_rate=item.cpc_rate
            )
            db.add(new_link)
            await db.commit()
            await db.refresh(new_link)
            
            # Re-fetch with eager loading
            stmt = select(TrackingLink).options(
                selectinload(TrackingLink.campaign),
                selectinload(TrackingLink.influencer)
            ).where(TrackingLink.id == new_link.id)
            result = await db.execute(stmt)
            final_link = result.scalar_one()
            
            # Manually attach click_count=0 for the response model
            final_link.click_count = 0
            return final_link

    raise HTTPException(status_code=409, detail="Could not generate unique short code.")

from sqlalchemy.orm import selectinload

@router.get("/", response_model=List[TrackingLinkResponse])
async def list_tracking_links(
    skip: int = 0,
    limit: int = 100,
    campaign_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    # Build query with join and count
    stmt = select(TrackingLink, func.count(ClickEvent.id).label("click_count"))\
        .outerjoin(ClickEvent, ClickEvent.tracking_link_id == TrackingLink.id)\
        .join(Campaign)\
        .options(
            selectinload(TrackingLink.campaign),
            selectinload(TrackingLink.influencer)
        )
        
    # Scoping
    if current_user.role == UserRole.ADVERTISER:
        stmt = stmt.where(Campaign.advertiser_id == current_user.advertiser_id)

    if campaign_id:
        stmt = stmt.where(TrackingLink.campaign_id == campaign_id)
        
    stmt = stmt.group_by(TrackingLink.id).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Map the tuple results to the response model shape
    response_data = []
    for link, count in rows:
        # We can dynamically set the attribute on the ORM object
        # The Pydantic model will read it from attributes
        link.click_count = count
        response_data.append(link)
        
    return response_data
