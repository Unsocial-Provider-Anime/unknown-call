---
description: "Use when running, selecting, or troubleshooting backend pytest tests; keeps test runs focused, time-bounded, and inside the project environment."
applyTo: "backend/**/*.py"
---
# Backend Pytest

- Run pytest from `backend/` through the project environment with `uv run`.
- For a focused test, target the test file or node ID first:
  `uv run pytest -q path/to/test_file.py::test_name --maxfail=1 --tb=short --timeout=60`
- Use this compact, fail-fast command for a broader run:
  `uv run pytest -q --maxfail=1 --tb=short --timeout=60`
- Treat `--timeout=60` as a per-test limit, not a limit on total suite duration.
- If no tests are collected, report that clearly; do not describe it as a passing test run.