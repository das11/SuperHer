from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime

from app.core.database import get_db, SessionLocal
from app.models.tracking_link import TrackingLink
from app.models.click_event import ClickEvent

router = APIRouter()

# Helper for background task to avoid slowing down redirect
async def log_click_background(link_id: int, ip: str, user_agent: str, referer: str):
    async with SessionLocal() as session:
        click = ClickEvent(
            tracking_link_id=link_id,
            ip_address=ip,
            user_agent=user_agent,
            referer=referer,
            timestamp=datetime.utcnow()
        )
        session.add(click)
        await session.commit()

@router.get("/{short_code}")
async def redirect_to_target(
    short_code: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Public redirect endpoint.
    1. Looks up link.
    2. Logs click (background).
    3. Redirects (302).
    """
    result = await db.execute(select(TrackingLink).where(TrackingLink.short_code == short_code))
    link = result.scalar_one_or_none()
    
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    # Extract metadata
    ip = request.client.host
    user_agent = request.headers.get("user-agent")
    referer = request.headers.get("referer")

    # Simple Bot Filter (Very basic)
    # If it looks like a bot, we might still redirect, but maybe skip logging?
    # For MVP, we log everything, user can filter later.
    
    # Add logging task
    background_tasks.add_task(log_click_background, link.id, ip, user_agent, referer)
    
    # ---------------------------------------------------------
    # Deterministic Tracking (Phase 4 Update)
    # Append ?ref_code={short_code} to the destination URL
    # ---------------------------------------------------------
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

    parsed_url = urlparse(link.destination_url)
    query_params = parse_qs(parsed_url.query)
    
    # Inject ref_code
    query_params['ref_code'] = [short_code]
    
    new_query_string = urlencode(query_params, doseq=True)
    new_url = urlunparse((
        parsed_url.scheme,
        parsed_url.netloc,
        parsed_url.path,
        parsed_url.params,
        new_query_string,
        parsed_url.fragment
    ))
    
    return RedirectResponse(url=new_url)
