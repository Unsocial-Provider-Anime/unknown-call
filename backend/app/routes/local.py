from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
from database.local_db_client import get_local_db_session
from pydantic import TypeAdapter, ValidationError
from app.models.call_record import CallRecordCreate
from database.tables import CallRecord
from sqlalchemy import insert, select, text
from sqlalchemy.orm import Session
from fastapi import Depends, File, HTTPException, UploadFile
from typing import Annotated
import pandas as pd
from io import BytesIO

router = APIRouter(prefix="/api/local", tags=["local"])

@router.get("/template")
def download_csv_template():
    return Response(
        content="date,time,country_code,caller_number\r\n",
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="call_log_template.csv"'},
    )


@router.post("/calls/upload")
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


@router.get("/calls/list")
def local_list_call_logs(
    db: Annotated[Session, Depends(get_local_db_session, scope="function")],
):
    result = (
        db.execute(
            select(
                CallRecord.id,
                CallRecord.date,
                CallRecord.time,
                CallRecord.country_code,
                CallRecord.caller_number,
            ).order_by(CallRecord.id)
        )
        .mappings()
        .all()
    )
    call_logs = [dict(row) for row in result]
    return {"call_logs": call_logs}


@router.get("/health")
def health_check(
    db: Annotated[Session, Depends(get_local_db_session, scope="function")],
):
    db.execute(text("SELECT 1")).scalar_one()
    return JSONResponse(content={"status": "healthy"})
