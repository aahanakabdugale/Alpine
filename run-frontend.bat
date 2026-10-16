@echo off
title Alpine Frontend (Vite + React)
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
cd /d "%PROJECT_ROOT%\frontend"

echo Starting Alpine Frontend on http://localhost:5173 ...
npm run dev
if %errorlevel% neq 0 (
    echo.
    echo Frontend crashed with error code %errorlevel%.
    pause
)
