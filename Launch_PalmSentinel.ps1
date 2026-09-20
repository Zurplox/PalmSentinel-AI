# PalmSentinel AI - PowerShell Launcher
$Host.UI.RawUI.WindowTitle = "PalmSentinel AI - Drone Oil Palm Sensus System"
Set-Location -Path $PSScriptRoot

Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "      PALMSENTINEL AI (SawitVision Enterprise)" -ForegroundColor Cyan
Write-Host "      High-Precision Drone Oil Palm Counting & Plantation Sensus" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[*] Working Directory: $PSScriptRoot" -ForegroundColor Yellow

# Verify Python
try {
    $pyVer = python --version 2>&1
    Write-Host "[OK] Python detected: $pyVer" -ForegroundColor Green
} catch {
    Write-Host "[!] Error: Python was not found in your PATH." -ForegroundColor Red
    Pause
    Exit 1
}

# Open browser after 2 seconds
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://127.0.0.1:5000"
} | Out-Null

Write-Host "[*] Starting local web server on http://127.0.0.1:5000 ..." -ForegroundColor Cyan
python app.py
