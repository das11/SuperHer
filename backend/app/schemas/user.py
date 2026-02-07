from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    SUPERROOT = "SUPERROOT"
    ADVERTISER = "ADVERTISER"
    INFLUENCER = "INFLUENCER"

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: UserRole

class UserCreate(UserBase):
    cognito_sub: str
    is_active: bool = False

class UserResponse(UserBase):
    id: int
    is_active: bool
    cognito_sub: str
    # IDs of linked profiles
    advertiser_id: Optional[int] = None
    influencer_id: Optional[int] = None
    admin_id: Optional[int] = None

    class Config:
        from_attributes = True
