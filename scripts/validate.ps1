# Antigravity OS - Post-Execution Validation Script (PowerShell)
# This script runs after every agent execution to validate code quality
# Part of the autonomous B.L.A.S.T. loop

$ErrorActionPreference = "Continue"

Write-Host "Starting Post-Execution Validation..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$validationPassed = $true
$validationErrors = @()

# 1. TypeScript Compilation Check
Write-Host ""
Write-Host "Step 1: TypeScript Compilation" -ForegroundColor Yellow
Write-Host "Checking for type errors..."
npm run type-check 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "TypeScript compilation passed" -ForegroundColor Green
} else {
    Write-Host "TypeScript compilation failed" -ForegroundColor Red
    $validationPassed = $false
    $validationErrors += "TypeScript compilation errors detected"
}

# 2. ESLint Check
Write-Host ""
Write-Host "Step 2: ESLint Validation" -ForegroundColor Yellow
Write-Host "Checking code quality..."
npm run lint 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "ESLint validation passed" -ForegroundColor Green
} else {
    Write-Host "ESLint validation failed" -ForegroundColor Red
    $validationPassed = $false
    $validationErrors += "ESLint errors detected"
}

# 3. Unit Tests
Write-Host ""
Write-Host "Step 3: Unit Tests" -ForegroundColor Yellow
Write-Host "Running test suite..."
npm test 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "All tests passed" -ForegroundColor Green
} else {
    Write-Host "Tests failed" -ForegroundColor Red
    $validationPassed = $false
    $validationErrors += "Test failures detected"
}

# 4. JSON Schema Validation
Write-Host ""
Write-Host "Step 4: JSON Schema Validation" -ForegroundColor Yellow
Write-Host "Validating schemas..."
if (Test-Path "docs/schemas") {
    $schemaFiles = Get-ChildItem "docs/schemas/*.json"
    $schemaValid = $true
    foreach ($schema in $schemaFiles) {
        try {
            $null = Get-Content $schema.FullName | ConvertFrom-Json
            Write-Host "$($schema.Name) is valid" -ForegroundColor Green
        } catch {
            Write-Host "$($schema.Name) is invalid" -ForegroundColor Red
            $validationPassed = $false
            $schemaValid = $false
            $validationErrors += "Invalid JSON schema: $($schema.Name)"
        }
    }
    if ($schemaValid) {
        Write-Host "All schemas validated" -ForegroundColor Green
    }
} else {
    Write-Host "No schemas directory found" -ForegroundColor Yellow
}

# 5. Spec File Validation
Write-Host ""
Write-Host "Step 5: Spec File Validation" -ForegroundColor Yellow
Write-Host "Checking spec files..."
if (Test-Path ".kiro/specs") {
    $specDirs = Get-ChildItem ".kiro/specs" -Directory
    foreach ($specDir in $specDirs) {
        $specName = $specDir.Name
        Write-Host "Checking $specName..."
        
        if (-not (Test-Path "$($specDir.FullName)/requirements.md")) {
            Write-Host "Missing requirements.md in $specName" -ForegroundColor Red
            $validationPassed = $false
            $validationErrors += "Missing requirements.md in $specName"
        }
        
        if (-not (Test-Path "$($specDir.FullName)/design.md")) {
            Write-Host "Missing design.md in $specName" -ForegroundColor Red
            $validationPassed = $false
            $validationErrors += "Missing design.md in $specName"
        }
        
        if (-not (Test-Path "$($specDir.FullName)/tasks.md")) {
            Write-Host "Missing tasks.md in $specName" -ForegroundColor Red
            $validationPassed = $false
            $validationErrors += "Missing tasks.md in $specName"
        }
    }
    Write-Host "Spec file structure validated" -ForegroundColor Green
} else {
    Write-Host "No specs directory found" -ForegroundColor Yellow
}

# 6. Steering File Validation
Write-Host ""
Write-Host "Step 6: Steering File Validation" -ForegroundColor Yellow
Write-Host "Checking steering files..."
if (Test-Path ".kiro/steering") {
    $requiredSteering = @(
        "antigravity-protocol.md",
        "global_rules.md",
        "checkpoint_rules.md",
        "n8n_integration.md"
    )
    
    foreach ($file in $requiredSteering) {
        if (Test-Path ".kiro/steering/$file") {
            Write-Host "$file exists" -ForegroundColor Green
        } else {
            Write-Host "Missing $file" -ForegroundColor Red
            $validationPassed = $false
            $validationErrors += "Missing steering file: $file"
        }
    }
} else {
    Write-Host "No steering directory found" -ForegroundColor Red
    $validationPassed = $false
    $validationErrors += "Missing .kiro/steering directory"
}

# Final Report
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($validationPassed) {
    Write-Host "VALIDATION PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "All checks completed successfully!"
    Write-Host "Code is ready for commit."
    exit 0
} else {
    Write-Host "VALIDATION FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Errors detected:"
    foreach ($err in $validationErrors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Triggering B.L.A.S.T. Protocol..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Review error logs"
    Write-Host "2. Update specs if needed"
    Write-Host "3. Fix code issues"
    Write-Host "4. Re-run validation"
    Write-Host ""
    Write-Host "See .kiro/steering/global_rules.md for B.L.A.S.T. protocol details"
    exit 1
}
