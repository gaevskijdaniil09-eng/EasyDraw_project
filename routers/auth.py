from DB import async_session_factory
from models import User
from fastapi import APIRouter, Depends
from sqlalchemy import select, insert
from schemas import UserDTO,SignInDTO
import bcrypt
from fastapi import HTTPException
from core.security import create_access_token, create_refresh_token, verify_refresh_token, allow_roles


router_auth = APIRouter(prefix="/auth", tags=["Auth"])


@router_auth.post("/register")
async def register(user_data: UserDTO):
    async with async_session_factory() as session:

        user_dict = user_data.model_dump()
        pwd = bcrypt.hashpw(user_data.password.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")
        user_dict["password"] = pwd
        query = insert(User).values(**user_dict)
        await session.execute(query)
        await session.commit()

        access_token = create_access_token({"sub": user_data.user_name, "role": user_data.role})
        refresh_token = create_refresh_token({"sub": user_data.user_name})
        return {"Status": "REGISTRATION COMPLETE!", "access_token": access_token, "refresh_token": refresh_token,
                "token_type": "bearer"}

@router_auth.post("/sign_in")
async def sign_in(sign_in_data: SignInDTO):
    async with (async_session_factory() as session):
        user_hash = select(User).where(User.user_name == sign_in_data.user_name)
        result = await session.execute(user_hash)
        user = result.scalar_one_or_none()

        if user:
            table_password_bytes = user.password.encode('utf-8')
            user_password_bytes = sign_in_data.password.encode('utf-8')
            password_check = bcrypt.checkpw(user_password_bytes, table_password_bytes)

            if password_check:
                access_token = create_access_token({"sub": sign_in_data.user_name, "role": user.role})
                refresh_token = create_refresh_token({"sub": sign_in_data.user_name})
                return {"Status": "SIGN_IN COMPLETE!", "access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
            else:
                raise HTTPException(status_code=401, detail="SIGN_IN IS NOT COMPLETE!(")
        else:
            raise HTTPException(status_code=401, detail="Error, we didn't find this user")

@router_auth.post("/refresh")
async def refresh(user: User = Depends(verify_refresh_token)):
    access_token = create_access_token({"sub": user.user_name, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.user_name})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router_auth.post("/test", dependencies=[Depends(allow_roles(["user"]))])
async def test():
    return "You are user <3"


