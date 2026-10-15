---
description: "Use when running, testing, debugging, or importing backend Python code; keeps scripts and tools in the project's virtual environment."
applyTo: "backend/**/*.py"
---
# Backend Python Environment

- Before running or importing backend Python code, change the shell's working directory to the repository's `backend/` directory. From the repository root, use `Set-Location backend` in PowerShell or the equivalent command for the shell; do not assume the shell already starts there.
- Run backend Python commands through the project environment. Prefer `uv run <command>` from `backend/`.
- If the shell must be activated manually, first change to `backend/` and activate `.venv` with `.\.venv\Scripts\Activate.ps1` in PowerShell or `.\.venv\Scripts\activate.bat` in Command Prompt.
- If `.venv` is missing or dependencies need synchronization, run `uv sync` from `backend/` before executing Python code.
- Use this rule for commands that execute or import backend Python, including scripts, the app, tests, and debugging. Reading, editing, or discussing Python source alone does not require environment activation.