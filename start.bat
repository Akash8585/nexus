@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Nexus
echo.
echo  ================================
echo   NEXUS - Starting up...
echo  ================================
echo.

echo [1/3] Checking Docker...
docker info > nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker is not running.
  echo Please start Docker Desktop first.
  echo.
  pause
  exit /b 1
)
echo  Docker is running

echo.
echo [2/3] Starting services - Kafka, Redis, API...
docker compose up -d
if errorlevel 1 (
  echo ERROR: Failed to start services.
  pause
  exit /b 1
)

echo.
echo [3/3] Waiting for API on port 8000...
set tries=0
:wait_api
curl -sf http://localhost:8000/health > nul 2>&1
if not errorlevel 1 goto api_ready
set /a tries+=1
if %tries% geq 90 (
  echo ERROR: API did not become ready within 3 minutes.
  echo Check: docker compose logs nexus-bus
  pause
  exit /b 1
)
ping -n 3 127.0.0.1 > nul
goto wait_api
:api_ready
echo  API is ready

if not exist "%~dp0dashboard\node_modules\" (
  echo.
  echo  Installing dashboard dependencies...
  pushd "%~dp0dashboard"
  call npm install
  popd
)

echo.
echo  ================================
echo   Nexus is ready!
echo  ================================
echo   Dashboard : http://localhost:3000
echo   API       : http://localhost:8000
echo   API health: http://localhost:8000/health
echo   Kafka UI  : http://localhost:8080
echo  ================================
echo.
echo  Starting dashboard - Ctrl+C to stop.
echo.

start "" http://localhost:3000
pushd "%~dp0dashboard"
npm run dev
popd
