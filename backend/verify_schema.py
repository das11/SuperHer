import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_schema():
    async with engine.connect() as conn:
        print("Checking 'users' table columns...")
        result = await conn.execute(text("DESCRIBE users;"))
        rows = result.fetchall()
        for row in rows:
            print(f"Column: {row[0]}, Type: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_schema())
