# AWS Setup Guide for SuperHer (Ubuntu Edition)

Follow these steps to prepare your AWS environment.

## 1. Create RDS Database (Aurora MySQL or Standard MySQL)
*(Assuming this is done. If not, refer to previous steps)*
*   **Important**: Note down your **Master Username**, **Master Password**, and **Endpoint URL** (e.g., `superher-db.xxxx.us-east-2.rds.amazonaws.com`).

## 2. Launch EC2 Instance (Ubuntu)
*(Done: `ec2-52-14-245-20.us-east-2.compute.amazonaws.com`)*
*   Ensure Security Groups allow:
    *   **Inbound SSH (22)**: From your IP.
    *   **Inbound HTTP (80)**: From Anywhere.
    *   **Inbound HTTPS (443)**: From Anywhere.

## 3. SSH Configuration
You have configured your `~/.ssh/config` as:
```text
Host superher
    Hostname ec2-52-14-245-20.us-east-2.compute.amazonaws.com
    User ubuntu
    IdentityFile "~/.ssh/Superherkey.pem"
```
You can now connect via `ssh superher`.

## 4. Install Docker on EC2 (Ubuntu)
Connect to your server:
```bash
ssh superher
```

Run the following commands to install Docker and Docker Compose on Ubuntu:

```bash
# 1. Update and install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# 2. Install Docker using the convenience script (easiest for Ubuntu)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Add 'ubuntu' user to docker group (so you don't need 'sudo' for docker commands)
sudo usermod -aG docker ubuntu

# 4. Install Docker Compose Plugin (if not already installed by get-docker.sh)
sudo apt-get install -y docker-compose-plugin

# 5. Apply group changes (Log out and log back in)
exit
```
*Wait a moment, then `ssh superher` again.*

Verify installation:
```bash
docker version
docker compose version
```

## 5. Required Environment Variables
You will need to create a `.env` file on the server. Here is the full list of parameters required based on your configuration.

**File Location on Server**: `~/superher/.env`

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string for RDS. | `mysql+mysqlconnector://admin:PASSWORD@HOST:3306/DB_NAME` |
| `SECRET_KEY` | Security key for FastAPI sessions/tokens. | `openssl rand -hex 32` output |
| `BACKEND_CORS_ORIGINS` | (Optional) Allowed origins. | `["http://your-ec2-ip", "http://localhost"]` |

**Template to copy-paste:**
```env
# Database Connection
# Format: mysql+mysqlconnector://<user>:<password>@<host>:<port>/<db_name>
DATABASE_URL=mysql+mysqlconnector://admin:MySecurePass@superher-db.ccxxyy.us-east-2.rds.amazonaws.com:3306/superher

# Security
SECRET_KEY=change_this_to_a_long_random_string

# Optional: If you see CORS errors
# BACKEND_CORS_ORIGINS=["http://52.14.245.20"]
```
