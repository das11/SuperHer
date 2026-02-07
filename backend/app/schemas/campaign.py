from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class CampaignBase(BaseModel):
    name: str
    status: Optional[str] = "draft"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = 0.0

class CampaignCreate(CampaignBase):
    advertiser_id: int

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None

class CampaignResponse(CampaignBase):
    id: int
    advertiser_id: int
    created_at: datetime
    revenue: Optional[float] = 0.0
    
    class Config:
        from_attributes = True
