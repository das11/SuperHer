from fastapi import APIRouter, Depends, HTTPException
from typing import Any

from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current user.
    Uses the get_current_user dependency which auto-syncs Cognito users to DB.
    """
    return current_user

@router.post("/sync", response_model=UserResponse)
async def sync_user(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Explicitly sync user from Cognito token to DB.
    (This logic is already in get_current_user, so calling this just triggers it and returns user).
    """
    return current_user
