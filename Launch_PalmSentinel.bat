@echo off
title PalmSentinel AI - Drone Oil Palm Sensus System
color 0A
cd /d "%~dp0"

echo =====================================================================
echo       PALMSENTINEL AI (SawitVision Enterprise)
echo       High-Precision Drone Oil Palm Counting & Plantation Sensus
echo =====================================================================
echo.
echo [*] Working Directory: %CD%
echo [*] Checking Python environment...

python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [!] Error: Python was not found in your system PATH.
    echo     Please install Python 3.10+ and check "Add Python to PATH".
    pause
    exit /b 1
)

echo [OK] Python detected!
echo [*] Starting PalmSentinel local server...
echo.

:: Launch browser in background after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5000"

:: Start the Flask app
python app.py

pause
