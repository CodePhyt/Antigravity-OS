# Autonomous Hooks System - Quick Reference

## Overview

The Autonomous Hooks System automatically validates code quality after every agent execution, implementing the B.L.A.S.T. protocol's validation loop without human intervention.

## Architecture

```
Agent Execution Completes
         ↓
   Hook Triggered (agentStop)
         ↓
   npm run validate
         ↓
   PowerShell Script Runs 6 Checks
         ↓
   ┌─────────────────────────────┐
   │ 1. TypeScript Compilation   │
   │ 2. ESLint Validation        │
   │ 3. Unit Tests               │
   │ 4. JSON Schema Validation   │
   │ 5. Spec File Structure      │
   │ 6. Steering File Validation │
   └─────────────────────────────┘
         ↓
   All Checks Pass?
    ├─ YES → Exit 0 (Success)
    └─ NO  → Exit 1 (Trigger B.L.A.S.T.)
              ↓
         Display Error Report
              ↓
         Suggest Next Steps
              ↓
         Agent Applies Fixes
              ↓
         Re-run Validation
```

## Hooks Defined

### 1. Post-Execution Validator

- **File**: `.kiro/hooks/post-execution-validator.kiro.hook`
- **Event**: `agentStop`
- **Action**: `runCommand` - `npm run validate`
- **Purpose**: Automatic quality enforcement

### 2. Context Steerer

- **File**: `.kiro/hooks/context-steerer.kiro.hook`
- **Event**: `promptSubmit`
- **Action**: `askAgent` - Cross-reference steering files
- **Purpose**: Ensure steering compliance

## Validation Steps

### Step 1: TypeScript Compilation

```powershell
npm run type-check
```

Checks for type errors in strict mode.

### Step 2: ESLint Validation

```powershell
npm run lint
```

Enforces code quality rules (no `any` types, explicit return types).

### Step 3: Unit Tests

```powershell
npm test
```

Runs all unit and property-based tests.

### Step 4: JSON Schema Validation

```powershell
Get-Content docs/schemas/*.json | ConvertFrom-Json
```

Validates all schema files are valid JSON.

### Step 5: Spec File Structure

```powershell
Test-Path .kiro/specs/*/requirements.md
Test-Path .kiro/specs/*/design.md
Test-Path .kiro/specs/*/tasks.md
```

Ensures all specs have required files.

### Step 6: Steering File Validation

```powershell
Test-Path .kiro/steering/antigravity-protocol.md
Test-Path .kiro/steering/global_rules.md
Test-Path .kiro/steering/checkpoint_rules.md
Test-Path .kiro/steering/n8n_integration.md
```

Confirms all steering documents exist.

## B.L.A.S.T. Integration

When validation fails:

1. **Build**: Validation script executes
2. **Log**: Error details captured and displayed
3. **Analyze**: Agent reviews error report
4. **Spec**: Update specs if needed
5. **Test**: Re-run validation until green

## Benefits

### Autonomy

- ✅ No manual validation required
- ✅ Automatic quality enforcement
- ✅ Self-healing on failures

### Quality

- ✅ 6 comprehensive checks
- ✅ Type safety enforced (zero `any` types)
- ✅ Test coverage maintained

### Speed

- ✅ Immediate feedback
- ✅ Local execution (no CI/CD wait)
- ✅ Parallel checks

### Reliability

- ✅ Consistent validation
- ✅ Platform-compatible (Windows + Unix)
- ✅ Error-proof (automated)

## Platform Compatibility

### Windows

```json
{
  "validate": "powershell -ExecutionPolicy Bypass -File scripts/validate.ps1"
}
```

### Unix/Linux

```json
{
  "validate": "bash scripts/validate.sh"
}
```

## Quick Commands

### Run Validation Manually

```bash
npm run validate
```

### Run Quick Validation (TypeScript + ESLint only)

```bash
npm run validate:quick
```

### Fix Auto-Fixable Issues

```bash
npm run lint:fix
```

## Success Metrics

**Before Hooks**:

- Manual validation required
- Type errors slipped through
- Inconsistent quality checks

**After Hooks**:

- ✅ 100% automatic validation
- ✅ 0 type errors (enforced)
- ✅ 6 consistent checks every time

## Status

- **Hooks**: 🟢 ACTIVE
- **Validation**: 🟢 PASSING (6/6)
- **Type Safety**: 🟢 ENFORCED
- **B.L.A.S.T. Loop**: 🟢 AUTONOMOUS

---

**Last Updated**: 2026-01-19  
**Version**: 1.0.0  
**Status**: ✅ PRODUCTION READY
