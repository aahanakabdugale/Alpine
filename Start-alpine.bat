@echo off
title Alpine Zero-Cloud Study Mentor Launcher
echo ====================================================
echo Starting Alpine Zero-Cloud Study Mentor
echo ====================================================

:: Locate the Python virtual environment across common project setups
set "VENV_ACTIVATE="
if exist ".venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%CD%\.venv\Scripts\activate.bat"
) else if exist "venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%CD%\venv\Scripts\activate.bat"
) else if exist "backend\.venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%CD%\backend\.venv\Scripts\activate.bat"
) else if exist "backend\venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%CD%\backend\venv\Scripts\activate.bat"
)

:: If no virtual environment is found, create one automatically in root
if "%VENV_ACTIVATE%"=="" (
    echo [Setup] No virtual environment detected. Creating .venv...
    python -m venv .venv
    set "VENV_ACTIVATE=%CD%\.venv\Scripts\activate.bat"
    call "%VENV_ACTIVATE%"
    echo [Setup] Installing backend dependencies...
    pip install -r backend\requirements.txt
)

:: Ensure alpine.pth exists and points dynamically to the cloned project root
if exist "%CD%\.venv\Lib\site-packages" (
    (echo %CD% & echo %CD%\backend) > "%CD%\.venv\Lib\site-packages\alpine.pth"
)

:: Ensure frontend dependencies exist
if not exist "frontend\node_modules\" (
    echo [Setup] Installing frontend dependencies...
    cmd /c "cd frontend && npm install"
)

:: 1. Launch FastAPI Backend in a separate window
echo [1/2] Launching Backend (FastAPI)...
start "Alpine Backend" cmd /k "call ""%VENV_ACTIVATE%"" && cd backend && uvicorn app.main:app --reload --port 8000"

:: 2. Launch Vite Frontend in a separate window
echo [2/2] Launching Frontend (Vite + React)...
start "Alpine Frontend" cmd /k "cd frontend && npm run dev"

echo ====================================================
echo Services started!
echo Backend Docs: http://127.0.0.1:8000/docs
echo Frontend App:  http://localhost:5173
echo ====================================================