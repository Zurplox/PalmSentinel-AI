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
echo [*] Launching PalmSentinel Native Desktop Application...

:: 1. If compiled native launcher exists, launch it cleanly
if exist "PalmSentinel.exe" (
    start "" "PalmSentinel.exe"
    exit /b 0
)

:: 2. If pythonw is available, launch without leaving console window
where pythonw >nul 2>&1
if not errorlevel 1 (
    start "" pythonw desktop_app.py
    exit /b 0
)

:: 3. Fallback to standard python
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [!] Error: Python was not found in your system PATH.
    echo     Please install Python 3.9+ and check "Add Python to PATH".
    pause
    exit /b 1
)

python desktop_app.py
