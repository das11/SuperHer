import requests
import sys
import time
from datetime import date, timedelta

BASE_URL = "http://localhost:8000/api/v1"

def test_influencer_flow():
    print("🚀 Starting Influencer API Test Flow...")
    timestamp = int(time.time())

    # 1. Setup: Create Advertiser & Campaign
    print("\n1. Setup: Creating Advertiser & Campaign...")
    adv_payload = {"name": f"Inf Test Brand {timestamp}", "contact_email": f"inf_{timestamp}@test.com", "is_active": True}
    adv_resp = requests.post(f"{BASE_URL}/advertisers/", json=adv_payload)
    if adv_resp.status_code != 201:
        print(f"❌ failed setup (advertiser): {adv_resp.text}")
        return
    adv_id = adv_resp.json()['id']

    camp_payload = {
        "name": "Influencer Blitz", "status": "active", 
        "start_date": str(date.today()), "advertiser_id": adv_id
    }
    camp_resp = requests.post(f"{BASE_URL}/campaigns/", json=camp_payload)
    if camp_resp.status_code != 201:
        print(f"❌ failed setup (campaign): {camp_resp.text}")
        return
    camp_id = camp_resp.json()['id']
    print(f"✅ success: Setup complete. Camp ID: {camp_id}")

    # 2. Create Influencer
    print("\n2. Creating Influencer...")
    inf_payload = {
        "name": "Super Star",
        "email": f"star_{timestamp}@social.com",
        "social_handle": "@superstar"
    }
    resp = requests.post(f"{BASE_URL}/influencers/", json=inf_payload)
    if resp.status_code == 201:
        inf_data = resp.json()
        inf_id = inf_data['id']
        print(f"✅ success: Created Influencer ID {inf_id}")
    else:
        print(f"❌ failed: {resp.text}")
        return

    # 3. Assign to Campaign
    print(f"\n3. Assigning Influencer {inf_id} to Campaign {camp_id}...")
    assign_payload = {"campaign_id": camp_id}
    resp = requests.post(f"{BASE_URL}/influencers/{inf_id}/campaigns", json=assign_payload)
    if resp.status_code == 200:
        data = resp.json()
        linked_camps = data.get('campaigns', [])
        if any(c['id'] == camp_id for c in linked_camps):
            print(f"✅ success: Assignment verified in response")
        else:
            print(f"❌ failed: Campaign not found in response list: {linked_camps}")
    else:
        print(f"❌ failed: {resp.text}")

    # 4. Verify Get
    print(f"\n4. Verifying Get Influencer...")
    resp = requests.get(f"{BASE_URL}/influencers/{inf_id}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"✅ success: Retrieved influencer, campaigns count: {len(data['campaigns'])}")
    else:
        print(f"❌ failed: {resp.text}")

if __name__ == "__main__":
    test_influencer_flow()
