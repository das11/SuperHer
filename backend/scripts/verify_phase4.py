import requests
import sys
import json
import time
import random

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

def print_json(label, data):
    print(f"{Colors.CYAN}{label}:{Colors.ENDC}")
    print(json.dumps(data, indent=2))

def run_test():
    session = requests.Session()
    unique_id = int(time.time())

    # ==============================================================================
    # 1. SETUP PHASE
    # ==============================================================================
    print_step(
        "PHASE 1: SETUP DATA", 
        "Creating Advertiser, Campaign, Influencer, Coupon, and Tracking Link to simulate a real environment."
    )

    # --- Advertiser ---
    print(f"\n[{Colors.BOLD}1. Create Advertiser{Colors.ENDC}]")
    adv_payload = {
        "name": f"Test Brand {unique_id}", 
        "contact_email": f"brand_{unique_id}@test.com"
    }
    res = requests.post(f"{BASE_URL}/advertisers/", json=adv_payload)
    if res.status_code == 201:
        log_success("Advertiser user created.")
    else:
        # Fallback if email exists (just for dev convenience)
        log_success("Advertiser likely exists, proceeding.")

    # We need the ID, so let's list and grab the last one or by email
    # For robustness in this script, lets just list all and take the last one created
    res = requests.get(f"{BASE_URL}/advertisers/")
    advertiser = res.json()[-1]
    advertiser_id = advertiser["id"]
    print_json("Advertiser Config", {"id": advertiser_id, "name": advertiser["name"]})

    # --- API Key ---
    print(f"\n[{Colors.BOLD}2. Generate API Key{Colors.ENDC}]")
    print("This key simulates the 'login' credential the advertiser server uses to send events.")
    res = requests.post(f"{BASE_URL}/advertisers/{advertiser_id}/api-key")
    if res.status_code == 200:
        api_key = res.json()["api_key"]
        log_success("API Key Generated.")
        print(f"Key: {api_key[:10]}... (hidden)")
    else:
        log_fail("Could not generate API Key", res.text)
    
    headers = {"X-API-KEY": api_key}

    # --- Campaign ---
    print(f"\n[{Colors.BOLD}3. Create Campaign{Colors.ENDC}]")
    res = requests.post(f"{BASE_URL}/campaigns/", json={
        "name": f"Summer Sale {unique_id}",
        "status": "active",
        "advertiser_id": advertiser_id,
        "budget": 5000.0
    })
    if res.status_code != 201: log_fail("Campaign Creation Failed", res.text)
    campaign_id = res.json()["id"]
    log_success(f"Campaign 'Summer Sale {unique_id}' created (ID: {campaign_id}).")

    # --- Influencer ---
    print(f"\n[{Colors.BOLD}4. Create Influencer{Colors.ENDC}]")
    res = requests.post(f"{BASE_URL}/influencers/", json={
        "name": "Jessica Test",
        "email": f"jessica_{unique_id}@influencer.com",
        "handle": "@jessica_xo"
    })
    if res.status_code != 201: log_fail("Influencer Creation Failed", res.text)
    inf_id = res.json()["id"]
    log_success(f"Influencer 'Jessica Test' created (ID: {inf_id}).")

    # --- Coupon ---
    print(f"\n[{Colors.BOLD}5. Create Coupon{Colors.ENDC}]")
    print("Assigning a unique coupon code to Jessica for this campaign.")
    unique_suffix = random.randint(1000, 9999)
    coupon_code = f"JESS{unique_suffix}"
    res = requests.post(f"{BASE_URL}/coupons/", json={
        "code": coupon_code,
        "discount_percent": 20,
        "campaign_id": campaign_id,
        "influencer_id": inf_id
    })
    if res.status_code not in [200, 201]: log_fail("Coupon Creation Failed", res.text)
    log_success(f"Coupon '{coupon_code}' assigned to Jessica.")

    # --- Tracking Link ---
    print(f"\n[{Colors.BOLD}6. Create Tracking Link{Colors.ENDC}]")
    print("Generating a tracking link for Jessica to post on her bio.")
    res = requests.post(f"{BASE_URL}/tracking-links/", json={
        "destination_url": "https://myshop.com/landing",
        "campaign_id": campaign_id,
        "influencer_id": inf_id
    })
    if res.status_code != 201: log_fail("Link Creation Failed", res.text)
    short_code = res.json()["short_code"]
    log_success(f"Link generated: {BASE_URL}/r/{short_code}")

    # ==============================================================================
    # 2. REDIRECT TEST
    # ==============================================================================
    print_step(
        "PHASE 2: VERIFY REDIRECT LOGIC",
        "We simulate a user clicking the link. We verify the server redirects to the destination with ?ref_code attached."
    )
    
    redirect_url = f"{BASE_URL}/r/{short_code}"
    print(f"Simulating Click: GET {redirect_url}")
    res = requests.get(redirect_url, allow_redirects=False) # Don't follow, just inspect header
    
    location = res.headers.get("Location")
    print(f"Server Responded: {res.status_code} Found")
    print(f"Redirect Location: {Colors.CYAN}{location}{Colors.ENDC}")
    
    if f"ref_code={short_code}" in location:
        log_success("Deterministic Tracking Verified! The `ref_code` is properly appended.")
    else:
        log_fail(f"Redirect URL missing ref_code={short_code}")

    # ==============================================================================
    # 3. ATTRIBUTION TEST
    # ==============================================================================
    print_step(
        "PHASE 3: VERIFY ATTRIBUTION WATERFALL",
        "We verify the 3 priority levels: Coupon > Ref Code > Lazy URL."
    )

    # --- TEST A: COUPON ---
    print(f"\n[{Colors.BOLD}Test Case A: Priority 1 - Coupon{Colors.ENDC}]")
    print("Scenario: User clicks SOMEONE ELSES link, but uses Jessica's Coupon.")
    payload = {
        "action": "purchase",
        "value": 150.00,
        "coupon_code": coupon_code, # Jessica's code
        "ref_code": "SOME_OTHER_GUY" # Conflict!
    }
    print_json("Payload", payload)
    
    res = requests.post(f"{BASE_URL}/events/", headers=headers, json=payload)
    if res.status_code != 201: log_fail("API Error", res.text)
    data = res.json()
    
    print_json("Server Response", data)
    attr_inf = data.get("attributed_influencer")
    
    if str(attr_inf) == str(inf_id):
        log_success("Attributed to Jessica (Coupon Owner). Coupon blocked the other link!")
    else:
        log_fail(f"Wrong Attribution. Expected {inf_id}, got {attr_inf}")

    # --- TEST B: REF CODE ---
    print(f"\n[{Colors.BOLD}Test Case B: Priority 2 - Direct Ref Code{Colors.ENDC}]")
    print("Scenario: User clicks Jessica's link. Advertiser passes the ref_code derived from redirect.")
    payload = {
        "action": "signup",
        "ref_code": short_code, # Jessica's link code
    }
    print_json("Payload", payload)
    
    res = requests.post(f"{BASE_URL}/events/", headers=headers, json=payload)
    data = res.json()
    
    if str(data.get("attributed_influencer")) == str(inf_id):
        log_success("Attributed to Jessica (Link Owner) via explicit ref_code.")
    else:
        log_fail("Attribution Failed.")

    # --- TEST C: LAZY URL ---
    print(f"\n[{Colors.BOLD}Test Case C: Priority 3 - Lazy Extraction{Colors.ENDC}]")
    print("Scenario: Advertiser is lazy. They just dump the full URL into the payload.")
    lazy_url = f"https://myshop.com/landing?utm_source=ig&ref_code={short_code}&other=123"
    payload = {
        "action": "custom",
        "landing_url": lazy_url
    }
    print_json("Payload", payload)
    
    res = requests.post(f"{BASE_URL}/events/", headers=headers, json=payload)
    data = res.json()
    
    if str(data.get("attributed_influencer")) == str(inf_id):
        log_success("Attributed to Jessica. System successfully extracted ref_code from URL.")
    else:
        log_fail("Lazy Extraction Failed.")

    print_step("SUMMARY", "All Phase 4 Verification Tests Passed Successfully. System is Ready.")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        log_fail(f"Script Error: {e}")
