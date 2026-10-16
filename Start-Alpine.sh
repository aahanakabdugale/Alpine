#!/usr/bin/env bash
set -e

echo "===================================================="
echo "Starting Alpine Zero-Cloud Study Mentor"
echo "===================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 1. Locate existing virtual environment activation script (Unix 'bin' or Windows 'Scripts')
VENV_ACTIVATE=""
for candidate in \
    "$PROJECT_ROOT/.venv/bin/activate" \
    "$PROJECT_ROOT/.venv/Scripts/activate" \
    "$PROJECT_ROOT/venv/bin/activate" \
    "$PROJECT_ROOT/venv/Scripts/activate" \
    "$PROJECT_ROOT/backend/.venv/bin/activate" \
    "$PROJECT_ROOT/backend/.venv/Scripts/activate" \
    "$PROJECT_ROOT/backend/venv/bin/activate" \
    "$PROJECT_ROOT/backend/venv/Scripts/activate"; do
    if [ -f "$candidate" ]; then
        VENV_ACTIVATE="$candidate"
        break
    fi
done

# 2. If no virtual environment is found, create .venv in root
if [ -z "$VENV_ACTIVATE" ]; then
    echo "[Setup] No virtual environment detected. Creating .venv..."
    if command -v python3 >/dev/null 2>&1; then
        python3 -m venv "$PROJECT_ROOT/.venv"
    else
        python -m venv "$PROJECT_ROOT/.venv"
    fi

    if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
        VENV_ACTIVATE="$PROJECT_ROOT/.venv/bin/activate"
    elif [ -f "$PROJECT_ROOT/.venv/Scripts/activate" ]; then
        VENV_ACTIVATE="$PROJECT_ROOT/.venv/Scripts/activate"
    fi
fi

# Activate virtual environment
source "$VENV_ACTIVATE"

# Install all dependencies from requirements.txt
echo "[Setup] Installing backend dependencies from requirements.txt..."
if [ -f "$PROJECT_ROOT/requirements.txt" ]; then
    pip install -r "$PROJECT_ROOT/requirements.txt"
elif [ -f "$PROJECT_ROOT/backend/requirements.txt" ]; then
    pip install -r "$PROJECT_ROOT/backend/requirements.txt"
fi

# 3. Set PYTHONPATH equivalent to $env:PYTHONPATH="backend;."
export PYTHONPATH="$PROJECT_ROOT/backend:$PROJECT_ROOT:$PYTHONPATH"

# 4. Ensure frontend dependencies exist
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "[Setup] Installing frontend dependencies..."
    (cd "$PROJECT_ROOT/frontend" && npm install)
fi

# 5. Clean up background tasks on exit (Ctrl+C)
cleanup() {
    echo ""
    echo "Shutting down Alpine services..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 6. Launch FastAPI backend
echo "[1/2] Launching Backend (FastAPI)..."
(
    cd "$PROJECT_ROOT"
    python -m uvicorn app.main:app --reload --port 8000
) &

# 7. Launch Vite frontend
echo "[2/2] Launching Frontend (Vite + React)..."
(
    cd "$PROJECT_ROOT/frontend"
    npm run dev
) &

echo "===================================================="
echo "Services running!"
echo "Backend Docs: http://127.0.0.1:8000/docs"
echo "Frontend App:  http://localhost:5173"
echo "Press Ctrl+C to terminate both servers."
echo "===================================================="

wait