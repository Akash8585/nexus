#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ""
echo "================================"
echo " NEXUS - Starting up..."
echo "================================"
echo ""

echo "[1/3] Checking Docker..."
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker is not running."
  echo "Please start Docker Desktop first."
  exit 1
fi
echo " Docker is running"

echo ""
echo "[2/3] Starting services (Kafka, Redis, API)..."
docker compose up -d

echo ""
echo "[3/3] Waiting for API on port 8000..."
for i in $(seq 1 90); do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo " API is ready"
    break
  fi
  if [ "$i" -eq 90 ]; then
    echo "ERROR: API did not become ready within 3 minutes."
    echo "Check: docker compose logs nexus-bus"
    exit 1
  fi
  sleep 2
done

if [ ! -d dashboard/node_modules ]; then
  echo ""
  echo " Installing dashboard dependencies..."
  (cd dashboard && npm install)
fi

echo ""
echo "================================"
echo " Nexus is ready!"
echo "================================"
echo " Dashboard : http://localhost:3000"
echo " API       : http://localhost:8000"
echo " API health: http://localhost:8000/health"
echo " Kafka UI  : http://localhost:8080"
echo "================================"
echo ""

open http://localhost:3000 2>/dev/null ||
xdg-open http://localhost:3000 2>/dev/null ||
true

echo "Starting dashboard..."
cd dashboard && npm run dev
