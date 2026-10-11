#!/usr/bin/env bash
set -e

echo "===================================================="
echo "Starting Alpine Zero-Cloud Study Mentor"
echo "===================================================="

PROJECT_ROOT="$(pwd)"

# 1. Locate existing virtual environment across common layouts
VENV_ACTIVATE=""
if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
    VENV_ACTIVATE="$PROJECT_ROOT/.venv/bin/activate"
elif [ -f "$PROJECT_ROOT/venv/bin/activate" ]; then
    VENV_ACTIVATE="$PROJECT_ROOT/venv/bin/activate"
elif [ -f "$PROJECT_ROOT/backend/.venv/bin/activate" ]; then
    VENV_ACTIVATE="$PROJECT_ROOT/backend/.venv/bin/activate"
elif [ -f "$PROJECT_ROOT/backend/venv/bin/activate" ]; then
    VENV_ACTIVATE="$PROJECT_ROOT/backend/venv/bin/activate"
fi

# 2. If no virtual environment is found, create .venv in root
if [ -z "$VENV_ACTIVATE" ]; then
    echo "[Setup] No virtual environment detected. Creating .venv..."
    python3 -m venv "$PROJECT_ROOT/.venv"
    VENV_ACTIVATE="$PROJECT_ROOT/.venv/bin/activate"
    source "$VENV_ACTIVATE"
    echo "[Setup] Installing backend dependencies..."
    pip install -r "$PROJECT_ROOT/backend/requirements.txt"
else
    source "$VENV_ACTIVATE"
fi

# 3. Create alpine.pth dynamically inside site-packages (resolves 'engine' import)
SITE_PACKAGES=$(python3 -c "import site; print(site.getsitepackages()[0])")
if [ -d "$SITE_PACKAGES" ]; then
    printf "%s\n%s/backend\n" "$PROJECT_ROOT" "$PROJECT_ROOT" > "$SITE_PACKAGES/alpine.pth"
fi

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
    cd "$PROJECT_ROOT/backend"
    uvicorn app.main:app --reload --port 8000
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