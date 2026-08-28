import enum
from datetime import datetime
from DB import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Annotated, Optional
from sqlalchemy import String, ForeignKey, MetaData, func, ARRAY
metadata_obj = MetaData()


int_pk=Annotated[int, mapped_column(primary_key=True, index=True)]
str10=Annotated[str, mapped_column(String(10))]
str30=Annotated[str, mapped_column(String(30))]
str50=Annotated[str, mapped_column(String(50))]
str150=Annotated[str, mapped_column(String(150))]

class Level(str, enum.Enum):
    noob="noob"
    average="average"
    pro="pro"

class Role(str, enum.Enum):
    user="user"
    admin="admin"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int_pk]
    user_name: Mapped[str30]
    password: Mapped[str]
    level: Mapped[Level] = mapped_column(default=Level.noob)
    role: Mapped[Role] = mapped_column(default=Role.user)

    posts: Mapped[list["Posts"]] = relationship(back_populates="user")
    comments: Mapped[list["Comments"]] = relationship(back_populates="author")
    likes: Mapped[list["Likes"]] = relationship(back_populates="user")

class RoadmapNode(Base):
    __tablename__ = "node"
    id: Mapped[int_pk]
    name: Mapped[str30]
    description: Mapped[str150]
    order_index: Mapped[int]
    category: Mapped[str50]
    subnodes: Mapped[list["SubNode"]] = relationship(back_populates="node")

class SubNode(Base):
    __tablename__ = "subnode"
    id: Mapped[int_pk]
    node_id: Mapped[int] = mapped_column(ForeignKey("node.id"))
    name: Mapped[str30]
    description: Mapped[str150]
    order_index: Mapped[int]
    category: Mapped[str50]
    resources: Mapped[list["Resource"]] = relationship(back_populates="subnode", cascade="all, delete-orphan")
    node: Mapped[RoadmapNode] = relationship(back_populates="subnodes")

class Resource(Base):
    __tablename__ = "resources"
    id: Mapped[int_pk]
    subnode_id: Mapped[int] = mapped_column(ForeignKey("subnode.id"))
    url: Mapped[str]
    name: Mapped[str50]
    step: Mapped[int]
    description: Mapped[str150]
    subnode: Mapped["SubNode"] = relationship(back_populates="resources")
    resource_progress: Mapped[list["UserResourceProgress"]] = relationship(back_populates="resource")

class UserSubNodeProgress(Base):
    __tablename__ = "subnode_progress"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    subnode_id: Mapped[int] = mapped_column(ForeignKey("subnode.id", ondelete="CASCADE"), primary_key=True)
    is_completed: Mapped[bool] = mapped_column(default=False)

class UserResourceProgress(Base):
    __tablename__ = "resource_progress"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True)
    resource: Mapped["Resource"] = relationship(back_populates="resource_progress")
    is_completed: Mapped[bool] = mapped_column(default=False)

class Posts(Base):
    __tablename__ = "posts"
    id: Mapped[int_pk]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    image_url: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    description: Mapped[Optional[str]] = mapped_column(default=None)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    user: Mapped["User"] = relationship(back_populates="posts")
    comments: Mapped[list["Comments"]] = relationship(back_populates="post")
    likes: Mapped[list["Likes"]] = relationship(back_populates="post", cascade="all, delete-orphan")


class Comments(Base):
    __tablename__ = "comments"
    id: Mapped[int_pk]
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    text: Mapped[str150]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    post: Mapped["Posts"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship(back_populates="comments")

class Likes(Base):
    __tablename__ = "likes"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)

    post: Mapped["Posts"] = relationship(back_populates="likes")
    user: Mapped["User"] = relationship(back_populates="likes")