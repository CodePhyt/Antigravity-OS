# Design Document: Spec Orchestrator

## Overview

The Spec Orchestrator is the central execution engine for Antigravity OS's spec-driven development workflow. It orchestrates the complete lifecycle from spec parsing through task execution, test validation, and self-correction. The system follows an event-driven architecture with clear separation between parsing, execution, testing, and logging concerns.

The orchestrator implements the Ralph-Loop protocol for autonomous error correction: when failures occur, it analyzes the error context, updates the relevant specification files, and re-executes from the failure point. This creates a self-healing development system that continuously improves its understanding of requirements.

Key design principles:

- **Sequential execution**: Tasks execute one at a time in dependency order
- **Fail-fast validation**: Tests run immediately after code changes
- **Atomic updates**: All spec file modifications are atomic and transactional
- **Event-driven progress**: Real-time updates via Server-Sent Events
- **Stateless execution**: All state persisted to disk for crash recovery

## Architecture

The system follows a layered architecture with clear boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (REST + SSE)                   │
├─────────────────────────────────────────────────────────────┤
│                   Orchestrator Core Engine                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Task Manager │  │ Ralph-Loop   │  │ Event Emitter│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Spec Parser  │  │ Test Runner  │  │ Log Manager  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ File System  │  │ Child Process│  │ Event Stream │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**API Layer**:

- REST endpoints for starting/stopping execution
- SSE endpoint for real-time progress updates
- Webhook receiver for n8n integration
- Authentication and rate limiting

**Orchestrator Core**:

- Task Manager: Schedules and executes tasks sequentially
- Ralph-Loop: Implements self-correction logic
- Event Emitter: Broadcasts progress events to subscribers

**Service Layer**:

- Spec Parser: Reads markdown and extracts structured data
- Test Runner: Executes Vitest tests and parses results
- Log Manager: Writes execution logs and DEVLOG entries

**Infrastructure Layer**:

- File System: Atomic file operations with backups
- Child Process: Spawns test runners and captures output
- Event Stream: Manages SSE connections and message delivery

## Components and Interfaces

### Spec Parser

Reads markdown specification files and extracts structured task data.

```typescript
interface SpecParser {
  parseSpec(specPath: string): Promise<ParsedSpec>;
  parseTasksFile(content: string): Task[];
  extractRequirements(content: string): Requirement[];
  extractProperties(content: string): Property[];
}

interface ParsedSpec {
  featureName: string;
  requirements: Requirement[];
  properties: Property[];
  tasks: Task[];
}

interface Task {
  id: string; // e.g., "1.2"
  description: string;
  status: TaskStatus;
  isOptional: boolean; // true if marked with *
  parentId: string | null; // null for top-level tasks
  children: Task[];
  requirementRefs: string[]; // e.g., ["1.2", "3.4"]
  propertyRefs: string[]; // e.g., ["Property 1", "Property 5"]
}

type TaskStatus = 'not_started' | 'queued' | 'in_progress' | 'completed';

interface Requirement {
  id: string; // e.g., "1.2"
  userStory: string;
  acceptanceCriteria: string[];
}

interface Property {
  number: number;
  title: string;
  statement: string; // The "for all" statement
  requirementRefs: string[]; // Requirements this validates
}
```

**Parsing Algorithm**:

1. Read markdown file content
2. Split into sections by headers
3. For tasks.md:
   - Match checkbox pattern: `- [ ] {id} {description}`
   - Extract optional marker: `- [ ]* {id} {description}`
   - Parse indentation to build hierarchy
   - Extract requirement references: `_Requirements: X.Y, X.Z_`
4. For requirements.md:
   - Extract requirement sections by "### Requirement N"
   - Parse user story and acceptance criteria
5. For design.md:
   - Extract properties by "Property N:" pattern
   - Parse "Validates: Requirements X.Y" annotations

**Error Handling**:

- Malformed markdown: Return error with line number
- Missing files: Return error indicating which file
- Invalid task IDs: Return error with task description
- Circular dependencies: Detect and reject

### Task Manager

Schedules and executes tasks in dependency order.

```typescript
interface TaskManager {
  loadSpec(specPath: string): Promise<void>;
  startExecution(): Promise<ExecutionResult>;
  pauseExecution(): Promise<void>;
  resumeExecution(): Promise<void>;
  getStatus(): ExecutionStatus;
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
}

interface ExecutionResult {
  success: boolean;
  completedTasks: string[];
  failedTask: string | null;
  error: ErrorContext | null;
}

interface ExecutionStatus {
  currentTask: Task | null;
  completedCount: number;
  totalCount: number;
  isRunning: boolean;
  progress: number; // 0-100
}

interface ErrorContext {
  taskId: string;
  errorMessage: string;
  stackTrace: string;
  failedTest: string | null;
  timestamp: Date;
}
```

**Execution Algorithm**:

1. Load and parse spec files
2. Build task dependency graph
3. Find first not_started task in document order
4. Mark task as queued, emit progress event
5. Mark task as in_progress, emit progress event
6. Execute task:
   - If code task: Invoke code generation agent
   - If test task: Run Test Runner
   - If checkpoint: Pause and wait for user
7. If task succeeds:
   - Mark as completed
   - Update tasks.md atomically
   - Emit progress event
   - Move to next task
8. If task fails:
   - Capture ErrorContext
   - Trigger Ralph-Loop
   - Halt execution

**Task Selection Logic**:

- Skip completed tasks
- Skip optional tasks (unless explicitly requested)
- Execute sub-tasks before parent
- Respect document order for implicit dependencies

### Test Runner

Executes Vitest tests and parses results.

```typescript
interface TestRunner {
  runTests(testFiles: string[]): Promise<TestResult>;
  runPropertyTests(testFiles: string[]): Promise<TestResult>;
  parseTestOutput(output: string): TestResult;
}

interface TestResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failures: TestFailure[];
  duration: number; // milliseconds
}

interface TestFailure {
  testName: string;
  errorMessage: string;
  stackTrace: string;
  propertyRef: string | null; // Extracted from test tag
  requirementRef: string | null; // Extracted from test tag
}
```

**Test Execution Flow**:

1. Identify test files to run (based on modified code)
2. Spawn child process: `vitest run {files}`
3. Capture stdout and stderr
4. Parse JSON output from Vitest reporter
5. Extract failure details:
   - Test name
   - Error message
   - Stack trace
   - Property/requirement tags from test comments
6. Return TestResult

**Property Test Validation**:

- Verify minimum 100 iterations configured
- Extract property number from test tag
- Link failures to design properties
- Include counterexample in error context

### Ralph-Loop Engine

Implements autonomous error correction.

```typescript
interface RalphLoop {
  analyze(error: ErrorContext): Promise<CorrectionPlan>;
  executeCorrection(plan: CorrectionPlan): Promise<void>;
  logCorrection(plan: CorrectionPlan): Promise<void>;
}

interface CorrectionPlan {
  errorType: ErrorType;
  targetFile: string; // Which spec file to update
  correction: string; // Description of fix
  updatedContent: string; // New file content
  attemptNumber: number; // 1-3
}

type ErrorType =
  | 'test_failure'
  | 'compilation_error'
  | 'runtime_error'
  | 'missing_dependency'
  | 'invalid_spec';
```

**Correction Algorithm**:

1. Analyze ErrorContext:
   - If test failure: Check if property is too strict
   - If compilation error: Check if design is incomplete
   - If runtime error: Check if requirements are ambiguous
2. Determine target file:
   - Test failures → design.md (adjust property)
   - Missing functionality → requirements.md (add criterion)
   - Implementation bugs → tasks.md (add clarification)
3. Generate correction:
   - Use LLM to analyze error and suggest fix
   - Validate fix doesn't break other requirements
   - Generate updated file content
4. Apply correction atomically:
   - Write to temp file
   - Validate syntax
   - Atomic rename
5. Log to DEVLOG.md:
   - Timestamp
   - Error description
   - Correction applied
   - Task ID
6. Reset task status to not_started
7. Resume execution from failed task

**Iteration Limits**:

- Maximum 3 correction attempts per task
- If exhausted: Halt and request human intervention
- Track attempts in execution state

### Log Manager

Manages execution logs and DEVLOG entries.

```typescript
interface LogManager {
  logEvent(event: LogEvent): Promise<void>;
  logSelfHealing(correction: CorrectionPlan): Promise<void>;
  rotateLogsIfNeeded(): Promise<void>;
  queryLogs(filter: LogFilter): Promise<LogEvent[]>;
}

interface LogEvent {
  timestamp: Date;
  eventType: EventType;
  taskId: string | null;
  message: string;
  context: Record<string, unknown>;
}

type EventType =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'test_run'
  | 'ralph_loop_activated'
  | 'spec_updated'
  | 'execution_started'
  | 'execution_completed';

interface LogFilter {
  startTime?: Date;
  endTime?: Date;
  eventTypes?: EventType[];
  taskId?: string;
}
```

**Logging Strategy**:

- **Execution Log** (`.kiro/logs/execution-{timestamp}.log`):
  - All orchestrator events
  - Structured JSON format
  - One event per line
  - Rotated at 10MB

- **DEVLOG.md** (root directory):
  - Human-readable format
  - Self-healing events only
  - Append to "Self-Healing Events" section
  - Include date, task, error, correction

**Log Entry Format**:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "eventType": "task_started",
  "taskId": "2.3",
  "message": "Starting task: Implement data validation",
  "context": {
    "requirementRefs": ["1.2", "3.4"],
    "propertyRefs": ["Property 2"]
  }
}
```

### Event Emitter

Broadcasts real-time progress updates via SSE.

```typescript
interface EventEmitter {
  subscribe(clientId: string): EventStream;
  unsubscribe(clientId: string): void;
  emit(event: ProgressEvent): void;
  batchEmit(events: ProgressEvent[]): void;
}

interface ProgressEvent {
  type: ProgressEventType;
  taskId: string | null;
  message: string;
  progress: number; // 0-100
  timestamp: Date;
  data: Record<string, unknown>;
}

type ProgressEventType =
  | 'task_queued'
  | 'task_started'
  | 'task_progress'
  | 'task_completed'
  | 'test_started'
  | 'test_completed'
  | 'ralph_loop_started'
  | 'ralph_loop_completed'
  | 'execution_completed';

interface EventStream {
  send(event: ProgressEvent): void;
  close(): void;
}
```

**Event Batching**:

- Buffer events for 100ms
- Send maximum 10 events per second per client
- Merge duplicate events (same type + taskId)
- Always send critical events immediately (errors, completion)

**SSE Implementation**:

```typescript
// Next.js API route
export async function GET(request: Request) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const clientId = crypto.randomUUID();
  const eventStream = eventEmitter.subscribe(clientId);

  eventStream.onEvent((event) => {
    writer.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

## Data Models

### File System Structure

```
.kiro/
├── specs/
│   └── {feature-name}/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
├── logs/
│   ├── execution-{timestamp}.log
│   └── execution-{timestamp}.log.1
└── state/
    └── orchestrator-state.json

DEVLOG.md (root)
```

### Orchestrator State

Persisted to `.kiro/state/orchestrator-state.json` for crash recovery:

```typescript
interface OrchestratorState {
  currentSpec: string | null; // Feature name
  currentTask: string | null; // Task ID
  executionStartTime: Date | null;
  ralphLoopAttempts: Record<string, number>; // taskId -> attempt count
  completedTasks: string[];
  skippedTasks: string[]; // Optional tasks skipped
}
```

**State Persistence**:

- Save after every task status change
- Atomic write (temp file + rename)
- Load on startup to resume execution
- Clear on successful completion

### Task Status Persistence

Task status is persisted directly in tasks.md by updating checkbox markers:

```markdown
- [ ] 1. Not started task
- [~] 2. Queued task
- [>] 3. In progress task
- [x] 4. Completed task
```

**Update Algorithm**:

1. Read current tasks.md content
2. Find task line by ID pattern
3. Replace checkbox marker
4. Write to temp file
5. Validate markdown syntax
6. Atomic rename

## Data Flow

### Task Execution Flow

```
User triggers execution
    ↓
Load spec files → Parse tasks → Build dependency graph
    ↓
Select next task (not_started, in order)
    ↓
Update status: queued → Emit event → Update tasks.md
    ↓
Update status: in_progress → Emit event → Update tasks.md
    ↓
Execute task (code generation / test run)
    ↓
    ├─ Success → Update status: completed → Emit event → Next task
    │
    └─ Failure → Capture error → Trigger Ralph-Loop
                      ↓
                 Analyze error → Generate correction
                      ↓
                 Update spec file → Log to DEVLOG
                      ↓
                 Reset task status → Resume execution
```

### Test Validation Flow

```
Code file modified
    ↓
Identify affected test files
    ↓
Spawn Vitest process
    ↓
Capture output → Parse JSON results
    ↓
    ├─ All pass → Continue execution
    │
    └─ Any fail → Extract failure details
                      ↓
                 Link to property/requirement
                      ↓
                 Create ErrorContext
                      ↓
                 Trigger Ralph-Loop
```

### Ralph-Loop Flow

```
Error detected
    ↓
Analyze ErrorContext
    ↓
Classify error type
    ↓
Determine target spec file
    ↓
Generate correction (LLM-assisted)
    ↓
Validate correction
    ↓
Apply atomically (temp + rename)
    ↓
Log to DEVLOG.md
    ↓
Increment attempt counter
    ↓
    ├─ Attempts < 3 → Reset task → Resume
    │
    └─ Attempts ≥ 3 → Halt → Request human help
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Parsing Properties

**Property 1: Complete spec file reading**
_For any_ valid spec directory path containing requirements.md, design.md, and tasks.md, the Spec_Parser should successfully read all three files and return their contents.
**Validates: Requirements 1.1**

**Property 2: Task parsing completeness**
_For any_ valid tasks.md content, parsing should extract all task identifiers, descriptions, statuses, requirement references, property references, and optional markers without loss of information.
**Validates: Requirements 1.2, 1.6, 1.7**

**Property 3: Hierarchical structure preservation**
_For any_ task tree with parent-child relationships, parsing then formatting should preserve the exact hierarchical structure with all parent-child links intact.
**Validates: Requirements 1.3**

**Property 4: Parse error descriptiveness**
_For any_ malformed markdown input, the parser should return an error containing the line number and contextual information about what was expected.
**Validates: Requirements 1.4**

### Task Status Properties

**Property 5: Initial task status**
_For any_ newly created task, its initial status should be not_started.
**Validates: Requirements 2.1**

**Property 6: Valid state transitions**
_For any_ task, status transitions should follow the valid sequence: not_started → queued → in_progress → completed, with no invalid transitions allowed.
**Validates: Requirements 2.2, 2.3, 2.4**

**Property 7: Status persistence immediacy**
_For any_ task status update, reading the tasks.md file immediately after the update should reflect the new status.
**Validates: Requirements 2.5**

**Property 8: Parent completion invariant**
_For any_ parent task with sub-tasks, the parent can only be marked completed if all non-optional sub-tasks are marked completed.
**Validates: Requirements 2.6**

**Property 9: Status persistence round-trip**
_For any_ orchestrator state, saving to disk then restarting and loading should preserve all task statuses exactly.
**Validates: Requirements 2.7**

### Task Execution Properties

**Property 10: First task selection**
_For any_ task list with mixed statuses, beginning execution should select the first not_started task in document order.
**Validates: Requirements 3.1**

**Property 11: Sub-task execution precedence**
_For any_ parent task with sub-tasks, all non-optional sub-tasks must reach completed status before the parent can be marked completed.
**Validates: Requirements 3.2**

**Property 12: Mutual exclusion of in-progress tasks**
_For any_ point in time during execution, at most one task should have status in_progress.
**Validates: Requirements 3.3**

**Property 13: Sequential task queueing**
_For any_ task that completes successfully, the next not_started task in document order should be automatically queued.
**Validates: Requirements 3.4**

**Property 14: Failure halts execution**
_For any_ task that fails, execution should halt immediately and the Ralph-Loop should be triggered before any other task starts.
**Validates: Requirements 3.5**

**Property 15: Optional task skipping**
_For any_ task marked as optional (with asterisk), it should be skipped during normal execution unless explicitly requested.
**Validates: Requirements 3.6**

### Test Integration Properties

**Property 16: Test triggering on code changes**
_For any_ code file modification, the Test_Runner should be invoked with all test files that cover the modified code.
**Validates: Requirements 4.1**

**Property 17: Comprehensive test execution**
_For any_ test task, both unit tests and property-based tests should be executed before the task is marked complete.
**Validates: Requirements 4.2**

**Property 18: Test success enables completion**
_For any_ task with tests, if all tests pass, the task should be marked as completed.
**Validates: Requirements 4.3**

**Property 19: Test failure triggers Ralph-Loop**
_For any_ test failure, the complete failure details (message, stack trace, test name) should be captured and the Ralph-Loop should be triggered.
**Validates: Requirements 4.4, 4.5**

**Property 20: Property test iteration minimum**
_For any_ property-based test execution, the test should run for at least 100 iterations.
**Validates: Requirements 4.6**

**Property 21: Test failure traceability**
_For any_ test failure, the corresponding design property number and requirement references should be extracted from test tags and included in the error context.
**Validates: Requirements 4.7**

### Ralph-Loop Properties

**Property 22: Error analysis completeness**
_For any_ task failure with error context, the Ralph-Loop should identify the error type and determine the root cause.
**Validates: Requirements 5.1**

**Property 23: Correct target file determination**
_For any_ error type, the Ralph-Loop should select the appropriate spec file to update (test failures → design.md, missing functionality → requirements.md, implementation issues → tasks.md).
**Validates: Requirements 5.2**

**Property 24: Surgical spec updates**
_For any_ spec file update by Ralph-Loop, all content outside the corrected section should remain byte-for-byte identical to the original.
**Validates: Requirements 5.3**

**Property 25: Task reset after correction**
_For any_ spec update by Ralph-Loop, the failed task's status should be reset to not_started.
**Validates: Requirements 5.4**

**Property 26: Execution resumption point**
_For any_ Ralph-Loop correction, execution should resume from the failed task, not from the beginning.
**Validates: Requirements 5.5**

**Property 27: Ralph-Loop iteration limit**
_For any_ task, the Ralph-Loop should attempt correction at most 3 times before halting and requesting human intervention.
**Validates: Requirements 5.6**

### Logging Properties

**Property 28: Universal action logging**
_For any_ orchestrator action (task start, task complete, test run, error, etc.), an entry should be appended to the execution log.
**Validates: Requirements 6.1**

**Property 29: Log entry completeness**
_For any_ log entry, it should contain timestamp, event type, task ID (if applicable), message, and relevant context data.
**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

**Property 30: Ralph-Loop DEVLOG entries**
_For any_ Ralph-Loop activation, a human-readable entry should be appended to DEVLOG.md under the "Self-Healing Events" section.
**Validates: Requirements 6.6**

**Property 31: Log rotation threshold**
_For any_ execution log file, when its size exceeds 10MB, it should be rotated to a new file.
**Validates: Requirements 6.7**

### Progress Event Properties

**Property 32: SSE stream establishment**
_For any_ client connection request, an SSE stream should be established and return a valid event stream response.
**Validates: Requirements 7.1**

**Property 33: Event broadcast to all clients**
_For any_ task status change, test execution, or Ralph-Loop activation, a progress event should be emitted to all connected clients.
**Validates: Requirements 7.2, 7.3, 7.4**

**Property 34: Progress percentage inclusion**
_For any_ progress event, it should include a completion percentage calculated as (completed tasks / total tasks) \* 100.
**Validates: Requirements 7.5**

**Property 35: Client disconnect cleanup**
_For any_ client that disconnects, all associated event stream resources should be freed and the client removed from the subscriber list.
**Validates: Requirements 7.6**

**Property 36: Event batching rate limit**
_For any_ sequence of progress events, they should be batched such that no client receives more than 10 events per second.
**Validates: Requirements 7.7**

### Atomic Update Properties

**Property 37: Atomic file write pattern**
_For any_ spec file update, the system should write to a temporary file first, then atomically rename it, ensuring the original is never corrupted.
**Validates: Requirements 8.1, 8.2, 8.3**

**Property 38: Markdown formatting preservation**
_For any_ task status update in tasks.md, all markdown formatting (indentation, bullets, headers) should be preserved exactly.
**Validates: Requirements 8.4**

**Property 39: Pre-commit validation**
_For any_ spec file update, the new content should be validated for correct markdown syntax before being committed.
**Validates: Requirements 8.5**

**Property 40: Update serialization**
_For any_ two concurrent spec file update requests, they should be serialized such that one completes fully before the other begins.
**Validates: Requirements 8.6**

**Property 41: Backup creation**
_For any_ spec file modification, a backup of the original file should exist before the modification is applied.
**Validates: Requirements 8.7**

### Dependency Properties

**Property 42: Document order dependencies**
_For any_ task list, tasks should be scheduled in document order, treating earlier tasks as implicit dependencies of later tasks.
**Validates: Requirements 9.1**

**Property 43: Reference validation**
_For any_ task that references requirements or design properties, those references should be validated to exist in the corresponding spec files.
**Validates: Requirements 9.2, 9.3**

**Property 44: Optional sub-task allowance**
_For any_ parent task with optional sub-tasks, the parent can be marked completed even if optional sub-tasks are skipped.
**Validates: Requirements 9.4**

**Property 45: Prerequisite enforcement**
_For any_ task with dependencies, all prerequisite tasks must be in completed status before the task can begin execution.
**Validates: Requirements 9.5**

### API Properties

**Property 46: Webhook payload validation**
_For any_ incoming n8n webhook request, the payload should be validated against the expected schema before triggering spec creation.
**Validates: Requirements 10.3**

**Property 47: Completion callback delivery**
_For any_ execution that completes (success or failure), a status callback should be sent to the configured webhook URL if one is configured.
**Validates: Requirements 10.4**

**Property 48: Bearer token authentication**
_For any_ API request, if a bearer token is not provided or is invalid, the request should be rejected with 401 Unauthorized.
**Validates: Requirements 10.5**

**Property 49: Rate limiting enforcement**
_For any_ client making API requests, if they exceed 100 requests per minute, subsequent requests should be rejected with 429 Too Many Requests.
**Validates: Requirements 10.6**

**Property 50: Structured error responses**
_For any_ API error, the response should be valid JSON containing an error code, message, and appropriate HTTP status code.
**Validates: Requirements 10.7**

## Error Handling

### Error Categories

1. **Parse Errors**
   - Malformed markdown syntax
   - Missing required files
   - Invalid task ID format
   - Circular dependencies

2. **Execution Errors**
   - Test failures
   - Compilation errors
   - Runtime exceptions
   - Timeout errors

3. **File System Errors**
   - Permission denied
   - Disk full
   - File locked by another process
   - Invalid path

4. **Network Errors**
   - SSE client disconnect
   - Webhook delivery failure
   - API timeout

### Error Handling Strategies

**Parse Errors**:

- Return descriptive error with line number and context
- Do not attempt execution with invalid specs
- Suggest corrections when possible

**Execution Errors**:

- Capture complete error context (stack trace, task ID, timestamp)
- Trigger Ralph-Loop for automatic correction
- Limit correction attempts to 3 per task
- Request human intervention if correction fails

**File System Errors**:

- Retry transient errors (locked files) up to 3 times with exponential backoff
- Fail fast on permanent errors (permission denied, disk full)
- Preserve original files on write failures
- Log all file system errors with full context

**Network Errors**:

- Clean up disconnected SSE clients immediately
- Retry webhook deliveries up to 3 times with exponential backoff
- Return appropriate HTTP status codes (503 for timeouts, 500 for server errors)
- Log all network errors for debugging

### Error Recovery

**Crash Recovery**:

1. On startup, load orchestrator state from `.kiro/state/orchestrator-state.json`
2. If state exists, resume from last in_progress or queued task
3. If state is corrupted, start fresh and log warning

**Ralph-Loop Recovery**:

1. Analyze error context to determine error type
2. Select appropriate spec file to update
3. Generate correction using LLM analysis
4. Apply correction atomically
5. Reset task status and resume execution
6. If 3 attempts exhausted, halt and request human help

**Test Failure Recovery**:

1. Parse test output to extract failure details
2. Link failure to design property and requirements
3. Determine if property is too strict or implementation is incorrect
4. Update design.md or tasks.md accordingly
5. Re-run tests to verify correction

## Testing Strategy

### Dual Testing Approach

The Spec Orchestrator requires both unit tests and property-based tests for comprehensive validation:

**Unit Tests** focus on:

- Specific examples of valid and invalid inputs
- Edge cases (empty task lists, missing files, malformed markdown)
- Error conditions (disk full, permission denied, network failures)
- Integration points (API endpoints, SSE streams, webhook handlers)
- Specific scenarios (checkpoint tasks, optional tasks, Ralph-Loop exhaustion)

**Property-Based Tests** focus on:

- Universal properties that hold for all inputs
- Round-trip properties (parse → format → parse, save → load → save)
- Invariants (task status consistency, parent-child relationships)
- State transitions (valid status progressions)
- Comprehensive input coverage through randomization

### Property-Based Testing Configuration

**Library**: fast-check (TypeScript property-based testing library)

**Configuration**:

- Minimum 100 iterations per property test
- Seed-based reproducibility for failed tests
- Shrinking enabled to find minimal failing examples
- Timeout: 30 seconds per property test

**Test Tagging**:
Each property test must include a comment tag referencing the design property:

```typescript
// Feature: spec-orchestrator, Property 9: Status persistence round-trip
fc.assert(
  fc.property(fc.orchestratorState(), (state) => {
    const saved = saveState(state);
    const loaded = loadState(saved);
    expect(loaded).toEqual(state);
  }),
  { numRuns: 100 }
);
```

### Test Organization

```
tests/
├── unit/
│   ├── spec-parser.test.ts
│   ├── task-manager.test.ts
│   ├── test-runner.test.ts
│   ├── ralph-loop.test.ts
│   ├── log-manager.test.ts
│   ├── event-emitter.test.ts
│   └── api/
│       ├── execution.test.ts
│       ├── status.test.ts
│       └── webhooks.test.ts
├── property/
│   ├── parsing.property.test.ts
│   ├── task-status.property.test.ts
│   ├── execution.property.test.ts
│   ├── testing.property.test.ts
│   ├── ralph-loop.property.test.ts
│   ├── logging.property.test.ts
│   ├── events.property.test.ts
│   ├── atomic-updates.property.test.ts
│   ├── dependencies.property.test.ts
│   └── api.property.test.ts
└── integration/
    ├── end-to-end.test.ts
    └── ralph-loop-integration.test.ts
```

### Custom Generators for Property Tests

**Task Generator**:

```typescript
const taskArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  status: fc.constantFrom('not_started', 'queued', 'in_progress', 'completed'),
  isOptional: fc.boolean(),
  parentId: fc.option(fc.string(), { nil: null }),
  requirementRefs: fc.array(fc.string(), { maxLength: 5 }),
  propertyRefs: fc.array(fc.string(), { maxLength: 5 }),
});
```

**Task Tree Generator**:

```typescript
const taskTreeArbitrary = fc.letrec((tie) => ({
  task: fc.record({
    id: fc.string(),
    description: fc.string(),
    status: fc.constantFrom('not_started', 'queued', 'in_progress', 'completed'),
    isOptional: fc.boolean(),
    children: fc.array(tie('task'), { maxLength: 3 }),
  }),
})).task;
```

**Markdown Generator**:

```typescript
const tasksMarkdownArbitrary = fc.array(taskArbitrary).map((tasks) => {
  return tasks
    .map(
      (t) =>
        `- [${t.status === 'completed' ? 'x' : ' '}]${t.isOptional ? '*' : ''} ${t.id} ${t.description}`
    )
    .join('\n');
});
```

### Test Coverage Goals

- Overall code coverage: 80% minimum
- Critical paths (task execution, Ralph-Loop, atomic updates): 95% minimum
- Property test coverage: All 50 properties implemented
- Unit test coverage: All edge cases and error conditions
- Integration test coverage: End-to-end workflows

### Continuous Testing

- Run unit tests on every file save (watch mode during development)
- Run property tests before every commit (pre-commit hook)
- Run full test suite in CI/CD pipeline
- Run integration tests nightly
- Monitor test execution time and optimize slow tests
