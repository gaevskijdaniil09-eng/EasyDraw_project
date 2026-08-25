from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routers.users import router_users
from routers.auth import router_auth
from routers.roadmap import router_roadmap
from fastapi.middleware.cors import CORSMiddleware
from routers.community import router_community

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:5173", "http://localhost:5174"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"]
)

app.include_router(router_users)
app.include_router(router_auth)
app.include_router(router_roadmap)
app.include_router(router_community)

app.mount("/static", StaticFiles(directory="uploads"), name="static")
