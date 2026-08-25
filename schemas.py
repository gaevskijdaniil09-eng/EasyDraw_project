from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from models import Level, Role
from datetime import datetime
from typing import Optional

class SignInDTO(BaseModel):
    user_name: str = Field(min_length=3, max_length=10)
    password: str

class UserDTO(SignInDTO):
    level: Level
    role: Role

class ShortUserDTO(BaseModel):
    id: int
    user_name: str

    model_config = ConfigDict(from_attributes=True)

class ResourceCreateDTO(BaseModel):
    node_id: int
    url: HttpUrl
    name: str
    step: int
    description: str

class ResourceReadDTO(BaseModel):
    id: int
    node_id: int
    url: str
    name: str
    step: int
    description: str

    model_config = ConfigDict(from_attributes=True)

class NodeCreateDTO(BaseModel):
    name: str
    description: str
    order_index: int
    category: str

class NodeReadDTO(BaseModel):
    id: int
    name: str
    description: str
    order_index: int
    category: str
    resources: list[ResourceReadDTO]

    model_config = ConfigDict(from_attributes=True)


class PostCreateDTO(BaseModel):
    user_id: int
    image_url: HttpUrl
    created_at: datetime
    description: str

class PostReadDTO(BaseModel):
    user_id: int
    image_url: str
    created_at: datetime
    description: Optional[str]
    author: Optional[ShortUserDTO] = None
    likes_count: int = 0
    comments_count: int = 0

    model_config = ConfigDict(from_attributes=True)

