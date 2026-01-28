@echo off
REM Antigravity OS - Demo Mode
REM Opens 2 terminals: Dashboard + CLI

echo.
echo ========================================
echo   ANTIGRAVITY OS - DEMO MODE
echo ========================================
echo.
echo Starting Visual Dashboard and CLI...
echo.

REM Start Dashboard in new window
echo [1/2] Starting Visual Dashboard (Observer Console)...
start "Antigravity Dashboard" cmd /k "npm run dev"

REM Wait 3 seconds for dashboard to start
timeout /t 3 /nobreak >nul

REM Open dashboard in browser
start http://localhost:3001/observer

REM Start CLI terminal
echo [2/2] Starting CLI Terminal...
start "Antigravity CLI" cmd /k "echo. & echo ========================================= & echo   ANTIGRAVITY OS - CLI READY & echo ========================================= & echo. & echo Quick Commands: & echo   ag-os status          - Check system health & echo   ag-os test:quick      - Run quick tests & echo   ag-os fix \"command\"    - Autonomous error fixing & echo   ag-os dashboard       - Open Visual Dashboard & echo   ag-os help            - Show all commands & echo. & echo Type a command to get started... & echo."

echo.
echo ========================================
echo   DEMO MODE ACTIVE!
echo ========================================
echo.
echo Two terminals opened:
echo   1. Visual Dashboard (http://localhost:3001/observer)
echo   2. CLI Terminal (ready for commands)
echo.
echo You can now:
echo   - Watch real-time execution in the Dashboard
echo   - Run commands in the CLI Terminal
echo   - Record your demo video!
echo.
echo Press any key to close this window...
pause >nul
