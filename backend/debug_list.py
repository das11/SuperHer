import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import engine
from app.models.advertiser import Advertiser
from app.models.user import User, UserRole

async def debug_list_endpoint_logic():
    # Simulate the User object that dependency would return
    mock_user = User(
        id=2, 
        email="kabir@thedas.biz", 
        role=UserRole.ADVERTISER, 
        advertiser_id=37, 
        is_active=True
    )
    
    print(f"DEBUG: Simulating Request for User: {mock_user.email}, Role: {mock_user.role}, AdvID: {mock_user.advertiser_id}")
    
    async with engine.connect() as conn:
        # Recreate the exact query from endpoints/advertisers.py
        query = select(Advertiser) # .options(selectinload(Advertiser.api_keys)) 
        # Note: selectinload requires session, strict execute might fail without session. 
        # But we just want to check the WHERE clause impact on rows.
        
        if mock_user.role == UserRole.ADVERTISER:
            query = query.where(Advertiser.id == mock_user.advertiser_id)
            
        print(f"DEBUG: Executing Query: {query}")
        
        result = await conn.execute(query)
        rows = result.fetchall()
        
        print(f"DEBUG: Rows Found: {len(rows)}")
        for row in rows:
            print(f"Match: ID={row.id}, Name={row.name}")

if __name__ == "__main__":
    asyncio.run(debug_list_endpoint_logic())
