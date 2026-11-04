@echo off
title Digital APMC Launcher
echo ===================================================
echo           Starting Digital APMC Application
echo ===================================================

REM ---- First run: install packages and check the .env file ----
if not exist backend\.env (
  copy backend\.env.example backend\.env >nul
  echo.
  echo [!] backend\.env was created from the example. Open it, set MONGODB_URI and JWT_SECRET, then run this file again.
  pause
  exit /b
)
if not exist backend\node_modules (
  echo Installing backend packages...
  pushd backend
  call npm install
  popd
)
if not exist frontend\node_modules (
  echo Installing frontend packages...
  pushd frontend
  call npm install
  popd
)

echo [1/3] Starting Python Price Prediction Service (port 8000)...
start "Digital APMC - Price Predictor (Python)" cmd /k "cd price-prediction && python -m uvicorn api:app --host 127.0.0.1 --port 8000"

echo [2/3] Starting Backend API (port 5000)...
start "Digital APMC - Backend (Node.js)" cmd /k "cd backend && npm run dev"

echo [3/3] Starting Frontend (port 5173)...
start "Digital APMC - Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo Waiting for servers to initialize...
timeout /t 5 >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo Setup complete. Keep the opened terminal windows running while using the app.
echo (The SMS reminder service is optional: cd notification-service ^&^& npm install ^&^& npm start)
