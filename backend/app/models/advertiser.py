from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Advertiser(Base):
    __tablename__ = "advertisers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    contact_email = Column(String(100), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    currency = Column(String(3), default='USD')  # 'USD' or 'INR'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    campaigns = relationship("Campaign", back_populates="advertiser", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="advertiser", cascade="all, delete-orphan")
    events = relationship("CustomerEvent", back_populates="advertiser", cascade="all, delete-orphan")
    user = relationship("User", back_populates="advertiser", uselist=False)

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_hash = Column(String(255), index=True, nullable=False)
    name = Column(String(100), nullable=True) # Optional name for the key
    key_prefix = Column(String(10), nullable=False) # Store first few chars for identification
    advertiser_id = Column(Integer, ForeignKey("advertisers.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    advertiser = relationship("Advertiser", back_populates="api_keys")
