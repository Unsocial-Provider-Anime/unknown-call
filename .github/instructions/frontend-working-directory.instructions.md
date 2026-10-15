---
description: "Use when running, testing, building, or debugging frontend code; run frontend commands from the frontend directory."
applyTo: "frontend/**"
---
# Frontend Working Directory

- Before running or importing frontend code, change the shell's working directory to the repository's `frontend/` directory. From the repository root, use `Set-Location frontend` in PowerShell or the equivalent command for the shell; do not assume the shell already starts there.
- Run frontend package-manager commands, scripts, tests, builds, and development servers from `frontend/`.
- If a command needs to access files outside `frontend/`, keep the working directory at `frontend/` and use paths relative to it, unless the command explicitly requires another working directory.
- Reading, editing, or discussing frontend source alone does not require changing the working directory.