
# Solution Draft
## 1. Objective
Build a Minimum Viable Product (MVP) platform that enables advertisers to run influencer/affiliate campaigns with the ability to:

- Generate coupon codes  
- Create tracking links  
- Track the full user journey (landing → ATC → purchase → drop-offs)  
- Attribute performance at influencer and campaign levels  
- View reporting dashboards for advertisers, influencers, and admin users  

The platform must be lightweight, API-first, and extendable for future enhancements, while strictly adhering to the MVP boundaries defined in the Final Terms & Roadmap Document.

---

## 2. Key Features (MVP Scope – Explicit & Final)

### A. Influencer & Campaign Management
- Ability to create and manage:
  - Advertisers  
  - Campaigns  
  - Influencers  
- Assign influencers to campaigns  
- Basic campaign metadata support (name, live dates, attribution source)

> **Note:** Budgeting, payout, ROI modeling, and multi-touch attribution are *not* part of the MVP.

---

### B. Coupon Code Generator
- Generate unique coupons using:
  - Prefix  
  - Length  
  - Basic character rules  
- One-click coupon generation per influencer or per campaign  
  - If `influencer_id` is NULL: The coupon is "Generic". It can be used by any influencer (or none), but **attribution will rely on Tracking Links (Clicks)**, not the coupon code itself. Detailed attribution logic will be handled in Phase 4.

## Proposed Changes (Updated Phase 4 Strategy)
We will implement a **Waterfall Attribution** model in the ingestion API:
1.  **Coupon Match**: If `coupon_code` is provided in the purchase event, look it up. If it belongs to a specific Influencer, they get the credit (100% confidence).
2.  **Click Match**: If no code (or generic code), use the `click_id` or session tracking to find the referrer.
- Coupon uniqueness enforcement
- Coupon ↔ Influencer ↔ Campaign mapping
- Regenerate / invalidate coupons
- DB: coupons

---

### C. Tracking Link Engine
- Auto-generated tracking links for influencers/campaigns  
- Redirect service with logging of:
  - Timestamp  
  - Device/User-Agent  
  - Referrer  
  - Geo/IP  
- All clicks correctly mapped to influencer + campaign  
- Fault-tolerant click-logging pipeline

> **Note:** No shortened vanity URLs, custom domain routing, or pixel-based tracking in MVP.

---

### D. Advertiser Backend Integration API (Internal Unified API)
APIs for advertisers to push customer events after the user lands on their site.

#### Required Endpoints:
- `POST /event/add_to_cart`
- `POST /event/purchase`
- `POST /event/drop_off`
- `POST /event/signup`
- **Payload Update**:
  - All events (especially `purchase`) will accept an optional `coupon_code` field.

#### Integration Requirements:
- API key-based authentication (per-advertiser)  
- Optional HMAC signature verification  
- Event-to-influencer/campaign attribution logic  
- Validation & deduplication of events  

> **Note:**  
> The MVP **does not** include **any custom integration** with:  
> Shopify, WooCommerce, Magento, custom CMS, Meta Commerce API, TikTok Shop, or any proprietary e-commerce platforms.  
> Only **generic backend API integration** is included.

---

### E. Event Logging & Attribution Engine
- Store all journey events with timestamps  
- Link events → click → coupon → influencer → campaign  
- Basic funnel metrics:
  - Landing  
  - ATC  
  - Purchase  
  - Drop-off  
- First-touch attribution only  
- No multi-touch, cohort, or advanced modelling

---

### F. Reporting & Dashboards

#### Advertiser Dashboard:
- Clicks  
- Add-to-cart events  
- Purchases  
- Drop-offs  
- Influencer performance summary  
- CSV export  

#### Influencer Dashboard:
- Clicks  
- Conversion funnel overview  
- Campaign performance  

#### Admin Dashboard (MVP-limited):
- Manage advertisers, campaigns, influencers  
- View logs and events  
- Manage API keys  
- Basic operational view

> **Note:**  
> IG/Facebook traffic dashboards, ad-spend dashboards, and paid-media visualisation are *not included*.

---

### G. System Admin Tools
- Admin authentication  
- CRUD tools for advertisers/campaigns/influencers  
- View event logs  
- Regenerate coupons or tracking links  
- Basic diagnostics only  
- No advanced role-based access, audit history, or automation scripts in MVP

---

## 3. Technical Requirements

### A. Backend
- Python (FastAPI)  
- RESTful API design  
- JWT/session authentication  
- Event ingestion with retry and validation  
- Logging & monitoring hooks  

### B. Database (MySQL - AWS RDS Aurora MySQL)
Tables include:
- Advertisers  
- Campaigns  
- Influencers  
- Coupons  
- Tracking Links  
- Click Events  
- Customer Events  
- API Keys  
- Admin Users  

> **Note:** No OLAP warehouse, no big-data pipelines in MVP.

### C. Infrastructure (Can be defined later before cloud deployment)
- AWS EC2 for backend  
- AWS RDS (MySQL)  
- S3-compatible storage  
- CloudWatch for logs/metrics  
- SSL-enabled endpoints  
- CI/CD for deployment (basic)  

---

## 4. Non-Functional Requirements

### Performance
- Supports 50k–100k monthly events  
- Handles burst loads of ~300–500 requests/min for redirect API

### Security
- API key authentication for advertisers  
- Optional HMAC verification  
- Strict HTTPS enforcement  
- Input validation  
- Rate limiting on sensitive routes  

### Reliability
- Retry logic for event ingestion  
- Graceful fallback for click events  
- Detailed logging for diagnostic purposes  

### Scalability
- Codebase and architecture ready for:
  - Multi-touch attribution  
  - Pixel tracking additions  
  - Advanced analytics dashboards  
- MVP will not include these features  

---

## 5. MVP Assumptions & Explicit Exclusions

### Functional Assumptions:
- Advertisers will implement or add the API calls from their own backend systems  
- Zero frontend pixel integrations in MVP  
- No custom connectors for third-party commerce systems  
- No payout automation  
- No CRM or email system integration  
- UI will be functional, not design-heavy (no custom design system)

### Exclusions (Strict):
- Custom e-commerce integrations (Shopify, WooCommerce, Magento, Custom CMS, Meta Commerce, etc.)  
- Pixel tracking (Meta/TikTok/Google)  
- Multi-touch attribution  
- Real-time data streaming  
- Mobile apps  
- Payout & financial tracking modules  
- Advanced analytics dashboards  
- Paid media dashboards (IG, FB, TikTok, Google)  
- Any feature not explicitly listed in the MVP scope  


---

# Implementation Plan

# MVP Implementation Plan (Backend-First, Modular)

## Guiding Principles
- Backend core services first, always API-complete before UI
- Each module follows:
  1. Backend service + DB schema
  2. Local API testing (Postman / Swagger)
  3. Frontend screen(s) for that module
  4. End-to-end integration test
- No cross-module dependencies unless explicitly stated
- Strict adherence to MVP scope and exclusions

---

## PHASE 0 — Foundation & Skeleton (One-time setup)

### Module 0.1 — Core Backend Skeleton
**Purpose:** Establish a stable base that all modules build upon.

**Backend**
- FastAPI project structure
- Environment config (dev/staging)
- DB connection (Aurora MySQL)
- Base models & migrations
- Common response format
- Error handling & logging
- JWT/session auth scaffold
- Admin auth scaffold (no UI yet)

**Output**
- Running FastAPI service
- Swagger docs accessible
- Empty but valid DB schema

_No frontend in this phase_

---

## PHASE 1 — Core Entity Management (System Backbone)

### Module 1.1 — Advertiser Management
**Backend**
- Advertiser CRUD APIs
- API key generation & rotation
- Advertiser status (active/inactive)
- DB: advertisers, api_keys

**Frontend**
- Admin screen:
  - Create / edit advertiser
  - View API key

---

### Module 1.2 — Campaign Management
**Backend**
- Campaign CRUD APIs
- Campaign metadata (dates, attribution source)
- Advertiser ↔ Campaign mapping
- DB: campaigns

**Frontend**
- Admin screen:
  - Create campaign under advertiser
  - List campaigns per advertiser

---

### Module 1.3 — Influencer Management
**Backend**
- Influencer CRUD APIs
- Influencer ↔ Campaign assignment
- DB: influencers, join tables

**Frontend**
- Admin screen:
  - Create influencer
  - Assign to campaign(s)

**Checkpoint**
- Advertisers, campaigns, influencers fully defined and linked

---

## PHASE 2 — Coupon System

### Module 2.1 — Coupon Code Generator
**Backend**
- Coupon generation logic:
  - Prefix
  - Length
  - Character rules
- Coupon uniqueness enforcement
- Coupon ↔ Influencer ↔ Campaign mapping
- Regenerate / invalidate coupons
- DB: coupons

**Frontend**
- Admin screen:
  - Generate coupons per campaign / influencer
  - View coupon mappings
- Influencer screen:
  - View assigned coupon(s)

---

## PHASE 3 — Tracking Link Engine (Click Layer)

### Module 3.1 — Tracking Link Generation
**Backend**
- Generate tracking URLs per influencer/campaign
- Persist link metadata
- DB: tracking_links

**Frontend**
- Admin screen:
  - Create / View / copy tracking links
- Influencer screen:
  - View assigned tracking links

---

### Module 3.2 — Redirect & Click Logging Service
**Backend**
- Public redirect endpoint
- Log:
  - Timestamp
  - User-Agent
  - Referrer
  - IP / Geo
- Fault-tolerant logging
- DB: click_events

**Frontend**
- No UI initially

**Checkpoint**
- Clicks reliably captured
- Each click resolves to influencer + campaign

---

## PHASE 4 — Advertiser Event Ingestion (Deterministic & Hybrid)

### Module 4.1 — Deterministic Redirect System
**Backend**
- **Redirect Logic Update**:
  - The `GET /r/{code}` endpoint must now append a unique reference token (`?ref_code={code}`) to the Advertiser's destination URL.
  - This shifts the state to the client/advertiser side, enabling 100% deterministic attribution loop.
- **Goal**: Ensure the Advertiser has a token they can pass back to us upon conversion.

---

### Module 4.2 — Unified Advertiser Event API (Single Endpoint)
**Backend**
- **Endpoint**: `POST /api/v1/events`
- **Design Philosophy**: Single ingress for all event types to simplify Advertiser integration.
- **Payload Structure**:
  - `action`: **(Required)** String. Enum: `purchase`, `add_to_cart`, `signup`, `custom`.
  - `value`: (Optional) Float. Revenue amount (relevant for `purchase`).
  - `currency`: (Optional) String. Default `USD`.
  - `properties`: (Optional) JSON Object. Context specific to the action (e.g., SKU, items).
  - **Attribution Keys** (One or more required for matching):
      - `coupon_code` (Standard)
      - `ref_code` (Pro/Deterministic)
      - `landing_url` / `referrer` (Lazy)

- **Security Requirements**: 
  - API Key Authentication (`X-API-KEY`) per advertiser.
  - Optional HMAC verification.

- **DB**: `customer_events`


**Frontend**
- No UI (API-first)

---

### Module 4.3 — Attribution Engine (Waterfall Service)
**Backend**
- **Logic**:
  1.  **Priority 1: Coupon Match (Strongest)**
      - If `coupon_code` is valid and mapped to an influencer, they get the credit (Highest Confidence).
      - Ignores `ref_code` if a valid coupon is present (assumes coupon was the "closer").
  2.  **Priority 2: Ref Code Match (Deterministic)**
      - Look up `TrackingLink` by `ref_code`.
      - Attribute to Link Owner.
  3.  **Priority 3: Lazy Extraction**
      - If no `ref_code` provided, try to extract `ref_code={code}` from `landing_url` or `referrer`.


## PHASE 5 — Reporting & Dashboards

### Module 5.1 — Advertiser Dashboard
**Backend (Aggregation Service)**
- **Direct SQL Aggregation**: Real-time `GROUP BY` queries on `customer_events` and `click_events`.
- **Endpoints**:
  - `GET /stats/overview`: Totals for Clicks, Conversions, GMV, Conversion Rate. Supports `?from=&to=` date filters.
  - `GET /stats/chart`: Time-series data (daily/hourly) for Clicks vs. Sales to power visualization charts.
  - `GET /stats/per-influencer`: Performance breakdown by Influencer.
  - `GET /stats/per-campaign`: ROI performance per campaign.
- **CSV Export**: Streamed response for raw event data download.

**Frontend**
- **Advertiser Dashboard**:
  - **Scorecard**: High-level metrics (Total Revenue, Clicks, Conversions).
  - **Performance Charts**: Line/Bar charts showing trend of Clicks vs. Conversions over selected date range.
  - **Date Range Picker**: Filter views (Last 7 Days, Last 30 Days, Custom).
  - **Tables**: Breakdown by Top Influencers and Campaigns.

---

### Module 5.2 — Influencer Dashboard
**Backend**
- **Scoped Reporting APIs**: STRICT security enforcement; endpoints only return data where `influencer_id == current_user`.
- **Endpoints**:
  - `GET /influencer/stats/overview`: Personal metrics (Clicks, Sales, Payout).
  - `GET /influencer/stats/chart`: Personal time-series data for visualization.

**Frontend**
- **Influencer Dashboard**:
  - **Performance Cards**: Sales, Clicks, and Commission summaries.
  - **Visual Charts**: Simple trend lines for "My Traffic" and "My Conversions".
  - **Lists**: Active Campaigns & assigned tracking links/coupons.

---

### Module 5.3 — Admin Operational Dashboard
**Backend**
- **Business Health**: Platform-wide totals (Active Advertisers, Total Monthly Events).
- **Operational actions**:
  - Force-generate coupons.
  - View recent error logs (tail of failed event ingestions).

**Frontend**
- **Admin Diagnostics**: Simple table views of system health and recent signups.

---

## PHASE 6 — Hardening & MVP Closure

### Module 6.1 — Non-Functional Hardening
- Rate limiting
- Retry logic
- Basic monitoring hooks
- Security validation
- Load sanity testing (redirect + events)

---

### Module 6.2 — Deployment & Documentation
- CI/CD setup
- EC2 + RDS deployment
- Environment documentation
- Advertiser API documentation
- Final handover checklist

---

## Final Outcome
- Each module independently testable
- Backend contracts locked before frontend
- Incremental, low-risk delivery
- Strict MVP scope enforcement

## Additionals : 
- Use uvcorn for localhost testing and uv for package management
