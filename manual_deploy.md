# Manual Deployment Guide (Docker Hub Workflow)

This guide details how to build images locally, push them to Docker Hub, and then pull them on your EC2 instance. It also includes a Master List of all required secrets.

## Prerequisites
1.  **Docker Hub Account**: You must have an account at [hub.docker.com](https://hub.docker.com/).
2.  **Locally**: Docker Desktop installed and running.
3.  **Remote**: Docker installed on EC2 (Ubuntu).

---

## Part 1: Secrets & Variables Master List

You need to configure these variables in different places.

### A. Local Environment (for building/pushing)
Add these to your local `.env` file (or export them):
| Variable | Description | Example |
| :--- | :--- | :--- |
| `DOCKER_USERNAME` | Your Docker Hub Username | `johndoe` |

### B. EC2 Server Environment (`.env`)
These are used by the running application.
| Variable | Description | Where to find it |
| :--- | :--- | :--- |
| `DOCKER_USERNAME` | Needed for docker-compose to know which image to pull. | Your Docker Hub username. |
| `DATABASE_URL` | Full connection string for RDS. | `mysql+mysqlconnector://user:pass@host:3306/db` |
| `SECRET_KEY` | Flask/FastAPI session security key. | `openssl rand -hex 32` |
| `MYSQL_USER` | (Optional) If used in code. | RDS Master Username. |
| `MYSQL_PASSWORD` | (Optional) If used in code. | RDS Master Password. |
| `MYSQL_DB` | (Optional) If used in code. | RDS DB Name. |

### C. GitHub Secrets (Future CI/CD)
When we enable GitHub Actions later, you will need these in **Settings > Secrets**:
| Secret Name | Content |
| :--- | :--- |
| `DOCKER_USERNAME` | `johndoe` |
| `DOCKER_PASSWORD` | Docker Hub Access Token. |
| `HOST_DNS` | `ec2-xx-xx.us-east-2.compute.amazonaws.com` |
| `SSH_PRIVATE_KEY` | Content of `Superherkey.pem`. |
| `ENV_FILE` | The full content of the EC2 `.env` file. |

---

## Part 2: Local Build & Push

### 1. Login to Docker Hub
```bash
docker login
# Enter your username and password
```

### 2. Set your Username
Export your username so the compose file can use it:
```bash
# Replace 'johndoe' with your actual username
export DOCKER_USERNAME=johndoe
```

### 3. Build Images (and include migration script)
```bash
docker-compose -f docker-compose.prod.yml build
```
*This includes the new `run_migrations.sh` script in the image.*

### 4. Push Images
```bash
docker-compose -f docker-compose.prod.yml push
```

---

## Part 3: Deploy on EC2

### 1. Transfer Orchestration Files
```bash
# 1. Create config dir
ssh superher "mkdir -p ~/superher/nginx"

# 2. Copy files
scp docker-compose.prod.yml superher:~/superher/
scp nginx/prod.conf superher:~/superher/nginx/
```

### 2. Configure Server Environment
SSH into your server:
```bash
ssh superher
cd ~/superher
nano .env
```
*(Paste variables from Part 1B)*

### 3. Pull and Run
```bash
# Pull the latest images
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d
```

### 4. Run Migrations (Critical Step)
Since the database is brand new, we need to apply the schema.
```bash
# Run the migration script inside the backend container
docker compose -f docker-compose.prod.yml exec backend bash ./run_migrations.sh
```
*This command uses Alembic to create all tables in your RDS database.*

### 5. Verify
Visit **[https://superher.in](https://superher.in)**. The site should be live and secure.
