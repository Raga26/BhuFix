#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build and test script for BhuFix application
.DESCRIPTION
    Builds frontend and backend, verifies dependencies and syntax
#>

$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

function Write-Status {
    param([string]$Message, [ValidateSet("Info", "Success", "Warning", "Error")]$Status = "Info")
    
    switch ($Status) {
        "Success" { Write-Host "[+] $Message" -ForegroundColor Green }
        "Error" { Write-Host "[X] $Message" -ForegroundColor Red }
        "Warning" { Write-Host "[!] $Message" -ForegroundColor Yellow }
        "Info" { Write-Host "[*] $Message" -ForegroundColor Cyan }
    }
}

Write-Host "`n$('='*60)" -ForegroundColor Cyan
Write-Host "  BhuFix Build and Test Script" -ForegroundColor Cyan
Write-Host "$('='*60)`n" -ForegroundColor Cyan

# ==================== FRONTEND BUILD ====================
Write-Status "Building Frontend..." "Info"
Write-Host ""

try {
    Push-Location frontend
    Write-Status "Installing npm dependencies..." "Info"
    npm install --legacy-peer-deps 2>&1 | Out-Null
    Write-Status "npm dependencies installed" "Success"
    
    Write-Status "Building frontend production build..." "Info"
    npm run build 2>&1 | Out-Null
    Write-Status "Frontend build completed" "Success"
    
    if (Test-Path "build") {
        $buildSize = (Get-ChildItem build -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Status "Frontend build directory created (size: $($buildSize.ToString('F2'))MB)" "Success"
    } else {
        throw "Frontend build directory not created"
    }
    
    Pop-Location
}
catch {
    Write-Status "Frontend build failed: $_" "Error"
    exit 1
}

Write-Host ""

# ==================== BACKEND SETUP ====================
Write-Status "Setting up Backend..." "Info"
Write-Host ""

try {
    Push-Location backend
    
    Write-Status "Installing Python dependencies..." "Info"
    pip install -q -r requirements.txt
    Write-Status "Python dependencies installed" "Success"
    
    Write-Status "Checking Python syntax..." "Info"
    python -m py_compile server.py
    Write-Status "Python syntax check passed" "Success"
    
    Write-Status "Testing module imports..." "Info"
    $importTest = python -c @"
try:
    import fastapi
    import motor
    import aiosmtplib
    import logging
    print('OK')
except ImportError as e:
    print(f'FAIL: {e}')
    exit(1)
"@
    
    if ($importTest -eq 'OK') {
        Write-Status "All module imports successful" "Success"
    } else {
        throw "Module import test failed: $importTest"
    }
    
    Pop-Location
}
catch {
    Write-Status "Backend setup failed: $_" "Error"
    exit 1
}

Write-Host ""

# ==================== SUMMARY ====================
Write-Host "$('='*60)" -ForegroundColor Green
Write-Status "BUILD COMPLETED SUCCESSFULLY" "Success"
Write-Host "$('='*60)" -ForegroundColor Green

Write-Host ""
Write-Host "Build Summary:" -ForegroundColor Cyan
Write-Host "  [+] Frontend:  Production build created at frontend/build/" -ForegroundColor Green
Write-Host "  [+] Backend:   Dependencies installed and verified" -ForegroundColor Green

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Set environment variables:" -ForegroundColor Gray
Write-Host "     - MONGO_URL" -ForegroundColor Gray
Write-Host "     - DB_NAME" -ForegroundColor Gray
Write-Host "     - GMAIL_USER (optional)" -ForegroundColor Gray
Write-Host "     - GMAIL_PASSWORD (optional)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Start backend:   python backend/server.py" -ForegroundColor Gray
Write-Host "  3. Start frontend:  npm start (from frontend/)" -ForegroundColor Gray
Write-Host "  4. Or deploy build to Render" -ForegroundColor Gray

Write-Host ""
Write-Host "For more details, check LOGGING.md" -ForegroundColor Gray
Write-Host ""
