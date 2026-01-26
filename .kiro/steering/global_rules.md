# Antigravity OS - Global Development Rules

## Purpose

This document defines system-wide development standards that apply to all features, tasks, and code. These rules are evolved through the Self-Refinement protocol in `evolution_log.md`.

---

## Rule 1: Memory-First Development (Golden Quadrant A)

**Mandate**: Before starting ANY new task or feature, the agent MUST read `/docs/memory/insight-graph.md`.

**Rationale**: Prevents repeating failed patterns and leverages accumulated knowledge.

**Enforcement**:

- Automatic check in task execution workflow
- Log violation if memory graph not consulted
- Block task start until memory reviewed

**Exceptions**: None. This is a hard requirement.

---

## Rule 1.5: Selective Context Loading (Cole Medin Top 5% Standard)

**Mandate**: Agents MUST load only essential context per task. Read files selectively, not exhaustively.

**Rationale**: Prevents context bloat, maintains focus, reduces token usage, increases execution speed.

**Protocol**:

1. **Task Analysis**: Identify minimum required files for current task
2. **Targeted Reading**: Read only relevant sections (use line ranges)
3. **Progressive Loading**: Load additional context only when needed
4. **Context Pruning**: Discard irrelevant context after task completion

**Essential Context Priority**:

- **Always Load**: Current task description, related requirements
- **Load When Needed**: Design properties, dependency files, test files
- **Load Sparingly**: Full specs, historical logs, unrelated components

**Enforcement**:

- Track context loading per task
- Log excessive context loading as violation
- Optimize context loading in evolution cycles

**Examples**:

- ✅ **Good**: Read only task 5.2 section from tasks.md
- ❌ **Bad**: Read entire tasks.md for single task
- ✅ **Good**: Read specific function from source file
- ❌ **Bad**: Read entire source file for single function check

**Exceptions**: Initial system setup, comprehensive audits, debugging complex issues.

---

## Rule 2: Schema-First Data Structures (Golden Quadrant B)

**Mandate**: All data structures MUST have a corresponding JSON Schema in `/docs/schemas/` before implementation.

**Rationale**: Catches type errors at design time, enables runtime validation.

**Enforcement**:

- Schema validation before any data processing
- B.L.A.S.T. Schema-Fix triggered on validation failure
- No code execution without valid schema

**Exceptions**: Temporary prototypes (must be schema-validated before merge).

---

## Rule 3: B.L.A.S.T. Recovery Protocol (Enhanced Ralph-Loop)

**Mandate**: All execution failures MUST follow the 5-step B.L.A.S.T. protocol with Human-Aware checkpoints and Type-Safe validation.

**Protocol**:

1. **Build**: Execute code/tests
2. **Log**: Capture full error context (stack trace, task ID, timestamp)
3. **Analyze**: Check against specs and memory graph
4. **Spec**: Update documentation if error due to missing/incorrect specs
   - ⚠️ **CHECKPOINT**: If spec change is architectural or breaking, pause for human review
   - ✅ **TYPE-SAFE**: Validate updated spec against JSON Schema before commit
5. **Test**: Re-run until green (max 3 attempts)
   - If 3 attempts exhausted, trigger n8n Deep Research Agent
   - ✅ **TYPE-SAFE**: Validate all code changes with TypeScript compiler

**Human-Aware Enhancement**:

- Architectural changes require checkpoint (see `.kiro/steering/checkpoint_rules.md`)
- Impact analysis generated automatically
- Human decision logged with reasoning
- Bypass only for critical emergencies

**Type-Safe Enhancement**:

- All spec updates validated against `/docs/schemas/api-schema.json`
- All code changes must pass TypeScript strict mode compilation
- Validation failures trigger "B.L.A.S.T. Type-Repair" loop
- Zero `any` types allowed

**Rationale**: Autonomous error recovery with strategic human oversight and compile-time safety.

**Enforcement**:

- Automatic activation on any test failure
- Checkpoint protocol enforced for major changes
- Type validation mandatory before commit
- Log all corrections to memory graph
- Escalate to human after 3 failed attempts

---

## Rule 4: Time-Boxing & MVP Mindset

**Mandate**: All debugging sessions MUST be time-boxed to 2 attempts maximum.

**Rationale**: Prevents infinite debugging loops, maintains development velocity.

**Protocol**:

- Attempt 1: Fix obvious issues
- Attempt 2: Try alternative approach
- After 2 attempts: Move to MVP, document limitation, continue

**Enforcement**:

- Track attempt count in execution state
- Automatic MVP fallback after limit
- Log time-box violations to evolution log

---

## Rule 5: Dual Testing Requirement

**Mandate**: All core logic MUST have both unit tests AND property-based tests.

**Rationale**: Unit tests verify specific cases, property tests verify universal correctness.

**Requirements**:

- Unit tests: Edge cases, error conditions, integration points
- Property tests: Universal properties, 100+ iterations
- Coverage: Minimum 80% for all modules

**Enforcement**:

- CI/CD blocks merge if coverage <80%
- Property tests required for all exported functions
- Test review in code review checklist

---

## Rule 6: Structured Verification

**Mandate**: All API inputs/outputs MUST be validated against JSON Schema.

**Rationale**: Runtime type safety, prevents invalid data propagation.

**Implementation**:

```typescript
import { validateTask } from '@/lib/validation';

// Before processing
validateTask(taskData); // Throws ValidationError if invalid

// After generation
validateExecutionStatus(status); // Ensures output correctness
```

**Enforcement**:

- Validation middleware on all API routes
- Schema validation in service layer
- Automatic error responses for invalid data

---

## Rule 7: Hybrid Compute Optimization (Golden Quadrant D)

**Mandate**: Workloads MUST be intelligently routed between cloud and local LLMs.

**Routing Logic**:

- **Cloud LLM**: Code generation, interactive development, real-time parsing
- **Local LLM**: Code auditing, batch validation, property test generation

**Auto-Detection**:

```typescript
const hasLocalLLM = await detectOllamaInstance();
const useLocal = hasLocalLLM && task.type === 'validation';
```

**Rationale**: Optimize for speed (cloud) and cost (local).

---

## Rule 8: Documentation Synchronization

**Mandate**: All spec updates MUST be reflected in code within same commit.

**Rationale**: Prevents spec-code drift, maintains single source of truth.

**Protocol**:

- Update spec file first
- Implement code changes
- Update tests
- Commit all together with descriptive message

**Enforcement**:

- Pre-commit hook checks for spec-code consistency
- CI/CD validates spec references in code
- Code review checklist includes spec sync verification

---

## Rule 9: Self-Evolution Cadence (Golden Quadrant C)

**Mandate**: System MUST perform self-refinement analysis every 3 development cycles.

**Protocol**:

1. Collect performance metrics
2. Analyze pattern effectiveness
3. Propose rule updates
4. Validate against historical data
5. Update this file with new/modified rules

**Rationale**: Continuous improvement of development standards.

**Enforcement**:

- Automatic trigger after cycle 3, 6, 9, etc.
- Evolution log tracks all refinements
- Rule changes require validation before activation

---

## Rule 10: Hackathon Velocity Mode

**Mandate**: During hackathon, prioritize working demos over perfect code.

**Guidelines**:

- MVP first, refinement later
- Document limitations clearly (⚠️ emoji)
- Skip optional tasks if time-constrained
- Focus on core functionality that demonstrates value

**Rationale**: Hackathons reward working prototypes, not perfect architecture.

**Enforcement**:

- Time-box all tasks to 30 minutes max
- Mark partial completions in DEVLOG
- Defer non-critical refinements to post-hackathon

---

## Rule Violation Protocol

### Automatic Violations

- Logged to `evolution_log.md`
- Counted toward evolution trigger threshold
- Analyzed during self-refinement

### Manual Violations

- Require justification in commit message
- Reviewed during code review
- May trigger emergency evolution cycle if pattern emerges

### Violation Thresholds

- **Warning**: 3 violations per cycle → Review rule clarity
- **Critical**: 5 violations per cycle → Emergency refinement
- **Systemic**: Same rule violated 3 cycles → Rule redesign

---

## Rule Evolution History

### Version 1.0.0 (2026-01-19)

- Initial rule set based on Golden Quadrant integration
- 10 core rules established
- B.L.A.S.T. protocol formalized

### Version 1.1.0 (TBD)

- _Future evolution will be logged here_

---

**Status**: 🟢 ACTIVE  
**Version**: 1.0.0  
**Last Updated**: 2026-01-19 14:32  
**Next Review**: After Cycle 4

## Rule 11: Human-in-the-Loop Checkpoints (Cole Medin Master Pattern)

**Mandate**: Critical decisions MUST pause for human review before execution.

**Checkpoint Triggers**:

- Architectural changes (A.N.T. framework modifications)
- Spec file modifications (requirements, design, tasks)
- File deletions (any file type)
- Security-sensitive changes (auth, encryption, validation)
- Production deployments (main branch, builds, migrations)

**Protocol**:

1. Detect checkpoint trigger
2. Generate impact analysis (severity, affected components, risks)
3. Present to human with clear options
4. Await decision (proceed/modify/reject/defer)
5. Execute or abort based on decision
6. Log decision with reasoning

**Impact Analysis Required**:

- Affected components list
- Breaking changes assessment
- Rollback strategy
- Testing requirements
- Risk estimation (0-100)

**Rationale**: Balance autonomy with accountability. Speed with safety.

**Enforcement**:

- Mandatory for architectural/security/production changes
- Optional for refactoring/optimization/integrations
- Emergency bypass only for critical bugs
- All checkpoints logged to `.kiro/logs/checkpoints.log`

**Exceptions**: Emergency mode for critical production issues (requires retroactive review)

**See**: `.kiro/steering/checkpoint_rules.md` for complete protocol

---

## Rule 12: Decision-Tree Logging (Process Transparency)

**Mandate**: All technical decisions MUST be documented with alternatives and reasoning.

**Required Documentation**:

- **Technical Choice**: What we decided
- **Alternatives Considered**: What else we evaluated (with pros/cons)
- **Why Spec-Compliant**: How this aligns with requirements/properties
- **Trade-offs**: What we gained and lost
- **Validation**: How we'll verify correctness

**Location**: `docs/internal/rationales.md` (Shadow Specs)

**Rationale**: Process transparency for hackathon judging, learning from decisions, continuous improvement.

**Enforcement**:

- Document decision before implementation
- Link to relevant specs and requirements
- Update after validation (success/failure)
- Review monthly for patterns

**Benefits**:

- Hackathon "Process Transparency" points
- Learning from outcomes
- Onboarding new team members
- Audit trail for compliance

**See**: `docs/internal/rationales.md` for decision log

---

## Rule 13: Strict Type-Safe Validation (Zero Runtime Surprises)

**Mandate**: All code and data MUST be validated at compile-time and runtime.

**Compile-Time Validation**:

- TypeScript strict mode (no `any` types)
- All functions have explicit return types
- All parameters have explicit types
- ESLint enforces type safety rules

**Runtime Validation**:

- All API inputs validated against JSON Schema
- All spec files validated before parsing
- All external data validated on entry
- Validation failures trigger "B.L.A.S.T. Type-Repair" loop

**Validation Libraries**:

- **TypeScript**: Compile-time type checking
- **Ajv**: JSON Schema validation (runtime)
- **Zod**: TypeScript-first validation (optional)

**B.L.A.S.T. Type-Repair Loop**:

1. Validation fails
2. Analyze error (missing field, wrong type, invalid format)
3. Update schema or code to fix
4. Re-validate
5. Log correction to memory graph

**Rationale**: Catch errors at design time, not runtime. Zero surprises in production.

**Enforcement**:

- TypeScript compilation must pass (zero errors)
- All schemas in `/docs/schemas/` must be valid
- Runtime validation on all boundaries
- CI/CD blocks merge if validation fails

**Exceptions**: None. Type safety is non-negotiable.

---

## Rule Evolution History

### Version 1.0.0 (2026-01-19)

- Initial rule set based on Golden Quadrant integration
- 10 core rules established
- B.L.A.S.T. protocol formalized

### Version 1.1.0 (2026-01-19) - Cole Medin Master Patterns

- **Rule 3 Enhanced**: Added Human-Aware checkpoints and Type-Safe validation to B.L.A.S.T.
- **Rule 11 Added**: Human-in-the-Loop Checkpoints protocol
- **Rule 12 Added**: Decision-Tree Logging for process transparency
- **Rule 13 Added**: Strict Type-Safe Validation with B.L.A.S.T. Type-Repair

---

**Status**: 🟢 ACTIVE  
**Version**: 1.1.0  
**Last Updated**: 2026-01-19 15:30  
**Next Review**: After Cycle 4
