#!/bin/bash
# Antigravity OS - Automated System Initialization
# Execution Layer Script (Deterministic)

set -e  # Exit on error

echo "========================================="
echo "Antigravity OS - System Initialization"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js ${NODE_VERSION} found"
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

# Check npm
echo "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm ${NPM_VERSION} found"
else
    echo -e "${RED}✗${NC} npm not found. Please install npm"
    exit 1
fi

# Check Docker (optional)
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
    echo -e "${GREEN}✓${NC} Docker ${DOCKER_VERSION} found"
    DOCKER_AVAILABLE=true
else
    echo -e "${YELLOW}⚠${NC} Docker not found (optional - enables sandboxed execution)"
    DOCKER_AVAILABLE=false
fi

# Check Ollama (optional)
echo "Checking Ollama..."
if curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo -e "${GREEN}✓${NC} Ollama running on localhost:11434"
    OLLAMA_AVAILABLE=true
else
    echo -e "${YELLOW}⚠${NC} Ollama not running (optional - enables local LLM)"
    OLLAMA_AVAILABLE=false
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p .tmp
mkdir -p logs
mkdir -p .kiro/logs
echo -e "${GREEN}✓${NC} Directories created"

# Run quick validation
echo ""
echo "Running system validation..."
npm run validate:quick

# Generate system report
echo ""
echo "========================================="
echo "System Initialization Complete!"
echo "========================================="
echo ""
echo "System Capabilities:"
echo "  - Node.js: ${GREEN}✓${NC}"
echo "  - npm: ${GREEN}✓${NC}"
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "  - Docker Sandboxing: ${GREEN}✓${NC}"
else
    echo "  - Docker Sandboxing: ${YELLOW}⚠${NC} (install Docker to enable)"
fi
if [ "$OLLAMA_AVAILABLE" = true ]; then
    echo "  - Local LLM (Ollama): ${GREEN}✓${NC}"
else
    echo "  - Local LLM (Ollama): ${YELLOW}⚠${NC} (install Ollama to enable)"
fi
echo ""
echo "Quick Start:"
echo "  1. Run demo: npx tsx demo.ts"
echo "  2. Run tests: npm test"
echo "  3. Validate: npm run validate:quick"
echo ""
echo "Documentation:"
echo "  - README.md: Project overview"
echo "  - CURRENT_STATUS.md: System status"
echo "  - INFRASTRUCTURE_COMPLETE.md: Infrastructure guide"
echo ""
echo "Ready to build! 🚀"
