from DB import async_session_factory
from models import User
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from core.config import SECRET_KEY, REFRESH_EXPIRE_TIME, ACCESS_EXPIRE_TIME, ALGORITHM


def create_access_token(data: dict) -> str:

    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_TIME)
    to_encode.update({"exp": expire, "type": "access"})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, ALGORITHM)

    return encoded_jwt

def create_refresh_token(data: dict) -> str:

    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE_TIME)
    to_encode.update({"exp": expire, "type": "refresh"})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, ALGORITHM)

    return encoded_jwt

async def get_user_by_username(username):
    async with async_session_factory() as session:
        query = select(User).where(User.user_name == username)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if user is None :
            raise HTTPException(status_code=401, detail="Invalid password or username")
        return user

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/sign_in")
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid password or username",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_name: str = payload.get("sub")
        t_type: str = payload.get("type")
        if user_name is None or t_type != "access":
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="time expired")
    except jwt.PyJWTError:
        raise credentials_exception

    result = await get_user_by_username(user_name)

    return result

async def verify_refresh_token(refresh_token = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid password or username",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_name: str = payload.get("sub")
        t_type: str = payload.get("type")
        if user_name is None or t_type != "refresh":
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="time expired")
    except jwt.PyJWTError:
        raise credentials_exception

    result = await get_user_by_username(user_name)

    return result


def allow_roles(roles: list[str]):
    async def verify_role(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return verify_role