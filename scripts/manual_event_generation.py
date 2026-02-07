import requests
import sys
import json
import time
import random
import secrets

BASE_URL = "http://localhost:8000/api/v1"

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_step(title, desc):
    print(f"\n{Colors.HEADER}=============================================================={Colors.ENDC}")
    print(f"{Colors.BOLD}{title}{Colors.ENDC}")
    print(f"{Colors.BLUE}{desc}{Colors.ENDC}")
    print(f"{Colors.HEADER}=============================================================={Colors.ENDC}")

def log_success(msg):
    print(f"{Colors.GREEN}✅ SUCCESS: {msg}{Colors.ENDC}")

def log_fail(msg, detail=None):
    print(f"{Colors.FAIL}❌ FAILED: {msg}{Colors.ENDC}")
    if detail:
        print(f"{Colors.WARNING}Detail: {detail}{Colors.ENDC}")
    sys.exit(1)

def run_generation():
    session = requests.Session()
    unique_suffix = secrets.token_hex(2)

    print_step("MANUAL CAMPAIGN DATA GENERATOR", "This script creates specific data for testing the Dashboard Campaign view.")

    # 1. Select/Create Advertiser
    print(f"\n[{Colors.BOLD}1. Advertiser Setup{Colors.ENDC}]")
    adv_name = f"ManualTest_{unique_suffix}"
    
    # Check if we should use an existing one (hardcoded for now to help user debug their specific view if needed, but safe to create new)
    # Let's create a NEW one to guarantee clean state, or user can modify this script to use existing ID.
    print(f"Creating NEW Advertiser: {adv_name}")
    
    res = requests.post(f"{BASE_URL}/advertisers/", json={
        "name": adv_name,
        "contact_email": f"manual_{unique_suffix}@test.com"
    })
    
    if res.status_code == 201:
        adv_data = res.json()
        advertiser_id = adv_data['id']
        log_success(f"Advertiser created with ID: {advertiser_id}")
    else:
        log_fail("Could not create advertiser", res.text)

    # 2. Get API Key
    res = requests.post(f"{BASE_URL}/advertisers/{advertiser_id}/api-key")
    if res.status_code == 200:
        api_key = res.json()["api_key"]
        headers = {"X-API-KEY": api_key}
        log_success("API Key Generated")
        print(f"🔑 Key: {Colors.BOLD}{api_key}{Colors.ENDC} (Copy this for Postman)")
    else:
        log_fail("Could not generate API Key")

    # 3. Create Campaigns (One High Value, One Low Value)
    print(f"\n[{Colors.BOLD}2. Creating Campaigns{Colors.ENDC}]")
    
    # Camp A: High Performer
    res = requests.post(f"{BASE_URL}/campaigns/", json={
        "name": "Winter Mega Scale",
        "status": "active",
        "advertiser_id": advertiser_id,
        "budget": 50000.0,
        "start_date": "2025-01-01",
        "end_date": "2025-03-01"
    })
    camp_a_id = res.json()['id']
    log_success(f"Campaign A 'Winter Mega Scale' created (ID: {camp_a_id})")

    # Camp B: Low Performer
    res = requests.post(f"{BASE_URL}/campaigns/", json={
        "name": "Small Retargeting",
        "status": "active",
        "advertiser_id": advertiser_id,
        "budget": 1000.0
    })
    camp_b_id = res.json()['id']
    log_success(f"Campaign B 'Small Retargeting' created (ID: {camp_b_id})")

    # 4. Create Influencer & Link
    print(f"\n[{Colors.BOLD}3. Setup Influencer & Links{Colors.ENDC}]")
    res = requests.post(f"{BASE_URL}/influencers/", json={
        "name": "Test Influencer",
        "handle": f"@tester_{unique_suffix}",
        "email": f"tester_{unique_suffix}@social.com"
    })
    inf_id = res.json()['id']

    # Link for Campaign A
    res = requests.post(f"{BASE_URL}/tracking-links/", json={
        "destination_url": "https://store.com/winter",
        "campaign_id": camp_a_id,
        "influencer_id": inf_id
    })
    link_a_code = res.json()['short_code']
    
    # Link for Campaign B
    res = requests.post(f"{BASE_URL}/tracking-links/", json={
        "destination_url": "https://store.com/promo",
        "campaign_id": camp_b_id,
        "influencer_id": inf_id
    })
    link_b_code = res.json()['short_code']
    
    log_success(f"Tracking Links Created: {link_a_code} (Camp A), {link_b_code} (Camp B)")

    # 5. Simulate Events via API (Manual Calls)
    print(f"\n[{Colors.BOLD}4. Simulating Traffic (Manual API Calls){Colors.ENDC}]")
    
    # Campaign A Traffic (High Volume)
    print("Sending events for Campaign A...")
    for _ in range(5):
        requests.post(f"{BASE_URL}/events/", headers=headers, json={"action": "click", "ref_code": link_a_code})
        requests.post(f"{BASE_URL}/events/", headers=headers, json={"action": "add_to_cart", "ref_code": link_a_code})
    
    # Purchases for A
    requests.post(f"{BASE_URL}/events/", headers=headers, json={"action": "purchase", "value": 150.0, "ref_code": link_a_code})
    requests.post(f"{BASE_URL}/events/", headers=headers, json={"action": "purchase", "value": 200.0, "ref_code": link_a_code})
    
    # Campaign B Traffic (Low Volume)
    print("Sending events for Campaign B...")
    requests.post(f"{BASE_URL}/events/", headers=headers, json={"action": "click", "ref_code": link_b_code})
    requests.post(f"{BASE_URL}/events/", headers=headers, json={"action": "purchase", "value": 45.0, "ref_code": link_b_code})

    print(f"\n{Colors.GREEN}DONE! Data Generated.{Colors.ENDC}")
    print(f"Go to Dashboard and select Advertiser: {Colors.BOLD}{adv_name}{Colors.ENDC}")
    print(f"You should see 2 Campaigns in the dropdown and table.")

if __name__ == "__main__":
    try:
        run_generation()
    except Exception as e:
        log_fail(f"Script Error: {e}")
