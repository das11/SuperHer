from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

class CouponBase(BaseModel):
    is_active: Optional[bool] = True

class CouponCreateBase(CouponBase):
    campaign_id: int = Field(..., description="ID of the campaign this coupon belongs to")
    influencer_id: Optional[int] = Field(None, description="ID of the influencer (Optional/Null for Generic Coupons)")

class CouponManualCreate(CouponCreateBase):
    code: str = Field(..., description="Manually specified coupon code (e.g. SUMMER20)", min_length=3)

    class Config:
        json_schema_extra = {
            "example": {
                "campaign_id": 1,
                "influencer_id": 1,
                "code": "SUMMER2025",
                "is_active": True
            }
        }

class CouponAutoGenerate(CouponCreateBase):
    generation_params: Optional[Dict[str, str]] = Field(
        default_factory=lambda: {"prefix": "", "length": "8"},
        description="Parameters for code generation. Key options: 'prefix' (str), 'length' (int)."
    )

    class Config:
        json_schema_extra = {
            "example": {
                "campaign_id": 1,
                "influencer_id": 1,
                "generation_params": {
                    "prefix": "SUMMER",
                    "length": "8"
                },
                "is_active": True
            }
        }

# Generic Create for fallback or internal use if needed (keeping original name for compat if needed, but not primarily exposed)
class CouponCreate(CouponCreateBase):
    code: Optional[str] = None
    generation_params: Optional[Dict[str, str]] = None

class CouponUpdate(BaseModel):
    is_active: Optional[bool] = None

from app.schemas.common import CampaignSummary, InfluencerSummary

class CouponResponse(CouponBase):
    id: int
    code: str
    campaign_id: int
    influencer_id: Optional[int]
    
    # Nested Summaries
    campaign: Optional[CampaignSummary] = None
    influencer: Optional[InfluencerSummary] = None
    
    settings: Optional[Dict] = None
    created_at: datetime
    updated_at: datetime

class CouponEmailRequest(BaseModel):
    ids: List[int] = Field(default=[], description="List of Coupon IDs to send emails for.")
    send_all: bool = Field(False, description="If True, sends emails for ALL coupons (filtered by campaign/advertiser implicitly).")
    campaign_id_filter: Optional[int] = Field(None, description="Optional filter if send_all is True")

