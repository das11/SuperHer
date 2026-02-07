from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional, Dict, Any
import random
import string

from app.core.database import get_db
from app.models.coupon import Coupon
from app.models.campaign import Campaign
from app.models.influencer import Influencer
from app.models.user import User, UserRole
from app.core.deps import get_current_active_user
from app.schemas.coupon import CouponCreate, CouponUpdate, CouponResponse, CouponManualCreate, CouponAutoGenerate, CouponEmailRequest
from app.services.email import email_service

router = APIRouter()

@router.post("/notify", response_model=Dict[str, Any])
async def notify_influencers(
    item: CouponEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Send emails to influencers with their assigned coupons.
    """
    stmt = select(Coupon).join(Campaign).join(Influencer).options(
        selectinload(Coupon.campaign),
        selectinload(Coupon.influencer)
    ).where(Influencer.email.isnot(None))

    # Scoping
    if current_user.role == UserRole.ADVERTISER:
        stmt = stmt.where(Campaign.advertiser_id == current_user.advertiser_id)

    # Filter Logic
    if item.send_all:
        if item.campaign_id_filter:
            stmt = stmt.where(Coupon.campaign_id == item.campaign_id_filter)
    else:
        if not item.ids:
            return {"message": "No coupons selected", "sent_count": 0}
        stmt = stmt.where(Coupon.id.in_(item.ids))

    result = await db.execute(stmt)
    coupons = result.scalars().all()

    # Group by Influencer and Campaign
    # Key: (influencer_id, campaign_id) -> list of coupons
    grouped: Dict[tuple, List[Coupon]] = {}
    
    for coupon in coupons:
        key = (coupon.influencer_id, coupon.campaign_id)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(coupon)

    sent_count = 0
    failed_count = 0
    
    for (inf_id, camp_id), coupon_list in grouped.items():
        # All coupons in this list belong to same influencer and campaign
        # So we can pick the first one's relations
        influencer = coupon_list[0].influencer
        campaign = coupon_list[0].campaign
        
        if influencer and influencer.email:
            success = email_service.send_coupons(
                influencer_name=influencer.name,
                influencer_email=influencer.email,
                campaign_name=campaign.name,
                coupons=coupon_list
            )
            if success:
                sent_count += 1
            else:
                failed_count += 1

    return {
        "message": f"Processed {len(coupons)} coupons.",
        "emails_sent": sent_count,
        "emails_failed": failed_count,
        "influencers_targeted": len(grouped)
    }


def generate_random_code(length: int = 8, prefix: str = "") -> str:
    """Generates a random alphanumeric code with keys."""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(random.choices(chars, k=length))
    return f"{prefix}{random_part}"

@router.post("/generate", response_model=CouponResponse)
async def generate_coupon(
    item: CouponAutoGenerate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Auto-generate a unique coupon code.
    Required: campaign_id
    Optional: influencer_id (if Generic), generation_params (prefix, length)
    """
    # Validate Campaign
    result = await db.execute(select(Campaign).where(Campaign.id == item.campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Scoping
    if current_user.role == UserRole.ADVERTISER:
        if campaign.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=403, detail="Not authorized")

    # Validate Influencer if provided
    if item.influencer_id:
        result = await db.execute(select(Influencer).where(Influencer.id == item.influencer_id))
        influencer = result.scalar_one_or_none()
        if not influencer:
            raise HTTPException(status_code=404, detail="Influencer not found")

    # Generation Logic
    params = item.generation_params or {}
    prefix = params.get("prefix", "").upper()
    try:
        length = int(params.get("length", 8))
    except (ValueError, TypeError):
        length = 8
    
    # Simple retry logic for uniqueness
    max_retries = 5
    for _ in range(max_retries):
        code = generate_random_code(length=length, prefix=prefix)
        # Check uniqueness
        result = await db.execute(select(Coupon).where(Coupon.code == code))
        existing = result.scalar_one_or_none()
        
        if not existing:
            new_coupon = Coupon(
                code=code,
                campaign_id=item.campaign_id,
                influencer_id=item.influencer_id,
                settings=params,
                is_active=item.is_active
            )
            db.add(new_coupon)
            await db.commit()
            await db.refresh(new_coupon)
            # Re-fetch with eager loading to avoid MissingGreenlet
            stmt = select(Coupon).options(
                selectinload(Coupon.campaign),
                selectinload(Coupon.influencer)
            ).where(Coupon.id == new_coupon.id)
            result = await db.execute(stmt)
            return result.scalar_one()
            
    raise HTTPException(status_code=409, detail="Could not generate a unique code after multiple retries. Please try again.")

@router.post("/", response_model=CouponResponse)
async def create_manual_coupon(
    item: CouponManualCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Manually create a coupon with a specific code.
    """
    if not item.code:
        raise HTTPException(status_code=400, detail="Code is required for manual creation. Use /generate for auto-generation.")

    code = item.code.strip().upper()

    # Validate Campaign
    result = await db.execute(select(Campaign).where(Campaign.id == item.campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Scoping
    if current_user.role == UserRole.ADVERTISER:
        if campaign.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=403, detail="Not authorized")

    # Validate Influencer if provided
    if item.influencer_id:
        result = await db.execute(select(Influencer).where(Influencer.id == item.influencer_id))
        influencer = result.scalar_one_or_none()
        if not influencer:
            raise HTTPException(status_code=404, detail="Influencer not found")
            
    # Check Uniqueness
    result = await db.execute(select(Coupon).where(Coupon.code == code))
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Coupon code '{code}' already exists.")

    new_coupon = Coupon(
        code=code,
        campaign_id=item.campaign_id,
        influencer_id=item.influencer_id,
        settings={"manual": True},
        is_active=item.is_active
    )
    db.add(new_coupon)
    await db.commit()
    await db.refresh(new_coupon)
    
    # Re-fetch with eager loading
    stmt = select(Coupon).options(
        selectinload(Coupon.campaign),
        selectinload(Coupon.influencer)
    ).where(Coupon.id == new_coupon.id)
    result = await db.execute(stmt)
    return result.scalar_one()

from sqlalchemy.orm import selectinload

@router.get("/", response_model=List[CouponResponse])
async def list_coupons(
    campaign_id: Optional[int] = None,
    influencer_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100
):
    stmt = select(Coupon).join(Campaign).options(
        selectinload(Coupon.campaign),
        selectinload(Coupon.influencer)
    )
    
    # Scoping
    if current_user.role == UserRole.ADVERTISER:
        stmt = stmt.where(Campaign.advertiser_id == current_user.advertiser_id)

    if campaign_id:
        stmt = stmt.where(Coupon.campaign_id == campaign_id)
    if influencer_id:
        stmt = stmt.where(Coupon.influencer_id == influencer_id)
        
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    # Scoping
    if current_user.role == UserRole.ADVERTISER:
        # Need to check related campaign's advertiser
        # We could join, or just lazy load. Let's do a quick check.
        # Ideally, schemas/models should be set up for efficient joins, 
        # but for now we fetch.
        
        # Async lazy load of campaign? 
        # Or explicit join query?
        # Let's do explicit check for safety
        camp_res = await db.execute(select(Campaign).where(Campaign.id == coupon.campaign_id))
        camp = camp_res.scalar_one_or_none()
        if not camp or camp.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=404, detail="Coupon not found")
             
    return coupon

@router.put("/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: int,
    item: CouponUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    # Scoping
    if current_user.role == UserRole.ADVERTISER:
        camp_res = await db.execute(select(Campaign).where(Campaign.id == coupon.campaign_id))
        camp = camp_res.scalar_one_or_none()
        if not camp or camp.advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=404, detail="Coupon not found")
        
    if item.is_active is not None:
        coupon.is_active = item.is_active
        
    # db.add(coupon) # Not strictly necessary if object is attached, but good practice
    await db.commit()
    await db.refresh(coupon)
    return coupon
