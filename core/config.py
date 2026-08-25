import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_fallback_key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_EXPIRE_TIME = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_EXPIRE_TIME = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))