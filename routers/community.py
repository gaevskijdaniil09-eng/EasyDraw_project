from DB import async_session_factory
from models import User, RoadmapNode, Resource, UserResourceProgress, UserSubNodeProgress, Posts, Comments, Likes
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy import select, insert, func, delete
from sqlalchemy.orm import selectinload
from schemas import UserDTO,SignInDTO, PostCreateDTO, CommentCreateDTO
import bcrypt
from fastapi import HTTPException
from core.security import create_access_token, create_refresh_token, verify_refresh_token, allow_roles, get_current_user
from schemas import NodeCreateDTO, ResourceCreateDTO, NodeReadDTO
import uuid


router_community = APIRouter(prefix="/community", tags=["Community"])

@router_community.get("/show/posts", dependencies=[Depends(allow_roles(["user"]))])
async def show_posts():
    async with async_session_factory() as session:
        query = select(Posts).options(selectinload(Posts.user),selectinload(Posts.likes),selectinload(Posts.comments))
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

@router_community.post("/add/like")
async def add_like(post_id: int, user_data = Depends(get_current_user)):
    async with async_session_factory() as session:
        select_query = select(Likes).where(Likes.user_id == user_data.id, Likes.post_id == post_id)
        result = await session.execute(select_query)
        user_likes = result.scalar_one_or_none()
        if user_likes:
            await session.delete(user_likes)
            await session.commit()
            return {"Status": "Unliked"}
        else:
            query = insert(Likes).values(user_id=user_data.id, post_id=post_id)
            await session.execute(query)
            await session.commit()
            return {"Status": "Liked"}

@router_community.post("/add/comment")
async def add_comment(comment_data: CommentCreateDTO, user_data = Depends(get_current_user)):
    async with async_session_factory() as session:
        if comment_data.text.strip():
            comment_obj = Comments(post_id=comment_data.post_id, user_id=user_data.id, text=comment_data.text)
            session.add(comment_obj)
            await session.commit()
            return {"Status": "Added"}
        else:
            raise HTTPException(status_code=400, detail="Text cannot be empty")