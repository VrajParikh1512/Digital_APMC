@echo off
title Digital APMC Launcher
echo ===================================================
echo           Starting Digital APMC Application
echo ===================================================

echo [1/3] Starting Python Price Prediction Service (port 8000)...
start "Digital APMC - Price Predictor (Python)" cmd /k "cd price-prediction && python -m uvicorn api:app --host 127.0.0.1 --port 8000"

echo [2/3] Starting Backend API (port 5000)...
start "Digital APMC - Backend (Node.js)" cmd /k "cd backend && npm run dev"

echo [3/3] Starting Frontend (port 5173)...
start "Digital APMC - Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo Waiting for servers to initialize...
timeout /t 3 >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo Setup complete. Keep the opened terminal windows running while using the app.

