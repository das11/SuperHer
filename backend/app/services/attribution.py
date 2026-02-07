from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, Tuple
from urllib.parse import urlparse, parse_qs

from app.models.coupon import Coupon
from app.models.tracking_link import TrackingLink
from app.models.advertiser import Advertiser

class AttributionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def extract_ref_code(self, url: str) -> Optional[str]:
        """Lazy extraction: Hunts for ?ref_code=XYZ"""
        if not url:
            return None
        try:
            parsed = urlparse(url)
            qs = parse_qs(parsed.query)
            return qs.get('ref_code', [None])[0]
        except:
            return None

    async def resolve(
        self, 
        coupon_code: Optional[str], 
        ref_code: Optional[str], 
        landing_url: Optional[str],
        advertiser_id: int
    ) -> Tuple[Optional[int], Optional[int], Optional[int]]:
        """
        Waterfall Logic.
        Returns: (influencer_id, campaign_id, tracking_link_id)
        """
        
        # 1. PRIORITY: Coupon Code (Strongest)
        if coupon_code:
            # Find coupon belonging to this advertiser's campaigns (implied via campaign->advertiser check if strict, or just global lookup for MVP)
            # For MVP, we check if coupon exists and get its owner.
            result = await self.db.execute(select(Coupon).where(Coupon.code == coupon_code))
            coupon = result.scalar_one_or_none()
            
            if coupon:
                # WINNER: Coupon (Always wins if valid)
                # Note: influencer_id might be None for generic coupons, that's fine.
                return (coupon.influencer_id, coupon.campaign_id, None)

        # 2. PRIORITY: Ref Code (Deterministic)
        # If not provided directly, try to extract from landing_url
        final_ref_code = ref_code
        if not final_ref_code and landing_url:
            final_ref_code = self.extract_ref_code(landing_url)
            
        if final_ref_code:
            result = await self.db.execute(select(TrackingLink).where(TrackingLink.short_code == final_ref_code))
            link = result.scalar_one_or_none()
            
            if link and link.influencer_id:
                 # Check if link belongs to a campaign of this advertiser (optional security check)
                 # For MVP, we trust the unique code.
                 # WINNER: Tracking Link
                 return (link.influencer_id, link.campaign_id, link.id)
                 
        return (None, None, None)
