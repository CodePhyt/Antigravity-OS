# Gateway Verification Script
# Tests Gateway functionality and performance

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Gateway Verification Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build Gateway
Write-Host "[1/5] Building Gateway..." -ForegroundColor Yellow
npm run gateway:build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Gateway build failed" -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] Gateway built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Start Gateway in background
Write-Host "[2/5] Starting Gateway..." -ForegroundColor Yellow
$gatewayProcess = Start-Process -FilePath "node" -ArgumentList "dist/gateway.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

if ($gatewayProcess.HasExited) {
    Write-Host "[FAIL] Gateway process exited immediately" -ForegroundColor Red
    exit 1
}
Write-Host "[PASS] Gateway process started (PID: $($gatewayProcess.Id))" -ForegroundColor Green
Write-Host ""

# Step 3: Health Check
Write-Host "[3/5] Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5
    if ($healthResponse.status -eq "active") {
        Write-Host "[PASS] Health check successful" -ForegroundColor Green
        Write-Host "  Status: $($healthResponse.status)" -ForegroundColor Gray
        Write-Host "  Uptime: $($healthResponse.uptime)ms" -ForegroundColor Gray
        Write-Host "  Port: $($healthResponse.port)" -ForegroundColor Gray
    } else {
        Write-Host "[FAIL] Health check returned unexpected status" -ForegroundColor Red
        Stop-Process -Id $gatewayProcess.Id -Force
        exit 1
    }
} catch {
    Write-Host "[FAIL] Health check failed: $_" -ForegroundColor Red
    Stop-Process -Id $gatewayProcess.Id -Force
    exit 1
}
Write-Host ""

# Step 4: Status Check
Write-Host "[4/5] Testing status endpoint..." -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "http://localhost:3000/status" -Method Get -TimeoutSec 5
    if ($statusResponse.gateway -eq "active") {
        Write-Host "[PASS] Status check successful" -ForegroundColor Green
        Write-Host "  Gateway: $($statusResponse.gateway)" -ForegroundColor Gray
        Write-Host "  Endpoints: $($statusResponse.endpoints.Count)" -ForegroundColor Gray
    } else {
        Write-Host "[FAIL] Status check returned unexpected response" -ForegroundColor Red
        Stop-Process -Id $gatewayProcess.Id -Force
        exit 1
    }
} catch {
    Write-Host "[FAIL] Status check failed: $_" -ForegroundColor Red
    Stop-Process -Id $gatewayProcess.Id -Force
    exit 1
}
Write-Host ""

# Step 5: Test Execution
Write-Host "[5/5] Testing command execution..." -ForegroundColor Yellow
try {
    $testBody = @{
        targetFile = "tests/unit/gateway.test.ts"
    } | ConvertTo-Json

    $testResponse = Invoke-RestMethod -Uri "http://localhost:3000/cmd/test" -Method Post -Body $testBody -ContentType "application/json" -TimeoutSec 30

    if ($testResponse.success) {
        Write-Host "[PASS] Test execution successful" -ForegroundColor Green
        Write-Host "  Duration: $($testResponse.duration)ms" -ForegroundColor Gray
        Write-Host "  Exit Code: $($testResponse.exitCode)" -ForegroundColor Gray
    } else {
        Write-Host "[WARN] Test execution completed with errors" -ForegroundColor Yellow
        Write-Host "  Duration: $($testResponse.duration)ms" -ForegroundColor Gray
        Write-Host "  Exit Code: $($testResponse.exitCode)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Test execution failed: $_" -ForegroundColor Red
    Stop-Process -Id $gatewayProcess.Id -Force
    exit 1
}
Write-Host ""

# Cleanup
Write-Host "Stopping Gateway..." -ForegroundColor Yellow
Stop-Process -Id $gatewayProcess.Id -Force
Write-Host "[PASS] Gateway stopped" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Verification Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Gateway is ready for use:" -ForegroundColor White
Write-Host "  Start: npm run gateway:start" -ForegroundColor Gray
Write-Host "  Health: http://localhost:3000/health" -ForegroundColor Gray
Write-Host "  Status: http://localhost:3000/status" -ForegroundColor Gray
Write-Host ""
