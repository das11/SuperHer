# SuperHer MVP - Backend

## Overview
This is the backend for the SuperHer Influencer Campaign Tracking Platform. It is built using **FastAPI** (Python) and **MySQL**.

## Tech Stack
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) - High performance, easy to learn, fast to code, ready for production.
- **Database**: [MySQL 8.0](https://www.mysql.com/) via [SQLAlchemy](https://www.sqlalchemy.org/) (Async).
- **Package Manager**: [uv](https://github.com/astral-sh/uv) - An extremely fast Python package installer and resolver.
- **Configuration**: [Pydantic Settings](https://docs.pydantic.dev/latest/usage/pydantic_settings/) - Robust settings management using environment variables.
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/en/latest/) - Database migration tool for SQLAlchemy.

## Features Implemented
### Phase 1: Core Entity Management
- **Advertiser Management**: create brands, generate secure API keys (one-to-many relationship).
- **Campaign Management**: create campaigns, validate advertiser existence, default "draft" status.
- **Influencer Management**: create profiles, **assign** influencers to campaigns (many-to-many relationship).
- **Technical**: Async SQLAlchemy queries, optimized lazy-loading (`selectinload`), and Pydantic validation.

## Project Structure & Architecture

```
.
├── .env                # [Universal Config] Secrets & DB Params
├── docker-compose.yml  # [Infrastructure] MySQL Container Definition
├── backend/
│   ├── pyproject.toml  # [Dependencies] Project modules
│   ├── app/
│   │   ├── main.py     # [Entrypoint] FastAPI App
│   │   ├── core/       
│   │   │   ├── config.py   # [Loader] Reads .env -> Python Object
│   │   │   ├── database.py # [DB] Session & Engine Management
│   │   │   ├── security.py # [Auth] Cryptography & JWT Utils
│   │   │   └── exceptions.py # [Error] Custom Exception Handlers
```

### Component Logic & Interaction
1.  **`.env` (The Source of Truth)**
    *   **Logic**: A simple key-value file stored at the project **root** (one level up from `backend/`).
    *   **Objective**: To hold all secrets (Passwords, Keys) and environment-specific configs (Ports, Hosts) in one place.
    *   **Interaction**: It feeds values to BOTH `docker-compose.yml` (for the DB) and `config.py` (for the App).

2.  **`docker-compose.yml` (The Infrastructure)**
    *   **Logic**: Defines the MySQL container service.
    *   **Objective**: To spin up a local database identical to production.
    *   **Interaction**: On startup, it reads the `.env` file to set the initial database username and password.

3.  **`backend/app/core/config.py` (The Application Config)**
    *   **Logic**: Uses Pydantic to validate configuration.
    *   **Objective**: To ensure the app crashes early if a required config (like DB Password) is missing.
    *   **Interaction**: It is configured to look for `../.env` (the parent directory). It reads the *same* file as Docker, ensuring the App and Database are always in sync.

## Codebase Tour

### Core Application (`app/core/`)
-   **`database.py`**: This is the engine room of the database layer.
    -   *Logic*: Creates the asynchronous SQLAlchemy engine using the connection string from `config.py`. It also provides the `get_db` generator function, which is used by API endpoints to get a temporary database session that automatically closes after the request is finished.
-   **`security.py`**: Handles all "secrets" logic.
    -   *Logic*: Contains functions to hash passwords (turning "password123" into secure gibberish) and to create/verify JWT tokens (the ID cards users pass to prove who they are).
-   **`exceptions.py`**: Centralized error handling.
    -   *Logic*: Defines custom errors (like `AppError`) and tells FastAPI how to format them into JSON responses (e.g., `{ "message": "Item not found" }`) instead of crashing with a traceback.

### Main Entrypoint (`app/main.py`)
-   *Logic*: This is the file you run. It initializes the `FastAPI` application object, configures it (e.g., adding CORS headers so your frontend can talk to it), registers global exception handlers, and includes the API routers.

### API Layer (`app/api/v1/router.py`)
-   *Logic*: Acts as the traffic controller. It imports "routers" from different feature modules (like Advertisers, Auth, Campaigns) and bundles them all under the `/api/v1` prefix. This keeps `main.py` clean.

### Models (`app/models/`)
-   *Logic*: Python classes that represent your database tables.
    -   **`advertiser.py`**: Defines `Advertiser` (brands) and `APIKey` (authentication secrets).
    -   **`campaign.py`**: Defines `Campaign` (marketing projects) linked to Advertisers.
    -   **`influencer.py`**: Defines `Influencer` and the many-to-many relationship with Campaigns.

### API Endpoints (`app/api/v1/endpoints/`)
-   **`advertisers.py`**: Handles creation, listing, and API key management for Advertisers. Uses `selectinload` for efficient relationship fetching.
-   **`campaigns.py`**: Manages campaign creation and retrieval, ensuring valid links to Advertisers.
-   **`influencers.py`**: Handles influencer profiles and the logic to **assign** them to campaigns (Many-to-Many).

## Configuration Details

### Why `MYSQL_USER` cannot be `root`?
You will notice the `.env` file uses `MYSQL_USER=admin` (or similar) but never `root`.
*   **Reason**: The official MySQL Docker image has specific startup logic. `root` is a special superuser account controlled *exclusively* by `MYSQL_ROOT_PASSWORD`.
*   **Conflict**: If you try to set `MYSQL_USER=root`, the container script thinks you are trying to create a *second* user named root, which conflicts with the built-in one, causing the container to crash with an error.

## Setup & Running Locally

### Prerequisites
- Python 3.9+
- Docker & Docker Compose
- `uv` (Install via `pip install uv`)

### 1. Database Setup
Start the local MySQL instance using Docker Compose:
```bash
docker-compose up -d
```
This will start MySQL on port `3306` using the variables defined in the `.env` file at the project root.

### 2. Environment Configuration
Ensure you have a `.env` file in the **project root** (parent of `backend/`).

### 3. Run the Server
Navigate to the `backend` directory and run the server:
```bash
cd backend
uv run uvicorn app.main:app --reload
```
The API will be available at [http://localhost:8000](http://localhost:8000).

### 4. API Documentation
Interactive API docs (Swagger UI) are available at:
- [http://localhost:8000/docs](http://localhost:8000/docs)
