from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
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