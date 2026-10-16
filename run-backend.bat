@echo off
title Alpine Backend (FastAPI)
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
cd /d "%PROJECT_ROOT%"

:: Activate virtual environment if present
if exist "%PROJECT_ROOT%\.venv\Scripts\activate.bat" (
    call "%PROJECT_ROOT%\.venv\Scripts\activate.bat"
) else if exist "%PROJECT_ROOT%\venv\Scripts\activate.bat" (
    call "%PROJECT_ROOT%\venv\Scripts\activate.bat"
) else if exist "%PROJECT_ROOT%\backend\.venv\Scripts\activate.bat" (
    call "%PROJECT_ROOT%\backend\.venv\Scripts\activate.bat"
) else if exist "%PROJECT_ROOT%\backend\venv\Scripts\activate.bat" (
    call "%PROJECT_ROOT%\backend\venv\Scripts\activate.bat"
)

:: Set PYTHONPATH equivalent to $env:PYTHONPATH="backend;."
set "PYTHONPATH=%PROJECT_ROOT%\backend;%PROJECT_ROOT%;backend;."

echo Starting Alpine Backend on http://127.0.0.1:8000 ...
python -m uvicorn app.main:app --reload --port 8000
if %errorlevel% neq 0 (
    echo.
    echo Backend crashed with error code %errorlevel%.
    pause
)
