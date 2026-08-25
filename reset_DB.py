from DB import async_engine, Base, async_session_factory
import asyncio
from models import User
from fastapi import FastAPI
from sqlalchemy import select, insert
from schemas import UserDTO

async def create_table():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(create_table())