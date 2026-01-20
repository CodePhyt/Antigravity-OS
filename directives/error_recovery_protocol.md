---
inclusion: always
---

# Error Recovery Protocol (Directive Layer)

**Version**: 2.0  
**Status**: ACTIVE  
**Last Updated**: 2026-01-20

---

## Purpose

This directive defines how the orchestration layer should handle errors during task execution. It provides natural language guidance for AI decision-making, not deterministic code.

---

## Core Philosophy

**"Errors are learning opportunities. Fix the system, not just the symptom."**

When an error occurs:
1. Don't panic or ask for permission
2. Analyze the root cause systematically
3. Update the relevant specification
4. Apply the correction
5. Learn from the experience

---

## B.L.A.S.T. Recovery Protocol

### Step 1: Build
**Action**: Execute the code or test that failed

**Orchestrator Decision**:
- Run the failing task/test
- Capture full execution context
- Record exact error message and stack trace

### Step 2: Log
**Action**: Capture comprehensive error context

**Required Information**:
- Task ID that failed
- Error message (full text)
- Stack trace (complete)
- Failed test name (if applicable)
- Timestamp
- Attempt number (1, 2, or 3)

**Orchestrator Decision**:
- Store error context in memory
- Prepare for analysis phase

### Step 3: Analyze
**Action**: Determine root cause of failure

**Analysis Questions**:
1. Is this a code bug or a spec issue?
2. Is the requirement unclear or missing?
3. Is the property definition incorrect?
4. Is the task description ambiguous?
5. Is this a known pattern from memory graph?

**Orchestrator Decision**:
- Check `docs/memory/insight-graph.md` for similar patterns
- Identify which spec file needs updating
- Determine if this is architectural (trigger checkpoint)

### Step 4: Spec
**Action**: Update the relevant specification

**Update Targets**:
- **requirements.md**: If acceptance criteria are unclear
- **design.md**: If properties are incorrect
- **tasks.md**: If task description is ambiguous
- **Memory graph**: Always log the pattern

**Orchestrator Decision**:
- If architectural change → Trigger Human Checkpoint
- If minor clarification → Update spec directly
- If type error → Trigger B.L.A.S.T. Type-Repair
- Always validate updated spec against JSON Schema

### Step 5: Test
**Action**: Re-execute the corrected task

**Orchestrator Decision**:
- Re-run the failing task/test
- If success → Mark task complete, log to DEVLOG
- If failure → Increment attempt counter
- If attempt >= 3 → Trigger n8n Deep Research Agent
- If attempt < 3 → Return to Step 1

---

## Sandboxed Execution (PREFERRED)

**Directive**: When executing untrusted or generated code, ALWAYS prefer sandboxed execution.

### When to Use Sandboxing
- Executing user-provided code
- Running generated code for the first time
- Testing potentially unsafe operations
- Validating external scripts

### How to Use Sandboxing
**Orchestrator Decision**:
1. Check if Docker is available (call `execution/container_service.ts`)
2. If available → Use `executeCodeSandboxed(code)`
3. If not available → Warn user and execute with caution
4. Always set resource limits (memory, CPU, timeout)
5. Always disable network access for untrusted code

### Sandboxing Configuration
```typescript
// Orchestrator calls execution layer
const result = await executeCodeSandboxed(generatedCode, {
  timeout: 30000,        // 30 seconds max
  memoryLimit: '512m',   // 512 MB max
  cpuLimit: '1.0',       // 1 CPU core max
  network: 'none'        // No network access
});
```

**Benefits**:
- Prevents system damage from buggy code
- Isolates resource usage
- Enables safe experimentation
- Protects against malicious code

---

## Human-Aware Checkpoints

**Directive**: Pause for human review on critical changes.

### Checkpoint Triggers
- Architectural changes (A.N.T. framework modifications)
- Spec file modifications (requirements, design, tasks)
- File deletions (any file type)
- Security-sensitive changes (auth, encryption, validation)
- Production deployments (main branch, builds)

### Checkpoint Protocol
**Orchestrator Decision**:
1. Detect checkpoint trigger
2. Generate impact analysis:
   - Severity (low/medium/high/critical)
   - Affected components
   - Breaking changes assessment
   - Rollback strategy
   - Risk estimation (0-100)
3. Present to human with options:
   - Proceed
   - Modify
   - Reject
   - Defer
4. Await human decision
5. Execute based on decision
6. Log decision with reasoning

**See**: `.kiro/steering/checkpoint_rules.md` for complete protocol

---

## Type-Safe Validation

**Directive**: Validate all data at compile-time and runtime.

### Compile-Time Validation
**Orchestrator Decision**:
- Ensure all code passes TypeScript strict mode
- No `any` types allowed
- All functions have explicit return types
- All parameters have explicit types

### Runtime Validation
**Orchestrator Decision**:
- Validate all API inputs against JSON Schema
- Validate all spec files before parsing
- Validate all external data on entry
- If validation fails → Trigger B.L.A.S.T. Type-Repair

### B.L.A.S.T. Type-Repair Loop
**Orchestrator Decision**:
1. Validation fails
2. Analyze error (missing field, wrong type, invalid format)
3. Determine if schema or code is wrong
4. Update schema or fix code
5. Re-validate
6. Log correction to memory graph

---

## External Research (n8n Integration)

**Directive**: When local information is insufficient, trigger external research.

### When to Trigger Research
- Ralph-Loop exhausts 3 attempts
- Error is complex or unfamiliar
- No similar pattern in memory graph
- Solution requires external knowledge

### How to Trigger Research
**Orchestrator Decision**:
1. Check if n8n is available
2. Prepare research payload:
   - Task ID
   - Error message
   - Stack trace
   - Spec references
   - Attempt number
3. Call `execution/n8n_client.ts` → `triggerDeepResearch()`
4. Wait for research results (max 5 minutes)
5. Parse research findings
6. Apply recommended solution
7. Log sources and confidence scores

**See**: `directives/external_research.md` for complete protocol

---

## Decision-Tree Logging

**Directive**: Document all technical decisions for transparency.

### What to Log
**Orchestrator Decision**:
- Technical choice made
- Alternatives considered (with pros/cons)
- Why spec-compliant
- Trade-offs (gains and losses)
- Validation approach

### Where to Log
- `docs/internal/rationales.md` (decision log)
- `DEVLOG.md` (execution log)
- `docs/memory/insight-graph.md` (pattern learning)

**Benefits**:
- Process transparency for hackathon judging
- Learning from outcomes
- Onboarding documentation
- Audit trail for compliance

---

## Attempt Limits

**Directive**: Respect attempt limits to maintain velocity.

### Standard Limits
- **Ralph-Loop**: 3 attempts maximum
- **Type Repair**: 2 attempts maximum
- **Debugging**: 2 attempts maximum

### After Limit Exhausted
**Orchestrator Decision**:
1. Log exhaustion event
2. Trigger n8n Deep Research Agent
3. If research fails → Mark task as blocked
4. Request human intervention
5. Document issue comprehensively

**Philosophy**: Don't get stuck. Move forward with MVP or escalate.

---

## Self-Healing Events

**Directive**: Log all self-healing events for continuous learning.

### What to Log
- Error type and context
- Root cause analysis
- Correction applied
- Spec updates made
- Success/failure outcome
- Time to resolution

### Where to Log
- `DEVLOG.md` under "Self-Healing Events" section
- `docs/memory/insight-graph.md` as new pattern
- `docs/telemetry.json` as telemetry event

**Orchestrator Decision**:
- Record telemetry event: `ralph_loop_success` or `ralph_loop_failure`
- Update memory graph with new pattern
- Trigger Continuous Learning Agent (n8n)

---

## Auditor Protocol Integration

**Directive**: Before finalizing any task, switch to Independent Auditor persona.

### Auditor Checklist
**Orchestrator Decision**:
1. Security review (no credentials, input validation)
2. Code quality review (DRY, SRP, error handling)
3. Testing review (coverage, edge cases, property tests)
4. Performance review (algorithms, async, memory)
5. Standards compliance (global rules, A.N.T., B.L.A.S.T.)
6. Documentation review (README, DEVLOG, JSDoc)

### Audit Outcome
**Orchestrator Decision**:
- If PASS → Add `[AUDIT_PASSED]` tag to commit
- If FAIL → Fix critical issues, re-audit
- Log audit report to commit message

**See**: `docs/audit_protocol.md` for complete checklist

---

## Error Recovery Patterns

### Pattern 1: Simple Bug Fix
**Scenario**: Code has a typo or logic error

**Orchestrator Decision**:
1. Analyze error message
2. Identify buggy line
3. Fix code directly
4. Re-run tests
5. If success → Complete task

### Pattern 2: Spec Clarification
**Scenario**: Requirement is ambiguous

**Orchestrator Decision**:
1. Identify ambiguous requirement
2. Update requirements.md with clarification
3. Regenerate code based on updated spec
4. Re-run tests
5. If success → Complete task

### Pattern 3: Property Violation
**Scenario**: Code violates a correctness property

**Orchestrator Decision**:
1. Identify violated property
2. Determine if property is correct
3. If property wrong → Update design.md
4. If code wrong → Fix code
5. Re-run property tests
6. If success → Complete task

### Pattern 4: Complex Error
**Scenario**: Error is unfamiliar or complex

**Orchestrator Decision**:
1. Attempt standard fixes (2 attempts)
2. If still failing → Trigger n8n Deep Research
3. Wait for research results
4. Apply recommended solution
5. Re-run tests
6. If success → Complete task
7. If still failing → Escalate to human

---

## Integration with Execution Layer

**Directive**: The orchestration layer makes decisions, the execution layer executes them.

### Orchestrator Responsibilities
- Analyze errors
- Decide on correction strategy
- Choose which execution script to call
- Interpret results
- Update specs

### Execution Layer Responsibilities
- Run Docker containers (`execution/container_service.ts`)
- Execute tests (`execution/test_runner.ts`)
- Make API calls (`execution/n8n_client.ts`)
- Perform file operations (`execution/file_operations.ts`)
- Validate data (`execution/validation.ts`)

**Philosophy**: Orchestrator thinks, execution layer acts.

---

## Success Criteria

**Directive**: A task is complete when:
1. All tests pass (unit + property)
2. Code passes audit review
3. Spec is updated (if needed)
4. Memory graph is updated
5. DEVLOG is updated
6. Telemetry is recorded

**Orchestrator Decision**:
- Mark task as completed
- Update task status in tasks.md
- Commit changes with `[AUDIT_PASSED]` tag
- Move to next task

---

## Failure Criteria

**Directive**: A task has failed when:
1. Ralph-Loop exhausts 3 attempts
2. n8n Deep Research fails
3. Human intervention is required
4. Critical security issue found

**Orchestrator Decision**:
- Mark task as blocked
- Document issue comprehensively
- Request human review
- Do not proceed to next task

---

**Status**: ACTIVE  
**Enforcement**: MANDATORY for all error recovery  
**Review Cycle**: After every self-healing event

**Philosophy**: *"Fix the system, not just the symptom. Learn from every error."*
