@echo off
REM Antigravity OS - Try It Demo
REM Demonstrates autonomous error fixing with a real broken file

echo.
echo ========================================
echo   ANTIGRAVITY OS - TRY IT DEMO
echo ========================================
echo.

REM Step 1: Create broken file
echo [1/4] Creating broken file: demo-error.js
echo console.log("Broken Code" > demo-error.js
echo.
echo ❌ Created broken file with missing closing parenthesis:
echo    console.log("Broken Code"
echo.

REM Step 2: Show the error
echo [2/4] Attempting to run broken file...
echo.
node demo-error.js 2>&1
echo.
echo ❌ Error detected! (as expected)
echo.

REM Step 3: Run Antigravity Fixer
echo [3/4] Running Antigravity Autonomous Fixer...
echo.
echo 🤖 The Fixer will:
echo    1. Detect the error (missing parenthesis)
echo    2. Apply heuristic fix (instant, no research needed)
echo    3. Create Git backup
echo    4. Verify the fix works
echo.
pause
echo.

call ag-os fix "node demo-error.js"

echo.
echo [4/4] Checking the result...
echo.
echo ✨ Fixed file content:
type demo-error.js
echo.

REM Step 4: Verify it works
echo.
echo 🎯 Running fixed file to verify:
node demo-error.js
echo.

echo ========================================
echo   DEMO COMPLETE!
echo ========================================
echo.
echo What just happened:
echo   1. Created a broken JavaScript file
echo   2. Antigravity detected the error
echo   3. Applied heuristic fix (instant)
echo   4. Created Git backup
echo   5. Verified the fix works
echo.
echo This is the power of autonomous error correction!
echo.
echo Try it yourself:
echo   1. Break any file: ag-os edit --file test.js --content "const x ="
echo   2. Fix it: ag-os fix "node test.js"
echo   3. Watch the magic happen!
echo.
pause
