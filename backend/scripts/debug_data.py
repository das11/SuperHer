
import asyncio
import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.customer_event import CustomerEvent

async def check_data():
    async with SessionLocal() as db:
        # Get last 10 events with a coupon code
        stmt = select(CustomerEvent.id, CustomerEvent.coupon_code, CustomerEvent.campaign_id, CustomerEvent.influencer_id, CustomerEvent.event_type)\
            .where(CustomerEvent.coupon_code.isnot(None))\
            .order_by(CustomerEvent.id.desc())\
            .limit(10)
        
        result = await db.execute(stmt)
        rows = result.all()
        
        print("\n--- Recent Coupon Events ---")
        for row in rows:
            print(f"ID: {row.id}, Coupon: {row.coupon_code}, CampID: {row.campaign_id}, InfID: {row.influencer_id}, Type: {row.event_type}")

        # Count total events with NULL campaign_id but with coupon
        stmt_null = select(CustomerEvent.id).where(CustomerEvent.coupon_code.isnot(None)).where(CustomerEvent.campaign_id.is_(None))
        res_null = await db.execute(stmt_null)
        null_count = len(res_null.all())
        print(f"\nTotal Coupon Events with NULL Campaign ID: {null_count}")

if __name__ == "__main__":
    asyncio.run(check_data())
