from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class AdvertiserBase(BaseModel):
    name: str
    contact_email: EmailStr
    is_active: Optional[bool] = True

class AdvertiserCreate(AdvertiserBase):
    pass

class AdvertiserUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class APIKeyCreate(BaseModel):
    name: Optional[str] = None

class APIKeyResponse(BaseModel):
    id: int
    name: Optional[str]
    key_prefix: str
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True

class AdvertiserResponse(AdvertiserBase):
    id: int
    created_at: datetime
    api_keys: List[APIKeyResponse] = []

    class Config:
        from_attributes = True
