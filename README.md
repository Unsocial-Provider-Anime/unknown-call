# Unknown Call

A call-log analysis application with a React frontend and a Python API for call records and usage analytics.

## Tech Stack

### Frontend

- **Language and framework:** TypeScript, React 19
- **Build and development:** Vite
- **Routing and server state:** TanStack Router, TanStack Query
- **UI and visualization:** Material UI, MUI X Charts, MUI X Data Grid, MUI X Date Pickers, Emotion
- **Forms and validation:** React Hook Form, Zod, `@hookform/resolvers`
- **Date utilities:** Day.js
- **Quality and testing:** ESLint, TypeScript, Playwright

### Backend

- **Language and API:** Python 3.14+, FastAPI
- **Database access:** Supabase Python client for call-record queries and PostgreSQL RPC functions; SQLAlchemy 2.x and Psycopg for PostgreSQL engine/session management
- **Data and statistical analysis:** Pandas, SciPy, OpenPyXL
- **Configuration:** python-dotenv
- **Testing:** pytest, pytest-timeout

The backend includes migrations for the `call_records` table and PostgreSQL call-volume and call-distribution functions. See [backend/README.md](backend/README.md) for database configuration and lifecycle details.

## Development

Start the API from the `backend` directory:

```powershell
uv sync
uv run uvicorn app.main:app --reload
```

Start the frontend from the `frontend` directory:

```powershell
npm install
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:8000`.
