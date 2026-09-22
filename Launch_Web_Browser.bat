@echo off
title PalmSentinel AI - Web Browser Mode
color 0A
cd /d "%~dp0"

echo =====================================================================
echo       PALMSENTINEL AI (SawitVision Enterprise) - Web Mode
echo       Starting Flask Server and Opening Web Dashboard...
echo =====================================================================
echo.

:: Launch background waiter that waits for port 5000 to be live before opening browser
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "$attempts=0; while ($attempts -lt 40) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/info' -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop; if ($r.StatusCode -eq 200) { Start-Process 'http://127.0.0.1:5000'; break; } } catch {}; Start-Sleep -Milliseconds 400; $attempts++ }"

:: Run the Flask web server
python app.py
pause
