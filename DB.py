from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

async_engine = create_async_engine(
    url="postgresql+asyncpg://Danik:Daniililiza9@localhost:5433/EasyDraw_db"
)

async_session_factory = async_sessionmaker(bind=async_engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass