@echo off
REM Antigravity OS - Deep Clean
REM Removes all generated files and artifacts for a spotless repository

echo.
echo ========================================
echo   ANTIGRAVITY OS - DEEP CLEAN
echo ========================================
echo.
echo 🧹 Cleaning repository...
echo.

REM Remove build artifacts
echo [1/8] Removing build artifacts...
if exist dist rmdir /s /q dist 2>nul
if exist .next rmdir /s /q .next 2>nul
if exist coverage rmdir /s /q coverage 2>nul
echo ✓ Build artifacts removed
echo.

REM Remove test artifacts
echo [2/8] Removing test artifacts...
if exist test-fixer rmdir /s /q test-fixer 2>nul
del test-file.txt 2>nul
del demo.js 2>nul
del demo-error.js 2>nul
del proof.js 2>nul
del bozuk-dosya.js 2>nul
echo ✓ Test artifacts removed
echo.

REM Remove temporary directories
echo [3/8] Removing temporary directories...
for /d %%i in (tmp-*) do rmdir /s /q "%%i" 2>nul
for /d %%i in (test-error-handling-*) do rmdir /s /q "%%i" 2>nul
for /d %%i in (test-file-watcher-*) do rmdir /s /q "%%i" 2>nul
echo ✓ Temporary directories removed
echo.

REM Remove log files
echo [4/8] Removing log files...
del *.log 2>nul
if exist logs rmdir /s /q logs 2>nul
echo ✓ Log files removed
echo.

REM Remove TypeScript build info
echo [5/8] Removing TypeScript build info...
del tsconfig.tsbuildinfo 2>nul
del tsconfig.mcp.tsbuildinfo 2>nul
echo ✓ TypeScript build info removed
echo.

REM Remove test result files
echo [6/8] Removing test result files...
del test-*.md 2>nul
del test-*.tmp.md 2>nul
echo ✓ Test result files removed
echo.

REM Remove demo files
echo [7/8] Removing demo files...
del demo-*.ts 2>nul
del demo-*.txt 2>nul
del demo-*.enc.tmp 2>nul
echo ✓ Demo files removed
echo.

REM Keep node_modules (don't force reinstall)
echo [8/8] Preserving node_modules...
echo ✓ node_modules preserved (no reinstall needed)
echo.

echo ========================================
echo   ✨ REPOSITORY IS SPOTLESS
echo ========================================
echo.
echo Cleaned:
echo   ✓ Build artifacts (dist, .next, coverage)
echo   ✓ Test artifacts (test-fixer, test files)
echo   ✓ Temporary directories (tmp-*, test-*)
echo   ✓ Log files (*.log)
echo   ✓ TypeScript build info
echo   ✓ Test result files
echo   ✓ Demo files
echo.
echo Preserved:
echo   ✓ node_modules (no reinstall needed)
echo   ✓ Source code (src/)
echo   ✓ Configuration files
echo   ✓ Documentation
echo.
echo Repository is ready for:
echo   - Git commit
echo   - Release packaging
echo   - Distribution
echo   - Hackathon submission
echo.
pause
