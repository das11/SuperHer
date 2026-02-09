#!/usr/bin/env python
"""
Debug Payout Script

Diagnoses why "Estimated Payout" might be showing 0 for a campaign.
Run inside the backend container:
    docker compose exec backend python scripts/debug_payout.py
"""

import asyncio
import sys
import os

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload

from app.core.database import SessionLocal
from app.models.campaign import Campaign
from app.models.influencer import Influencer, CampaignInfluencer
from app.models.customer_event import CustomerEvent, EventType


async def debug_campaign(campaign_id: int):
    print(f"\n{'='*60}")
    print(f"  PAYOUT DEBUG REPORT - Campaign ID: {campaign_id}")
    print(f"{'='*60}\n")

    async with SessionLocal() as db:
        # 1. Check Campaign Exists
        result = await db.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        campaign = result.scalars().first()

        if not campaign:
            print(f"❌ ERROR: Campaign with ID {campaign_id} NOT FOUND.")
            return

        print(f"✅ Campaign Found: '{campaign.name}' (Status: {campaign.status})")
        print(f"   Advertiser ID: {campaign.advertiser_id}")
        print()

        # 2. Check Linked Influencers
        print("-" * 40)
        print("LINKED INFLUENCERS (from campaign_influencers table):")
        print("-" * 40)

        links_result = await db.execute(
            select(CampaignInfluencer)
            .options(selectinload(CampaignInfluencer.influencer))
            .where(CampaignInfluencer.campaign_id == campaign_id)
        )
        links = links_result.scalars().all()

        if not links:
            print("❌ NO INFLUENCERS LINKED to this campaign!")
            print("   This is likely the cause. Payout calculation requires")
            print("   influencers to be added to the campaign with a revenue share.")
        else:
            for link in links:
                inf = link.influencer
                print(f"  • Influencer ID: {link.influencer_id} | Name: {inf.name if inf else 'N/A'}")
                print(f"    Revenue Share: {link.revenue_share_value} ({link.revenue_share_type})")
            print(f"\n   Total Linked: {len(links)}")
        print()

        # 3. Check Customer Events
        print("-" * 40)
        print("CUSTOMER EVENTS for this campaign:")
        print("-" * 40)

        events_result = await db.execute(
            select(
                CustomerEvent.event_type,
                CustomerEvent.influencer_id,
                func.count(CustomerEvent.id).label("count"),
                func.sum(CustomerEvent.revenue).label("total_revenue")
            )
            .where(CustomerEvent.campaign_id == campaign_id)
            .group_by(CustomerEvent.event_type, CustomerEvent.influencer_id)
        )
        event_rows = events_result.all()

        if not event_rows:
            print("❌ NO EVENTS found for this campaign.")
            print("   Revenue and Payout will both be 0.")
        else:
            linked_influencer_ids = {link.influencer_id for link in links}
            total_revenue = 0.0
            total_purchase_revenue = 0.0
            calculated_payout = 0.0

            for row in event_rows:
                event_type = row.event_type
                inf_id = row.influencer_id
                count = row.count
                rev = row.total_revenue or 0.0
                total_revenue += rev

                is_purchase = (event_type == EventType.purchase.value or event_type == 'purchase')
                is_linked = inf_id in linked_influencer_ids if inf_id else False

                status_flags = []
                if is_purchase:
                    total_purchase_revenue += rev
                    status_flags.append("✓ purchase")
                else:
                    status_flags.append("✗ not purchase")

                if is_linked:
                    status_flags.append("✓ linked")
                    # Find the share rate
                    for link in links:
                        if link.influencer_id == inf_id:
                            if link.revenue_share_type == 'percentage':
                                calculated_payout += rev * (link.revenue_share_value or 0) / 100.0
                            elif link.revenue_share_type == 'flat':
                                calculated_payout += (link.revenue_share_value or 0) * count
                            break
                elif inf_id:
                    status_flags.append("✗ NOT linked")
                else:
                    status_flags.append("✗ no influencer")

                print(f"  • Type: {event_type:12} | Influencer ID: {str(inf_id):5} | Count: {count:4} | Revenue: ₹{rev:,.2f}")
                print(f"    Status: {' | '.join(status_flags)}")

            print()
            print("-" * 40)
            print("SUMMARY:")
            print("-" * 40)
            print(f"  Total Events Revenue:    ₹{total_revenue:,.2f}")
            print(f"  Purchase Events Revenue: ₹{total_purchase_revenue:,.2f}")
            print(f"  Calculated Payout:       ₹{calculated_payout:,.2f}")
            print()

            if calculated_payout == 0:
                print("⚠️  PAYOUT IS ZERO. Possible reasons:")
                if total_purchase_revenue == 0:
                    print("   1. No 'purchase' type events. Only 'purchase' events contribute to payout.")
                if not links:
                    print("   2. No influencers linked to this campaign.")
                else:
                    # Check if events have influencer_ids that are not linked
                    unlinked_events = [r for r in event_rows if r.influencer_id and r.influencer_id not in linked_influencer_ids]
                    if unlinked_events:
                        print("   3. Events have influencer_ids that are NOT linked to this campaign:")
                        for r in unlinked_events:
                            print(f"      - Influencer ID {r.influencer_id} has {r.count} events")
                    
                    no_inf_events = [r for r in event_rows if not r.influencer_id]
                    if no_inf_events:
                        print("   4. Some events have no influencer_id (unattributed).")

    print(f"\n{'='*60}")
    print("  END OF REPORT")
    print(f"{'='*60}\n")


async def main():
    print("\n--- SuperHer Payout Debug Tool ---\n")
    
    if len(sys.argv) > 1:
        try:
            campaign_id = int(sys.argv[1])
        except ValueError:
            print("Usage: python debug_payout.py <campaign_id>")
            return
    else:
        try:
            campaign_id = int(input("Enter Campaign ID to debug: "))
        except ValueError:
            print("Invalid input. Please enter a numeric Campaign ID.")
            return

    await debug_campaign(campaign_id)


if __name__ == "__main__":
    asyncio.run(main())
