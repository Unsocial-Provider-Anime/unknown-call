import logging
import os
from collections.abc import Iterator
from pathlib import Path

from dotenv import load_dotenv
from fastapi import HTTPException, Request
from psycopg import OperationalError as DriverOperationalError
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import DBAPIError, SQLAlchemyError, TimeoutError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def create_local_db_engine() -> Engine:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")
    database_url = os.getenv("DATABASE_URL")
    if not database_url or not database_url.strip():
        raise RuntimeError("DATABASE_URL must be configured")
    return create_engine(database_url, pool_pre_ping=True)


def probe_database(engine: Engine) -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1")).scalar_one()


def is_database_unavailable(error: SQLAlchemyError) -> bool:
    if isinstance(error, TimeoutError):
        return True
    if not isinstance(error, DBAPIError):
        return False
    if error.connection_invalidated:
        return True
    sqlstate = getattr(error.orig, "sqlstate", None)
    if sqlstate:
        return sqlstate.startswith("08") or sqlstate in {
            "57P01", "57P02", "57P03", "53300"
        }
    return isinstance(error.orig, DriverOperationalError)


def get_local_db_session(request: Request) -> Iterator[Session]:
    try:
        with request.app.state.session_factory() as session:
            yield session
    except SQLAlchemyError as exc:
        if not is_database_unavailable(exc):
            raise
        logger.error("Database unavailable (%s)", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        ) from None
