@echo off
title Voli Riky Spagna - Flight Tracker
echo ========================================================
echo   TAVOLA ROTONDA - VOLI RIKY SPAGNA FLIGHT TRACKER
echo ========================================================
echo.
echo Avvio del server backend in corso...
cd /d "%~dp0backend"
start http://localhost:8000
python -m uvicorn app:app --host 127.0.0.1 --port 8000
pause
