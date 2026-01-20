# Antigravity OS - Automated System Initialization (PowerShell)
# Execution Layer Script (Deterministic)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Antigravity OS - System Initialization" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
try {
    $nodeVersion = node --version
    Write-Host " [OK] Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host " [FAIL] Node.js not found" -ForegroundColor Red
    Write-Host "Please install Node.js 20+ from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Check npm
Write-Host "Checking npm..." -NoNewline
try {
    $npmVersion = npm --version
    Write-Host " [OK] npm $npmVersion found" -ForegroundColor Green
} catch {
    Write-Host " [FAIL] npm not found" -ForegroundColor Red
    exit 1
}

# Check Docker (optional)
Write-Host "Checking Docker..." -NoNewline
try {
    $dockerVersion = docker --version
    Write-Host " [OK] Docker found" -ForegroundColor Green
    $dockerAvailable = $true
} catch {
    Write-Host " [WARN] Docker not found (optional)" -ForegroundColor Yellow
    $dockerAvailable = $false
}

# Check Ollama (optional)
Write-Host "Checking Ollama..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host " [OK] Ollama running" -ForegroundColor Green
        $ollamaAvailable = $true
    } else {
        throw
    }
} catch {
    Write-Host " [WARN] Ollama not running (optional)" -ForegroundColor Yellow
    $ollamaAvailable = $false
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

# Create necessary directories
Write-Host ""
Write-Host "Creating directories..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path ".tmp" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
New-Item -ItemType Directory -Force -Path ".kiro/logs" | Out-Null
Write-Host "[OK] Directories created" -ForegroundColor Green

# Run quick validation
Write-Host ""
Write-Host "Running system validation..." -ForegroundColor Cyan
npm run validate:quick

# Generate system report
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "System Initialization Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "System Capabilities:" -ForegroundColor Cyan
Write-Host "  - Node.js: " -NoNewline
Write-Host "[OK]" -ForegroundColor Green
Write-Host "  - npm: " -NoNewline
Write-Host "[OK]" -ForegroundColor Green
Write-Host "  - Docker Sandboxing: " -NoNewline
if ($dockerAvailable) {
    Write-Host "[OK]" -ForegroundColor Green
} else {
    Write-Host "[WARN] (install Docker to enable)" -ForegroundColor Yellow
}
Write-Host "  - Local LLM (Ollama): " -NoNewline
if ($ollamaAvailable) {
    Write-Host "[OK]" -ForegroundColor Green
} else {
    Write-Host "[WARN] (install Ollama to enable)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Quick Start:" -ForegroundColor Cyan
Write-Host "  1. Run demo: npx tsx demo.ts"
Write-Host "  2. Run tests: npm test"
Write-Host "  3. Validate: npm run validate:quick"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  - README.md: Project overview"
Write-Host "  - CURRENT_STATUS.md: System status"
Write-Host "  - INFRASTRUCTURE_COMPLETE.md: Infrastructure guide"
Write-Host ""
Write-Host "Ready to build!" -ForegroundColor Green
