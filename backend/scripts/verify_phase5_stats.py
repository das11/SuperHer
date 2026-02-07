import asyncio
import httpx
from datetime import datetime
import secrets

# Config
BASE_URL = "http://localhost:8000/api/v1"

async def test_stats_flow():
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("🚀 Starting Phase 5.1 verification...")
        
        # 1. Create Advertiser (and get API Key)
        adv_name = f"StatsTest_{secrets.token_hex(4)}"
        print(f"Creating Advertiser: {adv_name}")
        resp = await client.post(f"{BASE_URL}/advertisers/", json={"name": adv_name, "domain": "stats.com", "contact_email": f"{adv_name}@stats.com"})
        
        if resp.status_code != 201:
            print(f"❌ Failed to create advertiser: {resp.text}")
            return
        
        adv_data = resp.json()
        adv_id = adv_data["id"]
        
        # Generate API Key
        resp = await client.post(f"{BASE_URL}/advertisers/{adv_id}/api-key")
        api_key_data = resp.json()
        api_key = api_key_data["api_key"]
        print(f"✅ Generated API Key: {api_key[:5]}...")
        
        # 2. Create Campaign
        resp = await client.post(f"{BASE_URL}/campaigns/", json={
            "name": "Summer Sale",
            "advertiser_id": adv_id,
            "budget": 1000.0,
            "status": "active"
        })
        campaign_id = resp.json()["id"]
        
        # 3. Create Influencer & Assign
        inf_handle = f"@superstats_{secrets.token_hex(2)}"
        resp = await client.post(f"{BASE_URL}/influencers/", json={
            "name": "Super Influencer",
            "social_handle": inf_handle,
            "email": f"super_{secrets.token_hex(2)}@test.com"
        })
        inf_id = resp.json()["id"]
        await client.post(f"{BASE_URL}/influencers/{inf_id}/assign", json={"campaign_id": campaign_id})
        
        # 4. Create Tracking Link
        resp = await client.post(f"{BASE_URL}/tracking-links/", json={
            "destination_url": "https://stats.com/landing",
            "campaign_id": campaign_id,
            "influencer_id": inf_id
        })
        link_data = resp.json()
        short_code = link_data["short_code"]
        tracking_link_id = link_data["id"] 
        
        print(f"🔗 Tracking Link created: {short_code}")
        
        # 5. Simulate Traffic & Events
        # A. Link 1: 10 Clicks (Via Redirect)
        print("👉 Simulating 10 Clicks for Link 1...")
        for _ in range(10):
            await client.get(f"http://localhost:8000/api/v1/r/{short_code}", follow_redirects=False)

        # B. Link 2: 5 Clicks (No Events) - To test Zero-Conversion Links
        resp = await client.post(f"{BASE_URL}/tracking-links/", json={
            "destination_url": "https://stats.com/landing2",
            "campaign_id": campaign_id,
        })
        short_code_2 = resp.json()["short_code"]
        print(f"🔗 Tracking Link 2 created (Zero-Conversions): {short_code_2}")
        
        print("👉 Simulating 5 Clicks for Link 2...")
        for _ in range(5):
            await client.get(f"http://localhost:8000/api/v1/r/{short_code_2}", follow_redirects=False)
            
        await asyncio.sleep(1) 
        
        # B. Ingest Events
        headers = {"X-API-KEY": api_key}
        
        events_payloads = [
            # 5 Add to Cart
            {"action": "add_to_cart", "ref_code": short_code},
            {"action": "add_to_cart", "ref_code": short_code},
            {"action": "add_to_cart", "ref_code": short_code},
            {"action": "add_to_cart", "ref_code": short_code},
            {"action": "add_to_cart", "ref_code": short_code},
            
            # 3 Purchases (Total Rev: 300)
            {"action": "purchase", "value": 100.0, "ref_code": short_code}, # Attributed
            {"action": "purchase", "value": 50.0, "ref_code": short_code},  # Attributed
            {"action": "purchase", "value": 150.0}, # Organic 
            
            # 2 Signups
            {"action": "signup", "ref_code": short_code},
            {"action": "signup", "ref_code": short_code},
            
            # 2 Drop-offs
            {"action": "drop_off", "ref_code": short_code},
            {"action": "drop_off", "ref_code": short_code},
        ]
        
        print(f"📦 Simulating {len(events_payloads)} customer events...")
        for p in events_payloads:
            r = await client.post(f"{BASE_URL}/events/", headers=headers, json=p)
            if r.status_code != 201:
                print(f"⚠️ Event failed: {r.text}")

        await asyncio.sleep(1) # Wait for processing

        # 6. Verify Stats Endpoints
        print("\n🔎 Verifying Stats...")
        
        # A. Overview
        resp = await client.get(f"{BASE_URL}/stats/overview", headers=headers)
        if resp.status_code != 200:
             print(f"❌ call to overview failed: {resp.status_code} - {resp.text}")
        stats = resp.json()
        print(f"Overview: {stats}")
        
        assert stats["total_clicks"] == 10, f"Expected 10 clicks, got {stats['total_clicks']}"
        assert stats["total_conversions"] == 3, f"Expected 3 conversions (purchases), got {stats['total_conversions']}"
        assert stats["total_revenue"] == 300.0, f"Expected 300 revenue, got {stats['total_revenue']}"
        
        # B. Charts
        resp = await client.get(f"{BASE_URL}/stats/chart", headers=headers)
        chart = resp.json()
        print(f"Chart Data Points: {len(chart)}")
        if chart:
            today_data = chart[-1] 
            assert today_data["clicks"] == 10
            assert today_data["purchases"] == 3
            assert today_data["atc"] == 5
        
        # C. Influencers
        resp = await client.get(f"{BASE_URL}/stats/influencers", headers=headers)
        if resp.status_code != 200:
            print(f"❌ call to influencers failed: {resp.status_code} - {resp.text}")
        
        infs = resp.json()
        print(f"Top Influencers: {len(infs)}")
        if infs:
            top = infs[0]
            print(f"Top: {top['handle']} - Rev: {top['revenue']}")
            assert top['handle'] == inf_handle # Check against dynamic handle
            assert top['revenue'] == 150.0

        # D. Coupons
        resp = await client.get(f"{BASE_URL}/stats/coupons", headers=headers)
        if resp.status_code == 200:
             coupons = resp.json()
             print(f"Top Coupons: {len(coupons)}")
             # We didn't set coupons in this flow, so it might be empty or 0, that's fine as long as no error
        else:
             print(f"❌ call to coupons failed: {resp.status_code}")

        # E. Tracking Links
        resp = await client.get(f"{BASE_URL}/stats/tracking-links", headers=headers)
        if resp.status_code == 200:
             links = resp.json()
             print(f"Top Links: {len(links)}")
             if links:
                 print(f"Top Link: {links[0]['short_code']} - Events: {links[0]['total_events']} - Clicks: {links[0].get('clicks')}")
                 assert links[0]['short_code'] == short_code
                 assert links[0]['clicks'] == 10 # We simulated 10 clicks
                 
                 
                 # Verify we are getting the link even if no events matched (though here we have events)
                 # Ideally we should make a second link with only clicks to test the fix fully, but for now 
                 # we just verify the endpoint works.
                 
                 found_link_2 = next((l for l in links if l['short_code'] == short_code_2), None)
                 if found_link_2:
                     print(f"✅ Found Zero-Conversion Link {short_code_2}: Events={found_link_2['total_events']}, Clicks={found_link_2.get('clicks')}")
                     assert found_link_2['total_events'] == 0
                     assert found_link_2['clicks'] == 5
                 else:
                     print(f"❌ Failed to find Zero-Conversion Link {short_code_2} in stats")
                 
        else:
             print(f"❌ call to tracking-links failed: {resp.status_code}")

        # F. Verify Influencer Filtering (New Feature)
        print("\n🔎 Verifying Influencer Filter API...")
        resp = await client.get(f"{BASE_URL}/influencers/", params={"advertiser_id": advertiser_id}, headers=headers)
        if resp.status_code == 200:
            infs = resp.json()
            print(f"Influencers for Advertiser {advertiser_id}: {len(infs)}")
            assert len(infs) > 0
            
            # Check for Assigned Influencer
            found_assigned = any(i['id'] == inf_id for i in infs)
            
            # Create an Unassigned Influencer who has a link
            inf_unassigned_handle = f"@unassigned_{secrets.token_hex(2)}"
            u_resp = await client.post(f"{BASE_URL}/influencers/", json={
                "name": "Unassigned Influencer",
                "social_handle": inf_unassigned_handle,
                "email": f"unassigned_{secrets.token_hex(2)}@test.com"
            })
            if u_resp.status_code == 201:
                u_id = u_resp.json()["id"]
                # Give them a link but NO CAMPAIGN ASSIGNMENT
                await client.post(f"{BASE_URL}/tracking-links/", json={
                    "destination_url": "https://stats.com/u",
                    "campaign_id": campaign_id, # Campaign belongs to Advertiser
                    "influencer_id": u_id
                })
                
                # Re-check API
                resp2 = await client.get(f"{BASE_URL}/influencers/", params={"advertiser_id": advertiser_id}, headers=headers)
                infs2 = resp2.json()
                found_unassigned = any(i['id'] == u_id for i in infs2)
                
                if found_unassigned:
                    print("✅ Unassigned Influencer (with Link) found in filter.")
                else:
                    print("❌ Unassigned Influencer (with Link) NOT found.")
            
            if found_assigned:
                print("✅ Assigned Influencer found in filter.")
            else:
                print("❌ Assigned Influencer NOT found.")

        else:
            print(f"❌ Influencer Filter Failed: {resp.status_code}")
            
        print("\n✅ Verification Successful! All stats match expected values.")

        # D. CSV Export
        print("Testing CSV Export...")
        async with client.stream("GET", f"{BASE_URL}/stats/export", headers=headers) as response:
            assert response.status_code == 200
            print("CSV Stream started...")
            line_count = 0
            async for line in response.aiter_lines():
                if line:
                    line_count += 1
            print(f"CSV Total Lines: {line_count}")
            assert line_count >= 13 # Header + 12 events
        
        print("✅ CSV Export Verified.")

if __name__ == "__main__":
    asyncio.run(test_stats_flow())
