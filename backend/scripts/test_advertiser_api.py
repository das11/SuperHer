import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_advertiser_flow():
    print("🚀 Starting Advertiser API Test Flow...")
    
    # 1. Create Advertiser
    print("\n1. Creating Advertiser...")
    import time
    timestamp = int(time.time())
    payload = {
        "name": f"Test Brand {timestamp}",
        "contact_email": f"contact_{timestamp}@testbrand.com",
        "is_active": True
    }
    try:
        response = requests.post(f"{BASE_URL}/advertisers/", json=payload)
        if response.status_code == 201:
            data = response.json()
            adv_id = data['id']
            print(f"✅ success: Created Advertiser ID {adv_id}")
        else:
            print(f"❌ failed: {response.text}")
            return
    except requests.exceptions.ConnectionError:
        print("❌ failed: Could not connect to server. Is it running?")
        return

    # 2. List Advertisers
    print("\n2. Listing Advertisers...")
    response = requests.get(f"{BASE_URL}/advertisers/")
    if response.status_code == 200:
        print(f"✅ success: Found {len(response.json())} advertisers")
    else:
        print(f"❌ failed: {response.text}")

    # 3. Generate API Key
    print(f"\n3. Generating API Key for Advertiser {adv_id}...")
    response = requests.post(f"{BASE_URL}/advertisers/{adv_id}/api-key")
    if response.status_code == 200:
        key_data = response.json()
        print(f"✅ success: Generated Key: {key_data['api_key'][:10]}...")
    else:
        print(f"❌ failed: {response.text}")

    # 4. Get Advertiser Details (Verify Key Linked)
    print(f"\n4. Verifying API Key Link for Advertiser {adv_id}...")
    response = requests.get(f"{BASE_URL}/advertisers/{adv_id}")
    if response.status_code == 200:
        data = response.json()
        keys = data.get('api_keys', [])
        if len(keys) > 0:
             print(f"✅ success: Advertiser has {len(keys)} api key(s) linked")
        else:
             print("❌ failed: No API keys found in response")
    else:
        print(f"❌ failed: {response.text}")

if __name__ == "__main__":
    test_advertiser_flow()
