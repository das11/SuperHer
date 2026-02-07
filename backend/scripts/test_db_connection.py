import os
import sys
import mysql.connector
from dotenv import load_dotenv

# Load env from project root (3 levels up from scripts/)
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(project_root, ".env"))

def test_connection():
    host = os.getenv("MYSQL_SERVER", "127.0.0.1")
    port = int(os.getenv("MYSQL_PORT", 3306))
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD")
    database = os.getenv("MYSQL_DB")

    print(f"Attempting connection to {host}:{port} as user '{user}'...")
    
    try:
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            connection_timeout=5
        )
        if conn.is_connected():
            print("✅ Connection successful!")
            print(f"Connected to database: {database}")
            print(f"Server version: {conn.get_server_info()}")
            conn.close()
    except mysql.connector.Error as e:
        print(f"❌ Connection failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Is the Docker container running? (docker ps)")
        print(f"2. Is port {port} exposed in docker-compose.yml?")
        print("3. Did you restart docker-compose after changing the password variables?")
        print("   Run: docker-compose down -v && docker-compose up -d")

if __name__ == "__main__":
    test_connection()
