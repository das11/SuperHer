import asyncio
import sys
from sqlalchemy.future import select
from app.models.campaign import Campaign
from app.models.influencer import Influencer, CampaignInfluencer
from app.models.advertiser import Advertiser
from app.core.database import SessionLocal

async def verify():
    async with SessionLocal() as db:
        print("Creating test data...")
        # Get advertiser
        adv = await db.execute(select(Advertiser))
        advertiser = adv.scalars().first()
        if not advertiser:
            print("No advertiser found. Please create one first.")
            return

        # Create Campaign
        camp = Campaign(name="Revenue Test Campaign", advertiser_id=advertiser.id, status="active")
        db.add(camp)
        await db.commit()
        await db.refresh(camp)
        print(f"Created Campaign: {camp.id}")

        # Create Influencer
        inf = Influencer(name="RevShare Inf", email="rev@test.com", social_handle="@revshare")
        db.add(inf)
        try:
            await db.commit()
        except:
             await db.rollback()
             res = await db.execute(select(Influencer).where(Influencer.email == "rev@test.com"))
             inf = res.scalars().first()
        
        await db.refresh(inf)
        print(f"Created/Found Influencer: {inf.id}")

        # Assign with Revenue Share
        print("Assigning with 15% Revenue Share...")
        link = CampaignInfluencer(
            campaign_id=camp.id,
            influencer_id=inf.id,
            revenue_share_value=15.0,
            revenue_share_type="percentage"
        )
        db.add(link)
        await db.commit()

        # Verify Link
        res = await db.execute(
            select(CampaignInfluencer)
            .where(CampaignInfluencer.campaign_id == camp.id)
            .where(CampaignInfluencer.influencer_id == inf.id)
        )
        saved_link = res.scalars().first()
        print(f"Verified Link: Type={saved_link.revenue_share_type}, Value={saved_link.revenue_share_value}")
        
        if saved_link.revenue_share_value == 15.0 and saved_link.revenue_share_type == "percentage":
             print("SUCCESS: Revenue share data saved correctly.")
        else:
             print("FAILURE: Data mismatch.")
             
        # Cleanup
        # db.delete(saved_link)
        # db.delete(camp)
        # db.delete(inf)
        # await db.commit()

if __name__ == "__main__":
    asyncio.run(verify())
