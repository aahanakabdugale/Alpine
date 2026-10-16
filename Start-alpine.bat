@echo off
title Alpine Zero-Cloud Study Mentor Launcher
echo ====================================================
echo Starting Alpine Zero-Cloud Study Mentor
echo ====================================================

:: Resolve project root directory safely
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
cd /d "%PROJECT_ROOT%"

:: Locate the Python virtual environment across common project setups
set "VENV_ACTIVATE="
if exist "%PROJECT_ROOT%\.venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%PROJECT_ROOT%\.venv\Scripts\activate.bat"
) else if exist "%PROJECT_ROOT%\venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%PROJECT_ROOT%\venv\Scripts\activate.bat"
) else if exist "%PROJECT_ROOT%\backend\.venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%PROJECT_ROOT%\backend\.venv\Scripts\activate.bat"
) else if exist "%PROJECT_ROOT%\backend\venv\Scripts\activate.bat" (
    set "VENV_ACTIVATE=%PROJECT_ROOT%\backend\venv\Scripts\activate.bat"
)

:: If no virtual environment is found, create one automatically in root
if "%VENV_ACTIVATE%"=="" (
    echo [Setup] No virtual environment detected. Creating .venv...
    python -m venv "%PROJECT_ROOT%\.venv"
    set "VENV_ACTIVATE=%PROJECT_ROOT%\.venv\Scripts\activate.bat"
)

:: Activate the virtual environment
call "%VENV_ACTIVATE%"

:: Install all dependencies from requirements.txt
echo [Setup] Installing backend dependencies from requirements.txt...
if exist "%PROJECT_ROOT%\requirements.txt" (
    pip install -r "%PROJECT_ROOT%\requirements.txt"
) else if exist "%PROJECT_ROOT%\backend\requirements.txt" (
    pip install -r "%PROJECT_ROOT%\backend\requirements.txt"
)

:: Set PYTHONPATH equivalent to $env:PYTHONPATH="backend;."
set "PYTHONPATH=%PROJECT_ROOT%\backend;%PROJECT_ROOT%;backend;."

:: Ensure alpine.pth exists and points dynamically to the cloned project root
if exist "%PROJECT_ROOT%\.venv\Lib\site-packages" (
    (echo %PROJECT_ROOT% & echo %PROJECT_ROOT%\backend) > "%PROJECT_ROOT%\.venv\Lib\site-packages\alpine.pth"
)

:: Ensure frontend dependencies exist
if not exist "%PROJECT_ROOT%\frontend\node_modules\" (
    echo [Setup] Installing frontend dependencies...
    cmd /c "cd /d ""%PROJECT_ROOT%\frontend"" && npm install"
)

:: 1. Launch FastAPI Backend in a separate window
echo [1/2] Launching Backend (FastAPI)...
start "Alpine Backend" "%PROJECT_ROOT%\run-backend.bat"

:: 2. Launch Vite Frontend in a separate window
echo [2/2] Launching Frontend (Vite + React)...
start "Alpine Frontend" "%PROJECT_ROOT%\run-frontend.bat"

echo ====================================================
echo Services started!
echo Backend Docs: http://127.0.0.1:8000/docs
echo Frontend App:  http://localhost:5173
echo ====================================================