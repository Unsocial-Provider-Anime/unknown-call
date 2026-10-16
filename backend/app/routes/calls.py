from fastapi import APIRouter, Depends
from supabase import Client
from fastapi import Depends, HTTPException

from database.supabase_client import get_supabase

router = APIRouter(prefix="/api/calls", tags=["calls"])

@router.get("/list")
def list_call_logs(supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.table("call_records").select("id,date,time,country_code,caller_number").execute()
        return {"call_logs": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching call logs: {e}")
