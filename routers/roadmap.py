from DB import async_session_factory
from models import User, RoadmapNode, Resource, UserResourceProgress, UserNodeProgress
from fastapi import APIRouter, Depends
from sqlalchemy import select, insert, func
from sqlalchemy.orm import selectinload
from schemas import UserDTO,SignInDTO
import bcrypt
from fastapi import HTTPException
from core.security import create_access_token, create_refresh_token, verify_refresh_token, allow_roles, get_current_user
from schemas import NodeCreateDTO, ResourceCreateDTO, NodeReadDTO


router_roadmap = APIRouter(prefix="/roadmap", tags=["Roadmap"])

@router_roadmap.post("/create/node")
async def create_node(node_data: NodeCreateDTO):
    async with async_session_factory() as session:
        orm_node = RoadmapNode(**node_data.model_dump())
        session.add(orm_node)
        await session.commit()
        await session.refresh(orm_node)

        return {"status": "ok", "message": "completed", "node_id": orm_node.id}

@router_roadmap.post("/create/resource")
async def create_resource(resource_data: ResourceCreateDTO):
    async with async_session_factory() as session:
        orm_resource = Resource(**resource_data.model_dump(mode="json"))
        session.add(orm_resource)
        await session.commit()
        await session.refresh(orm_resource)

        return {"status": "ok", "message": "completed", "resource_id": orm_resource.id}

@router_roadmap.get("/", response_model=list[NodeReadDTO])
async def show_nodes():
    async with async_session_factory() as session:
        query = select(RoadmapNode).options(selectinload(RoadmapNode.resources)).order_by(RoadmapNode.id)
        result = await session.execute(query)
        nodes = result.scalars().all()
        return nodes

@router_roadmap.post("/toggle")
async def toggle_progress(resource_id: int, user: User = Depends(get_current_user)):
    async with async_session_factory() as session:

        resource = await session.get(Resource, resource_id)
        if not resource:
            return {"error": "Resource not found"}

        node_id: int = resource.node_id

        query = (
            select(UserResourceProgress).
            where(UserResourceProgress.resource_id == resource_id, UserResourceProgress.user_id == user.id).
            options(selectinload(UserResourceProgress.resource))
        )

        res = await session.execute(query)
        progress = res.scalar_one_or_none()

        if progress:
            progress.is_completed = not progress.is_completed
        else:
            progress = UserResourceProgress(user_id=user.id, resource_id=resource_id, is_completed=True)
            session.add(progress)

        await session.flush()


        total_resources_query =  (
            select(func.count(Resource.id)).where(Resource.node_id == node_id)
        )

        total_count = (await session.execute(total_resources_query)).scalar() or 0

        completed_resources_query = (
            select(func.count(UserResourceProgress.resource_id)).
            join(Resource, UserResourceProgress.resource_id == Resource.id).
            where(UserResourceProgress.user_id == user.id, Resource.node_id == node_id, UserResourceProgress.is_completed == True)
        )

        completed_count = (await session.execute(completed_resources_query)).scalar() or 0
        id_node_completed = (total_count > 0) and (completed_count == total_count)

        query_toggle_node = (
            select(UserNodeProgress).
            where(UserNodeProgress.user_id == user.id, UserNodeProgress.node_id == node_id)
        )
        node_progress = (await session.execute(query_toggle_node)).scalar_one_or_none()

        if node_progress:
            node_progress.is_completed = id_node_completed
        else:
            creating_node_progress = UserNodeProgress(user_id=user.id, node_id=node_id, is_completed=id_node_completed)
            session.add(creating_node_progress)

        await session.commit()

        return {
            "resource_id": resource_id,
            "resource_completed": progress.is_completed,
            "node_id": node_id,
            "node_completed": id_node_completed
        }