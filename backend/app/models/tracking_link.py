from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class TrackingLink(Base):
    __tablename__ = "tracking_links"

    id = Column(Integer, primary_key=True, index=True)
    short_code = Column(String(20), unique=True, index=True, nullable=False)
    destination_url = Column(String(500), nullable=False)
    
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=True) # Nullable for generic links
    
    cpc_rate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    campaign = relationship("Campaign", back_populates="tracking_links")
    influencer = relationship("Influencer", back_populates="tracking_links")
    clicks = relationship("ClickEvent", back_populates="tracking_link", cascade="all, delete-orphan")
