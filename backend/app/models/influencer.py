from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

# Association Table for Many-to-Many
campaign_influencer = Table(
    'campaign_influencers',
    Base.metadata,
    Column('campaign_id', Integer, ForeignKey('campaigns.id'), primary_key=True),
    Column('influencer_id', Integer, ForeignKey('influencers.id'), primary_key=True)
)

class Influencer(Base):
    __tablename__ = "influencers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    social_handle = Column(String(100), nullable=True) # e.g. @username
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    campaigns = relationship("Campaign", secondary=campaign_influencer, back_populates="influencers")
    coupons = relationship("Coupon", back_populates="influencer")
    tracking_links = relationship("TrackingLink", back_populates="influencer")
    user = relationship("User", back_populates="influencer", uselist=False)
