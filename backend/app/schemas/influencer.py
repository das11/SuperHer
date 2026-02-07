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

class InfluencerBase(BaseModel):
    name: str
    email: EmailStr
    social_handle: Optional[str] = None

class InfluencerCreate(InfluencerBase):
    campaign_id: Optional[int] = None

class InfluencerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    social_handle: Optional[str] = None

class InfluencerResponse(InfluencerBase):
    id: int
    created_at: datetime
    campaigns: List[CampaignSummary] = []

    class Config:
        from_attributes = True
