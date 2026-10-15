# Backend

Run backend commands from this directory using the project environment:

```powershell
uv sync
uv run uvicorn app.main:app --reload
```

Configure `DATABASE_URL` in the process environment or in `backend/.env.local`.
The environment file is resolved relative to the backend directory, and existing
environment variables take precedence. Use a synchronous PostgreSQL URL such as
`postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE`.

The existing database migration must be applied before using the upload endpoint.
The application does not create or alter tables automatically.

## Database Lifecycle

FastAPI lifespan creates one SQLAlchemy engine and session factory per server
process. Startup must execute `SELECT 1` successfully before accepting requests.
Missing configuration or an unreachable database prevents startup. The engine
is disposed during shutdown and if the startup probe fails. Blocking probe and
disposal work runs in a thread pool rather than on the event loop.

Each database-using request receives its own synchronous ORM session. The
dependency closes it before the response is sent; it does not commit writes.
Write operations own explicit `session.begin()` transactions, which commit on
success and roll back on failure. Keep database-using handlers synchronous.

`GET /health` executes `SELECT 1` to check ongoing database availability.
Connection failures, unavailable PostgreSQL states, and pool timeouts return
`503` with `{"detail": "Database unavailable"}`. Unexpected query and integrity
errors are not reclassified as availability failures. The startup probe checks
connectivity, not whether application tables or migrations are up to date.

## Tests

```powershell
uv run pytest -q tests/test_database_lifecycle.py --maxfail=1 --tb=short --timeout=60
```

Tests use mocks for application lifecycle and HTTP behavior, plus an isolated
SQLite table for generic Session commit/rollback checks. They do not require
database credentials or prove PostgreSQL schema and driver integration. Verify
real uploads and failed-write atomicity separately against a disposable
PostgreSQL database with the existing migration applied.
