from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class UserRole(str, enum.Enum):
    SUPERROOT = "SUPERROOT"
    ADVERTISER = "ADVERTISER"
    INFLUENCER = "INFLUENCER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    cognito_sub = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=False)
    
    # Foreign Keys to other entities
    # Note: These are nullable because a User might be one OR the other (or future roles)
    # Ideally, we enforce consistency in application logic.
    advertiser_id = Column(Integer, ForeignKey("advertisers.id"), nullable=True)
    admin_id = Column(Integer, ForeignKey("admins.id"), nullable=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id"), nullable=True)

    # Relationships
    advertiser = relationship("Advertiser", back_populates="user")
    admin = relationship("Admin", back_populates="user")
    influencer = relationship("Influencer", back_populates="user")
