from DB import async_session_factory
from models import User, RoadmapNode, Resource, UserResourceProgress, UserSubNodeProgress, Posts, Comments, Likes
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy import select, insert, func, delete, update
from sqlalchemy.orm import selectinload
from schemas import UserDTO,SignInDTO, PostCreateDTO, CommentCreateDTO
import bcrypt
from fastapi import HTTPException, BackgroundTasks
from core.security import create_access_token, create_refresh_token, verify_refresh_token, allow_roles, get_current_user
from schemas import NodeCreateDTO, ResourceCreateDTO, NodeReadDTO
import uuid
import ollama
from ollama import AsyncClient


router_community = APIRouter(prefix="/community", tags=["Community"])

async def generate_tags(post_id: int, image: bytes):
    try:
        response = (await AsyncClient().generate(
            model="llava-phi3",
            prompt=(
                "List 5 to 7 short art tags for this image. "
                "Each tag must be 1 or 2 words only (for example: mask, warrior, digital art, dark fantasy, portrait). "
                "Do not write full sentences. Do not use bullet points or stars. Output ONLY comma-separated words."
            ),
            images=[image]
        ))

        raw_text = response.get("response", "")

        cleaned_text = raw_text.replace("\n", ",").replace("*", ",")

        for char in ['"', "'", "[", "]", "{", "}", "-", "."]:
            cleaned_text = cleaned_text.replace(char, "")

        raw_tags = cleaned_text.split(",")

        unique_tags = []
        for tag in raw_tags:
            clean_tag = tag.strip().lower()

            words = clean_tag.split()
            if (
                    clean_tag
                    and len(words) <= 3
                    and clean_tag not in unique_tags
                    and len(clean_tag) > 1
            ):
                unique_tags.append(clean_tag)

        final_tags = unique_tags[:7]

        if not final_tags:
            final_tags = ["art"]

        async with async_session_factory() as session:
            stmt = update(Posts).where(Posts.id == post_id).values(tags=final_tags)
            await session.execute(stmt)
            await session.commit()
    except Exception as e:
        print(f"Generation error! = {e}")


@router_community.get("/show/posts", dependencies=[Depends(allow_roles(["user"]))])
async def show_posts():
    async with async_session_factory() as session:
        query = select(Posts).options(selectinload(Posts.user),selectinload(Posts.likes),selectinload(Posts.comments))
        res = await session.execute(query)
        result = res.scalars().all()
        return result

@router_community.post("/create/post")
async def create_post(
        photo: UploadFile,
        description: str,
        background_tasks: BackgroundTasks,
        user_data = Depends(get_current_user)):
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

        query = insert(Posts).values(user_id=user_data.id, image_url=image_url, description=description, tags=[]).returning(Posts.id)
        result = await session.execute(query)
        new_post_id = result.scalar()
        await session.commit()

        background_tasks.add_task(generate_tags, new_post_id, content)

        return {"status": "complete!", "image_url": image_url, "tags": "processing..."}

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