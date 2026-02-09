from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.schemas.campaign import CampaignResponse 

# We might want a smaller Campaign schema for nested responses to avoid circular dependency/too much data
class CampaignSummary(BaseModel):
    id: int
    name: str
    status: str
    class Config:
        from_attributes = True

class CampaignLinkResponse(BaseModel):
    campaign: CampaignSummary
    revenue_share_value: Optional[float] = 0.0
    revenue_share_type: Optional[str] = 'percentage'
    
    class Config:
        from_attributes = True

class InfluencerBase(BaseModel):
    name: str
    email: EmailStr
    social_handle: Optional[str] = None

class InfluencerCreate(InfluencerBase):
    campaign_id: Optional[int] = None
    revenue_share_value: Optional[float] = 0.0
    revenue_share_type: Optional[str] = 'percentage'

class InfluencerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    social_handle: Optional[str] = None

class InfluencerResponse(InfluencerBase):
    id: int
    created_at: datetime
    # campaigns: List[CampaignSummary] = [] # Deprecated or kept for backward compat?
    campaign_links: List[CampaignLinkResponse] = []

    class Config:
        from_attributes = True

class InfluencerLinkResponse(InfluencerBase):
    id: int
    revenue_share_value: float
    revenue_share_type: str
    
    class Config:
        from_attributes = True
