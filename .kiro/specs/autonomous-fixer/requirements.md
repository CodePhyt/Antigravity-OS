# Autonomous Fixer - Requirements

**Feature**: Self-healing autonomous error correction loop
**Status**: Draft
**Priority**: Critical (Phase 7 - Final Boss)

---

## 1. User Stories

### 1.1 As an autonomous agent, I need to fix my own errors
**So that** I can recover from failures without human intervention.

**Acceptance Criteria**:
- Agent can execute commands and capture errors
- Agent can research error solutions
- Agent can apply code fixes
- Agent can verify fixes work
- Agent retries up to 3 times
- Agent reports success or failure

### 1.2 As a developer, I need CLI access to autonomous fixing
**So that** I can trigger self-healing for any command.

**Acceptance Criteria**:
- `ag-os fix "<command>"` initiates autonomous loop
- Shows progress for each attempt
- Shows research findings
- Shows applied fixes
- Reports final outcome

---

## 2. Functional Requirements

### 2.1 The Autonomous Loop

**Algorithm**:
```
1. EXECUTE: Run command (e.g., "npm test")
2. CATCH: If fails, capture stderr (error message)
3. RESEARCH: Pass error to Researcher skill → Get solution
4. PATCH: Pass solution to FileSystem skill → Apply code change
5. VERIFY: Re-run command
6. REPEAT: Max 3 attempts
7. REPORT: Success or failure
```

**Input**:
```typescript
{
  command: string;      // Command to execute and fix
  maxAttempts?: number; // Default: 3
  timeout?: number;     // Per-attempt timeout (default: 60s)
}
```

**Output**:
```typescript
{
  success: boolean;
  attempts: number;
  finalOutput: string;
  fixes: Array<{
    attempt: number;
    error: string;
    research: string;
    patch: string;
    result: 'success' | 'failure';
  }>;
}
```

### 2.2 Error Analysis

**Capabilities**:
- Extract error message from stderr
- Identify file and line number
- Classify error type (syntax, type, runtime)
- Generate search query for Researcher

**Example**:
```
Error: SyntaxError: Unexpected token ';'
  at broken.ts:1:11

Analysis:
- File: broken.ts
- Line: 1
- Type: SyntaxError
- Query: "TypeScript SyntaxError Unexpected token semicolon fix"
```

### 2.3 Solution Application

**Capabilities**:
- Parse research results for code fixes
- Extract code snippets from solutions
- Apply patches using FileSystem skill
- Verify syntax before applying

**Safety**:
- Create Git snapshot before each fix attempt
- Validate patch doesn't break other code
- Rollback if fix makes things worse

---

## 3. Security Requirements

### 3.1 Command Validation
**Requirement**: Only allow safe commands.

**Acceptance Criteria**:
- Block dangerous commands (rm -rf, format, etc.)
- Block commands that modify system files
- Block commands that access network without permission
- Whitelist: npm, npx, node, tsc, vitest

### 3.2 File Modification Limits
**Requirement**: Only modify files within workspace.

**Acceptance Criteria**:
- Use FileSystem skill (inherits workspace sandboxing)
- Never modify system files
- Never modify node_modules
- Git snapshot before every modification

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Each attempt: <60 seconds
- Total loop: <3 minutes (3 attempts)
- Research: <10 seconds
- Patch application: <5 seconds

### 4.2 Reliability
- 80% success rate on common errors
- 100% safety (no system damage)
- Graceful degradation (report failure if can't fix)

### 4.3 Usability
- Clear progress indicators
- Detailed error explanations
- Actionable failure messages

---

## 5. Success Metrics

- 80% of syntax errors fixed autonomously
- 60% of type errors fixed autonomously
- 40% of runtime errors fixed autonomously
- 0% system damage rate
- 100% Git backup coverage

---

## 6. Out of Scope

- Fixing errors in external dependencies
- Fixing errors in node_modules
- Fixing errors in system files
- Fixing errors that require architectural changes
- Fixing errors that require human judgment

---

**Status**: Ready for Design
**Next Step**: Create design.md with implementation details
