from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from database.supabase_client import get_supabase

router = APIRouter(prefix="/api/calls", tags=["calls"])


@router.get("/list")
def list_call_logs(supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.table("call_records").select("id,date,time,country_code,caller_number").execute()
        return {"call_logs": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching call logs: {e}")


@router.get("/volume")
def get_call_volume(
    period: Literal["day", "week", "month", "year"] = Query(default="day"),
    supabase: Client = Depends(get_supabase),
):
    try:
        response = supabase.rpc("get_call_volume", {"p_period": period}).execute()
        points = [
            {"date": point["bucket_start"], "count": point["call_count"]}
            for point in (response.data or [])
        ]
        return {"period": period, "points": points}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching call volume: {e}")


@router.get("/hourly")
def get_hourly_call_distribution(supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.rpc("get_call_hourly_distribution").execute()
        points = [
            {"hour": point["hour"], "count": point["call_count"]}
            for point in (response.data or [])
        ]
        return {"points": points}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching hourly call distribution: {e}"
        )
