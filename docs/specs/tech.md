# Antigravity OS - Technical Specification

## Technology Stack

### Frontend Layer
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + Zustand for complex state
- **Real-time Updates**: Server-Sent Events (SSE) for execution progress

### Backend Layer
- **Runtime**: Node.js 20+
- **API**: Next.js API Routes (serverless functions)
- **File System**: Native fs/promises for spec and code management
- **Process Management**: Child processes for command execution

### Automation & Integration
- **Workflow Engine**: n8n (self-hosted or cloud)
- **Webhooks**: Express middleware for external triggers
- **LLM Validation**: Hybrid Adaptive Infrastructure (see below)

### n8n Automation Layer (Autonomous Executioner)

**Philosophy**: Delegate complex, multi-step operations to specialized n8n workflows that act as autonomous sub-agents.

#### Core Workflows

**1. Deep Research Agent**
- **Trigger**: Ralph-Loop exhausts 3 attempts on complex errors
- **Process**: 
  - Strategy agent generates clarifying questions
  - Multi-query search via Tavily API
  - Content extraction and ranking
  - AI-powered report compilation
  - Structured solution delivery
- **Output**: Root cause analysis, recommended fixes, spec updates
- **Integration**: Triggered from Ralph-Loop engine when `attemptNumber >= 3`

**2. Spec Validation Agent**
- **Trigger**: Before executing any task
- **Process**:
  - Parse all spec files (requirements, design, tasks)
  - Validate completeness and consistency
  - Check reference integrity
  - Generate improvement suggestions
- **Output**: Validation report with confidence scores
- **Integration**: Called from Task Manager before task execution

**3. Multi-Agent Code Review**
- **Trigger**: After completing a task, before marking complete
- **Process**:
  - Main coordinator delegates to specialized sub-agents:
    - Security agent (vulnerability scanning)
    - Performance agent (efficiency analysis)
    - Test coverage agent (completeness validation)
    - Documentation agent (comment quality)
  - Aggregates all feedback
  - Makes pass/fail decision
- **Output**: Approval status with detailed feedback
- **Integration**: Called from Task Manager after task completion

**4. Continuous Learning Agent**
- **Trigger**: After every self-healing event
- **Process**:
  - Extract patterns from error and solution
  - Update memory graph automatically
  - Generate new global rules
  - Propose steering file updates
- **Output**: Updated insight graph and evolution log
- **Integration**: Called from Ralph-Loop after successful correction

#### Webhook Architecture
```typescript
// Base URL: http://localhost:5678/webhook/

Endpoints:
- POST /deep-research        # Complex error analysis
- POST /spec-validation      # Pre-execution validation
- POST /multi-agent-review   # Post-completion review
- POST /continuous-learning  # Self-improvement pipeline
```

#### Benefits
- **Scalability**: Non-blocking, concurrent workflow execution
- **Specialization**: Each workflow optimized for specific tasks
- **Maintainability**: Visual workflows, no code changes needed
- **Cost Optimization**: Route to local Ollama or cloud LLMs intelligently
- **Observability**: Built-in execution logs and metrics

#### Security
- Webhook authentication via bearer tokens
- Input validation with JSON schemas
- Rate limiting (100 req/min per workflow)
- Network isolation (localhost only)
- Encrypted credential storage

**See**: `.kiro/steering/n8n_integration.md` for complete implementation details

### Hybrid Adaptive Infrastructure (Power User Mode)

**Philosophy**: Optimize for speed and cost by intelligently routing workloads.

#### Cloud LLM (Primary - Speed)
- **Provider**: OpenAI GPT-4 / Anthropic Claude
- **Use Cases**: 
  - Rapid code generation
  - Real-time spec parsing
  - Interactive development
- **Advantage**: Low latency, high availability

#### Local LLM (Secondary - Validation)
- **Provider**: Ollama (Llama 3.1, DeepSeek Coder, Qwen)
- **Use Cases**:
  - Heavy code auditing (security, performance)
  - Batch validation of generated code
  - Property-based test generation
  - Zero-cost continuous validation
- **Advantage**: No API costs, privacy, unlimited usage

#### Auto-Detection Logic
```typescript
// Detect local GPU/Docker environment
const hasLocalLLM = await detectOllamaInstance();

if (hasLocalLLM && task.type === 'validation') {
  // Offload to local Ollama
  return await localLLM.validate(code);
} else {
  // Use cloud LLM for speed
  return await cloudLLM.generate(prompt);
}
```

#### Workload Distribution
- **Cloud**: 70% (generation, interactive)
- **Local**: 30% (validation, auditing)
- **Fallback**: Cloud if local unavailable

### Testing Infrastructure
- **Unit Testing**: Vitest
- **Property-Based Testing**: fast-check (100+ iterations)
- **E2E Testing**: Playwright
- **Coverage**: c8 / vitest coverage (target: 80%+)
- **Validation**: JSON Schema (Ajv) for structured verification
- **Type Safety**: TypeScript strict mode (zero `any` types)

### Type-Safe Validation System (Cole Medin Master Pattern)

**Philosophy**: Catch errors at design time, not runtime. Zero surprises in production.

#### Compile-Time Validation
- **TypeScript Strict Mode**: All code must compile without errors
- **Explicit Types**: All functions have return types, all parameters typed
- **ESLint Rules**: Enforce type safety, no `any`, no implicit any
- **Pre-commit Hooks**: Block commits with type errors

#### Runtime Validation
- **JSON Schema**: All data structures validated against `/docs/schemas/`
- **Ajv Validator**: Fast, standards-compliant validation
- **API Boundaries**: Validate all inputs/outputs
- **External Data**: Validate all data from external sources

#### B.L.A.S.T. Type-Repair Loop
When validation fails:
1. **Build**: Attempt validation
2. **Log**: Capture validation error details
3. **Analyze**: Determine if schema or code is wrong
4. **Spec**: Update schema or fix code
5. **Test**: Re-validate until green

**Integration**:
```typescript
import Ajv from 'ajv';
import taskSchema from '@/schemas/task.schema.json';

const ajv = new Ajv();
const validateTask = ajv.compile(taskSchema);

// Before processing
if (!validateTask(taskData)) {
  throw new ValidationError(validateTask.errors);
}

// After generation
if (!validateTask(generatedTask)) {
  // Trigger B.L.A.S.T. Type-Repair
  await repairTypeError(validateTask.errors);
}
```

**Benefits**:
- Zero runtime type errors
- Self-documenting schemas
- Automatic validation
- Fast feedback loop

### Development Tools
- **Language**: TypeScript (strict mode)
- **Linting**: ESLint + Prettier
- **Git Hooks**: Husky for pre-commit validation
- **Monorepo**: Turborepo (if scaling to multiple packages)

## Architecture Patterns

### A.N.T. Framework (Architecture, Navigation, Tools)

#### Layer 1: Architecture
```
.kiro/specs/{feature-name}/
  ├── requirements.md    # User stories & acceptance criteria
  ├── design.md          # Technical design & correctness properties
  └── tasks.md           # Implementation checklist
```

#### Layer 2: Navigation
```
Orchestrator (@prime)
  ↓
Plan Generator (@plan-call)
  ↓
Task Executor (@execute)
  ↓
Self-Correction Loop (Ralph-Loop with B.L.A.S.T.)
  ↓
Human Checkpoint (if architectural/breaking change)
```

#### Layer 3: Tools
- Spec parser and validator
- Code generator with templates
- Test runner and reporter
- Error analyzer and fixer
- n8n workflow executor
- Type-safe validator

### Human-in-the-Loop Checkpoints (Cole Medin Master Pattern)

**Philosophy**: Autonomy with accountability. Speed with safety.

#### Checkpoint Triggers
- **Architectural Changes**: A.N.T. framework modifications
- **Spec Modifications**: Requirements, design, or task changes
- **File Deletions**: Any file removal
- **Security Changes**: Auth, encryption, validation logic
- **Production Deployments**: Main branch, builds, migrations

#### Checkpoint Protocol
1. **Detect**: Identify checkpoint trigger
2. **Analyze**: Generate impact analysis
   - Severity (low/medium/high/critical)
   - Affected components
   - Breaking changes assessment
   - Rollback strategy
   - Risk estimation (0-100)
3. **Present**: Show analysis to human with options
4. **Decide**: Human chooses (proceed/modify/reject/defer)
5. **Execute**: Apply decision and log reasoning

#### Impact Analysis Format
```markdown
## 🚨 Checkpoint Required: [Trigger Type]

### Summary
[Brief description]

### Impact Analysis
- **Severity**: [level]
- **Affected Components**: [list]
- **Breaking Changes**: [yes/no]
- **Estimated Risk**: [0-100]

### Rollback Strategy
[How to undo]

### Options
1. Proceed - Execute the change
2. Modify - Adjust the approach
3. Reject - Cancel the change
4. Defer - Postpone for review
```

**See**: `.kiro/steering/checkpoint_rules.md` for complete protocol

### Decision-Tree Logging (Process Transparency)

**Philosophy**: Document decisions, learn from outcomes, improve continuously.

#### Decision Documentation
Every technical choice is logged in `docs/internal/rationales.md` with:
- **Technical Choice**: What we decided
- **Alternatives Considered**: What else we evaluated (pros/cons)
- **Why Spec-Compliant**: How this aligns with specs
- **Trade-offs**: What we gained and lost
- **Validation**: How we'll verify correctness

#### Decision Patterns
- **Prefer Standards**: Default to industry standards
- **Optimize for Maintainability**: Code is read more than written
- **Validate Early**: Catch errors at design time
- **Learn from Research**: Stand on shoulders of giants

#### Benefits
- Hackathon "Process Transparency" points
- Learning from outcomes
- Onboarding documentation
- Audit trail for compliance

**See**: `docs/internal/rationales.md` for decision log

## Data Flow

### Spec Creation Flow
1. User provides product idea (natural language)
2. Requirements agent generates requirements.md
3. Design agent creates design.md with correctness properties
4. Task agent breaks down into actionable tasks.md

### Execution Flow
1. Orchestrator reads tasks.md
2. For each task:
   - Mark as in_progress
   - Generate implementation code
   - Run unit tests
   - Run property-based tests
   - Mark as completed or trigger Ralph-Loop
3. Report final status

### Ralph-Loop (Self-Correction)
```
Error Detected
  ↓
Analyze root cause
  ↓
Update relevant spec (requirements/design/tasks)
  ↓
Re-execute failed task
  ↓
Log correction in DEVLOG.md
```

## Security Considerations
- Sandboxed code execution (VM2 or isolated processes)
- Input validation for all user-provided specs
- Rate limiting on API endpoints
- Secure storage of API keys and credentials

## Performance Targets
- Spec generation: < 30 seconds
- Task execution: < 5 minutes per task
- Self-correction cycle: < 2 minutes
- UI responsiveness: < 100ms interaction latency

## Deployment Strategy
- **Development**: Local with hot reload
- **Staging**: Vercel preview deployments
- **Production**: Vercel with edge functions
- **n8n**: Self-hosted on Railway or DigitalOcean

## Monitoring & Observability
- Execution logs in `/logs` directory
- DEVLOG.md for human-readable progress
- Error tracking with Sentry (optional)
- Performance metrics via Vercel Analytics
