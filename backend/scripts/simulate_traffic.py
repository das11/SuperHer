import asyncio
import sys
import os
import random
import time
import requests
import hashlib
from sqlalchemy import select
from datetime import datetime

# Add parent directory to path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from app.models.advertiser import Advertiser, APIKey
from app.models.campaign import Campaign
from app.models.influencer import Influencer
from app.models.coupon import Coupon
from app.models.tracking_link import TrackingLink

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

def print_header(text):
    print(f"\n{Colors.HEADER}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{'='*60}{Colors.ENDC}")

def get_input(prompt, default=None, cast_type=str):
    default_str = f" [{default}]" if default is not None else ""
    val = input(f"{Colors.CYAN}{prompt}{default_str}: {Colors.ENDC}").strip()
    if not val and default is not None:
        return default
    try:
        return cast_type(val)
    except ValueError:
        print(f"{Colors.FAIL}Invalid input. Please enter a {cast_type.__name__}.{Colors.ENDC}")
        return get_input(prompt, default, cast_type)

async def list_entities(session, model, name_field="name"):
    result = await session.execute(select(model))
    items = result.scalars().all()
    return items

async def main():
    print_header("SUPERHER TRAFFIC SIMULATOR v2.0")
    
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    selected_advertiser = None
    selected_campaign = None
    
    # Store valid assets for attribution
    valid_coupons = [] 
    valid_links = []
    
    temp_key_str = f"sk_sim_{int(time.time())}"
    key_hash = hashlib.sha256(temp_key_str.encode()).hexdigest()

    try:
        async with async_session() as session:
            # --- 1. Select Advertiser ---
            advertisers = await list_entities(session, Advertiser)
            if not advertisers:
                print(f"{Colors.FAIL}No advertisers found.{Colors.ENDC}")
                return

            print(f"\n{Colors.BOLD}Select an Advertiser:{Colors.ENDC}")
            for idx, adv in enumerate(advertisers):
                print(f"{idx + 1}. {adv.name} (ID: {adv.id})")
            
            choice = get_input("Enter number", 1, int)
            if 1 <= choice <= len(advertisers):
                selected_advertiser = advertisers[choice - 1]
            else:
                return

            print(f"{Colors.GREEN}Selected: {selected_advertiser.name}{Colors.ENDC}")

            # Inject Temp Key
            print(f"\n{Colors.BLUE}Injecting Temporary API Key...{Colors.ENDC}")
            new_key = APIKey(
                name="Simulation Temp Key",
                key_prefix=temp_key_str[:7],
                key_hash=key_hash,
                is_active=True,
                created_at=datetime.utcnow(),
                advertiser_id=selected_advertiser.id
            )
            session.add(new_key)
            await session.commit()

            # --- 2. Select Campaign ---
            result = await session.execute(select(Campaign).where(Campaign.advertiser_id == selected_advertiser.id))
            campaigns = result.scalars().all()
            
            print(f"\n{Colors.BOLD}Select a Campaign:{Colors.ENDC}")
            print("0. [Create New Campaign]")
            for idx, camp in enumerate(campaigns):
                print(f"{idx + 1}. {camp.name} (ID: {camp.id})")
            
            c_choice = get_input("Enter number", 0, int)
            
            if c_choice == 0:
                c_name = get_input("New Campaign Name", f"Sim Campaign {int(time.time())}")
                c_budget = get_input("Budget", 1000.0, float)
                new_camp = Campaign(
                    name=c_name, status="active", budget=c_budget,
                    advertiser_id=selected_advertiser.id, start_date=datetime.utcnow()
                )
                session.add(new_camp)
                await session.commit()
                await session.refresh(new_camp)
                selected_campaign = new_camp
                print(f"{Colors.GREEN}Created: {new_camp.name}{Colors.ENDC}")
            elif 1 <= c_choice <= len(campaigns):
                selected_campaign = campaigns[c_choice - 1]
                print(f"{Colors.GREEN}Selected: {selected_campaign.name}{Colors.ENDC}")
            else:
                return

            # --- 3. Fetch Valid Attribution Assets ---
            print(f"\n{Colors.BLUE}Fetching Valid Coupons & Links...{Colors.ENDC}")
            
            # Fetch Coupons
            res = await session.execute(select(Coupon).where(Coupon.campaign_id == selected_campaign.id))
            valid_coupons = res.scalars().all()
            
            # Fetch Links
            res = await session.execute(select(TrackingLink).where(TrackingLink.campaign_id == selected_campaign.id))
            valid_links = res.scalars().all()
            
            # --- 4. Fallback Creation ---
            if not valid_coupons and not valid_links:
                print(f"{Colors.WARNING}No assets found. Creating dummy assets for correct attribution...{Colors.ENDC}")
                
                # Need an influencer
                res = await session.execute(select(Influencer))
                infs = res.scalars().all()
                if not infs:
                     inf = Influencer(name="Sim Influencer", email=f"sim_{int(time.time())}@test.com", handle="@sim")
                     session.add(inf)
                     await session.commit()
                     await session.refresh(inf)
                     target_inf = inf
                else:
                    target_inf = random.choice(infs)
                
                # Create Coupon
                code = f"SIM{random.randint(100,999)}"
                new_coupon = Coupon(code=code, campaign_id=selected_campaign.id, influencer_id=target_inf.id)
                session.add(new_coupon)
                valid_coupons.append(new_coupon)
                
                # Create Link
                short_code = f"s{random.randint(100,999)}"
                new_link = TrackingLink(
                    short_code=short_code, destination_url="https://example.com", 
                    campaign_id=selected_campaign.id, influencer_id=target_inf.id
                )
                session.add(new_link)
                valid_links.append(new_link)
                
                await session.commit()
                print(f"{Colors.GREEN}Created Coupon: {code} | Link: {BASE_URL}/r/{short_code}{Colors.ENDC}")

            print(f"Loaded {len(valid_coupons)} Coupons and {len(valid_links)} Tracking Links.")

    except Exception as e:
        print(f"{Colors.FAIL}Database Error: {e}{Colors.ENDC}")
        await engine.dispose()
        return

    # --- 5. Simulation Config ---
    print_header("SIMULATION PARAMETERS")
    
    total_actions = get_input("Total Events to Simulate (Clicks + Conversions)", 50, int)
    click_share = get_input("Click Event Share %", 50, int)
    # The rest are conversions
    
    print(f"\n{Colors.BOLD}Conversion Event Distribution{Colors.ENDC}")
    dist_purchase = get_input("Purchase %", 60, int)
    dist_val_min = get_input("Min Value ($)", 10, float)
    dist_val_max = get_input("Max Value ($)", 200, float)
    
    headers = {"X-API-KEY": temp_key_str}
    
    # Stats
    from collections import defaultdict
    stats = {
        "clicks_sent": 0, "clicks_ok": 0,
        "conv_sent": 0, "conv_ok": 0,
        "revenue": 0.0,
        "errors": 0,
        # Granular Breakdown
        "clicks_by_link": defaultdict(int),
        "events_by_coupon": defaultdict(int),
        "events_by_ref": defaultdict(int),
        "events_by_action": defaultdict(int) 
    }
    
    print_header("STARTING SIMULATION")
    start_time = time.time()
    
    for i in range(total_actions):
        is_click = (random.randint(1, 100) <= click_share)
        
        # VISUAL PROGRESS
        sys.stdout.write(f"\r[{i+1}/{total_actions}] ")
        
        if is_click:
            # --- CLICK EVENT ---
            if valid_links:
                link = random.choice(valid_links)
                url = f"{BASE_URL}/r/{link.short_code}"
                sys.stdout.write(f"Clicking Link {link.short_code}...")
                try:
                    res = requests.get(url, allow_redirects=False)
                    stats["clicks_sent"] += 1
                    if res.status_code in [301, 302, 307]:
                        stats["clicks_ok"] += 1
                        stats["clicks_by_link"][link.short_code] += 1
                    else:
                        stats["errors"] += 1
                        sys.stdout.write(f" {Colors.FAIL}Failed ({res.status_code}){Colors.ENDC}")
                except:
                    stats["errors"] += 1
            else:
                sys.stdout.write(f"{Colors.WARNING}Skip Click (No Links){Colors.ENDC}")

        else:
            # --- CONVERSION EVENT ---
            action = "purchase" if random.randint(1,100) <= dist_purchase else "add_to_cart"
            
            payload = {
                "action": action,
                "value": round(random.uniform(dist_val_min, dist_val_max), 2) if action == "purchase" else 0
            }
            
            # Determine Attribution Source
            # 50% Coupon, 50% Link (if available)
            use_coupon = valid_coupons and (not valid_links or random.choice([True, False]))
            
            attribution_desc = "Organic"
            if use_coupon:
                c = random.choice(valid_coupons)
                payload["coupon_code"] = c.code
                attribution_desc = f"Coupon {c.code}"
            elif valid_links:
                # Use Ref Code
                l = random.choice(valid_links)
                payload["ref_code"] = l.short_code
                attribution_desc = f"Ref {l.short_code}"
            
            sys.stdout.write(f"Event: {action} via {attribution_desc}...")
            
            try:
                res = requests.post(f"{BASE_URL}/events/", json=payload, headers=headers)
                stats["conv_sent"] += 1
                if res.status_code in [200, 201]:
                    stats["conv_ok"] += 1
                    if action == "purchase":
                        stats["revenue"] += payload["value"]
                    
                    # Track Granular
                    stats["events_by_action"][action] += 1
                    if "coupon_code" in payload:
                        stats["events_by_coupon"][payload["coupon_code"]] += 1
                    elif "ref_code" in payload:
                        stats["events_by_ref"][payload["ref_code"]] += 1

                else:
                    stats["errors"] += 1
                    sys.stdout.write(f" {Colors.FAIL}Failed ({res.text}) {Colors.ENDC}")
            except:
                stats["errors"] += 1

        sys.stdout.flush()
        time.sleep(0.02)
    
    duration = time.time() - start_time
    print("\n")
    
    # --- 6. Summary Report ---
    print_header("SIMULATION SUMMARY")
    print(f"Time Taken: {round(duration, 2)}s")
    print("-" * 30)
    print(f"{Colors.CYAN}Total Metrics:{Colors.ENDC}")
    print(f"  Total Simulated:   {total_actions}")
    print(f"  Clicks (Redirects):{stats['clicks_ok']} / {stats['clicks_sent']}")
    print(f"  Conversions:       {stats['conv_ok']} / {stats['conv_sent']}")
    print(f"  Total Revenue:     ${round(stats['revenue'], 2)}")
    print(f"  API Errors:        {stats['errors']}")
    
    print("-" * 30)
    print(f"{Colors.CYAN}Breakdown by Action:{Colors.ENDC}")
    for act, count in stats["events_by_action"].items():
        print(f"  - {act.ljust(15)}: {count}")
        
    print("-" * 30)
    print(f"{Colors.CYAN}Attribution - Customer Events:{Colors.ENDC}")
    if stats["events_by_coupon"]:
        print("  Coupons:")
        for code, count in stats["events_by_coupon"].items():
             print(f"    {code.ljust(15)}: {count}")
    if stats["events_by_ref"]:
        print("  Ref Codes (Direct Link Attributes):")
        for code, count in stats["events_by_ref"].items():
             print(f"    {code.ljust(15)}: {count}")

    print("-" * 30)
    print(f"{Colors.CYAN}Redirects (Clicks):{Colors.ENDC}")
    if stats["clicks_by_link"]:
        for code, count in stats["clicks_by_link"].items():
            print(f"  - {code.ljust(15)}: {count}")

    print("-" * 30)
    
    if stats['errors'] == 0:
         print(f"{Colors.GREEN}PERFECT RUN. All events accepted.{Colors.ENDC}")
    else:
         print(f"{Colors.WARNING}Some events failed. Check server logs.{Colors.ENDC}")

    # Cleanup
    print(f"\n{Colors.BLUE}Cleaning up Temporary Key...{Colors.ENDC}")
    async with async_session() as session:
        from sqlalchemy import delete
        await session.execute(delete(APIKey).where(APIKey.key_hash == key_hash))
        await session.commit()
    
    await engine.dispose()
    print("Done.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nAborted.")
