import asyncio
import os
import sys
sys.path.append(os.getcwd())

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.advertiser import Advertiser
from dotenv import load_dotenv
from app.core.config import settings

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check_adv(adv_id):
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Advertiser).where(Advertiser.id == adv_id))
        adv = res.scalars().first()
        if adv:
            print(f"Advertiser {adv_id} EXISTS.")
        else:
            print(f"Advertiser {adv_id} DOES NOT EXIST.")

if __name__ == "__main__":
    asyncio.run(check_adv(40))
