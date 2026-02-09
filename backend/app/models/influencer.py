from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Table, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class CampaignInfluencer(Base):
    __tablename__ = 'campaign_influencers'
    
    campaign_id = Column(Integer, ForeignKey('campaigns.id'), primary_key=True)
    influencer_id = Column(Integer, ForeignKey('influencers.id'), primary_key=True)
    
    revenue_share_value = Column(Float, default=0.0)
    revenue_share_type = Column(String(20), default='percentage') # 'percentage' or 'flat'

    campaign = relationship("Campaign", back_populates="influencer_links")
    influencer = relationship("Influencer", back_populates="campaign_links")

class Influencer(Base):
    __tablename__ = "influencers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    social_handle = Column(String(100), nullable=True) # e.g. @username
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    campaign_links = relationship("CampaignInfluencer", back_populates="influencer", cascade="all, delete-orphan")
    
    @property
    def campaigns(self):
        return [link.campaign for link in self.campaign_links]
    
    coupons = relationship("Coupon", back_populates="influencer")
    tracking_links = relationship("TrackingLink", back_populates="influencer")
    user = relationship("User", back_populates="influencer", uselist=False)
