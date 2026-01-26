---
inclusion: always
---

# External Research Protocol (Directive Layer)

**Version**: 1.0  
**Status**: ACTIVE  
**Last Updated**: 2026-01-20

---

## Purpose

This directive defines when and how the orchestration layer should trigger external research via n8n workflows when local information is insufficient to solve a problem.

---

## Core Philosophy

**"When stuck, research. When researched, apply. When applied, learn."**

The orchestrator should:

1. Recognize when local knowledge is insufficient
2. Trigger external research workflows
3. Parse and apply research findings
4. Learn from the research for future use

---

## When to Trigger Research

### Automatic Triggers

#### 1. Ralph-Loop Exhaustion

**Condition**: 3 correction attempts have failed

**Orchestrator Decision**:

- Error is complex or unfamiliar
- Standard fixes have not worked
- Time to seek external knowledge
- Trigger: n8n Deep Research Agent

#### 2. Unknown Error Pattern

**Condition**: Error not found in memory graph

**Orchestrator Decision**:

- Check `docs/memory/insight-graph.md`
- If no similar pattern exists
- Trigger: n8n Deep Research Agent

#### 3. Missing Specification

**Condition**: Requirement or property is unclear

**Orchestrator Decision**:

- Spec validation fails
- Ambiguity detected in requirements
- Trigger: n8n Spec Validation Agent

#### 4. Complex Integration

**Condition**: Integrating with external service

**Orchestrator Decision**:

- Need API documentation
- Need best practices
- Need code examples
- Trigger: n8n Deep Research Agent

### Manual Triggers

**Orchestrator Decision**:

- User explicitly requests research
- Task description includes "research" keyword
- Directive specifies external research needed

---

## Research Workflows

### 1. Deep Research Agent

**Purpose**: Comprehensive error analysis and solution discovery

**When to Use**:

- Ralph-Loop exhausted (3 attempts)
- Complex error requiring external knowledge
- Unfamiliar library or framework
- Need multiple solution approaches

**Payload Structure**:

```typescript
{
  taskId: string;           // Task that failed
  errorMessage: string;     // Full error text
  stackTrace: string;       // Complete stack trace
  specPath: string;         // Path to spec directory
  attemptNumber: number;    // Current attempt (usually 3)
  context: {
    language: string;       // Programming language
    framework: string;      // Framework being used
    libraries: string[];    // Relevant libraries
  }
}
```

**Expected Output**:

```typescript
{
  rootCause: string;                    // Root cause analysis
  recommendedSolutions: Array<{
    approach: string;                   // Solution approach
    code: string;                       // Code example
    confidence: number;                 // 0-100
    source: string;                     // URL or reference
  }>;
  specUpdates: Array<{
    file: string;                       // requirements.md, design.md, etc.
    section: string;                    // Section to update
    content: string;                    // New content
  }>;
  learnings: string[];                  // Key learnings for memory graph
}
```

**Orchestrator Decision**:

1. Prepare payload with full error context
2. Call `execution/n8n_client.ts` → `triggerDeepResearch(payload)`
3. Wait for response (max 5 minutes)
4. Parse research findings
5. Apply highest confidence solution first
6. If solution works → Log to memory graph
7. If solution fails → Try next solution
8. If all fail → Escalate to human

### 2. Spec Validation Agent

**Purpose**: Validate spec completeness and consistency

**When to Use**:

- Before executing any task
- After spec updates
- When ambiguity detected
- User requests validation

**Payload Structure**:

```typescript
{
  specPath: string; // Path to spec directory
  requirementsPath: string; // requirements.md path
  designPath: string; // design.md path
  tasksPath: string; // tasks.md path
}
```

**Expected Output**:

```typescript
{
  isValid: boolean; // Overall validation result
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    file: string; // File with issue
    section: string; // Section with issue
    description: string; // Issue description
    suggestion: string; // Suggested fix
  }>;
  suggestions: Array<{
    type: 'missing_requirement' | 'ambiguous_property' | 'incomplete_task';
    content: string; // Suggested addition
    reasoning: string; // Why this is needed
  }>;
  confidence: number; // 0-100
}
```

**Orchestrator Decision**:

1. Prepare payload with spec paths
2. Call `execution/n8n_client.ts` → `triggerSpecValidation(payload)`
3. Wait for response (max 2 minutes)
4. If critical issues → Pause execution, request human review
5. If high issues → Apply suggestions, re-validate
6. If medium/low issues → Log for future improvement
7. If valid → Proceed with task execution

### 3. Multi-Agent Code Review

**Purpose**: Comprehensive code quality review by specialized agents

**When to Use**:

- After completing a task
- Before marking task as complete
- User requests code review
- Critical code changes

**Payload Structure**:

```typescript
{
  taskId: string;                       // Task that was completed
  changedFiles: string[];               // Files that were modified
  testFiles: string[];                  // Test files
  specPath: string;                     // Path to spec directory
}
```

**Expected Output**:

```typescript
{
  approved: boolean;                    // Overall approval
  reviews: {
    security: {
      passed: boolean;
      issues: string[];
      suggestions: string[];
    };
    performance: {
      passed: boolean;
      issues: string[];
      suggestions: string[];
    };
    testCoverage: {
      passed: boolean;
      coverage: number;                 // Percentage
      missingTests: string[];
    };
    documentation: {
      passed: boolean;
      issues: string[];
      suggestions: string[];
    };
  };
  overallScore: number;                 // 0-100
}
```

**Orchestrator Decision**:

1. Prepare payload with changed files
2. Call `execution/n8n_client.ts` → `triggerCodeReview(payload)`
3. Wait for response (max 3 minutes)
4. If not approved → Apply suggestions, re-run tests
5. If approved → Mark task complete
6. Log review results to DEVLOG

### 4. Continuous Learning Agent

**Purpose**: Extract patterns and update memory graph automatically

**When to Use**:

- After every self-healing event
- After successful correction
- After failed correction (learn what didn't work)
- Periodically (every 5 tasks)

**Payload Structure**:

```typescript
{
  errorType: string; // Type of error
  targetFile: string; // File that was corrected
  correction: string; // Correction that was applied
  attemptNumber: number; // Number of attempts
  success: boolean; // Whether correction worked
  timestamp: string; // ISO timestamp
}
```

**Expected Output**:

```typescript
{
  pattern: {
    name: string; // Pattern name
    description: string; // Pattern description
    category: 'success' | 'failure' | 'meta';
    frequency: number; // How often this occurs
  }
  memoryGraphUpdate: string; // Markdown to add to insight-graph.md
  ruleProposals: Array<{
    rule: string; // Proposed global rule
    reasoning: string; // Why this rule is needed
    priority: 'high' | 'medium' | 'low';
  }>;
  evolutionLogEntry: string; // Entry for evolution_log.md
}
```

**Orchestrator Decision**:

1. Prepare payload with correction details
2. Call `execution/n8n_client.ts` → `triggerContinuousLearning(payload)`
3. Wait for response (max 1 minute)
4. Update `docs/memory/insight-graph.md` with new pattern
5. If rule proposals → Add to evolution log for review
6. Log learning event to telemetry

---

## Research Execution Flow

### Step 1: Detect Need for Research

**Orchestrator Decision**:

- Check if local knowledge is sufficient
- Check memory graph for similar patterns
- Check attempt counter
- Decide which research workflow to trigger

### Step 2: Prepare Research Payload

**Orchestrator Decision**:

- Gather all relevant context
- Include error details, spec references, attempt history
- Add language/framework information
- Validate payload structure

### Step 3: Trigger Research Workflow

**Orchestrator Decision**:

- Check if n8n is available
- Call appropriate execution script:
  - `execution/n8n_client.ts` → `triggerDeepResearch()`
  - `execution/n8n_client.ts` → `triggerSpecValidation()`
  - `execution/n8n_client.ts` → `triggerCodeReview()`
  - `execution/n8n_client.ts` → `triggerContinuousLearning()`
- Set timeout (varies by workflow)
- Handle connection errors gracefully

### Step 4: Wait for Research Results

**Orchestrator Decision**:

- Poll for results (non-blocking)
- Show progress indicator to user
- Handle timeout gracefully
- If timeout → Fall back to manual intervention

### Step 5: Parse Research Findings

**Orchestrator Decision**:

- Validate response structure
- Extract recommended solutions
- Rank by confidence score
- Identify spec updates needed

### Step 6: Apply Research Findings

**Orchestrator Decision**:

- Apply highest confidence solution first
- Update specs if recommended
- Re-run tests
- If success → Log to memory graph
- If failure → Try next solution

### Step 7: Learn from Research

**Orchestrator Decision**:

- Update memory graph with new pattern
- Record sources and confidence scores
- Log to DEVLOG under "Self-Healing Events"
- Trigger Continuous Learning Agent
- Update telemetry

---

## Fallback Strategies

### If n8n Unavailable

**Orchestrator Decision**:

1. Log warning: "n8n not available, using fallback"
2. Attempt local research:
   - Check memory graph more thoroughly
   - Try alternative correction approaches
   - Use local LLM if available (Ollama)
3. If still failing → Escalate to human
4. Document issue for future improvement

### If Research Timeout

**Orchestrator Decision**:

1. Log timeout event
2. Cancel research request
3. Try simpler correction approach
4. If still failing → Escalate to human
5. Document timeout for n8n optimization

### If Research Returns No Solutions

**Orchestrator Decision**:

1. Log "no solutions found"
2. Mark error as novel/complex
3. Request human intervention
4. Document for future research improvement
5. Add to memory graph as "unsolved pattern"

---

## Research Quality Metrics

### Track These Metrics

**Orchestrator Decision**:

- Research success rate (solutions that worked)
- Average research time
- Confidence score accuracy
- Source quality
- Pattern extraction accuracy

### Success Criteria

- Research success rate > 70%
- Average research time < 3 minutes
- Confidence score accuracy > 80%
- Pattern extraction accuracy > 90%

### Continuous Improvement

**Orchestrator Decision**:

- If success rate < 70% → Review research queries
- If time > 3 minutes → Optimize n8n workflows
- If confidence inaccurate → Improve ranking algorithm
- If patterns inaccurate → Refine extraction logic

---

## Integration with Memory Graph

### Before Research

**Orchestrator Decision**:

1. Check `docs/memory/insight-graph.md`
2. Search for similar error patterns
3. If found → Try known solution first
4. If not found → Proceed with research

### After Research

**Orchestrator Decision**:

1. Extract key learnings from research
2. Format as memory graph pattern
3. Add to appropriate category (success/failure/meta)
4. Include source references
5. Update pattern frequency

### Pattern Format

```markdown
#### Pattern: [Name]

**Category**: success | failure | meta
**Frequency**: [count]
**Description**: [what happened]
**Solution**: [what worked]
**Source**: [research URL or reference]
**Confidence**: [0-100]
```

---

## Security Considerations

### Research Data Privacy

**Orchestrator Decision**:

- Never send sensitive data (API keys, credentials)
- Sanitize error messages before sending
- Redact file paths if they contain sensitive info
- Use generic descriptions for proprietary code

### Research Source Validation

**Orchestrator Decision**:

- Verify research sources are reputable
- Prefer official documentation over blogs
- Check source publication date (prefer recent)
- Validate code examples before applying

### Sandboxed Testing

**Orchestrator Decision**:

- Always test research solutions in sandbox first
- Use `execution/container_service.ts` for untrusted code
- Validate results before applying to main codebase
- Log all research-based changes for audit

---

## Cost Optimization

### Research Routing

**Orchestrator Decision**:

- Simple queries → Local LLM (Ollama) if available
- Complex queries → Cloud LLM (OpenAI/Anthropic)
- Validation → Local LLM
- Code generation → Cloud LLM

### Research Caching

**Orchestrator Decision**:

- Cache research results in memory graph
- Reuse solutions for similar errors
- Avoid redundant research requests
- Expire cache after 30 days

---

**Status**: ACTIVE  
**Enforcement**: MANDATORY when local knowledge insufficient  
**Review Cycle**: After every research event

**Philosophy**: _"Research when stuck. Apply when researched. Learn when applied."_
