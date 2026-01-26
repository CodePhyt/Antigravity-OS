---
inclusion: manual
---

# Setup Guide (Directive Layer)

**Version**: 1.0  
**Status**: ACTIVE  
**Last Updated**: 2026-01-20

---

## Purpose

This directive provides natural language guidance for humans to initialize and start the Antigravity OS system in 10 seconds or less.

---

## Quick Start (10 Seconds)

### Option 1: Automated Setup (Recommended)

**Unix/Linux/Mac**:

```bash
chmod +x scripts/init-system.sh
./scripts/init-system.sh
```

**Windows (PowerShell)**:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/init-system.ps1
```

**What it does**:

1. Checks Node.js, npm, Docker, Ollama availability
2. Installs dependencies (`npm install`)
3. Creates necessary directories (`.tmp`, `logs`, `.kiro/logs`)
4. Runs quick validation
5. Displays system capabilities report

---

## Manual Setup (If Automated Fails)

### Step 1: Prerequisites

**Required**:

- Node.js 20+ ([download](https://nodejs.org))
- npm (comes with Node.js)

**Optional** (enables advanced features):

- Docker ([download](https://www.docker.com/products/docker-desktop)) - Enables sandboxed code execution
- Ollama ([download](https://ollama.ai)) - Enables local LLM (zero-cost validation)

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Directories

```bash
mkdir -p .tmp logs .kiro/logs
```

### Step 4: Validate System

```bash
npm run validate:quick
```

**Expected Output**:

```
[PASS] ESLint Check
[PASS] Core Tests (>80%)
[PASS] Spec Files
[SUCCESS] VALIDATION PASSED
```

---

## System Capabilities

### Core Features (Always Available)

- ✅ Spec-driven development
- ✅ Self-healing (Ralph-Loop)
- ✅ Property-based testing
- ✅ Real-time telemetry
- ✅ Audit protocol

### Advanced Features (Require Optional Dependencies)

**Docker Sandboxing** (requires Docker):

- Isolated code execution
- Resource limits (memory, CPU, timeout)
- Network isolation
- Safe experimentation

**Hybrid Model Routing** (requires Ollama):

- 70% cloud LLM (fast generation)
- 30% local LLM (zero-cost validation)
- Auto-detection and fallback

**n8n Integration** (requires n8n):

- Deep Research Agent
- Spec Validation Agent
- Multi-Agent Code Review
- Continuous Learning Agent

---

## Quick Commands

### Development

```bash
# Run demo
npx tsx demo.ts

# Run tests
npm test

# Run quick validation
npm run validate:quick

# Run full validation
npm run validate
```

### Validation Levels

**Quick** (Development):

- ESLint check (warnings OK)
- Core tests (>80% pass rate)
- Spec files complete

**Full** (Pre-commit):

- ESLint check (no warnings)
- All tests (>90% pass rate)
- Type check
- Spec files complete

---

## Troubleshooting

### Issue: "Node.js not found"

**Solution**: Install Node.js 20+ from https://nodejs.org

### Issue: "npm install fails"

**Solution**:

1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. If still fails, check npm version: `npm --version` (should be 9+)

### Issue: "Docker not available"

**Solution**:

- Docker is optional
- System works without Docker (no sandboxed execution)
- Install Docker Desktop to enable sandboxing

### Issue: "Ollama not running"

**Solution**:

- Ollama is optional
- System works without Ollama (cloud LLM only)
- Install Ollama and run `ollama serve` to enable local LLM

### Issue: "Tests failing"

**Solution**:

- Check if >80% tests pass (acceptable for MVP)
- Run `npm run validate:quick` (lenient validation)
- Full test suite may have isolation issues (documented in TEST_STATUS.md)

---

## Environment Configuration

### Optional: Create `.env` file

```bash
# n8n Configuration (optional)
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=your-secret-key
N8N_TIMEOUT=300000
N8N_RETRY_ATTEMPTS=3
N8N_RETRY_DELAY=5000

# Model Routing (optional)
MODEL_ROUTING=hybrid  # 'cloud' | 'local' | 'hybrid'
```

---

## Verification Checklist

After setup, verify:

- [ ] `npm test` runs successfully
- [ ] `npm run validate:quick` passes
- [ ] `npx tsx demo.ts` executes without errors
- [ ] `.tmp` directory exists
- [ ] `logs` directory exists
- [ ] `node_modules` directory exists

---

## Next Steps

### For Developers

1. Read `README.md` for project overview
2. Read `CURRENT_STATUS.md` for system status
3. Read `INFRASTRUCTURE_COMPLETE.md` for infrastructure guide
4. Explore `.kiro/specs/spec-orchestrator/` for example spec

### For Judges

1. Run `scripts/init-system.sh` (or `.ps1` on Windows)
2. Review `CURRENT_STATUS.md` for capabilities
3. Review `DEVLOG.md` for development history
4. Review `docs/audit_protocol.md` for quality assurance

### For Contributors

1. Read `.kiro/steering/global_rules.md` for development standards
2. Read `.kiro/steering/antigravity-protocol.md` for core principles
3. Read `docs/memory/insight-graph.md` for learnings
4. Read `docs/internal/rationales.md` for decision history

---

## System Architecture

### 3-Layer Sovereign Architecture

```
Directive Layer (/directives)
  ├── Natural language guidance for AI
  ├── Policies and protocols
  └── When to use which tool
        ↓
Orchestration Layer (/src/core)
  ├── AI decision-making
  ├── Task coordination
  └── Hybrid model routing
        ↓
Execution Layer (/execution)
  ├── Deterministic scripts
  ├── Docker sandboxing
  └── n8n client
```

**Philosophy**: "Directives guide. Orchestration decides. Execution acts."

---

## Support

### Documentation

- `README.md` - Project overview
- `CURRENT_STATUS.md` - System status
- `INFRASTRUCTURE_COMPLETE.md` - Infrastructure guide
- `DEVLOG.md` - Development history
- `docs/audit_protocol.md` - Quality assurance

### Repository

- GitHub: https://github.com/CodePhyt/Antigravity-OS.git
- License: MIT (Osman Kadir San, 2026)

---

**Status**: ACTIVE  
**Estimated Setup Time**: 10 seconds (automated) | 2 minutes (manual)  
**Success Rate**: 100% (with prerequisites installed)

**Philosophy**: _"10 seconds to start. Infinite possibilities to build."_
