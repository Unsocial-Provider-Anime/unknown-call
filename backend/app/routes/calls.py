from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from scipy.stats import binomtest
from supabase import Client

from database.supabase_client import get_supabase

router = APIRouter(prefix="/api/calls", tags=["calls"])
DAY_NAMES = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def build_day_of_week_analysis(points: list[dict[str, int]]) -> dict:
    counts_by_day = {
        point["iso_day"]: point for point in points if 1 <= point["iso_day"] <= 7
    }
    days = [
        {
            "day": name,
            "call_count": counts_by_day.get(index, {}).get("call_count", 0),
            "observed_days": counts_by_day.get(index, {}).get("observed_days", 0),
            "calls_per_day": (
                counts_by_day[index]["call_count"] / counts_by_day[index]["observed_days"]
                if counts_by_day.get(index, {}).get("observed_days", 0) > 0
                else 0.0
            ),
        }
        for index, name in enumerate(DAY_NAMES, start=1)
    ]
    weekday_days = sum(day["observed_days"] for day in days[:5])
    weekend_days = sum(day["observed_days"] for day in days[5:])
    weekday_calls = sum(day["call_count"] for day in days[:5])
    weekend_calls = sum(day["call_count"] for day in days[5:])
    total_calls = weekday_calls + weekend_calls
    comparison = {
        "weekday": {
            "call_count": weekday_calls,
            "observed_days": weekday_days,
            "calls_per_day": weekday_calls / weekday_days if weekday_days else 0.0,
        },
        "weekend": {
            "call_count": weekend_calls,
            "observed_days": weekend_days,
            "calls_per_day": weekend_calls / weekend_days if weekend_days else 0.0,
        },
        "rate_ratio": None,
        "confidence_interval_95": None,
        "p_value": None,
        "test_available": False,
        "test_unavailable_reason": None,
    }

    if weekday_days == 0 or weekend_days == 0:
        comparison["test_unavailable_reason"] = (
            "Both weekdays and weekend days must be observed to compare rates."
        )
    elif total_calls == 0:
        comparison["test_unavailable_reason"] = "No calls occurred in the observed date range."
    else:
        test = binomtest(
            weekday_calls,
            total_calls,
            p=weekday_days / (weekday_days + weekend_days),
        )
        interval = test.proportion_ci(confidence_level=0.95, method="exact")
        exposure_ratio = weekend_days / weekday_days
        comparison.update(
            {
                "rate_ratio": (
                    weekday_calls * exposure_ratio / weekend_calls
                    if weekend_calls
                    else None
                ),
                "confidence_interval_95": {
                    "lower": interval.low / (1 - interval.low) * exposure_ratio,
                    "upper": (
                        interval.high / (1 - interval.high) * exposure_ratio
                        if interval.high < 1
                        else None
                    ),
                },
                "p_value": test.pvalue,
                "test_available": True,
            }
        )

    return {"days": days, **comparison}


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


@router.get("/day-of-week")
def get_call_day_of_week_analysis(supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.rpc("get_call_day_of_week_analysis").execute()
        points = [
            {
                "iso_day": int(point["iso_day"]),
                "call_count": int(point["call_count"]),
                "observed_days": int(point["observed_days"]),
            }
            for point in (response.data or [])
        ]
        return build_day_of_week_analysis(points)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching day-of-week analysis: {e}"
        )


@router.get("/caller-frequency")
def get_caller_frequency_distribution(supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.rpc("get_caller_frequency_distribution").execute()
        if response.data is None:
            return {
                "summary": {
                    "total_calls": 0,
                    "distinct_callers": 0,
                    "one_time_callers": 0,
                    "repeat_callers": 0,
                },
                "distribution": [],
                "top_callers": [],
            }
        return {
            "summary": response.data["summary"],
            "distribution": response.data["distribution"],
            "top_callers": response.data["top_callers"],
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching caller frequency distribution: {e}"
        )
