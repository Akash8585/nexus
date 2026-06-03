@echo off
cd /d "%~dp0"
echo Stopping Nexus...
docker compose down
echo Done.
pause
