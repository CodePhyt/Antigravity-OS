# Requirements Document: Medin Protocol (Ralph-Loop 2.0)

## Introduction

The Medin Protocol enhances Antigravity OS's Ralph-Loop self-healing engine with sovereign memory, real system validation, and context isolation. This upgrade transforms Ralph-Loop from a reactive error-correction system into a proactive, truth-grounded autonomous agent that validates all claims against real system state.

## Glossary

- **Ralph_Loop**: The self-healing execution engine that follows the B.L.A.S.T. protocol (Build, Log, Analyze, Spec, Test)
- **PRD**: Product Requirements Document, the master source of truth for system requirements
- **Activity_Log**: Long-term memory system tracking all operations, decisions, and outcomes
- **Validator**: Component that performs real system checks to verify task completion claims
- **Constitutional_Pre_Check**: Safety validation that analyzes commands before execution
- **MCP_Tool**: Model Context Protocol tool that extends agent capabilities
- **Isolation_Context**: Sandboxed execution environment for sub-tasks
- **CLI**: Command-line interface for interacting with Antigravity OS
- **System_State**: Current runtime state of services, processes, and resources

## Requirements

### Requirement 1: Sovereign Memory Integration

**User Story:** As a Ralph-Loop engine, I want to read the master PRD before starting any task, so that I operate from a single source of truth.

#### Acceptance Criteria

1. WHEN Ralph-Loop initializes a task execution, THE Ralph_Loop SHALL read PRD.md before any code execution
2. WHEN PRD.md is missing or invalid, THE Ralph_Loop SHALL halt execution and request human intervention
3. WHEN task requirements conflict with PRD.md, THE Ralph_Loop SHALL prioritize PRD.md and log the conflict
4. THE Ralph_Loop SHALL extract relevant requirements from PRD.md based on task context
5. WHEN PRD.md is updated during execution, THE Ralph_Loop SHALL reload requirements before the next task

### Requirement 2: Activity Log Maintenance

**User Story:** As a Ralph-Loop engine, I want to maintain a comprehensive activity log, so that the system has long-term memory of all operations.

#### Acceptance Criteria

1. WHEN a task completes successfully, THE Ralph_Loop SHALL append an entry to ACTIVITY_LOG.md with timestamp, task ID, outcome, and validation results
2. WHEN a task fails, THE Ralph_Loop SHALL log the failure with error context, attempted corrections, and final state
3. WHEN a self-healing event occurs, THE Ralph_Loop SHALL document the error, analysis, spec update, and resolution
4. THE Ralph_Loop SHALL structure log entries with consistent markdown formatting for machine parsing
5. WHEN ACTIVITY_LOG.md exceeds 10MB, THE Ralph_Loop SHALL archive old entries and create a new log file

### Requirement 3: Real System Validation

**User Story:** As a Ralph-Loop engine, I want to validate task completion against real system state, so that I never claim success without proof.

#### Acceptance Criteria

1. WHEN a task claims completion, THE Validator SHALL execute real system checks before marking the task as complete
2. WHEN validation checks fail, THE Ralph_Loop SHALL retry the task or escalate to human review
3. THE Validator SHALL support multiple validation types: process checks (docker ps), network checks (netstat), API checks (HTTP fetch), and file system checks
4. WHEN validation takes longer than 100ms, THE Validator SHALL log a performance warning
5. THE Validator SHALL return structured validation results with pass/fail status, evidence, and confidence score

### Requirement 4: Validation Library Implementation

**User Story:** As a developer, I want a reusable validation library, so that all components can verify system state consistently.

#### Acceptance Criteria

1. THE Validator SHALL provide a `validateDockerContainer(name: string)` function that checks if a container is running
2. THE Validator SHALL provide a `validateNetworkPort(port: number)` function that checks if a port is listening
3. THE Validator SHALL provide a `validateAPIEndpoint(url: string)` function that checks if an API responds successfully
4. THE Validator SHALL provide a `validateFileExists(path: string)` function that checks if a file exists and is readable
5. WHEN any validation function fails, THE Validator SHALL return detailed error information including expected vs. actual state

### Requirement 5: Constitutional Pre-Check System

**User Story:** As a Ralph-Loop engine, I want to validate all shell commands before execution, so that I never run dangerous operations.

#### Acceptance Criteria

1. WHEN Ralph-Loop prepares to execute a shell command, THE Constitutional_Pre_Check SHALL analyze the command for safety violations
2. THE Constitutional_Pre_Check SHALL block commands that delete files without confirmation
3. THE Constitutional_Pre_Check SHALL block commands that modify production databases
4. THE Constitutional_Pre_Check SHALL block commands that expose sensitive credentials
5. WHEN a command is blocked, THE Constitutional_Pre_Check SHALL suggest a safer alternative and request human approval

### Requirement 6: Context Isolation for Sub-Tasks

**User Story:** As a Ralph-Loop engine, I want to execute sub-tasks in isolated contexts, so that failures don't cascade across the system.

#### Acceptance Criteria

1. WHEN Ralph-Loop executes a sub-task, THE Isolation_Context SHALL create a sandboxed process with limited permissions
2. WHEN a sub-task fails, THE Isolation_Context SHALL contain the failure and prevent system-wide corruption
3. THE Isolation_Context SHALL provide resource limits (CPU, memory, time) for sub-task execution
4. WHEN a sub-task exceeds resource limits, THE Isolation_Context SHALL terminate it gracefully and log the violation
5. THE Isolation_Context SHALL capture all stdout, stderr, and exit codes from sub-tasks for analysis

### Requirement 7: MCP Tool Integration

**User Story:** As an MCP tool, I want to follow the Plan-Execute-Verify cycle, so that all tool operations are validated.

#### Acceptance Criteria

1. WHEN an MCP tool is invoked, THE MCP_Tool SHALL generate an execution plan before taking action
2. WHEN the execution plan is generated, THE MCP_Tool SHALL present it for approval (human or automated)
3. WHEN the plan is approved, THE MCP_Tool SHALL execute the planned actions
4. WHEN actions complete, THE MCP_Tool SHALL verify outcomes using the Validator
5. WHEN verification fails, THE MCP_Tool SHALL rollback changes and report failure

### Requirement 8: CLI Activity Log Integration

**User Story:** As a developer, I want to query the activity log via CLI, so that I can inspect system history without reading raw markdown.

#### Acceptance Criteria

1. WHEN a user runs `ag-os status`, THE CLI SHALL read ACTIVITY_LOG.md and display recent activity
2. WHEN a user runs `ag-os status --task <id>`, THE CLI SHALL filter log entries for that specific task
3. WHEN a user runs `ag-os status --failed`, THE CLI SHALL display only failed tasks with error summaries
4. WHEN a user runs `ag-os status --since <date>`, THE CLI SHALL display activity since the specified date
5. THE CLI SHALL format log output with color-coded status indicators (green=success, red=failure, yellow=warning)

### Requirement 9: Zero False Positives

**User Story:** As a system architect, I want zero false positive task completions, so that the system maintains integrity.

#### Acceptance Criteria

1. THE Ralph_Loop SHALL NOT mark any task as complete without passing validation
2. WHEN validation is unavailable (e.g., network down), THE Ralph_Loop SHALL mark the task as "pending verification"
3. THE Ralph_Loop SHALL track false positive rate and alert when it exceeds 0.1%
4. WHEN a false positive is detected retroactively, THE Ralph_Loop SHALL log it and update the task status
5. THE Ralph_Loop SHALL require manual override with justification to bypass validation

### Requirement 10: Performance Requirements

**User Story:** As a system operator, I want validation to be fast, so that it doesn't slow down development velocity.

#### Acceptance Criteria

1. THE Validator SHALL complete validation checks in under 100ms for 95% of cases
2. WHEN validation exceeds 100ms, THE Validator SHALL log the slow check for optimization
3. THE Validator SHALL cache validation results for 5 seconds to avoid redundant checks
4. THE Validator SHALL execute validation checks in parallel when possible
5. THE Validator SHALL provide a timeout mechanism (default 5 seconds) to prevent hanging

### Requirement 11: Activity Log Parsing

**User Story:** As a developer, I want to parse the activity log programmatically, so that I can build analytics and monitoring tools.

#### Acceptance Criteria

1. THE Activity_Log SHALL use consistent markdown structure with YAML frontmatter for metadata
2. THE Activity_Log SHALL include machine-readable timestamps in ISO 8601 format
3. THE Activity_Log SHALL tag entries with categories (task, error, validation, self-healing)
4. THE Activity_Log SHALL provide a JSON export function for programmatic access
5. THE Activity_Log SHALL support filtering by date range, task ID, status, and category

### Requirement 12: PRD Synchronization

**User Story:** As a Ralph-Loop engine, I want to detect PRD changes during execution, so that I always operate on current requirements.

#### Acceptance Criteria

1. THE Ralph_Loop SHALL monitor PRD.md for file system changes during task execution
2. WHEN PRD.md is modified, THE Ralph_Loop SHALL pause execution and reload requirements
3. WHEN reloaded requirements conflict with in-progress tasks, THE Ralph_Loop SHALL request human decision
4. THE Ralph_Loop SHALL log all PRD reloads to ACTIVITY_LOG.md with diff summaries
5. THE Ralph_Loop SHALL support a "freeze PRD" mode that ignores changes during critical operations

