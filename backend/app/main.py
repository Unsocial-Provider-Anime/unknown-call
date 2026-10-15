from fastapi import FastAPI
from fastapi.responses import Response, JSONResponse

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

@app.get("/health")
def health_check():
    return JSONResponse(content={"status":"healthy"})