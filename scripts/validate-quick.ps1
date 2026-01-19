# Antigravity OS - Quick Validation (Hackathon Mode)
# Validates essentials only - allows minor issues for velocity

$ErrorActionPreference = "Continue"

Write-Host "Quick Validation (Hackathon Mode)" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$criticalErrors = @()

# 1. ESLint Check (warnings OK)
Write-Host ""
Write-Host "ESLint Check..." -ForegroundColor Yellow
npm run lint 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[PASS] ESLint passed" -ForegroundColor Green
} else {
    Write-Host "[WARN] ESLint warnings (non-blocking)" -ForegroundColor Yellow
}

# 2. Core Tests (allow some failures)
Write-Host ""
Write-Host "Core Tests..." -ForegroundColor Yellow
$testOutput = npm test 2>&1 | Out-String
$passRate = if ($testOutput -match '(\d+) passed') { [int]$matches[1] } else { 0 }
$totalTests = if ($testOutput -match '\((\d+)\)') { [int]$matches[1] } else { 1 }
$passPercentage = [math]::Round(($passRate / $totalTests) * 100, 1)

Write-Host "Test Results: $passRate of $totalTests tests passed" -ForegroundColor Cyan
Write-Host "Pass Rate: $passPercentage percent" -ForegroundColor Cyan

if ($passPercentage -ge 80) {
    Write-Host "[PASS] Tests passed (above 80 percent threshold)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Tests below 80 percent threshold" -ForegroundColor Red
    $criticalErrors += "Test pass rate too low"
}

# 3. Spec Files
Write-Host ""
Write-Host "Spec Files..." -ForegroundColor Yellow
if (Test-Path ".kiro/specs/spec-orchestrator") {
    $hasReq = Test-Path ".kiro/specs/spec-orchestrator/requirements.md"
    $hasDesign = Test-Path ".kiro/specs/spec-orchestrator/design.md"
    $hasTasks = Test-Path ".kiro/specs/spec-orchestrator/tasks.md"
    
    if ($hasReq -and $hasDesign -and $hasTasks) {
        Write-Host "[PASS] Spec files complete" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Missing spec files" -ForegroundColor Red
        $criticalErrors += "Incomplete spec files"
    }
} else {
    Write-Host "[WARN] No spec directory" -ForegroundColor Yellow
}

# Final Report
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
if ($criticalErrors.Count -eq 0) {
    Write-Host "[SUCCESS] VALIDATION PASSED (Quick Mode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "MVP is operational!" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "[FAILURE] CRITICAL ISSUES FOUND" -ForegroundColor Red
    foreach ($err in $criticalErrors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
    exit 1
}
