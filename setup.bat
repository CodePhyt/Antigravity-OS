@echo off
REM Antigravity OS - One-Click Setup
REM Windows installation script

echo.
echo ========================================
echo   ANTIGRAVITY OS - ONE-CLICK SETUP
echo ========================================
echo.

REM Check if Node.js is installed
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js 20+ from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version
echo.

REM Check npm
echo [2/5] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)

echo [OK] npm found:
npm --version
echo.

REM Install dependencies
echo [3/5] Installing dependencies...
echo This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Build the project
echo [4/5] Building project...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo [OK] Build successful
echo.

REM Link CLI globally
echo [5/5] Linking CLI globally...
call npm link
if %errorlevel% neq 0 (
    echo [WARN] Global link failed (may need admin rights)
    echo You can still use: npm run cli
) else (
    echo [OK] CLI linked globally
)
echo.

echo ========================================
echo   INSTALLATION COMPLETE!
echo ========================================
echo.
echo Next steps:
echo   1. Type 'ag-os help' to see available commands
echo   2. Run 'demo-start.bat' for a guided demo
echo   3. Visit http://localhost:3001 for the Visual Dashboard
echo.
echo Quick commands:
echo   ag-os status          - Check system health
echo   ag-os test:quick      - Run quick tests
echo   ag-os fix "command"   - Autonomous error fixing
echo   ag-os dashboard       - Open Visual Dashboard
echo.
pause
