from DB import async_session_factory
from models import User
from fastapi import APIRouter
from sqlalchemy import select

router_users = APIRouter(prefix="/auth", tags=["Auth"])


@router_users.get("/show_users")
async def show_users():
    async with async_session_factory() as session:
        query = select(User)
        result = await session.execute(query)
        users=result.scalars().all()
        return users