from fastapi import FastAPI
from fastapi.responses import Response, JSONResponse
from fastapi import File, HTTPException, UploadFile, Depends
import pandas as pd
from io import BytesIO
from typing import List, Dict
from typing import Annotated
from sqlalchemy.engine import Connection
from sqlalchemy import text
from database.local_db_client import get_local_db_connection

app = FastAPI()

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
async def upload_call_log(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")

    content = await file.read()

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

    return {
        "filename": file.filename,
        "count": len(records),
        "records": records[required_columns].to_dict(orient="records"),
    }

@app.get("/health")
def health_check(db: Annotated[Connection, Depends(get_local_db_connection)]):
    if not db:
        raise HTTPException(status_code=503, detail="Database unavailable")
    try:
        db.execute(text("SELECT 1")).scalar_one()
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")
    return JSONResponse(content={"status":"healthy"})