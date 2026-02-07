from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime

from app.core import deps
from app.services.stats import StatsService
from app.models.advertiser import Advertiser
from app.models.user import User, UserRole

router = APIRouter()

@router.get("/overview")
async def get_overview(
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    advertiser_id: Optional[int] = Query(None, description="SuperRoot Override"),
    campaign_id: Optional[int] = Query(None),
    influencer_id: Optional[int] = Query(None),
    current_advertiser: Optional[Advertiser] = Depends(deps.superroot_get_current_advertiser),
    current_user: Optional[User] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Get high-level dashboard metrics (Clicks, Conversions, GMV).
    If advertiser_id is None and user is SUPERROOT, returns Global Stats.
    """
    target_id = None
    
    # 1. API Key Auth (Advertiser Context)
    if current_advertiser:
        target_id = current_advertiser.id
        # Safety: API Key user can't override advertiser_id
        if advertiser_id and advertiser_id != target_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Cannot override Advertiser ID with API Key")
    
    # 2. JWT Auth (Dashboard Context)
    elif current_user:
        if current_user.role == UserRole.ADVERTISER:
            target_id = current_user.advertiser_id
        elif current_user.role == UserRole.SUPERROOT:
            target_id = advertiser_id
            
    if target_id is None and (not current_user or current_user.role != UserRole.SUPERROOT):
         from fastapi import HTTPException
         raise HTTPException(status_code=401, detail="Authentication required (API Key or Admin)")
         
    return await StatsService.get_overview(db, target_id, from_date, to_date, campaign_id, influencer_id)

@router.get("/chart")
async def get_chart_data(
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    advertiser_id: Optional[int] = Query(None),
    campaign_id: Optional[int] = Query(None),
    influencer_id: Optional[int] = Query(None),
    current_advertiser: Optional[Advertiser] = Depends(deps.superroot_get_current_advertiser),
    current_user: Optional[User] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Get daily time-series data for Clicks vs Conversions.
    """
    target_id = None
    if current_advertiser:
        target_id = current_advertiser.id
        if advertiser_id and advertiser_id != target_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Cannot override Advertiser ID with API Key")
    elif current_user:
        if current_user.role == UserRole.ADVERTISER:
            target_id = current_user.advertiser_id
        elif current_user.role == UserRole.SUPERROOT:
            target_id = advertiser_id
            
    if target_id is None and (not current_user or current_user.role != UserRole.SUPERROOT):
         from fastapi import HTTPException
         raise HTTPException(status_code=401, detail="Authentication required")

    return await StatsService.get_chart_data(db, target_id, from_date, to_date, campaign_id, influencer_id)

@router.get("/breakdown")
async def get_event_breakdown(
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    advertiser_id: Optional[int] = Query(None),
    campaign_id: Optional[int] = Query(None),
    influencer_id: Optional[int] = Query(None),
    current_advertiser: Optional[Advertiser] = Depends(deps.superroot_get_current_advertiser),
    current_user: Optional[User] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Get aggregated counts by Event Type (Sankey/Funnel data).
    """
    target_id = None
    if current_advertiser:
        target_id = current_advertiser.id
        if advertiser_id and advertiser_id != target_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Cannot override Advertiser ID with API Key")
    elif current_user:
        if current_user.role == UserRole.ADVERTISER:
            target_id = current_user.advertiser_id
        elif current_user.role == UserRole.SUPERROOT:
            target_id = advertiser_id
            
    if target_id is None and (not current_user or current_user.role != UserRole.SUPERROOT):
         from fastapi import HTTPException
         raise HTTPException(status_code=401, detail="Authentication required")

    return await StatsService.get_event_breakdown(db, target_id, from_date, to_date, campaign_id, influencer_id)

@router.get("/campaigns")
async def get_top_campaigns(
    advertiser_id: Optional[int] = Query(None),
    campaign_id: Optional[int] = Query(None),
    influencer_id: Optional[int] = Query(None),
    current_advertiser: Optional[Advertiser] = Depends(deps.superroot_get_current_advertiser),
    current_user: Optional[User] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Get performance breakdown by Campaign (Top 10 by Revenue).
    """
    target_id = None
    if current_advertiser:
        target_id = current_advertiser.id
        if advertiser_id and advertiser_id != target_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Cannot override Advertiser ID with API Key")
    elif current_user:
        if current_user.role == UserRole.ADVERTISER:
            target_id = current_user.advertiser_id
        elif current_user.role == UserRole.SUPERROOT:
            target_id = advertiser_id
            
    if target_id is None and (not current_user or current_user.role != UserRole.SUPERROOT):
         from fastapi import HTTPException
         raise HTTPException(status_code=401, detail="Authentication required")

    return await StatsService.get_top_campaigns(db, target_id, limit=10, campaign_id=campaign_id, influencer_id=influencer_id)

@router.get("/influencers")
async def get_top_influencers(
    advertiser_id: Optional[int] = Query(None),
    campaign_id: Optional[int] = Query(None),
    influencer_id: Optional[int] = Query(None),
    current_advertiser: Optional[Advertiser] = Depends(deps.superroot_get_current_advertiser),
    current_user: Optional[User] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Get performance breakdown by Influencer (Top 10 by Revenue).
    """
    target_id = None
    if current_advertiser:
        target_id = current_advertiser.id
        if advertiser_id and advertiser_id != target_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Cannot override Advertiser ID with API Key")
    elif current_user:
        if current_user.role == UserRole.ADVERTISER:
            target_id = current_user.advertiser_id
        elif current_user.role == UserRole.SUPERROOT:
            target_id = advertiser_id
            
    if target_id is None and (not current_user or current_user.role != UserRole.SUPERROOT):
         from fastapi import HTTPException
         raise HTTPException(status_code=401, detail="Authentication required")

    return await StatsService.get_top_influencers(db, target_id, limit=10, campaign_id=campaign_id, influencer_id=influencer_id)

@router.get("/coupons")
async def get_top_coupons(
    advertiser_id: Optional[int] = Query(None),
    campaign_id: Optional[int] = Query(None),
    influencer_id: Optional[int] = Query(None),
    current_advertiser: Optional[Advertiser] = Depends(deps.superroot_get_current_advertiser),
    current_user: Optional[User] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Get performance breakdown by Coupon Code (Top 10 by Revenue).
    """
    target_id = None
    if current_advertiser:
        target_id = current_advertiser.id
        if advertiser_id and advertiser_id != target_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Cannot override Advertiser ID with API Key")
    elif current_user:
        if current_user.role == UserRole.ADVERTISER:
            target_id = current_user.advertiser_id
        elif current_user.role == UserRole.SUPERROOT:
            target_id = advertiser_id
            
    if target_id is None and (not current_user or current_user.role != UserRole.SUPERROOT):
         from fastapi import HTTPException
         raise HTTPException(status_code=401, detail="Authentication required")

    return await StatsService.get_top_coupons(db, target_id, limit=10, campaign_id=campaign_id, influencer_id=influencer_id)

@router.get("/tracking-links")
async def get_top_links(
    advertiser_id: Optional[int] = Query(None),
    campaign_id: Optional[int] = Query(None),
    influencer_id: Optional[int] = Query(None),
    current_advertiser: Optional[Advertiser] = Depends(deps.superroot_get_current_advertiser),
    current_user: Optional[User] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Get performance breakdown by Tracking Link (Top 10 by Revenue).
    """
    target_id = None
    if current_advertiser:
        target_id = current_advertiser.id
        if advertiser_id and advertiser_id != target_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Cannot override Advertiser ID with API Key")
    elif current_user:
        if current_user.role == UserRole.ADVERTISER:
            target_id = current_user.advertiser_id
        elif current_user.role == UserRole.SUPERROOT:
            target_id = advertiser_id
            
    if target_id is None and (not current_user or current_user.role != UserRole.SUPERROOT):
         from fastapi import HTTPException
         raise HTTPException(status_code=401, detail="Authentication required")

    return await StatsService.get_top_links(db, target_id, limit=10, campaign_id=campaign_id, influencer_id=influencer_id)

from fastapi.responses import StreamingResponse

@router.get("/export")
async def export_events(
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    advertiser_id: Optional[int] = Query(None),
    campaign_id: Optional[int] = Query(None),
    influencer_id: Optional[int] = Query(None),
    current_advertiser: Optional[Advertiser] = Depends(deps.superroot_get_current_advertiser),
    current_user: Optional[User] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Download raw event data as CSV.
    """
    target_id = None
    if current_advertiser:
        target_id = current_advertiser.id
        if advertiser_id and advertiser_id != target_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Cannot override Advertiser ID with API Key")
    elif current_user:
        if current_user.role == UserRole.ADVERTISER:
            target_id = current_user.advertiser_id
        elif current_user.role == UserRole.SUPERROOT:
            target_id = advertiser_id
            
    if target_id is None and (not current_user or current_user.role != UserRole.SUPERROOT):
         from fastapi import HTTPException
         raise HTTPException(status_code=401, detail="Authentication required")

    csv_generator = StatsService.export_events_csv(db, target_id, from_date, to_date, campaign_id, influencer_id)
    return StreamingResponse(
        csv_generator, 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=events_export_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
    )

@router.get("/journey")
async def get_journey_stats(
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    advertiser_id: Optional[int] = Query(None),
    campaign_id: Optional[int] = Query(None),
    influencer_id: Optional[int] = Query(None),
    current_advertiser: Optional[Advertiser] = Depends(deps.superroot_get_current_advertiser),
    current_user: Optional[User] = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Get Source -> Attribution -> Outcome flow data.
    """
    target_id = None
    if current_advertiser:
        target_id = current_advertiser.id
        if advertiser_id and advertiser_id != target_id:
             from fastapi import HTTPException
             raise HTTPException(status_code=403, detail="Cannot override Advertiser ID with API Key")
    elif current_user:
        if current_user.role == UserRole.ADVERTISER:
            target_id = current_user.advertiser_id
        elif current_user.role == UserRole.SUPERROOT:
            target_id = advertiser_id
            
    if target_id is None and (not current_user or current_user.role != UserRole.SUPERROOT):
         from fastapi import HTTPException
         raise HTTPException(status_code=401, detail="Authentication required")

    return await StatsService.get_journey_stats(db, target_id, from_date, to_date, campaign_id, influencer_id)
