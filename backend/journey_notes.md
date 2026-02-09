# SuperHer Development Journey - Phase 1

This document tracks the technical implementation details, architectural decisions, and "how it works" for each phase of the project.

---

## Phase 1: Core Entity Management (Foundation)

**Objective**: Establish the backbone of the system by enabling the management of Advertisers, Campaigns, and Influencers.

### 1. Backend Architecture (FastAPI + MySQL)

We built the backend using a modular, async-first architecture.

*   **Framework**: FastAPI (high-performance, async).
*   **Database**: MySQL 8.0 (running in Docker).
*   **ORM**: SQLAlchemy (Async) with Pydantic v2 for validation.
*   **Migrations**: Alembic for schema version control.

#### Key Implementations by Module:

**A. Advertiser Module (`app/api/v1/endpoints/advertisers.py`)**
*   **Functionality**: Allows creating brands and generating API keys.
*   **Technical Detail**:
    *   **Relationships**: Enforced strict relationship loading. We use `selectinload` to fetch related `api_keys` efficiently to avoid N+1 query problems.
    *   **Security**: API Keys are generated using `secrets.token_urlsafe()` and stored with a SHA-256 hash. The raw key is shown **only once** upon creation.

**B. Campaign Module (`app/api/v1/endpoints/campaigns.py`)**
*   **Functionality**: Creates marketing campaigns linked to an Advertiser.
*   **Logic**:
    *   Campaigns default to `draft` status.
    *   Budget inputs are sanitized (float validation).
    *   Enforces correct Foreign Key constraints (`advertiser_id` must exist).

**C. Influencer Module (`app/api/v1/endpoints/influencers.py`)**
*   **Functionality**: Manage talent roster and assignments.
*   **The "Assignment" Logic**:
    *   We implemented a Many-to-Many relationship between `Influencers` and `Campaigns` using a join table (`campaign_influencers`).
    *   The API endpoint `POST /{id}/assign` accepts a `campaign_id` and creates this association.
    *   This allows one influencer to be part of multiple campaigns and vice-versa.

---

### 2. Frontend Architecture (React + Tailwind v4)

We decided to skip the basic MVP UI and jumped straight to a "Premium/Enterprise" aesthetic (Phase 1.5).

*   **Build Tool**: Vite (blazing fast HMR).
*   **Styling**: Tailwind CSS v4 (using `@tailwindcss/vite` plugin).
*   **Icons**: Lucide React (clean SVG icons).
*   **State Management**: React Hooks (`useState`, `useEffect`) + Axios for API calls.

#### UI Components & Features:

**A. Layout & Navigation (`Sidebar.jsx`)**
*   **Design**: A permanent, dark-mode sidebar (Slate-900) inspired by SaaS platforms like Stripe/Upfluence.
*   **Feedback**: Active tabs are highlighted with a distinct background and glow effect.

**B. Advertiser Management (`Advertisers.jsx`)**
*   **Card View**: Instead of a boring table, brands are displayed as cards.
*   **Integration**: The "Generate Key" button hits the backend, gets the fresh key, and displays it in a dismissible success alert.
*   **Visuals**: Active keys are shown as masked pills (e.g., `sk_live_...`).

**C. Campaign Dashboard (`Campaigns.jsx`)**
*   **Status Badges**: Campaigns show badges (Draft/Active) with color-coded styling (Gray/Green) driven by the backend status.
*   **Draft Mode**: The UI clearly indicates that new campaigns start in Draft mode.

**D. Influencer Roster (`Influencers.jsx`)**
*   **Quick Assign**: The coolest feature here. Each influencer card has a dropdown to instantly assign them to an active campaign.
*   **Real-time Update**: Assigning a campaign updates the UI immediately to show the new association tag on the card.

---

### 3. Infrastructure & DevOps

*   **Docker**: The database runs in an isolated container.
    *   *Decision*: We verified the use of `mysqld_native_password` to ensure compatibility with older SQL clients (like DBeaver).
*   **Data Persistence**:
    *   We use a Docker Volume (`db_data`) to ensure data survives container restarts (`docker-compose stop`).
    *   *Note*: `docker-compose down -v` is the "nuclear option" that wipes this volume.

---

## Phase 2: Coupon System (Attribution Layer)

**Objective**: Enable the creation and tracking of unique coupon codes to attribute sales to specific influencers or campaigns.

### 1. Backend Implementation (`app/api/v1/endpoints/coupons.py`)

We introduced a dedicated Coupon Tracking Module.

*   **Data Model (`Coupon`)**:
    *   Links `Coupon` to `Campaign` (Required) and `Influencer` (Optional).
    *   **Generic Coupons**: By allowing `influencer_id` to be Null, we support "Generic" or "Site-wide" coupons (e.g., `BLACKFRIDAY25`) that aren't tied to a specific person.
    
*   **API Logic**:
    *   **Auto-Generation**: Uses `secrets` logic to generate unique alphanumeric codes (e.g., `SUMMER-X9Y2`). Includes retry logic to handle collision edge cases.
    *   **Manual Creation**: Allows brands to specify vanity codes (e.g., `JESSICA20`). The system enforces database-level uniqueness.

*   **Technical Challenge & Fix**:
    *   *Issue*: Initially encountered `AttributeError: 'AsyncSession' object has no attribute 'query'` because we mix-and-matched Synchronous SQLAlchemy syntax (`db.query`) with our Async engine.
    *   *Fix*: Refactored the entire module to use modern Async SQLAlchemy 1.4/2.0 syntax:
        ```python
        # old (sync)
        # db.query(Coupon).filter(...)
        
        # new (async)
        result = await db.execute(select(Coupon).where(...))
        coupons = result.scalars().all()
        ```

### 2. Frontend Implementation (`/coupons`)

We added a full management interface for coupons.

*   **UI Components**:
    *   **`CouponList.jsx`**: A responsive table view showing Code, Campaign, Influencer (or "Generic"), and Status. Includes a "Copy to Clipboard" utility.
    *   **`CreateCouponModal.jsx`**: A dual-mode creation form.
        *   **Tab 1 (Auto)**: Lets user define a Prefix + Length.
        *   **Tab 2 (Manual)**: Lets user type the exact code.
    *   **Smart Dropdowns**: The "Influencer" dropdown includes a "Generic" option at the top to clear the selection easily.

*   **UX Details**:
    *   **Validation**: The UI prevents submitting without a Campaign selected.
    *   **Error Handling**: If a code already exists (duplicates), the API error message is caught and displayed in a red alert box within the modal.

---

## Phase 3: Tracking Link Engine (Traffic Source)

**Objective**: Build a robust system to generate, track, and redirect short links (e.g., `bit.ly/xyz`) to measure click-through rates.

### 1. Backend Implementation (Redirection Service)

This phase required building two distinct components: a Management API and a Public Redirector.

*   **Data Models**:
    *   **`TrackingLink`**: Stores the mapping between a `short_code` (e.g., `AbC12`) and the `destination_url`.
    *   **`ClickEvent`**: A high-volume table designed to log every single interaction (Timestamp, IP, User-Agent, Referrer).

*   **API 1: The Redirector (`GET /api/v1/r/{code}`)**
    *   **Performance Strategy**: We used FastAPI's `BackgroundTasks` to ensure the user is redirected immediately, without waiting for the database write.
        1.  Fetch Link (SELECT).
        2.  Queue DB Write (Background Task).
        3.  Return `302 Found` (Immediate Redirect).
    *   **Why?**: This keeps latency extremely low (~10-20ms database read time) so the user doesn't feel a delay.

*   **API 2: Management (`/tracking-links/`)**
    *   **Aggregation Logic**: We updated the List endpoint to perform a **SQL Aggregation** (Count) on the fly.
    *   Instead of fetching all click events (which could be millions), we execute:
        ```sql
        SELECT tracking_links.*, COUNT(click_events.id) 
        FROM tracking_links 
        LEFT JOIN click_events ON ... 
        GROUP BY tracking_links.id
        ```
    *   This efficiently populates the `click_count` field for the frontend.

### 2. Frontend Implementation (`/tracking-links`)

*   **UI Components**:
    *   **`TrackingLinks.jsx`**: The main dashboard page.
    *   **`TrackingLinkList.jsx`**: Displays the active links and, crucially, the **Total Clicks** column which serves as our MVP "monitoring" tool.
    *   **`CreateTrackingLinkModal.jsx`**: Simple form that takes a Destination URL and handles the complex 3-way mapping (Link -> Campaign -> Influencer).

---

### Summary of Status
We now have a complete **Traffic & Attribution System**:
1.  **Coupons**: For direct sales attribution (Phase 2).
2.  **Tracking Links**: For click-based attribution and traffic measurement (Phase 3).

**Ready for Phase 4: Event Ingestion (Purchases & Conversions).**

## Phase 4: Event Ingestion & Attribution (The Core)

**Objective**: Enable advertisers to report sales conversions via API and automatically attribute them to the correct Influencer.

### 1. Architectural Decisions (Deterministic vs Fuzzy)

We chose a **Deterministic Hybrid Approach** to maximize accuracy and minimize "fuzzy matching" guessing.

*   **Deterministic Redirect**: We modified the redirect engine (`redirect.py`) so that when a user clicks a tracking link (`/r/abc`), they are redirected to `Destination?ref_code=abc`. This ensures the advertiser receives the "Token" (ref_code) explicitly.
*   **Waterfall Logic**: We implemented a strict priority system in `AttributionService`:
    1.  **Coupon Code** (Priority 1): If the event contains a Coupon, it *always* wins (Last Touch attribution).
    2.  **Ref Code** (Priority 2): If no coupon, we look for an explicit `ref_code`.
    3.  **Lazy Extraction** (Priority 3): If the advertiser is lazy and sends the full URL, we parse it to find `?ref_code=...`.

### 2. Backend Implementation

*   **Unified Endpoint (`POST /api/v1/events/`)**:
    *   Instead of separate inputs for "purchase" or "signup", we built a single flexible endpoint.
    *   **Payload**: Accepts `action` (enum), `value`, `currency`, and attribution keys (`coupon_code`, `ref_code`, `landing_url`).
    *   **Validation**: Uses Pydantic to ensure at least one attribution key is present (or acts as a "fallback").

*   **Attribution Service (`app/services/attribution.py`)**:
    *   Encapsulated the complexity of checking Coupons vs Links.
    *   Returns a tuple `(influencer_id, campaign_id, tracking_link_id)` to be saved with the event.

*   **API Verification Script (`scripts/verify_phase4.py`)**:
    *   Since this phase is purely backend API logic, we built a visual Python script.
    *   It simulates the **entire lifecycle**: Creating a Brand -> Getting API Key -> Generating Link -> Simulating the Redirect -> Ingesting the Event -> Verifying Attribution.

---

## Phase 5: Reporting & Dashboards (Advertiser View)

**Objective**: Provide advertisers with a real-time, visual dashboard to track campaign performance, analyzing traffic (clicks) vs. conversions (sales) and calculating ROI.

### 1. Functional Architecture (By Dashboard Use Case)

We structured the backend APIs to map directly to the distinct "Zones" of the frontend dashboard:

#### Zone A: Context & Filters (The Header)
*   **Goal**: Allow users to slice data by Advertiser, Campaign, and Influencer.
*   **Endpoints**:
    *   `GET /api/v1/advertisers/`: Lists available advertisers (Admins see all).
    *   `GET /api/v1/campaigns/`: dynamic list based on selected advertiser.
    *   `GET /api/v1/influencers/`: **(Complex Logic)**
        *   *Challenge*: Finding "relevant" influencers.
        *   *Tech Detail*: We implemented a smart filter using SQLAlchemy's `any()` operator. It returns influencers who are EITHER explicitly assigned to a campaign OR who have implicitly created a tracking link for the advertiser. This solves the "Orphaned Influencer" visibility issue.

#### Zone B: High-Level Metrics (The Scorecards)
*   **Goal**: Instant snapshot of performance (Clicks, Conversions, Revenue, AOV).
*   **Endpoint**: `GET /api/v1/stats/overview`
    *   *Tech Detail*: This performs a high-speed aggregation on the `customer_events` table using DB-level `SUM(CASE WHEN...)` logic.
    *   **AOV (Avg Order Value)**: Calculated on the fly (`Total Revenue / Total Purchases`) to avoid storing redundant derived data.

#### Zone C: Visualizations (The Charts)
*   **Goal**: Visual Trend Analysis & Activity Flow.
*   **Endpoints**:
    *   `GET /api/v1/stats/chart`: Time-series data.
        *   *Tech Detail*: Merges two disparate datasets—`ClickEvents` (Traffic) and `CustomerEvents` (Sales)—into a single JSON structure grouped by Date. It handles "sparse data" (dates with clicks but no sales) effectively.
    *   `GET /api/v1/stats/breakdown`: Activity Funnel.
        *   *Tech Detail*: Aggregates counts by `event_type` (`add_to_cart`, `purchase`, `signup`) to power the Sankey/Funnel view.

#### Zone D: Granular Deep-Dives (The Tabbed Table)
*   **Goal**: Detailed performance attribution per entity.
*   **Endpoints**:
    *   `GET /api/v1/stats/campaigns`: Aggregates revenue per Campaign.
    *   `GET /api/v1/stats/influencers`: Aggregates revenue per Influencer.
    *   `GET /api/v1/stats/coupons`: Tracks usage of specific coupon codes.
    *   `GET /api/v1/stats/tracking-links`: Tracks individual short-link performance.
        *   *Tech Detail (The Zero-Row Problem)*: We use a **`LEFT OUTER JOIN`** starting from `TrackingLinks`. This ensures that a link created today (0 sales) still appears in the report with its Click Count, rather than being invisible until a sale occurs.

#### Zone E: Data Portability (Export)
*   **Endpoint**: `GET /api/v1/stats/export`
*   **Tech Detail**: Uses Python generators (`yield`) to stream the CSV response row-by-row. This keeps memory usage low even when exporting 100,000+ events.

### 2. Core Technical Implementation Details

*   **The `StatsService` Engine**:
    *   Located in `app/services/stats.py`.
    *   **Unified Query Builder**: We created a `apply_filters(query, ...)` mixin that injects `WHERE` clauses for dates, campaigns, and influencers. This guarantees consistent numbers across all 5 zones.
    *   **Optimization**: We added compound indices to `customer_events(advertiser_id, timestamp)` to ensure sub-100ms query times even with large datasets.

*   **Authentication & "SuperRoot"**:
    *   We refactored `deps.py` to allow an optional `advertiser_id` query parameter override for Admin users.
    *   This decouples the Dashboard UI from the strict "One Token per Brand" limit, enabling the SuperRoot global view.

### 3. Frontend Implementation Highlights

*   **Performance Optimization**:
    *   **Parallel Fetching**: The dashboard uses `Promise.all()` to fire requests for Overview, Charts, and Breakdowns simultaneously, reducing "Time to Interactive".
*   **UX Refinements**:
    *   **Overlay Selects**: Custom CSS implementation to make full-width cards clickable dropdowns.
    *   **Real-time Interaction**: Hovering on charts uses a custom `Recharts` tooltip to show multi-metric data (Clicks + Revenue) in a unified glassmorphic popup.

---


### 4. Deep Dive: Attribution Journey (Sankey Chart)

**Objective**: Visualize the "Contribution Flow" of events—showing which Traffic Sources and Attribution Methods are driving outcomes—without falsely implying a strict linear timeline (Click -> ATC -> Purchase) which we cannot always track statefully.

#### A. Backend Implementation
*   **New Endpoint**: `GET /api/v1/stats/journey`
    *   This specialized endpoint was added to `StatsRouter` to serve the specific data shape needed for the Sankey visualization.
    *   It accepts standard filters (date range, campaign, influencer) to ensure the journey view matches the rest of the dashboard context.

*   **Service Logic (`StatsService.get_journey_stats`)**:
    *   **The Logic**: We needed to group events by three distinct dimensions simultaneously to determine the flow.
    *   **Query Strategy**:
        *   **Source**: We derive this boolean state: `CASE WHEN tracking_link_id IS NOT NULL THEN 'Tracking Link' ELSE 'Direct / Organic'`
        *   **Method**: We check priority: `CASE WHEN coupon_code IS NOT NULL THEN 'Coupon' WHEN ref_code IS NOT NULL THEN 'Ref Code' ELSE 'Unattributed'`
        *   **Outcome**: The raw `event_type` (Purchase, Signup, etc.).
    *   **Aggregation**: `SELECT source, method, event_type, COUNT(*) GROUP BY 1, 2, 3`. This returns a flat list of weighted flows (e.g., `Link -> Coupon -> Purchase: 50`) which the frontend can easily parse.

#### B. Frontend Implementation (`JourneySankey.jsx`)
*   **Library**: `@nivo/sankey`.
*   **Transformation**: The component takes the flat list and dynamically builds a Node/Link graph.
*   **Visual Decisions**:
    *   **Vertical Labels**: To accommodate long names like "Direct / Organic" without cutoff.
    *   **Margins**: Increased to `50px` to prevent text clipping.
    *   **Tooltips**: Custom flex-row design to show readable "Source -> Target: Value" metrics.

#### C. How it Solves the Requirement (The Logic)

**The Problem**: We needed to answer "Where did my sales come from?" but we don't have perfect session tracking (e.g., we can't prove that *this specific* Click Event #101 led to *this specific* Purchase #505 if the user switched devices).

**The Solution**: We treat attribution as a **Flow of Influence** rather than a strict timeline.

**Example Data Scenario**:
Imagine 3 raw events in the database:

| Event ID | Tracking Link ID | Coupon Code | Ref Code | Event Type | **Mapped Flow** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| #1 | `101` (Present) | `SUMMER20` | `null` | `purchase` | **Link** (`Source`) -> **Coupon** (`Method`) -> **Purchase** (`Outcome`) |
| #2 | `null` (Direct) | `SUMMER20` | `null` | `purchase` | **Direct** (`Source`) -> **Coupon** (`Method`) -> **Purchase** (`Outcome`) |
| #3 | `101` (Present) | `null` | `jessica` | `signup` | **Link** (`Source`) -> **Ref Code** (`Method`) -> **Signup** (`Outcome`) |

**The Visualization**:
-   The Sankey chart aggregates these flows.
-   It would show a thick line from "Link" to "Coupon", and a thinner line from "Direct" to "Coupon".
-   unique strength: It immediately visualizes **"Direct Organic" Coupon usage** (people finding codes on Google/Reddit) vs **"Influencer Driven" Coupon usage** (people clicking the link AND using the code).

---

## Annexure I - Identity, Auth & Security

**Objective**: Implement "Zero Trust" security where every API request is strictly verified for identity (Authentication) and data access rights (Authorization).

### 1. The Stack ("Auth System" Components)

The Authentication System is a distributed pipeline that spans the Client, the Network, and the Backend.

#### A. Frontend (The Client)
*   **Context (`AuthContext.jsx`)**: The "Brain". It manages the session state, communicates with AWS Cognito for credentials, and holds the critical **Axios Interceptor** that stamps the Auth Token onto every outgoing API request.
*   **Network Layer (`client.js`)**: The "Courier". A specialized Axios instance configured to carry the payload.
*   **Protection (`ProtectedRoute.jsx`)**: The "Bouncer". It wraps sensitive routes and redirects unauthenticated users to Login, or shows a "Pending Approval" screen for inactive users.

#### B. Backend (The Gatekeeper)
*   **Dependency Injection (`deps.py`)**: The "Guard". This function (`get_current_active_user`) intercepts every request. It extracts the Bearer Token and enforces a strict checklist:
    1.  Is the Token signature valid?
    2.  Is the User active in our DB?
    3.  Does the User exist? (Auto-creates if missing).
*   **Validation Logic (`cognito.py`)**: The "Validator". A specialized class that manages JWKS (JSON Web Key Set) caching and RSA signature verification.

#### C. Database (The Truth)
*   **User Model**: Maps the external Cognito Identity (`sub`) to our internal RBAC system (`role`, `advertiser_id`).

### 2. Authorization Strategy (RBAC & Scoping)

We implemented a **Role-Based Access Control** (RBAC) system with **Strict Data Scoping**.

*   **The Problem**: A standard API (`GET /campaigns`) usually blindly returns all data.
*   **The Solution**: We inject "Scoping Logic" into the dependencies.
    *   **Admins (SuperRoot)**: Can view everything or filter by any Advertiser ID.
    *   **Advertisers**: Are forcibly restricted. The backend ignores any filters they send and strictly applies `WHERE advertiser_id = [THEIR_ID]`. This ensures they can never access data outside their account, preventing IDOR attacks.

### 3. Deep Dive: End-to-End Execution Flow

Here is how the system actually processes a user interaction, step-by-step:

#### A. The Handoff (Frontend -> Backend)
1.  **Login**: User enters credentials. `AuthContext` calls `AWS Cognito`. AWS responds with a **JWT (JSON Web Token)**. This is a cryptographically signed "Passport".
2.  **Storage & Stamping (Crucial)**:
    *   *The Race Condition Fix*: We encountered a bug where the API was called before the token was ready. We solved this by **synchronously** attaching the token to the `client.defaults.headers` immediately upon login.
    *   *The Interceptor*: For all subsequent requests, a dynamic Axios interceptor ensures the header `Authorization: Bearer <TOKEN>` is always attached.

#### B. The Gatekeeper (Backend Verification)
1.  **Interception**: The request hits an endpoint (e.g., `GET /advertisers`). Before the function runs, FastAPI executes `Depends(get_current_active_user)`.
2.  **Offline Verification (Performance)**:
    *   Instead of calling AWS APIs for every request (which is slow/expensive), we use the **`CognitoVerifier` Singleton**.
    *   It caches AWS's Public Keys in **RAM** (for 24 hours).
    *   It uses CPU logic to verify the token signature in **<1ms**.
3.  **Identity Sync**:
    *   The system extracts the `sub` (Unique ID) from the token.
    *   It looks up the User in our MySQL DB. (If new, it auto-creates them).
    *   It looks up the User in our MySQL DB. (If new, it auto-creates them).

### 4. Developer Experience (Swagger UI)
*   **Problem**: FastAPI's default `OAuth2PasswordBearer` assumes a monolithic app with a `/token` endpoint to handle passwords. This broke our Swagger UI because we use Client-Side Login (Cognito).
*   **Solution**: We switched to `HTTPBearer`.
    *   **Effect**: Swagger UI now ignores the "Password Flow" and simply provides a box to **Paste the Token**.
    *   **Workflow**: Login on Frontend -> Copy Token from Local Storage -> Paste in Swagger.
    *   **Why**: This accurately reflects our architecture: The Backend trusts the Token (Stateless), it does not verify passwords.
#### C. The Jail (Data Scoping)
1.  **Role Check**: The system identifies the user is an `ADVERTISER` (ID: 37).
2.  **Forced Isolation**:
    *   When listing data, the API forcibly appends: `WHERE advertiser_id = 37`.
    *   This happens at the database query level. Even if a malicious user tries to request `?advertiser_id=99`, the backend ignores it.
    *   **Result**: The Advertiser sees *only* their data (or an empty list if they have none), and sees *nothing* from others.

---

## Annexure II - Email Service Implementation

**Objective**: Enable the platform to send professional, automated transactional emails (Coupons, Tracking Links) to influencers, replacing manual copy-pasting.

### 1. Infrastructure (AWS SES)
We chose **AWS Simple Email Service (SES)** for its reliability and high deliverability.
*   **Identity Verification**:
    *   **Domain Level**: We verified `superher.in` mapping via Route53 CNAME records. This allows sending from any address (e.g., `noreply@superher.in`) without individual verification.
    *   **Sandbox Mode**: Initially, we operated in SES Sandbox, requiring both Sender and Recipient to be verified. (Moved to Production access for unrestricted sending).
*   **Security**: IAM User (`ses-mailer`) with restricted `ses:SendRawEmail` permissions, credentials stored in `.env`.

### 2. Backend Architecture (`app/services/email.py`)

#### A. The Challenge: Image Blocking
*   **Problem**: Most modern email clients (Gmail, Outlook) block external images and Base64 Data URIs (`<img src="data:image/png;base64...">`) by default for privacy/security.
*   **Solution**: **MIME Multipart with Content-ID (CID)**.
    *   We refactored the email engine to construct a `multipart/related` MIME message.
    *   **The Logo**: Instead of a link, the logo is *attached* to the email as a binary part.
    *   **The Reference**: The HTML references it via `<img src="cid:logo">`.
    *   **Result**: The image renders instantly as an "internal" attachment, bypassing the blocker.

#### B. Template Engine
*   **Design**: A "Card-Based" layout using pure HTML5/CSS (tables and inline styles) for maximum compatibility.
*   **Responsiveness**: A mobile-first container (`max-width: 600px`) that scales down on phones.
*   **Methods**:
    *   `send_coupons()`: Iterates through the list and generates a card for each code.
    *   `send_links()`: Generates a card with the Short URL and a Call-to-Action button.

### 3. Frontend Integration (`EmailSuccessModal.jsx`)

*   **UX Upgrade**: We replaced standard browser `alert()` boxes with a custom React Modal.
*   **State Management**:
    *   The API returns a detailed breakdown: `{ emails_sent: 5, emails_failed: 1 }`.
    *   The Modal dynamically styles its icon (Green Check vs Red Alert) based on the result.
*   **Animation**: Used `framer-motion` for a smooth "Spring" entrance/exit, adding a premium feel to the notification.

---

## Phase 6: Revenue Share & Payouts (The Monetization Layer)

**Objective**: Enable advertisers to compensate influencers based on specific performance models (Percentage or Flat Fee) and calculate "Estimated Payout" dynamically.

### 1. Database Schema (`CampaignInfluencer`)

We upgraded the simple relationship table to a full SQLAlchemy Model to store per-link configuration.

*   **Migration**: `alembic revision -m "add_revenue_share_columns"`
*   **New Columns**:
    *   `revenue_share_type`: Enum (`percentage` | `flat`).
    *   `revenue_share_value`: Float (e.g., `15.0`).
*   **Why**: This allows granular control. One influencer can get 10% while another gets a $50 flat fee on the *same* campaign.

### 2. Backend Logic (`StatsService`)

*   **Dynamic Payout Calculation**:
    *   We modified the aggregation queries in `stats.py` to calculate payout *on the fly* during reporting.
    *   **The Math**:
        ```sql
        SUM(
            CASE 
                WHEN share_type = 'percentage' THEN (revenue * share_value / 100)
                WHEN share_type = 'flat' THEN (conversions * share_value)
                ELSE 0 
            END
        )
        ```
    *   **Handling Nulls**: Heavily used `COALESCE(val, 0)` to ensure that missing config doesn't break the entire dashboard report.

### 3. Frontend Integration

*   **Dashboard Updates**:
    *   **Scorecards**: Added "Est. Payout" card to both *Home* and *Performance* dashboards.
    *   **Columns**: Added a dedicated `Payout` column to the breakdown tables for Campaigns and Influencers.
*   **Visual Refinements**:
    *   **Smart Formatting**: Implemented a `formatCompact` utility to show large numbers as `1.5M` or `10K`, while keeping small currency values precise (`$123.45`).
    *   **Layout**: Updated the grid to 5 columns to fit the new metric without cramping the UI.


