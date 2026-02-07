import secrets
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import attributes, selectinload

from app.core.database import get_db
from app.models.advertiser import Advertiser, APIKey
from app.models.user import User, UserRole
from app.models.campaign import Campaign
from app.models.customer_event import CustomerEvent
from app.core.deps import get_current_active_user
from app.schemas.advertiser import AdvertiserCreate, AdvertiserResponse, AdvertiserUpdate, APIKeyResponse, APIKeyCreate

router = APIRouter()

# --- Advertiser CRUD ---

@router.post("/", response_model=AdvertiserResponse, status_code=status.HTTP_201_CREATED)
async def create_advertiser(
    advertiser: AdvertiserCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create a new advertiser. Restricted."""
    # Only SuperRoot can manually create advertisers this way?
    # Or maybe it's allowed for anyone (e.g. an Admin creating an account)?
    # For now, let's restrict to SuperRoot to prevent spam, 
    # since normal signup is handled via Cognito+Deps.
    if current_user.role != UserRole.SUPERROOT:
        raise HTTPException(status_code=403, detail="Not authorized to create advertisers manually")
    new_advertiser = Advertiser(
        name=advertiser.name,
        contact_email=advertiser.contact_email,
        is_active=advertiser.is_active
    )
    db.add(new_advertiser)
    try:
        await db.commit()
        await db.refresh(new_advertiser)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Advertiser with this email already exists."
        )
    
    # Manually set the relationship to empty list, bypassing the lazy-load trigger
    attributes.set_committed_value(new_advertiser, "api_keys", [])
    
    return new_advertiser

@router.get("/", response_model=List[AdvertiserResponse])
async def list_advertisers(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """List all advertisers. Scoped."""
    query = select(Advertiser).options(selectinload(Advertiser.api_keys))

    if current_user.role == UserRole.ADVERTISER:
        # Only show self
        query = query.where(Advertiser.id == current_user.advertiser_id)

    result = await db.execute(query.offset(skip).limit(limit))
    advertisers = result.scalars().all()
    return advertisers

@router.get("/{advertiser_id}", response_model=AdvertiserResponse)
async def get_advertiser(
    advertiser_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get a specific advertiser."""
    if current_user.role == UserRole.ADVERTISER:
        if advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(Advertiser)
        .options(selectinload(Advertiser.api_keys))
        .where(Advertiser.id == advertiser_id)
    )
    advertiser = result.scalars().first()
    if not advertiser:
        raise HTTPException(status_code=404, detail="Advertiser not found")
    
    return advertiser

# --- API Key Management ---

@router.post("/{advertiser_id}/api-key", response_model=dict)
async def generate_api_key(
    advertiser_id: int, 
    key_data: APIKeyCreate = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Generate a new API key for the advertiser."""
    if current_user.role == UserRole.ADVERTISER:
        if advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=403, detail="Not authorized")
    # Check if advertiser exists
    advertiser_result = await db.execute(select(Advertiser).where(Advertiser.id == advertiser_id))
    advertiser = advertiser_result.scalars().first()
    if not advertiser:
        raise HTTPException(status_code=404, detail="Advertiser not found")

    # Generate Secure Key
    raw_key = secrets.token_urlsafe(32)
    key_prefix = raw_key[:8]
    # In a real app, hash this! We store it raw for MVP simplicity/demo unless requested.
    # Implementation plan said "hashed", let's be good citizens.
    import hashlib
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    new_key = APIKey(
        key_hash=key_hash,
        key_prefix=key_prefix,
        advertiser_id=advertiser_id,
        name=key_data.name if key_data else None
    )
    db.add(new_key)
    await db.commit()

    return {
        "api_key": raw_key,
        "name": new_key.name,
        "message": "Save this key now. You won't see it again."
    }

@router.delete("/{advertiser_id}/api-key/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    advertiser_id: int,
    key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an API key."""
    if current_user.role == UserRole.ADVERTISER:
        if advertiser_id != current_user.advertiser_id:
             raise HTTPException(status_code=403, detail="Not authorized")
    # Check if key exists and belongs to advertiser
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.advertiser_id == advertiser_id
        )
    )
    api_key = result.scalars().first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")

    await db.delete(api_key)
    await db.commit()
    
    return None

@router.delete("/{advertiser_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_advertiser(
    advertiser_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an advertiser and all associated data (Campaigns, Events, Keys).
    Restricted to SUPERROOT.
    """
    if current_user.role != UserRole.SUPERROOT:
        raise HTTPException(status_code=403, detail="Not authorized to delete advertisers")

    # Fetch advertiser
    result = await db.execute(select(Advertiser).where(Advertiser.id == advertiser_id))
    advertiser = result.scalars().first()
    
    if not advertiser:
        raise HTTPException(status_code=404, detail="Advertiser not found")

    # 1. Unlink Users 
    result_users = await db.execute(select(User).where(User.advertiser_id == advertiser_id))
    users = result_users.scalars().all()
    for u in users:
        u.advertiser_id = None
        db.add(u)
    await db.commit() # Commit user changes immediately
    
    # 2. Delete Dependent API Keys
    result_keys = await db.execute(select(APIKey).where(APIKey.advertiser_id == advertiser_id))
    keys = result_keys.scalars().all()
    for k in keys:
        await db.delete(k)
    await db.commit()

    # 3. Delete Dependent Events
    result_events = await db.execute(select(CustomerEvent).where(CustomerEvent.advertiser_id == advertiser_id))
    events = result_events.scalars().all()
    for e in events:
        await db.delete(e)
    await db.commit()

    # 4. Delete Dependent Campaigns
    # (Campaigns should cascade delete their coupons/links/influencer-assoc, but let's load them to be sure)
    result_campaigns = await db.execute(select(Campaign).where(Campaign.advertiser_id == advertiser_id))
    campaigns = result_campaigns.scalars().all()
    for c in campaigns:
        await db.delete(c)
    await db.commit()

    # 5. Finally Delete Advertiser
    try:
        await db.delete(advertiser)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        print(f"Delete Advertiser Integrity Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Cannot delete advertiser. Check for remaining dependencies (e.g. Users, Events) manually."
        )
    except Exception as e:
        await db.rollback()
        print(f"Delete Advertiser Unexpected Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    return None
