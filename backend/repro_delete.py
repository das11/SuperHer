import asyncio
import os
import sys

# Ensure backend dir is in path
sys.path.append(os.getcwd())

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.advertiser import Advertiser, APIKey
from app.models.user import User
from app.models.campaign import Campaign
from app.models.customer_event import CustomerEvent
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from app.core.config import settings

# Setup DB
engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def debug_delete(advertiser_id: int):
    async with AsyncSessionLocal() as db:
        print(f"--- Attempting Debug Deletion for Advertiser ID: {advertiser_id} ---")
        
        # 1. Unlink Users
        try:
            result_users = await db.execute(select(User).where(User.advertiser_id == advertiser_id))
            users = result_users.scalars().all()
            print(f"Found {len(users)} users to unlink.")
            for u in users:
                u.advertiser_id = None
                db.add(u)
            await db.commit()
            print("Users unlinked.")
        except Exception as e:
            print(f"Error unlinking users: {e}")
            await db.rollback()

        # 2. Delete API Keys
        try:
            result_keys = await db.execute(select(APIKey).where(APIKey.advertiser_id == advertiser_id))
            keys = result_keys.scalars().all()
            print(f"Found {len(keys)} API Keys to delete.")
            for k in keys:
                await db.delete(k)
            await db.commit() # Commit intermediate steps?
            print("API Keys deleted.")
        except Exception as e:
            print(f"Error deleting keys: {e}")
            await db.rollback()

        # 3. Delete Events
        try:
            result_events = await db.execute(select(CustomerEvent).where(CustomerEvent.advertiser_id == advertiser_id))
            events = result_events.scalars().all()
            print(f"Found {len(events)} Events to delete.")
            for e in events:
                await db.delete(e)
            await db.commit()
            print("Events deleted.")
        except Exception as e:
            print(f"Error deleting events: {e}")
            await db.rollback()

        # 4. Delete Campaigns
        try:
            result_campaigns = await db.execute(select(Campaign).where(Campaign.advertiser_id == advertiser_id))
            campaigns = result_campaigns.scalars().all()
            print(f"Found {len(campaigns)} Campaigns to delete.")
            for c in campaigns:
                await db.delete(c)
            await db.commit()
            print("Campaigns deleted.")
        except Exception as e:
            print(f"Error deleting campaigns: {e}")
            await db.rollback()
            
        # 5. Delete Advertiser
        try:
            res = await db.execute(select(Advertiser).where(Advertiser.id == advertiser_id))
            adv = res.scalars().first()
            if not adv:
                print("Advertiser not found!")
                return
            await db.delete(adv)
            await db.commit()
            print("Advertiser DELETED successfully!")
        except Exception as e:
            print(f"\n!!! DELETION FAILED !!!")
            print(f"Error: {e}")
            if hasattr(e, 'orig'):
                print(f"Original Error: {e.orig}")
            await db.rollback()

if __name__ == "__main__":
    # ID from user request: 40
    asyncio.run(debug_delete(40))
