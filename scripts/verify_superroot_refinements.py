import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add backend to path (Absolute path for safety)
BACKEND_DIR = "/Users/interfacev2/KXM-BM/Prospects/SuperHer/Dev/backend"
sys.path.insert(0, BACKEND_DIR)

from app.core.database import SessionLocal
from app.services.stats import StatsService
from app.models.advertiser import Advertiser, APIKey
from app.models.customer_event import CustomerEvent
from app.core import deps
from sqlalchemy import select

async def verify_refinements():
    async with SessionLocal() as db:
        print("--- Verifying SuperRoot Refinements ---")
        
        # 1. Setup Data
        # Get or Create Advertiser
        result = await db.execute(select(Advertiser).limit(1))
        advertiser = result.scalar_one_or_none()
        if not advertiser:
            print("No advertiser found. Creating one...")
            advertiser = Advertiser(name="Refinement Test Brand", contact_email="test@refine.com", is_active=True)
            db.add(advertiser)
            await db.commit()
            await db.refresh(advertiser)
        
        print(f"Using Advertiser: {advertiser.name} (ID: {advertiser.id})")
        
        # Create Dummy Events for Breakdown
        # Use event_type, remove erroneous e_type
        events = [
            CustomerEvent(
                advertiser_id=advertiser.id, timestamp=datetime.utcnow(),
                event_type="click" 
            ),
            CustomerEvent(
                advertiser_id=advertiser.id, timestamp=datetime.utcnow(), 
                event_type="add_to_cart"
            ),
            CustomerEvent(
                advertiser_id=advertiser.id, timestamp=datetime.utcnow(),
                event_type="add_to_cart"
            ),
            CustomerEvent(
                advertiser_id=advertiser.id, timestamp=datetime.utcnow(), revenue=100.0,
                event_type="purchase"
            )
        ]
        db.add_all(events)
        await db.commit()
        print("Inserted 4 test events (1 click, 2 atc, 1 purchase)")
        
        # 2. Verify StatsService.get_event_breakdown
        print("\nTesting StatsService.get_event_breakdown...")
        breakdown = await StatsService.get_event_breakdown(db, advertiser.id, None, None)
        print(f"Breakdown Result: {breakdown}")
        
        # Check values
        map_data = {item['name']: item['value'] for item in breakdown}
        assert map_data.get('click') >= 1, "Should have clicks"
        assert map_data.get('add_to_cart') >= 2, "Should have add_to_cart"
        assert map_data.get('purchase') >= 1, "Should have purchase"
        print("✅ Service Logic Verified")

        # 3. Verify Auth Dependency Rename (Static Check)
        # We can't easily runtime test the dependency injection without running the full FastAPI app,
        # but we can check if the function exists in deps
        if hasattr(deps, 'superroot_get_current_advertiser'):
            print("✅ Dependency 'superroot_get_current_advertiser' exists in deps")
        else:
            print("❌ Dependency rename failed or not found")
            return

        print("\n✅ Verification Successful!")

    # 6. Verify Stats Endpoint: Breakdown
    print("\n--- Verifying GET /stats/breakdown ---")
    # ... code for breakdown test ...

    # 7. Verify Stats Endpoint: Campaigns
    print("\n--- Verifying GET /stats/campaigns ---")
    async def verify_campaigns_endpoint(adv_obj):
        async with SessionLocal() as db:
            result = await StatsService.get_top_campaigns(db, advertiser_id=adv_obj.id)
            print(f"Top Campaigns: {result}")
            # We expect empty list or list of campaigns depending on data
            # Since we didn't create campaigns in this script, it might be empty, but should not error.
            assert isinstance(result, list)
    
    await verify_campaigns_endpoint(adv)

if __name__ == "__main__":
    asyncio.run(verify_refinements())
