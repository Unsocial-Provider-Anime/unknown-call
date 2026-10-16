from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

from app.routes.calls import router as calls_router

app.include_router(calls_router)

@app.get("/")
def read_root():
    return JSONResponse(content={"message": "OK"})
