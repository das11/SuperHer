from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    status = Column(String(50), default="draft") # draft, active, paused, completed
    
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    budget = Column(Float, default=0.0)
    
    advertiser_id = Column(Integer, ForeignKey("advertisers.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    advertiser = relationship("Advertiser", back_populates="campaigns")
    influencers = relationship("Influencer", secondary="campaign_influencers", back_populates="campaigns")
    coupons = relationship("Coupon", back_populates="campaign", cascade="all, delete-orphan")
    tracking_links = relationship("TrackingLink", back_populates="campaign", cascade="all, delete-orphan")
