@echo off
title PalmSentinel AI - Web Browser Mode
color 0A
cd /d "%~dp0"

echo =====================================================================
echo       PALMSENTINEL AI (SawitVision Enterprise) - Web Mode
echo       Opening in your default Web Browser (Chrome / Edge / Firefox)
echo =====================================================================
echo.

:: Open default web browser after 1 second delay
start "" http://127.0.0.1:5000

:: Run the Flask web server
python app.py
pause
