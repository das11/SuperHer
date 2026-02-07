import requests
import sys
import time
from datetime import date, timedelta

BASE_URL = "http://localhost:8000/api/v1"

def test_campaign_flow():
    print("🚀 Starting Campaign API Test Flow...")
    
    # 1. Create Advertiser (Prerequisite)
    timestamp = int(time.time())
    adv_payload = {
        "name": f"Campaign Test Brand {timestamp}",
        "contact_email": f"campaign_{timestamp}@test.com",
        "is_active": True
    }
    print("\n1. Creating Advertiser...")
    resp = requests.post(f"{BASE_URL}/advertisers/", json=adv_payload)
    if resp.status_code != 201:
        print(f"❌ failed to create advertiser: {resp.text}")
        return
    adv_id = resp.json()['id']
    print(f"✅ success: Created Advertiser ID {adv_id}")

    # 2. Create Campaign
    print("\n2. Creating Campaign...")
    today = date.today()
    campaign_payload = {
        "name": "Summer Sale 2025",
        "status": "draft",
        "start_date": str(today),
        "end_date": str(today + timedelta(days=30)),
        "budget": 5000.0,
        "advertiser_id": adv_id
    }
    resp = requests.post(f"{BASE_URL}/campaigns/", json=campaign_payload)
    if resp.status_code == 201:
        camp_data = resp.json()
        print(f"✅ success: Created Campaign ID {camp_data['id']}")
    else:
        print(f"❌ failed: {resp.text}")
        return

    # 3. List Campaigns
    print("\n3. Listing Campaigns...")
    resp = requests.get(f"{BASE_URL}/campaigns/?advertiser_id={adv_id}")
    if resp.status_code == 200:
        campaigns = resp.json()
        print(f"✅ success: Found {len(campaigns)} campaigns for this advertiser")
    else:
        print(f"❌ failed: {resp.text}")

if __name__ == "__main__":
    test_campaign_flow()
