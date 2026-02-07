from fastapi import APIRouter
from app.api.v1.endpoints import advertisers, campaigns, influencers, coupons, tracking_links, redirect, events, stats, auth

api_router = APIRouter()

api_router.include_router(advertisers.router, prefix="/advertisers", tags=["advertisers"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(influencers.router, prefix="/influencers", tags=["influencers"])
api_router.include_router(coupons.router, prefix="/coupons", tags=["coupons"])
api_router.include_router(tracking_links.router, prefix="/tracking-links", tags=["tracking-links"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(redirect.router, prefix="/r", tags=["redirect"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

@api_router.get("/status")
def status():
    return {"status": "ok"}
