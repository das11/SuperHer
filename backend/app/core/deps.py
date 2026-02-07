from fastapi import Security, HTTPException, status, Depends
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
import hashlib

from app.core.database import get_db
from app.models.advertiser import Advertiser, APIKey
from app.models.user import User, UserRole
from app.core.cognito import cognito_verifier


api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)
oauth2_scheme = HTTPBearer(auto_error=False)


async def get_current_advertiser(
    api_key_str: str = Security(api_key_header),
    db: AsyncSession = Depends(get_db)
) -> Advertiser:
    """
    Validates the X-API-KEY header and returns the associated Advertiser.
    Note: For MVP, we are storing simple hashed keys. 
    In PROD, we should cache this lookup (Redis) to avoid DB hits on every event.
    """
    if not api_key_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-KEY header"
        )
    
    # Find the key
    # Important: In a real system, we'd hash the input and compare with stored hash.
    # For this MVP (based on Phase 1), let's see how we stored it.
    # checking ... app/api/v1/endpoints/advertisers.py...
    # We stored `key_hash`. 
    # BUT, if we returned the raw key to the user (sk_...), we need to hash it again here to match.
    
    import hashlib
    input_hash = hashlib.sha256(api_key_str.encode()).hexdigest()
    
    # Check Active Keys
    result = await db.execute(
        select(APIKey)
        .where(APIKey.key_hash == input_hash)
        .where(APIKey.is_active == True)
    )
    api_key_obj = result.scalar_one_or_none()
    
    if not api_key_obj:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or inactive API Key"
        )
        
    # Get Advertiser
    advertiser = await db.get(Advertiser, api_key_obj.advertiser_id)
    if not advertiser:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advertiser not found"
        )
        
    return advertiser

async def superroot_get_current_advertiser(
    api_key_str: str = Security(api_key_header),
    db: AsyncSession = Depends(get_db)
) -> Optional[Advertiser]:
    """
    Returns Advertiser if valid API key provided, else None.
    
    AUTH STRATEGY DOC:
    - **Current State (SuperRoot)**: This dependency is PERMISSIVE. It attempts to resolve a user from the API Key. 
      If no key is found, it returns `None`. The *Endpoint* then decides: "If no user is found, check if 
      `advertiser_id` specific reference was passed (Admin Mode). If neither, Error."
    
    - **Future State (Individual Access)**: 
      1. We will revert to using `get_current_advertiser` (Strict) for standard endpoints. This will *require* 
         a valid key and ignore `advertiser_id` parameters (forcing the user to only see their own data).
      2. SuperRoot features will likely move to a dedicated `/admin` router or require a specific `is_superuser` 
         scope on the token, where `advertiser_id` overriding is explicitly allowed.
    """
    if not api_key_str:
        return None
    
    import hashlib
    input_hash = hashlib.sha256(api_key_str.encode()).hexdigest()
    
    result = await db.execute(
        select(APIKey)
        .where(APIKey.key_hash == input_hash)
        .where(APIKey.is_active == True)
    )
    api_key_obj = result.scalar_one_or_none()
    
    if not api_key_obj:
        return None # Invalid Key -> Return None
        
    advertiser = await db.get(Advertiser, api_key_obj.advertiser_id)
    return advertiser


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Validates JWT from Cognito.
    If User exists in DB -> Return User.
    If User NOT in DB (First Login) -> Create User & Links -> Return User.
    """
    if not auth:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = auth.credentials

    
    # 1. Verify Token
    claims = await cognito_verifier.verify_token(token)
    
    cognito_sub = claims.get("sub")
    email = claims.get("email")
    # Custom attribute from Cognito usually comes as 'custom:role'
    # Fallback to ADVERTISER if missing (safety net)
    role_str = claims.get("custom:role", "ADVERTISER")
    name = claims.get("name", email.split("@")[0] if email else "New User")

    if not cognito_sub or not email:
         raise HTTPException(status_code=401, detail="Invalid token claims")

    # 2. Find User
    result = await db.execute(select(User).where(User.cognito_sub == cognito_sub))
    user = result.scalar_one_or_none()

    # 3. Auto-Create if missing
    if not user:
        # Determine Role Enum
        try:
             # Normalize casing just in case
            role_enum = UserRole(role_str.upper())
        except ValueError:
            # Default fallback or error
            role_enum = UserRole.ADVERTISER
        
        # Create User
        # Advertiser users start as Inactive (Pending Approval)
        # We can make SUPERROOT active by default if we want, but safer to keeping all pending?
        # Let's say: If it's the FIRST user ever, make SuperRoot? No, too Magic.
        # Stick to plan: "Status: Active=False"
        
        user = User(
            cognito_sub=cognito_sub,
            email=email,
            name=name,
            role=role_enum,
            is_active=False
        )
        db.add(user)
        await db.flush() # Get ID
        
        # If Advertiser, create linked record
        if role_enum == UserRole.ADVERTISER:
            # Check if advertiser with this email already exists?
            # To avoid duplicates if they signed up differently.
            # But 'contact_email' is unique in Advertiser table.
            
            existing_adv_result = await db.execute(select(Advertiser).where(Advertiser.contact_email == email))
            existing_adv = existing_adv_result.scalar_one_or_none()
            
            if existing_adv:
                # Link to existing
                user.advertiser_id = existing_adv.id
                # Update existing adv to pending? Or if they were already active (legacy), keep them active?
                # Let's assume new flow. If existing, respect its status.
            else:
                new_adv = Advertiser(
                    name=name,
                    contact_email=email,
                    is_active=False # Pending
                )
                db.add(new_adv)
                await db.flush()
                user.advertiser_id = new_adv.id
        
        await db.commit()
        await db.refresh(user)

    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Account pending approval")
    return current_user

async def get_current_advertiser_user(
    current_user: User = Depends(get_current_active_user),
) -> Advertiser:
    if current_user.role != UserRole.ADVERTISER:
         raise HTTPException(status_code=403, detail="Not authorized")
    if not current_user.advertiser:
         raise HTTPException(status_code=404, detail="Advertiser profile missing")
    return current_user.advertiser
