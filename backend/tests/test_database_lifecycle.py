import importlib
from datetime import date, time
from unittest.mock import MagicMock

import psycopg
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import (
    IntegrityError, OperationalError, ProgrammingError, SQLAlchemyError, TimeoutError
)
from sqlalchemy.orm import Session, sessionmaker
from starlette.requests import Request

from app import main
from database import local_db_client

CSV_HEADER = "date,time,country_code,caller_number\r\n"
CSV_RECORD = "2026-10-15,12:30:00,852,12345678\r\n"
type DatabaseMocks = tuple[MagicMock, MagicMock, list[MagicMock], MagicMock]


@pytest.fixture
def database(monkeypatch: pytest.MonkeyPatch) -> DatabaseMocks:
    engine = MagicMock(spec=Engine)
    factory = MagicMock()
    sessions: list[MagicMock] = []

    def new_session() -> MagicMock:
        session = MagicMock(spec=Session)
        session.__enter__.return_value = session
        sessions.append(session)
        return session

    factory.side_effect = new_session
    monkeypatch.setattr(main, "create_local_db_engine", lambda: engine)
    constructor = MagicMock(return_value=factory)
    monkeypatch.setattr(main, "sessionmaker", constructor)
    return engine, factory, sessions, constructor


def test_import_does_not_initialize_database(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    initializer = MagicMock(side_effect=AssertionError("unexpected initialization"))
    monkeypatch.setattr(local_db_client, "create_engine", initializer)
    importlib.reload(main)
    initializer.assert_not_called()


def test_missing_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(local_db_client, "load_dotenv", MagicMock(return_value=False))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL must be configured"):
        with TestClient(main.app):
            pass


def test_engine_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    loader = MagicMock()
    creator = MagicMock()
    monkeypatch.setattr(local_db_client, "load_dotenv", loader)
    monkeypatch.setattr(local_db_client, "create_engine", creator)
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://localhost/test")
    assert local_db_client.create_local_db_engine() is creator.return_value
    assert loader.call_args.args[0].name == ".env.local"
    assert loader.call_args.args[0].parent.name == "backend"
    creator.assert_called_once_with(
        "postgresql+psycopg://localhost/test", pool_pre_ping=True
    )


def test_lifespan_probe_and_shutdown(database: DatabaseMocks) -> None:
    engine, factory, sessions, constructor = database
    with TestClient(main.app) as client:
        engine.connect.assert_called_once()
        connection = engine.connect.return_value.__enter__.return_value
        assert str(connection.execute.call_args.args[0]) == "SELECT 1"
        connection.execute.return_value.scalar_one.assert_called_once()
        engine.connect.return_value.__exit__.assert_called_once()
        constructor.assert_called_once_with(bind=engine, expire_on_commit=False)
        assert main.app.state.session_factory is factory
        engine.dispose.assert_not_called()
        assert client.get("/health").json() == {"status": "healthy"}
        assert client.get("/health").status_code == 200
        assert len(sessions) == 2
        assert sessions[0] is not sessions[1]
        for session in sessions:
            assert str(session.execute.call_args.args[0]) == "SELECT 1"
            session.__exit__.assert_called_once_with(None, None, None)
    engine.dispose.assert_called_once()


def test_failed_probe_disposes_engine(database: DatabaseMocks) -> None:
    engine, factory, sessions, constructor = database
    engine.connect.side_effect = OperationalError(
        None, None, psycopg.OperationalError("connection refused")
    )
    with pytest.raises(OperationalError):
        with TestClient(main.app):
            pytest.fail("startup must not complete")
    engine.dispose.assert_called_once()
    constructor.assert_not_called()


def test_exceptional_lifespan_exit_disposes_engine(database: DatabaseMocks) -> None:
    engine, factory, sessions, constructor = database
    with pytest.raises(RuntimeError, match="application failure"):
        with TestClient(main.app):
            raise RuntimeError("application failure")
    engine.dispose.assert_called_once()


def test_list_call_logs_returns_stable_ids(database: DatabaseMocks) -> None:
    engine, factory, sessions, constructor = database
    session = MagicMock(spec=Session)
    session.__enter__.return_value = session
    factory.side_effect = None
    factory.return_value = session
    session.execute.return_value.mappings.return_value.all.return_value = [
        {
            "id": 42,
            "date": date(2026, 10, 15),
            "time": time(12, 30),
            "country_code": "+852",
            "caller_number": "12345678",
        }
    ]

    with TestClient(main.app) as client:
        response = client.get("/api/calls/list")

    assert response.status_code == 200
    assert response.json() == {
        "call_logs": [
            {
                "id": 42,
                "date": "2026-10-15",
                "time": "12:30:00",
                "country_code": "+852",
                "caller_number": "12345678",
            }
        ]
    }
    statement = session.execute.call_args.args[0]
    assert statement.selected_columns.keys() == [
        "id",
        "date",
        "time",
        "country_code",
        "caller_number",
    ]


def test_upload_uses_bulk_insert_and_transaction(database: DatabaseMocks) -> None:
    engine, factory, sessions, constructor = database
    with TestClient(main.app) as client:
        response = client.post(
            "/api/calls/upload",
            files={"file": ("calls.csv", CSV_HEADER + CSV_RECORD, "text/csv")},
        )
    assert response.status_code == 200
    assert response.json()["count"] == 1
    session = sessions[0]
    session.begin.assert_called_once()
    session.begin.return_value.__exit__.assert_called_once_with(None, None, None)
    statement, mappings = session.execute.call_args.args
    assert statement.table.name == "call_records"
    assert mappings == [{
        "date": date(2026, 10, 15),
        "time": time(12, 30),
        "country_code": "+852",
        "caller_number": "12345678",
    }]
    session.__exit__.assert_called_once_with(None, None, None)


@pytest.mark.parametrize("failure_stage", ["execute", "commit"])
def test_failed_upload_closes_session_and_returns_503(
    database: DatabaseMocks, failure_stage: str
) -> None:
    engine, factory, sessions, constructor = database
    session = factory()
    factory.side_effect = None
    factory.return_value = session
    error = OperationalError(None, None, psycopg.OperationalError("disconnected"))
    if failure_stage == "execute":
        session.execute.side_effect = error
    else:
        session.begin.return_value.__exit__.side_effect = error
    with TestClient(main.app) as client:
        response = client.post(
            "/api/calls/upload",
            files={"file": ("calls.csv", CSV_HEADER + CSV_RECORD, "text/csv")},
        )
    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}
    session.begin.return_value.__exit__.assert_called_once()
    if failure_stage == "execute":
        assert session.begin.return_value.__exit__.call_args.args[0] is OperationalError
    assert session.__exit__.call_args.args[1] is error


@pytest.mark.parametrize("content,filename,status", [
    (CSV_HEADER, "calls.csv", 200),
    ("", "calls.csv", 400),
    ("date\r\n2026-10-15\r\n", "calls.csv", 422),
    (CSV_HEADER + "invalid,invalid,+852,12345678\r\n", "calls.csv", 422),
    (CSV_HEADER, "calls.txt", 400),
])
def test_upload_without_writes(
    database: DatabaseMocks, content: str, filename: str, status: int
) -> None:
    engine, factory, sessions, constructor = database
    with TestClient(main.app) as client:
        response = client.post(
            "/api/calls/upload", files={"file": (filename, content, "text/csv")}
        )
    assert response.status_code == status
    sessions[0].execute.assert_not_called()
    sessions[0].begin.assert_not_called()
    sessions[0].__exit__.assert_called_once()
    if status == 200:
        assert response.json()["count"] == 0


@pytest.mark.parametrize("error,status", [
    (TimeoutError("pool exhausted"), 503),
    (OperationalError(None, None, psycopg.OperationalError("offline")), 503),
    (ProgrammingError("bad SQL", None, Exception("invalid query")), 500),
    (IntegrityError("INSERT", None, Exception("constraint violation")), 500),
])
def test_health_error_responses(
    database: DatabaseMocks, error: SQLAlchemyError, status: int
) -> None:
    engine, factory, sessions, constructor = database
    session = factory()
    factory.side_effect = None
    factory.return_value = session
    session.execute.side_effect = error
    with TestClient(main.app, raise_server_exceptions=False) as client:
        response = client.get("/health")
    assert response.status_code == status
    assert session.__exit__.call_args.args[1] is error
    if status == 503:
        assert response.json() == {"detail": "Database unavailable"}


@pytest.mark.parametrize("sqlstate,unavailable", [
    ("08006", True), ("57P01", True), ("57P02", True),
    ("57P03", True), ("53300", True), ("40001", False),
    ("40P01", False), ("23505", False), ("42601", False),
])
def test_driver_error_classification(sqlstate: str, unavailable: bool) -> None:
    driver_error = psycopg.errors.lookup(sqlstate)("driver failure")
    error = OperationalError(None, None, driver_error)
    assert local_db_client.is_database_unavailable(error) is unavailable


def test_invalidated_connection_is_unavailable() -> None:
    error = OperationalError(None, None, Exception(), connection_invalidated=True)
    assert local_db_client.is_database_unavailable(error)


@pytest.mark.parametrize("fail_write", [False, True])
def test_real_session_commits_or_rolls_back(fail_write: bool) -> None:
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE transaction_test (id INTEGER PRIMARY KEY)"))
        application = main.FastAPI()
        application.state.session_factory = sessionmaker(bind=engine)
        request = Request({"type": "http", "app": application})
        dependency = local_db_client.get_local_db_session(request)
        session = next(dependency)
        try:
            with session.begin():
                session.execute(text("INSERT INTO transaction_test (id) VALUES (1)"))
                if fail_write:
                    session.execute(text("INSERT INTO transaction_test (id) VALUES (1)"))
        except IntegrityError as exc:
            with pytest.raises(IntegrityError):
                dependency.throw(exc)
        else:
            with pytest.raises(StopIteration):
                next(dependency)
        assert not session.in_transaction()
        with engine.connect() as connection:
            count = connection.execute(text("SELECT COUNT(*) FROM transaction_test")).scalar_one()
        assert count == (0 if fail_write else 1)
    finally:
        engine.dispose()