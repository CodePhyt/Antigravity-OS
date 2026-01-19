---
inclusion: always
---

# Antigravity OS - Autonomous Engineering Protocol

## Core Principles

### 1. Spec-Driven Development
- Every feature MUST start with a spec in `.kiro/specs/{feature-name}/`
- Required files: requirements.md, design.md, tasks.md
- Code is never written before specs are approved

### 2. Ralph-Loop Self-Correction
When errors occur during execution:
- **DO NOT** ask for permission to fix
- **ANALYZE** the error and root cause
- **UPDATE** the relevant spec file (requirements/design/tasks)
- **RE-EXECUTE** the failed task
- **LOG** the correction in DEVLOG.md under "Self-Healing Events"

### 3. Property-Based Testing
- All core logic MUST have property-based tests using fast-check
- Properties must be linked to requirements: `**Validates: Requirements X.Y**`
- Tests must pass before marking tasks as complete

### 4. Documentation First
- Update DEVLOG.md after every significant action
- Keep docs/specs/ synchronized with implementation
- Generate inline code comments for complex logic

## Execution Rules

### Task Execution
1. Read requirements.md and design.md before starting
2. Execute tasks sequentially (never skip ahead)
3. Run tests after every code change
4. Update task status: queued → in_progress → completed

### Error Handling
1. Capture full error stack trace
2. Identify which spec assumption was violated
3. Update spec to reflect new understanding
4. Re-run from the failed step
5. Log the correction event

### Code Quality Standards
- TypeScript strict mode (no `any` types)
- ESLint + Prettier formatting
- Minimum 80% test coverage
- All functions documented with JSDoc

## Integration Points

### n8n Workflows
- Webhook endpoint: `/api/webhooks/n8n`
- Trigger spec creation from external events
- Report execution status back to n8n

### Ollama Validation
- Use local LLM for spec review
- Validate correctness properties
- Suggest improvements to requirements

## Hackathon Success Criteria
- ✅ Complete spec-to-production pipeline
- ✅ Demonstrated self-healing capability
- ✅ Property-based testing implementation
- ✅ Clean, documented codebase
- ✅ Working demo with real feature execution
