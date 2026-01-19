---
title: n8n Integration - Autonomous Executioner Layer
version: 1.0.0
date: 2026-01-19
status: Active
---

# n8n Integration: The Autonomous Executioner

## Overview

This document defines how our local n8n instance acts as the **Autonomous Executioner** in the A.N.T. (Architecture → Navigation → Tools) framework. n8n extends our agent's capabilities by providing orchestrated, multi-step workflows that handle complex research, validation, and correction tasks beyond single LLM passes.

## Architecture Position

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE LAYER                        │
│              (Specs, Requirements, Design)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    NAVIGATION LAYER                          │
│         (Kiro Agent, Task Manager, Ralph-Loop)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      TOOLS LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ File System  │  │ Test Runner  │  │ n8n Executor │ ←── │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                              ↓               │
│                                    ┌──────────────────┐     │
│                                    │ Deep Research    │     │
│                                    │ Error Analysis   │     │
│                                    │ Spec Validation  │     │
│                                    │ Multi-Agent Ops  │     │
│                                    └──────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Delegation Over Execution
The Kiro agent **delegates** complex, multi-step operations to n8n rather than attempting them inline. This follows the pattern from the n8n multi-agent system where the main agent routes tasks to specialized sub-agents.

### 2. Webhook-Driven Activation
All n8n workflows are triggered via webhooks from the Kiro agent. This ensures:
- Asynchronous execution (non-blocking)
- Clear separation of concerns
- Scalability (n8n can handle multiple concurrent workflows)

### 3. Context-Rich Payloads
Every webhook call includes:
- **Task ID**: Links back to the spec task
- **Error Context**: Full stack trace, file paths, line numbers
- **Spec References**: Requirements and properties being validated
- **Attempt Number**: Current Ralph-Loop iteration count

## Integration Patterns

### Pattern 1: Deep Research Agent (B.L.A.S.T. Enhancement)

**Trigger**: Ralph-Loop exhausts 3 attempts on a complex error

**Workflow**:
1. **Strategy Agent**: Analyzes error context and generates 2-3 clarifying questions
2. **Search Query Generation**: Creates targeted search queries for:
   - Library documentation
   - Stack Overflow solutions
   - GitHub issue discussions
   - Best practice articles
3. **Data Gathering**: Uses Tavily API to:
   - Search for relevant content
   - Extract full article text
   - Rank by relevance
4. **Report Compilation**: AI agent synthesizes findings into:
   - Root cause analysis
   - Recommended solution approaches
   - Code examples
   - Spec update suggestions
5. **Delivery**: Returns structured JSON to Kiro agent with:
   - Recommended spec changes
   - Code fixes
   - Test strategies

**n8n Nodes**:
- Webhook (trigger)
- AI Agent (strategy)
- Loop Over Items (queries)
- HTTP Request (Tavily API)
- AI Agent (report compiler)
- Respond to Webhook

**Kiro Integration**:
```typescript
// In Ralph-Loop engine (src/core/ralph-loop.ts)
async function handleComplexError(error: ErrorContext): Promise<CorrectionPlan> {
  if (error.attemptNumber >= 3) {
    // Trigger n8n deep research
    const research = await triggerN8nWorkflow('deep-research', {
      taskId: error.taskId,
      errorMessage: error.errorMessage,
      stackTrace: error.stackTrace,
      specPath: error.specPath,
      attemptNumber: error.attemptNumber
    });
    
    // Apply research findings
    return generateCorrectionFromResearch(research);
  }
  
  // Standard Ralph-Loop correction
  return generateStandardCorrection(error);
}
```

### Pattern 2: Spec Validation Agent

**Trigger**: Before executing any task, validate spec completeness

**Workflow**:
1. **Spec Analyzer**: Checks for:
   - Missing acceptance criteria
   - Ambiguous requirements
   - Conflicting properties
   - Incomplete task descriptions
2. **Reference Validator**: Verifies:
   - All requirement references exist
   - All property references are valid
   - Dependency graph is acyclic
3. **Suggestion Generator**: Proposes:
   - Missing requirements
   - Clarifying questions
   - Property additions
4. **Delivery**: Returns validation report with confidence scores

**n8n Nodes**:
- Webhook (trigger)
- Code Node (parse spec files)
- AI Agent (analyzer)
- Loop Over Items (references)
- AI Agent (suggestion generator)
- Respond to Webhook

**Kiro Integration**:
```typescript
// In Task Manager (src/core/task-manager.ts)
async function validateSpecBeforeExecution(specPath: string): Promise<ValidationResult> {
  const validation = await triggerN8nWorkflow('spec-validation', {
    specPath,
    requirementsPath: `${specPath}/requirements.md`,
    designPath: `${specPath}/design.md`,
    tasksPath: `${specPath}/tasks.md`
  });
  
  if (!validation.isValid) {
    // Pause execution, request human review
    await requestHumanReview(validation.issues);
  }
  
  return validation;
}
```

### Pattern 3: Multi-Agent Code Review

**Trigger**: After completing a task, before marking as complete

**Workflow**:
1. **Main Coordinator**: Delegates to specialized sub-agents:
   - **Security Agent**: Checks for vulnerabilities
   - **Performance Agent**: Analyzes efficiency
   - **Test Coverage Agent**: Validates test completeness
   - **Documentation Agent**: Reviews code comments
2. **Aggregator**: Combines all agent feedback
3. **Decision Maker**: Determines if code passes review
4. **Delivery**: Returns pass/fail with detailed feedback

**n8n Nodes**:
- Webhook (trigger)
- AI Agent (coordinator)
- Execute Workflow (security sub-agent)
- Execute Workflow (performance sub-agent)
- Execute Workflow (test coverage sub-agent)
- Execute Workflow (documentation sub-agent)
- Code Node (aggregator)
- AI Agent (decision maker)
- Respond to Webhook

**Kiro Integration**:
```typescript
// In Task Manager (src/core/task-manager.ts)
async function reviewCodeBeforeCompletion(taskId: string): Promise<ReviewResult> {
  const review = await triggerN8nWorkflow('multi-agent-review', {
    taskId,
    changedFiles: await getChangedFiles(taskId),
    testFiles: await getTestFiles(taskId),
    specPath: await getSpecPath(taskId)
  });
  
  if (!review.approved) {
    // Apply suggested improvements
    await applySuggestions(review.suggestions);
    // Re-run tests
    await runTests(taskId);
  }
  
  return review;
}
```

### Pattern 4: Continuous Learning Agent

**Trigger**: After every self-healing event

**Workflow**:
1. **Pattern Extractor**: Analyzes:
   - Error type
   - Solution applied
   - Time to resolution
   - Success/failure outcome
2. **Memory Updater**: Updates:
   - `docs/memory/insight-graph.md`
   - Adds new patterns
   - Updates success rates
3. **Rule Generator**: Proposes:
   - New global rules
   - Steering file updates
   - Evolution log entries
4. **Delivery**: Returns updated memory graph

**n8n Nodes**:
- Webhook (trigger)
- AI Agent (pattern extractor)
- Code Node (memory updater)
- AI Agent (rule generator)
- HTTP Request (GitHub API - commit changes)
- Respond to Webhook

**Kiro Integration**:
```typescript
// In Ralph-Loop engine (src/core/ralph-loop.ts)
async function logSelfHealingEvent(correction: CorrectionPlan): Promise<void> {
  await triggerN8nWorkflow('continuous-learning', {
    errorType: correction.errorType,
    targetFile: correction.targetFile,
    correction: correction.correction,
    attemptNumber: correction.attemptNumber,
    success: correction.success,
    timestamp: new Date().toISOString()
  });
  
  // n8n will update memory graph asynchronously
}
```

## Webhook Endpoints

### Local n8n Instance
```
Base URL: http://localhost:5678/webhook/
```

### Webhook Definitions

| Workflow | Endpoint | Method | Payload |
|----------|----------|--------|---------|
| Deep Research | `/deep-research` | POST | `{ taskId, errorMessage, stackTrace, specPath, attemptNumber }` |
| Spec Validation | `/spec-validation` | POST | `{ specPath, requirementsPath, designPath, tasksPath }` |
| Multi-Agent Review | `/multi-agent-review` | POST | `{ taskId, changedFiles, testFiles, specPath }` |
| Continuous Learning | `/continuous-learning` | POST | `{ errorType, targetFile, correction, attemptNumber, success, timestamp }` |

## Configuration

### Environment Variables
```bash
# .env
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=your-secret-key-here
N8N_TIMEOUT=300000  # 5 minutes
N8N_RETRY_ATTEMPTS=3
N8N_RETRY_DELAY=5000  # 5 seconds
```

### n8n Workflow Configuration
```typescript
// src/config/n8n.ts
export const n8nConfig = {
  baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
  webhookSecret: process.env.N8N_WEBHOOK_SECRET,
  timeout: parseInt(process.env.N8N_TIMEOUT || '300000'),
  retryAttempts: parseInt(process.env.N8N_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.N8N_RETRY_DELAY || '5000'),
  
  workflows: {
    deepResearch: '/webhook/deep-research',
    specValidation: '/webhook/spec-validation',
    multiAgentReview: '/webhook/multi-agent-review',
    continuousLearning: '/webhook/continuous-learning'
  }
};
```

## Implementation Checklist

- [ ] Install n8n locally: `npx n8n`
- [ ] Create webhook endpoints for each workflow
- [ ] Implement `triggerN8nWorkflow()` utility function
- [ ] Add n8n configuration to environment variables
- [ ] Create n8n workflow templates (JSON exports)
- [ ] Integrate deep research into Ralph-Loop
- [ ] Add spec validation to Task Manager
- [ ] Implement multi-agent code review
- [ ] Set up continuous learning pipeline
- [ ] Test webhook connectivity
- [ ] Document workflow JSON schemas
- [ ] Add error handling for n8n failures
- [ ] Implement webhook authentication
- [ ] Set up monitoring and logging

## Benefits

### 1. Scalability
n8n handles complex, multi-step operations without blocking the main agent. Multiple workflows can run concurrently.

### 2. Specialization
Each workflow is optimized for a specific task (research, validation, review) with dedicated AI agents and tools.

### 3. Maintainability
Workflows are visual and can be updated without changing agent code. Non-developers can modify workflows.

### 4. Cost Optimization
n8n can route tasks to local Ollama for validation and cloud LLMs for generation, optimizing cost and speed.

### 5. Observability
n8n provides built-in execution logs, error tracking, and performance metrics for all workflows.

## Security Considerations

### 1. Webhook Authentication
All webhooks require a secret token in the `Authorization` header:
```
Authorization: Bearer <N8N_WEBHOOK_SECRET>
```

### 2. Input Validation
n8n workflows validate all incoming payloads against JSON schemas before processing.

### 3. Rate Limiting
Implement rate limiting on webhook endpoints to prevent abuse:
- Max 100 requests per minute per workflow
- Max 10 concurrent executions per workflow

### 4. Data Privacy
Sensitive data (API keys, credentials) are stored in n8n's encrypted credential store, never in workflow definitions.

### 5. Network Isolation
n8n runs on localhost only, not exposed to public internet. All communication is internal.

## Monitoring and Observability

### Metrics to Track
- Workflow execution time
- Success/failure rates
- API call counts (Tavily, OpenAI, etc.)
- Token usage per workflow
- Queue depth (pending executions)

### Logging
All n8n executions are logged to:
- n8n's built-in execution log
- `.kiro/logs/n8n-executions.log` (mirrored)
- DEVLOG.md (for self-healing events)

### Alerts
Set up alerts for:
- Workflow failures (>3 consecutive)
- High execution time (>5 minutes)
- API rate limit hits
- Webhook authentication failures

## Future Enhancements

### Phase 2: Advanced Workflows
- **Automated Testing Agent**: Generates property-based tests from requirements
- **Documentation Generator**: Creates API docs from code
- **Performance Optimizer**: Analyzes code and suggests optimizations
- **Dependency Updater**: Monitors and updates npm packages

### Phase 3: External Integrations
- **GitHub Integration**: Auto-create issues for failed tasks
- **Slack Notifications**: Real-time updates on execution progress
- **Notion Sync**: Mirror specs to Notion for team collaboration
- **Jira Integration**: Link tasks to Jira tickets

### Phase 4: Self-Improving Workflows
- **Workflow Optimizer**: Analyzes execution patterns and suggests workflow improvements
- **A/B Testing**: Test multiple workflow variations and pick the best
- **Auto-Scaling**: Dynamically adjust workflow complexity based on task difficulty

## References

- [n8n Documentation](https://docs.n8n.io/)
- [Deep Research Agent Workflow](https://n8n.io/workflows/7160)
- [Multi-Agent System Pattern](https://community.n8n.io/t/how-i-built-a-multi-agent-ai-system-in-n8n-using-sub-workflows-example/120176)
- [Zie619 n8n Workflows Collection](https://github.com/Zie619/n8n-workflows)

---

**Status**: 🟢 READY FOR IMPLEMENTATION  
**Next Steps**: Create n8n workflow templates and implement webhook integration  
**Owner**: Kiro Agent  
**Last Updated**: 2026-01-19
