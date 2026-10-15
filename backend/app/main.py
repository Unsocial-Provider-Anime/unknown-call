from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import Response, JSONResponse
from fastapi import File, HTTPException, UploadFile, Depends
import pandas as pd
from io import BytesIO
from typing import Annotated
from sqlalchemy import insert, text
from sqlalchemy.orm import Session, sessionmaker
from starlette.concurrency import run_in_threadpool
from pydantic import TypeAdapter, ValidationError
from app.models.call_record import CallRecordCreate
from database.local_db_client import (
    create_local_db_engine,
    get_local_db_session,
    probe_database,
)
from database.tables import CallRecord


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    engine = await run_in_threadpool(create_local_db_engine)
    try:
        await run_in_threadpool(probe_database, engine)
        app.state.engine = engine
        app.state.session_factory = sessionmaker(
            bind=engine, expire_on_commit=False
        )
        yield
    finally:
        await run_in_threadpool(engine.dispose)


app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return JSONResponse(content={"message":"Backend"})

@app.get("/api/template")
def download_csv_template():
    return Response(
        content="date,time,country_code,caller_number\r\n",
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="call_log_template.csv"'
        },
    )

@app.post("/api/calls/upload")
def upload_call_log(
    db: Annotated[Session, Depends(get_local_db_session, scope="function")],
    file: UploadFile = File(...),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    content = file.file.read()

    try:
        records = pd.read_csv(
            BytesIO(content),
            encoding="utf-8-sig",
            dtype=str,
            keep_default_na=False,
        )
    except (UnicodeDecodeError, pd.errors.ParserError, pd.errors.EmptyDataError):
        raise HTTPException(status_code=400, detail="Invalid or empty CSV file.")

    required_columns = ["date", "time", "country_code", "caller_number"]
    missing_columns = [
        column for column in required_columns if column not in records.columns
    ]
    if missing_columns:
        raise HTTPException(
            status_code=422,
            detail={"missing_columns": missing_columns},
        )

    try:
        validated_records = TypeAdapter(list[CallRecordCreate]).validate_python(
            records[required_columns].to_dict(orient="records")
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.errors(include_context=False, include_url=False),
        ) from None

    if validated_records:
        with db.begin():
            db.execute(
                insert(CallRecord),
                [record.model_dump() for record in validated_records],
            )

    return {
        "filename": file.filename,
        "count": len(validated_records),
    }

@app.get("/health")
def health_check(
    db: Annotated[Session, Depends(get_local_db_session, scope="function")],
):
    db.execute(text("SELECT 1")).scalar_one()
    return JSONResponse(content={"status":"healthy"})