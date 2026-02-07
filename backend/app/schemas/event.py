from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime

class EventCreate(BaseModel):
    action: Literal['purchase', 'add_to_cart', 'signup', 'custom', 'drop_off'] = Field(..., description="Type of event")
    value: Optional[float] = Field(None, description="Monetary value of the event (e.g. 19.99)")
    currency: Optional[str] = Field("USD", description="Currency code (ISO 4217, default USD)")
    properties: Optional[Dict[str, Any]] = Field(None, description="Arbitrary JSON metadata about the event (items, SKU, etc.)")
    
    # Attribution Attributes
    coupon_code: Optional[str] = Field(None, description="Coupon code used in the transaction. Highest priority for attribution.")
    ref_code: Optional[str] = Field(None, description="Tracking reference code (short_code). Second priority.")
    landing_url: Optional[str] = Field(None, description="The full URL the user landed on. Used for lazy extraction of ref_code.")
    referrer: Optional[str] = Field(None, description="Referrer URL (optional, for backup extraction).")
    
    class Config:
        schema_extra = {
            "example": {
                "action": "purchase",
                "value": 120.50,
                "coupon_code": "SUMMER20",
                "properties": {"items": 3}
            }
        }

class EventResponse(BaseModel):
    id: int
    status: str
    attributed_influencer: Optional[str] = None
