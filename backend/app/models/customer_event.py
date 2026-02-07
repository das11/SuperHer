from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base

class EventType(str, enum.Enum):
    purchase = "purchase"
    add_to_cart = "add_to_cart"
    signup = "signup"
    custom = "custom"
    drop_off = "drop_off"

class CustomerEvent(Base):
    __tablename__ = "customer_events"

    id = Column(Integer, primary_key=True, index=True)
    
    # Advertiser Context
    advertiser_id = Column(Integer, ForeignKey("advertisers.id"), nullable=False)
    
    # Event Details
    event_type = Column(String(50), nullable=False, index=True) # Store as string to allow flexibility, typically purchase/signup
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Financials
    revenue = Column(Float, nullable=True)
    currency = Column(String(3), default="USD")
    
    # Attribution Inputs (from conversion payload)
    coupon_code = Column(String(50), nullable=True)
    ref_code = Column(String(50), nullable=True)      # The code passed/extracted
    landing_url = Column(String(2048), nullable=True) # Full URL if lazy
    referrer = Column(String(2048), nullable=True)
    
    # Resolved Attribution (Computed)
    tracking_link_id = Column(Integer, ForeignKey("tracking_links.id"), nullable=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    
    # Audit
    properties = Column(JSON, nullable=True) # Mapped from payload.properties
    raw_data = Column(JSON, nullable=True)   # Full original payload
    
    # Relationships
    advertiser = relationship("Advertiser", back_populates="events")
    tracking_link = relationship("TrackingLink")
    influencer = relationship("Influencer")
    campaign = relationship("Campaign")
