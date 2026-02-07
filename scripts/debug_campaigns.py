import asyncio
import httpx
import sys

# Config
BASE_URL = "http://localhost:8000/api/v1"

async def debug_campaigns():
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("--- Debugging Campaign List API ---")
        
        # 1. Get Advertisers
        try:
            resp = await client.get(f"{BASE_URL}/advertisers/")
            if resp.status_code != 200:
                print(f"❌ Failed to list advertisers: {resp.status_code} {resp.text}")
                return
            
            advertisers = resp.json()
            print(f"Found {len(advertisers)} advertisers.")
            
            for adv in advertisers:
                print(f"\nAdvertiser: {adv['name']} (ID: {adv['id']})")
                
                # 2. Get Campaigns for this Advertiser
                print(f"   Fetching campaigns for adv_id={adv['id']}...")
                camp_resp = await client.get(f"{BASE_URL}/campaigns/", params={"advertiser_id": adv['id']})
                
                if camp_resp.status_code == 200:
                    campaigns = camp_resp.json()
                    print(f"   ✅ Success. Found {len(campaigns)} campaigns.")
                    for c in campaigns:
                        print(f"      - {c['name']} (ID: {c['id']}, Status: {c['status']})")
                else:
                    print(f"   ❌ Failed to get campaigns: {camp_resp.status_code} {camp_resp.text}")
                    
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(debug_campaigns())
