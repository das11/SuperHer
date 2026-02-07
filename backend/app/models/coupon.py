from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    # Influencer ID can be Null for "Generic" coupons
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    settings = Column(JSON, nullable=True) # Stores generation params e.g. {"prefix": "SUMMER", "length": 8}
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaign = relationship("Campaign", back_populates="coupons")
    influencer = relationship("Influencer", back_populates="coupons")
