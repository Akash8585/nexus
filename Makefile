up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f nexus-bus

restart:
	docker compose restart nexus-bus
