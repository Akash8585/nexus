# Nexus — developer commands (Mac/Linux/Git Bash; on Windows prefer start.bat)
.DEFAULT_GOAL := help

ifeq ($(OS),Windows_NT)
  SLEEP := ping -n 9 127.0.0.1 > nul
else
  SLEEP := sleep 8
endif

.PHONY: help start stop restart status logs dashboard demo health clean setup check-docker

ifeq ($(OS),Windows_NT)

check-docker:
	@docker info >nul 2>&1 || (echo. & echo Error: Docker is not running or not installed. & echo Start Docker Desktop, then retry. & echo. & exit /b 1)

health:
	@echo "Checking Nexus API health..."
	@curl -sf http://localhost:8000/health | python -m json.tool || (echo. & echo API is not responding. Run 'make start' first. & echo. & exit /b 1)

clean: check-docker
	@echo "WARNING: This will remove all Nexus containers and volumes."
	@set /p confirm="Enter 'yes' to continue: "
	@if /i "$(confirm)"=="yes" (docker compose down -v && echo Cleaned up successfully.) else (echo Cancelled.)

else

check-docker:
	@docker info >/dev/null 2>&1 || { \
		echo ""; \
		echo "Error: Docker is not running or not installed."; \
		echo "Start Docker Desktop (Windows/Mac) or the Docker daemon (Linux), then retry."; \
		echo ""; \
		exit 1; \
	}

health:
	@echo "Checking Nexus API health..."
	@curl -sf http://localhost:8000/health | python -m json.tool || { \
		echo ""; \
		echo "API is not responding. Run 'make start' first."; \
		echo ""; \
		exit 1; \
	}

clean: check-docker
	@echo "WARNING: This will remove all Nexus containers and volumes."
	@echo "Press Ctrl+C to cancel or"
	@read -p "Enter 'yes' to continue: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker compose down -v; \
		echo "Cleaned up successfully."; \
	else \
		echo "Cancelled."; \
	fi

endif

help:
	@echo ""
	@echo "Nexus — Multi-agent coordination bus"
	@echo ""
	@echo "Usage:"
	@echo "  make start       Start all services"
	@echo "  make stop        Stop all services"
	@echo "  make restart     Restart all services"
	@echo "  make status      Check service status"
	@echo "  make logs        Show live logs"
	@echo "  make demo        Run demo pipeline"
	@echo "  make dashboard   Start dashboard only"
	@echo "  make clean       Remove all containers"
	@echo "  make health      Check API health"
	@echo "  make setup       First time setup guide"
	@echo ""
	@echo "Windows: use start.bat / stop.bat if make is unavailable."
	@echo ""

start: check-docker
	@echo "Starting Nexus..."
	@docker compose up -d
	@echo "Waiting for services to be healthy..."
	@$(SLEEP)
	@echo "Tip: use start.bat / ./start.sh to also launch the dashboard."
	@echo ""
	@echo "================================"
	@echo " Nexus is running!"
	@echo "================================"
	@echo " Dashboard : http://localhost:3000"
	@echo " API       : http://localhost:8000"
	@echo " Kafka UI  : http://localhost:8080"
	@echo "================================"
	@echo ""
	@echo "Tip: Run 'make dashboard' or start.bat to start"
	@echo "the Next.js dashboard dev server"

stop: check-docker
	@echo "Stopping Nexus..."
	@docker compose down
	@echo "All services stopped."

restart: check-docker
	@$(MAKE) stop
	@$(MAKE) start

status: check-docker
	@echo "Service status:"
	@docker compose ps

logs: check-docker
	@docker compose logs -f

dashboard:
	@echo "Starting dashboard on port 3000..."
	@cd dashboard && npm run dev

demo:
	@echo "Running Nexus demo pipeline..."
	@echo "Make sure NEXUS_API_KEY and GROQ_API_KEY are set in demo/.env"
	@cd demo && python run.py "Give me a morning briefing on AI news"

setup:
	@echo ""
	@echo "=== Nexus First-time Setup ==="
	@echo ""
	@echo "Step 1: Start services"
	@echo "  make start   (or start.bat / ./start.sh)"
	@echo ""
	@echo "Step 2: Start dashboard"
	@echo "  make dashboard"
	@echo ""
	@echo "Step 3: Open browser"
	@echo "  http://localhost:3000"
	@echo ""
	@echo "Step 4: Create admin account"
	@echo "  Click Get Started on the landing page"
	@echo ""
	@echo "Step 5: Generate API key"
	@echo "  Settings > API Keys > Generate"
	@echo ""
	@echo "Step 6: Run demo"
	@echo "  make demo"
	@echo ""
