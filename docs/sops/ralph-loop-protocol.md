# Ralph-Loop Self-Correction Protocol

## Purpose

This SOP defines the autonomous error correction protocol for Antigravity OS. When execution failures occur, the Ralph-Loop analyzes errors, updates specifications, and re-executes without human intervention.

## Scope

Applies to all task execution failures during spec-driven development, including:

- Test failures (unit and property-based)
- Compilation errors
- Runtime exceptions
- Missing dependencies
- Invalid specifications

## Principles

### 1. Autonomous Operation

- **DO NOT** ask for permission to fix errors
- **DO** analyze, correct, and re-execute automatically
- **DO** log all corrections for transparency

### 2. Spec-First Correction

- Errors indicate spec misalignment, not just code bugs
- Update specs to reflect new understanding
- Code follows specs, not vice versa

### 3. Bounded Iteration

- Maximum 3 correction attempts per task
- Prevents infinite loops
- Escalates to human after exhaustion

## Procedure

### Step 1: Error Detection

**Trigger**: Task execution fails with error context

**Actions**:

1. Capture complete error information:
   - Error message and stack trace
   - Task ID and description
   - Timestamp
   - Failed test name (if applicable)
   - Counterexample (for property tests)

2. Halt execution immediately
3. Emit Ralph-Loop activation event

### Step 2: Error Classification

**Objective**: Determine error type and root cause

**Classification Matrix**:

| Error Type         | Indicators              | Root Cause                                      |
| ------------------ | ----------------------- | ----------------------------------------------- |
| Test Failure       | Test exit code ≠ 0      | Property too strict OR implementation incorrect |
| Compilation Error  | TypeScript/build errors | Design incomplete OR missing types              |
| Runtime Error      | Uncaught exception      | Requirements ambiguous OR edge case missed      |
| Missing Dependency | Import/require fails    | Tasks out of order OR prerequisite skipped      |
| Invalid Spec       | Parse error             | Spec syntax error OR malformed markdown         |

**Actions**:

1. Parse error output to identify type
2. Extract relevant context (line numbers, function names, test names)
3. Link error to requirements/properties if possible

### Step 3: Target File Determination

**Objective**: Identify which spec file needs updating

**Decision Tree**:

```
Is it a test failure?
├─ Yes: Is the test a property test?
│   ├─ Yes: Update design.md (adjust property or add constraint)
│   └─ No: Update tasks.md (clarify implementation detail)
└─ No: Is it a compilation error?
    ├─ Yes: Update design.md (add missing types/interfaces)
    └─ No: Is it a runtime error?
        ├─ Yes: Update requirements.md (add missing acceptance criterion)
        └─ No: Update tasks.md (add prerequisite or clarification)
```

**Special Cases**:

- **Property test with counterexample**: Analyze if property is universally true or needs refinement
- **Missing functionality**: Add to requirements.md as new acceptance criterion
- **Ambiguous requirement**: Clarify in requirements.md with specific examples

### Step 4: Correction Generation

**Objective**: Generate updated spec content

**Process**:

1. Load current spec file content
2. Identify section to modify (preserve all other content)
3. Use LLM analysis to generate correction:
   - Prompt: "Error: {error_message}. Task: {task_description}. Current spec: {relevant_section}. Suggest correction."
4. Validate correction:
   - Doesn't contradict other requirements
   - Maintains spec structure and formatting
   - Addresses root cause, not just symptom

**Correction Patterns**:

**For test failures**:

```markdown
# Before (design.md)

Property 5: All user inputs must be validated

# After (design.md)

Property 5: All user inputs must be validated, except for trusted admin inputs
```

**For missing functionality**:

```markdown
# Before (requirements.md)

1. User can create account

# After (requirements.md)

1. User can create account
   - Email must be unique
   - Password must be at least 8 characters
```

**For implementation clarification**:

```markdown
# Before (tasks.md)

- [ ] 2.3 Implement validation

# After (tasks.md)

- [ ] 2.3 Implement validation
  - Use Zod schema for type safety
  - Return structured error messages
  - Handle edge case: empty strings
```

### Step 5: Atomic Application

**Objective**: Apply correction without corrupting files

**Process**:

1. Create backup of original file:
   - Copy to `.kiro/backups/{filename}-{timestamp}.md`
2. Write corrected content to temporary file:
   - `.kiro/specs/{feature}/.{filename}.tmp`
3. Validate temporary file:
   - Check markdown syntax
   - Verify all sections present
   - Ensure no data loss
4. Atomic rename:
   - Replace original with temporary file
   - OS-level atomic operation
5. If any step fails:
   - Restore from backup
   - Log failure
   - Increment attempt counter

### Step 6: Logging

**Objective**: Record correction for audit and learning

**DEVLOG.md Entry Format**:

```markdown
### Self-Healing Event #{number}

**Date**: 2026-01-19 13:45:00  
**Task**: 2.3 Implement validation  
**Error**: Property test failed - counterexample: empty string input  
**Root Cause**: Property too strict - didn't account for optional fields  
**Correction**: Updated design.md Property 5 to exclude optional fields  
**Attempt**: 1 of 3  
**Status**: ✅ Resolved
```

**Execution Log Entry**:

```json
{
  "timestamp": "2026-01-19T13:45:00.123Z",
  "eventType": "ralph_loop_activated",
  "taskId": "2.3",
  "errorType": "test_failure",
  "targetFile": "design.md",
  "attemptNumber": 1,
  "correction": "Updated Property 5 to exclude optional fields",
  "success": true
}
```

### Step 7: Task Reset and Resumption

**Objective**: Resume execution from corrected state

**Process**:

1. Reset failed task status:
   - Change from `in_progress` to `not_started`
   - Update tasks.md atomically
2. Increment attempt counter:
   - Track in orchestrator state
   - Check against limit (3 attempts)
3. If attempts < 3:
   - Resume execution from failed task
   - Emit resumption event
4. If attempts ≥ 3:
   - Halt execution
   - Emit escalation event
   - Request human intervention

## Iteration Limits

### Maximum Attempts: 3

**Rationale**: Prevents infinite loops while allowing reasonable correction attempts

**Escalation Procedure**:

1. Log exhaustion event to DEVLOG.md:

   ```markdown
   ### Self-Healing Event #{number} - ESCALATION REQUIRED

   **Task**: {task_id}  
   **Error**: {error_message}  
   **Attempts**: 3 of 3 exhausted  
   **Status**: ⚠️ Human intervention required  
   **Context**: {full_error_context}
   ```

2. Emit escalation event via SSE:

   ```json
   {
     "type": "ralph_loop_exhausted",
     "taskId": "2.3",
     "message": "Unable to auto-correct after 3 attempts",
     "requiresHuman": true
   }
   ```

3. Halt execution gracefully:
   - Save current state
   - Close all resources
   - Return control to user

## Success Criteria

A Ralph-Loop correction is successful when:

1. ✅ Spec file updated atomically
2. ✅ Correction logged to DEVLOG.md
3. ✅ Task reset to not_started
4. ✅ Re-execution passes without same error
5. ✅ No other tests broken by correction

## Monitoring

### Key Metrics

- **Self-Correction Rate**: % of errors fixed autonomously
- **Average Attempts**: Mean attempts before success
- **Escalation Rate**: % of tasks requiring human intervention
- **Correction Types**: Distribution of error types

### Target Performance

- Self-Correction Rate: > 90%
- Average Attempts: < 1.5
- Escalation Rate: < 10%

## Examples

### Example 1: Property Test Failure

**Error**:

```
Property test failed: Property 5 - Input validation
Counterexample: { email: "", password: "test123" }
Expected: validation error
Actual: accepted
```

**Analysis**:

- Error Type: Test failure (property test)
- Root Cause: Property doesn't account for empty string edge case
- Target File: design.md

**Correction**:

```markdown
# Before

Property 5: All user inputs must be validated for correct format

# After

Property 5: All user inputs must be validated for correct format

- Email must be non-empty and match email regex
- Password must be non-empty and at least 8 characters
```

**Outcome**: ✅ Test passes on re-execution

### Example 2: Missing Functionality

**Error**:

```
Runtime error: Cannot read property 'validate' of undefined
at UserService.createUser (user-service.ts:45)
```

**Analysis**:

- Error Type: Runtime error
- Root Cause: Validation function not implemented
- Target File: tasks.md

**Correction**:

```markdown
# Before

- [ ] 2.3 Implement user creation

# After

- [ ] 2.3 Implement user creation
  - [ ] 2.3.1 Implement validation function
  - [ ] 2.3.2 Implement user creation logic
```

**Outcome**: ✅ Prerequisite task added, execution resumes

## Revision History

| Version | Date       | Changes                     |
| ------- | ---------- | --------------------------- |
| 1.0     | 2026-01-19 | Initial protocol definition |

---

**Remember**: The Ralph-Loop is not just error handling—it's continuous spec refinement through execution feedback. Every correction makes the spec more accurate and complete.
