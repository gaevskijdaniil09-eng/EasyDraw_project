from DB import async_session_factory
from models import User, RoadmapNode, Resource, UserResourceProgress, UserNodeProgress, Posts, Comments, Likes
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy import select, insert, func
from sqlalchemy.orm import selectinload
from schemas import UserDTO,SignInDTO, PostCreateDTO
import bcrypt
from fastapi import HTTPException
from core.security import create_access_token, create_refresh_token, verify_refresh_token, allow_roles, get_current_user
from schemas import NodeCreateDTO, ResourceCreateDTO, NodeReadDTO
import uuid


router_community = APIRouter(prefix="/community", tags=["Community"])

@router_community.get("/show/posts", dependencies=[Depends(allow_roles(["user"]))])
async def show_posts():
    async with async_session_factory() as session:
        query = select(Posts).options(selectinload(Posts.user, Posts.likes, Posts.comments))
        res = await session.execute(query)
        result = res.scalars().all()
        return result

@router_community.post("/create/post")
async def create_post(photo: UploadFile, description: str, user_data = Depends(get_current_user)):
    async with async_session_factory() as session:
        file_extension = photo.filename.split(".")[-1]

        unique_name = f"{uuid.uuid4()}.{file_extension}"

        access_types = ["jpg", "jpeg", "png", "webp"]

        if file_extension.lower() not in access_types:
            raise HTTPException(status_code=400, detail="Wrong file type!")

        image_url = f"/static/{unique_name}"
        file_path = f"static/{unique_name}"

        content = await photo.read()

        with open(file_path, "wb") as f:
            f.write(content)

        query = insert(Posts).values(user_id=user_data.id, image_url=image_url, description=description)
        await session.execute(query)
        await session.commit()

        return {"status": "complete!", "image_url": image_url}