@echo off
cd /d "%~dp0"
echo Running Nexus demo pipeline...
echo.
cd demo
python run.py "Give me a morning briefing on AI news"
pause
