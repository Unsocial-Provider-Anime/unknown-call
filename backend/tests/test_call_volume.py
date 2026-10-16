from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes.calls import build_day_of_week_analysis
from database.supabase_client import get_supabase


@pytest.fixture
def supabase_client() -> MagicMock:
    client = MagicMock()
    app.dependency_overrides[get_supabase] = lambda: client
    yield client
    app.dependency_overrides.pop(get_supabase, None)


@pytest.mark.parametrize("period", ["day", "week", "month", "year"])
def test_call_volume_uses_requested_period(
    supabase_client: MagicMock, period: str
) -> None:
    supabase_client.rpc.return_value.execute.return_value.data = [
        {"bucket_start": "2026-10-15", "call_count": 3}
    ]

    with TestClient(app) as client:
        response = client.get("/api/calls/volume", params={"period": period})

    assert response.status_code == 200
    assert response.json() == {
        "period": period,
        "points": [{"date": "2026-10-15", "count": 3}],
    }
    supabase_client.rpc.assert_called_once_with(
        "get_call_volume", {"p_period": period}
    )


def test_call_volume_defaults_to_daily(supabase_client: MagicMock) -> None:
    supabase_client.rpc.return_value.execute.return_value.data = []

    with TestClient(app) as client:
        response = client.get("/api/calls/volume")

    assert response.status_code == 200
    assert response.json() == {"period": "day", "points": []}
    supabase_client.rpc.assert_called_once_with(
        "get_call_volume", {"p_period": "day"}
    )


def test_call_volume_rejects_unsupported_period(
    supabase_client: MagicMock,
) -> None:
    with TestClient(app) as client:
        response = client.get("/api/calls/volume", params={"period": "hour"})

    assert response.status_code == 422
    supabase_client.rpc.assert_not_called()


def test_hourly_call_distribution_maps_hour_counts(
    supabase_client: MagicMock,
) -> None:
    supabase_client.rpc.return_value.execute.return_value.data = [
        {"hour": 0, "call_count": 2},
        {"hour": 23, "call_count": 5},
    ]

    with TestClient(app) as client:
        response = client.get("/api/calls/hourly")

    assert response.status_code == 200
    assert response.json() == {
        "points": [{"hour": 0, "count": 2}, {"hour": 23, "count": 5}]
    }
    supabase_client.rpc.assert_called_once_with("get_call_hourly_distribution")


def test_hourly_call_distribution_handles_no_records(
    supabase_client: MagicMock,
) -> None:
    supabase_client.rpc.return_value.execute.return_value.data = None

    with TestClient(app) as client:
        response = client.get("/api/calls/hourly")

    assert response.status_code == 200
    assert response.json() == {"points": []}
    supabase_client.rpc.assert_called_once_with("get_call_hourly_distribution")


def test_day_of_week_analysis_accounts_for_unequal_exposure() -> None:
    points = [
        {"iso_day": day, "call_count": 15 if day <= 5 else 6, "observed_days": 5 if day <= 5 else 2}
        for day in range(1, 8)
    ]

    result = build_day_of_week_analysis(points)

    assert result["weekday"]["calls_per_day"] == 3
    assert result["weekend"]["calls_per_day"] == 3
    assert result["rate_ratio"] == 1
    assert result["p_value"] == pytest.approx(1)
    assert len(result["days"]) == 7


def test_day_of_week_analysis_handles_no_calls() -> None:
    result = build_day_of_week_analysis(
        [
            {"iso_day": day, "call_count": 0, "observed_days": 1}
            for day in range(1, 8)
        ]
    )

    assert result["test_available"] is False
    assert result["p_value"] is None
    assert result["test_unavailable_reason"] == "No calls occurred in the observed date range."


def test_day_of_week_analysis_represents_infinite_rate_ratio() -> None:
    points = [
        {"iso_day": day, "call_count": 20 if day == 1 else 0, "observed_days": 1}
        for day in range(1, 8)
    ]

    result = build_day_of_week_analysis(points)

    assert result["test_available"] is True
    assert result["rate_ratio"] is None
    assert result["confidence_interval_95"]["upper"] is None
    assert result["p_value"] < 0.05


def test_day_of_week_route_maps_rpc_result(supabase_client: MagicMock) -> None:
    supabase_client.rpc.return_value.execute.return_value.data = [
        {"iso_day": day, "call_count": 10 if day <= 5 else 2, "observed_days": 5 if day <= 5 else 2}
        for day in range(1, 8)
    ]

    with TestClient(app) as client:
        response = client.get("/api/calls/day-of-week")

    assert response.status_code == 200
    body = response.json()
    assert len(body["days"]) == 7
    assert body["weekday"]["call_count"] == 50
    assert body["weekend"]["call_count"] == 4
    assert body["test_available"] is True
    supabase_client.rpc.assert_called_once_with("get_call_day_of_week_analysis")


def test_day_of_week_route_handles_no_records(supabase_client: MagicMock) -> None:
    supabase_client.rpc.return_value.execute.return_value.data = None

    with TestClient(app) as client:
        response = client.get("/api/calls/day-of-week")

    assert response.status_code == 200
    body = response.json()
    assert len(body["days"]) == 7
    assert body["test_available"] is False
    assert body["p_value"] is None