import asyncio
from sqlalchemy import select
from app.core.database import engine
from app.models.advertiser import Advertiser
from app.models.user import User

async def debug_advertiser():
    async with engine.connect() as conn:
        # Check Advertiser 37
        print("Checking Advertiser 37...")
        # Note: Raw SQL to bypass any ORM/model issues first
        result = await conn.execute(select(Advertiser).where(Advertiser.id == 37))
        adv = result.fetchone()
        if adv:
            print(f"Found Advertiser: ID={adv.id}, Name={adv.name}, Active={adv.is_active}")
        else:
            print("❌ Advertiser 37 NOT FOUND in 'advertisers' table.")

if __name__ == "__main__":
    asyncio.run(debug_advertiser())
