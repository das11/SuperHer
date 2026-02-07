from pydantic import BaseModel
from typing import Optional

class CampaignSummary(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

class InfluencerSummary(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True
