#!/bin/bash
cd "$(dirname "$0")"
echo "Stopping Nexus..."
docker compose down
echo "Done."
