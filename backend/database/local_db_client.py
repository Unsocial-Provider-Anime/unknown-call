import os
from collections.abc import Iterator
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url, Connection
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException

load_dotenv(".env.local")

DATABASE_URL = os.getenv("DATABASE_URL","")

url = make_url(DATABASE_URL)
engine = create_engine(url, pool_pre_ping=True)

def get_local_db_connection() -> Iterator[Connection]:
    try:
        with engine.connect() as connection:
            yield connection
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        ) from None
