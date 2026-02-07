from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class ClickEvent(Base):
    __tablename__ = "click_events"

    id = Column(Integer, primary_key=True, index=True)
    tracking_link_id = Column(Integer, ForeignKey("tracking_links.id"), nullable=False)
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    referer = Column(String(500), nullable=True)
    country_code = Column(String(10), nullable=True)

    # Relationships
    tracking_link = relationship("TrackingLink", back_populates="clicks")
