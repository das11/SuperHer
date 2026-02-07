from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List
from datetime import datetime

class TrackingLinkBase(BaseModel):
    destination_url: str = Field(..., description="The final destination URL where the user will be redirected (e.g. https://brand.com/product-page).")
    cpc_rate: Optional[float] = Field(0.0, description="Cost Per Click (CPC) rate for this link, used for calculating ad spend.")

class TrackingLinkCreate(TrackingLinkBase):
    campaign_id: int = Field(..., description="ID of the Campaign this link belongs to.")
    influencer_id: Optional[int] = Field(None, description="ID of the Influencer. If Null, this is a Generic link not tied to a specific person.")

    class Config:
        json_schema_extra = {
            "example": {
                "destination_url": "https://myshop.com/summer-sale",
                "campaign_id": 1,
                "influencer_id": 1,
                "cpc_rate": 0.50
            }
        }

from app.schemas.common import CampaignSummary, InfluencerSummary

class TrackingLinkResponse(TrackingLinkBase):
    id: int = Field(..., description="Unique ID of the tracking link.")
    short_code: str = Field(..., description="The 6-character unique code used in the short URL (e.g. 'AbC12').")
    campaign_id: int
    influencer_id: Optional[int]
    
    # Nested
    campaign: Optional[CampaignSummary] = None
    influencer: Optional[InfluencerSummary] = None
    
    created_at: datetime
    
    click_count: int = Field(0, description="Total number of clicks this link has received.")
    
    # Computed field helper
    full_url: Optional[str] = Field(None, description="The full short URL to share (e.g. http://api.superher.com/r/AbC12).")

    class Config:
        from_attributes = True

class ClickEventResponse(BaseModel):
    id: int
    tracking_link_id: int
    timestamp: datetime
    ip_address: Optional[str]
    user_agent: Optional[str]
    referer: Optional[str]
    country_code: Optional[str]

    class Config:
        from_attributes = True

class TrackingLinkEmailRequest(BaseModel):
    ids: List[int] = Field(default=[], description="List of Link IDs to send emails for.")
    send_all: bool = Field(False, description="If True, sends emails for ALL links (filtered by campaign/advertiser implicitly).")
    campaign_id_filter: Optional[int] = Field(None, description="Optional filter if send_all is True")
