from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.core.database import get_db
from app.core.deps import get_current_advertiser
from app.schemas.event import EventCreate, EventResponse
from app.models.advertiser import Advertiser
from app.models.customer_event import CustomerEvent
from app.services.attribution import AttributionService

router = APIRouter()

@router.post(
    "/", 
    response_model=EventResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Conversion Event",
    description="""
INGESTS ADVERTISER CONVERSION EVENT
(e.g., Purchase, Sign-up) and attributes it to an influencer.

AUTHENTICATION:
Requires 'X-API-KEY' header with a valid Advertiser API Key.

ATTRIBUTION LOGIC (WATERFALL):
The system determines the attributed influencer in this order of priority:
1. COUPON CODE: If a valid coupon is provided, the influencer owning that coupon gets credit.
2. REF CODE: If a 'ref_code' (from a tracking link) is provided, the link owner gets credit.
3. LAZY URL EXTRACTION: If 'ref_code' is missing, the system attempts to extract it from 'landing_url' or 'referrer'.

PAYLOAD NOTES:
- action: Required. One of 'purchase', 'add_to_cart', 'signup', 'custom', 'drop_off'.
- value: Revenue amount (optional).
- properties: Flexible JSON for extra data (SKU, items, etc.).
    """
)
async def ingest_event(
    event_in: EventCreate,
    advertiser: Advertiser = Depends(get_current_advertiser),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Process a new conversion event.
    """
    
    # 1. Run Attribution
    attr_service = AttributionService(db)
    influencer_id, campaign_id, tracking_link_id = await attr_service.resolve(
        coupon_code=event_in.coupon_code,
        ref_code=event_in.ref_code,
        landing_url=event_in.landing_url,
        advertiser_id=advertiser.id
    )
    
    # 2. Create Event Record
    new_event = CustomerEvent(
        advertiser_id=advertiser.id,
        event_type=event_in.action,  # mapping 'action' -> 'event_type'
        # Financials
        revenue=event_in.value,
        currency=event_in.currency,
        # Inputs
        coupon_code=event_in.coupon_code,
        ref_code=event_in.ref_code,
        landing_url=event_in.landing_url,
        referrer=event_in.referrer,
        # Resolved Attribution
        influencer_id=influencer_id,
        campaign_id=campaign_id,
        tracking_link_id=tracking_link_id,
        # Audit
        properties=event_in.properties,
        raw_data=event_in.dict()
    )
    
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    
    return {
        "id": new_event.id,
        "status": "processed",
        "attributed_influencer": str(influencer_id) if influencer_id else None
    }
