# Design Document: Gateway Architecture

## Overview

The Gateway Architecture transforms Antigravity OS from a traditional request-response system into a persistent, skill-based architecture. This design implements a long-running daemon process that routes commands internally, validates all data against strict schemas, and maintains execution context between requests for improved performance.

The architecture draws inspiration from the clawdbot Gateway Pattern, emphasizing modularity, type safety, and autonomous maintenance. The system will support seamless migration from the existing architecture while maintaining current test pass rates.

### Key Design Goals

1. **Performance**: Reduce command execution latency by 70% through persistent process and internal routing
2. **Type Safety**: Enforce strict schema validation at all boundaries
3. **Modularity**: Enable independent skill development with clear contracts
4. **Maintainability**: Autonomous code quality enforcement via Auto-Janitor
5. **Observability**: Comprehensive monitoring and tracing capabilities

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│              (CLI, API, n8n Webhooks)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   GATEWAY PROCESS                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Router     │→ │  Validator   │→ │   Executor   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                  ↓                  ↓             │
│  ┌──────────────────────────────────────────────────┐      │
│  │          Skill Registry (In-Memory)              │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SKILLS LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Spec Skills  │  │ Test Skills  │  │ File Skills  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Task Skills  │  │ Memory Skills│  │ n8n Skills   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ File System  │  │  Database    │  │  Monitoring  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Gateway Process Architecture

The Gateway is a persistent Node.js process that maintains state between requests:

```typescript
// Gateway lifecycle
Gateway.start()
  → Load skill definitions
  → Validate all schemas
  → Initialize router
  → Enter event loop
  → Process commands (internal routing)
  → Maintain keep-alive
  → Graceful shutdown on signal
```

### Skill Architecture

Each skill is a self-contained module with:

1. **Schema Definition**: JSON Schema for input/output validation
2. **Implementation**: Pure function with no side effects outside declared interface
3. **Metadata**: Name, version, dependencies, resource limits
4. **Tests**: Unit tests and property-based tests

```typescript
// Skill structure
interface Skill {
  name: string;
  version: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  execute: (input: unknown) => Promise<unknown>;
  metadata: SkillMetadata;
}
```

## Components and Interfaces

### 1. Gateway Core (`src/gateway/core.ts`)

**Responsibilities**:
- Process lifecycle management (start, stop, restart)
- Skill registry initialization and management
- Health check endpoint
- Graceful shutdown handling

**Interface**:
```typescript
interface Gateway {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getHealth(): HealthStatus;
  registerSkill(skill: Skill): void;
  unregisterSkill(skillName: string): void;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: number;
  activeConnections: number;
  skillCount: number;
}
```

### 2. Command Router (`src/gateway/router.ts`)

**Responsibilities**:
- Parse incoming commands
- Route to appropriate skill
- Handle routing errors
- Maintain routing metrics

**Interface**:
```typescript
interface Router {
  route(command: Command): Promise<RoutingResult>;
  getSkill(skillName: string): Skill | undefined;
  listSkills(): SkillInfo[];
}

interface Command {
  skill: string;
  action: string;
  payload: unknown;
  correlationId: string;
}

interface RoutingResult {
  success: boolean;
  output?: unknown;
  error?: Error;
  duration: number;
}
```

### 3. Schema Validator (`src/gateway/validator.ts`)

**Responsibilities**:
- Validate inputs against skill schemas
- Validate outputs against skill schemas
- Generate validation error reports
- Cache compiled schemas for performance

**Interface**:
```typescript
interface Validator {
  validateInput(skill: string, input: unknown): ValidationResult;
  validateOutput(skill: string, output: unknown): ValidationResult;
  loadSchema(schemaPath: string): JSONSchema;
}

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
  expected: string;
  received: string;
}
```

### 4. Skill Executor (`src/gateway/executor.ts`)

**Responsibilities**:
- Execute skills in isolated contexts
- Enforce resource limits (CPU, memory, time)
- Handle skill errors and timeouts
- Track execution metrics

**Interface**:
```typescript
interface Executor {
  execute(skill: Skill, input: unknown): Promise<ExecutionResult>;
  terminate(executionId: string): void;
  getMetrics(skillName: string): ExecutionMetrics;
}

interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: Error;
  duration: number;
  resourceUsage: ResourceUsage;
}

interface ResourceUsage {
  cpuTime: number;
  memoryPeak: number;
  fileDescriptors: number;
}
```

### 5. Auto-Janitor (`src/gateway/auto-janitor.ts`)

**Responsibilities**:
- Load constitutional rules from `.claud.md`
- Enforce rules on file write operations
- Validate TypeScript strict mode compliance
- Check test coverage thresholds
- Prevent `any` types in TypeScript

**Interface**:
```typescript
interface AutoJanitor {
  enforceRules(operation: FileOperation): EnforcementResult;
  loadRules(rulesPath: string): void;
  validateFile(filePath: string): ValidationResult;
  checkCoverage(coverageReport: CoverageReport): boolean;
}

interface FileOperation {
  type: 'write' | 'delete' | 'rename';
  path: string;
  content?: string;
}

interface EnforcementResult {
  allowed: boolean;
  violations: RuleViolation[];
}

interface RuleViolation {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  line?: number;
}
```

### 6. Deep Clean Analyzer (`src/gateway/deep-clean.ts`)

**Responsibilities**:
- Analyze file usage across codebase
- Identify unused exports and files
- Generate quarantine reports
- Move files to quarantine directory
- Restore quarantined files on demand

**Interface**:
```typescript
interface DeepClean {
  analyze(rootDir: string): AnalysisReport;
  quarantine(files: string[]): QuarantineResult;
  restore(files: string[]): RestoreResult;
  generateReport(): QuarantineReport;
}

interface AnalysisReport {
  totalFiles: number;
  unusedFiles: string[];
  unusedExports: Map<string, string[]>;
  importGraph: Map<string, string[]>;
}

interface QuarantineResult {
  moved: string[];
  failed: string[];
  report: string;
}
```

### 7. Skill Registry (`src/gateway/skill-registry.ts`)

**Responsibilities**:
- Load skill definitions from `src/skills/`
- Validate skill schemas on registration
- Provide skill lookup by name
- Track skill versions and dependencies

**Interface**:
```typescript
interface SkillRegistry {
  loadSkills(skillsDir: string): Promise<void>;
  register(skill: Skill): void;
  unregister(skillName: string): void;
  get(skillName: string): Skill | undefined;
  list(): SkillInfo[];
  validateAll(): ValidationResult[];
}

interface SkillInfo {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  resourceLimits: ResourceLimits;
}
```

## Data Models

### Skill Definition

```typescript
interface Skill {
  name: string;
  version: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  execute: (input: unknown) => Promise<unknown>;
  metadata: SkillMetadata;
}

interface SkillMetadata {
  author: string;
  created: Date;
  updated: Date;
  dependencies: string[];
  resourceLimits: ResourceLimits;
  tags: string[];
}

interface ResourceLimits {
  maxCpuTime: number; // milliseconds
  maxMemory: number; // bytes
  maxFileDescriptors: number;
  timeout: number; // milliseconds
}
```

### Command Model

```typescript
interface Command {
  skill: string;
  action: string;
  payload: unknown;
  correlationId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
```

### Execution Context

```typescript
interface ExecutionContext {
  command: Command;
  skill: Skill;
  startTime: Date;
  correlationId: string;
  resourceUsage: ResourceUsage;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
}
```

### Constitutional Rule

```typescript
interface ConstitutionalRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning';
  pattern: RegExp | ((content: string) => boolean);
  message: string;
  autofix?: (content: string) => string;
}
```

### Quarantine Record

```typescript
interface QuarantineRecord {
  originalPath: string;
  quarantinePath: string;
  reason: string;
  timestamp: Date;
  usageCount: number;
  lastUsed?: Date;
  retentionDays: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Schema Completeness

*For any* skill in the `src/skills/` directory, there must exist a corresponding JSON Schema file in `docs/schemas/skills/` with the same name.

**Validates: Requirements 1.1, 1.5**

### Property 2: Input Validation Enforcement

*For any* skill invocation with any input, the system must validate the input against the skill's input schema before execution, and reject invalid inputs with descriptive error messages.

**Validates: Requirements 1.2, 1.4, 3.4**

### Property 3: Output Validation Enforcement

*For any* skill execution that completes, the system must validate the output against the skill's output schema before returning it to the caller.

**Validates: Requirements 1.3**

### Property 4: Unused Code Detection Accuracy

*For any* file in the `src/` directory with zero import references across the codebase, the deep clean analyzer must correctly identify it as unused.

**Validates: Requirements 2.1, 2.2**

### Property 5: Quarantine Structure Preservation

*For any* file moved to quarantine, the system must preserve its original directory structure within `.kiro/quarantine/`, such that the relative path from `src/` is maintained.

**Validates: Requirements 2.4**

### Property 6: Quarantine Report Completeness

*For any* quarantine operation, the generated report must include all moved files with their usage statistics (import count, last used date).

**Validates: Requirements 2.5**

### Property 7: Quarantine Restoration Round-Trip

*For any* file that is quarantined and then restored, the file must return to its exact original location with identical content.

**Validates: Requirements 2.7**

### Property 8: Internal Command Routing

*For any* command received by the Gateway, the system must route it internally without spawning a new shell process (verified by process monitoring).

**Validates: Requirements 3.2**

### Property 9: Skill Registry Consistency

*For any* skill loaded into the Gateway, the skill registry must maintain its schema, metadata, and execution function in a consistent state accessible by name lookup.

**Validates: Requirements 3.3**

### Property 10: Comprehensive Event Logging

*For any* command routing event, error occurrence, or legacy command usage, the system must log it with timestamp, correlation ID, and relevant context details.

**Validates: Requirements 3.6, 6.3, 7.2**

### Property 11: Constitutional Rule Enforcement

*For any* file write operation, the Auto-Janitor must validate it against all active constitutional rules and prevent writes that violate error-level rules.

**Validates: Requirements 4.2, 4.3**

### Property 12: TypeScript Strict Mode Compliance

*For any* TypeScript file, the Auto-Janitor must reject code that contains `any` types or fails TypeScript strict mode compilation.

**Validates: Requirements 4.4, 4.6**

### Property 13: Documentation Completeness

*For any* exported function in the codebase, the Auto-Janitor must verify that it has a JSDoc comment with description and parameter documentation.

**Validates: Requirements 4.7**

### Property 14: Module Persistence Across Requests

*For any* two consecutive requests in daemon mode, loaded modules must remain in memory between requests (verified by module cache inspection).

**Validates: Requirements 5.2**

### Property 15: Execution Context Preservation

*For any* request sequence in daemon mode, execution context (loaded skills, configuration, state) must be preserved across requests.

**Validates: Requirements 5.3**

### Property 16: Low-Power Mode State Preservation

*For any* transition to low-power mode and back, all system state (skill registry, configuration, execution history) must be preserved identically.

**Validates: Requirements 5.4**

### Property 17: Performance Metrics Tracking

*For any* request processed by the Gateway, the system must track and report performance metrics including latency, memory usage, and cache hit rate.

**Validates: Requirements 5.6, 7.3**

### Property 18: Memory Management Trigger

*For any* point where memory usage exceeds 80% of available RAM, the system must trigger garbage collection within 1 second.

**Validates: Requirements 5.7**

### Property 19: Legacy Command Translation

*For any* legacy command format received, the compatibility layer must translate it to the new Gateway format while preserving all command semantics.

**Validates: Requirements 6.1, 6.2**

### Property 20: Execution History Bounded Size

*For any* sequence of commands, the execution history must maintain exactly the last 1000 commands, discarding older entries.

**Validates: Requirements 7.6**

### Property 21: Correlation ID Propagation

*For any* command with a correlation ID, the ID must be propagated through all skill executions, logs, and responses for distributed tracing.

**Validates: Requirements 7.7**

### Property 22: Skill Execution Isolation

*For any* skill execution that throws an error, the error must be contained within that skill's execution context without affecting the Gateway or other skills.

**Validates: Requirements 8.1, 8.2**

### Property 23: Resource Limit Enforcement

*For any* skill that exceeds its resource limits (CPU time, memory, file descriptors), the system must terminate it immediately and log the violation with details.

**Validates: Requirements 8.3, 8.6**

### Property 24: Input Sanitization Against Injection

*For any* skill input, the system must validate it against known injection attack patterns (SQL injection, command injection, XSS) and reject malicious inputs.

**Validates: Requirements 8.4**

### Property 25: Output Sanitization

*For any* skill output, the system must sanitize it to remove potentially dangerous content before returning to the caller.

**Validates: Requirements 8.5**

### Property 26: Rate Limiting Enforcement

*For any* skill, the system must enforce a rate limit of maximum 100 requests per minute, rejecting excess requests with appropriate error messages.

**Validates: Requirements 8.7**

## Error Handling

### Error Categories

1. **Validation Errors**: Schema validation failures, input/output type mismatches
2. **Execution Errors**: Skill execution failures, timeouts, resource limit violations
3. **Routing Errors**: Unknown skill, invalid command format
4. **System Errors**: Gateway failures, registry corruption, file system errors

### Error Handling Strategy

**Validation Errors**:
- Return immediately with descriptive error message
- Include validation failure details (path, expected, received)
- Log validation failures for monitoring
- Do not execute skill if validation fails

**Execution Errors**:
- Catch all errors within skill execution context
- Log full stack trace with correlation ID
- Return error response to caller
- Continue Gateway operation (isolation)
- Increment error metrics for monitoring

**Routing Errors**:
- Validate command format before routing
- Return "skill not found" for unknown skills
- Suggest similar skill names (fuzzy matching)
- Log routing failures

**System Errors**:
- Log critical errors with full context
- Attempt graceful degradation
- Trigger alerts for critical failures
- Provide health check status updates

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    correlationId: string;
    timestamp: Date;
  };
}
```

### Recovery Strategies

1. **Skill Failure**: Isolate and continue, log for analysis
2. **Registry Corruption**: Reload skills from disk
3. **Memory Exhaustion**: Trigger garbage collection, shed load
4. **Validation Failure**: Reject request, provide clear feedback

## Testing Strategy

### Dual Testing Approach

The Gateway Architecture requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Gateway startup and shutdown sequences
- Specific skill execution scenarios
- Error handling for known failure modes
- Configuration loading and validation
- Health check endpoint responses

**Property-Based Tests**: Verify universal properties across all inputs
- Schema validation for randomly generated skills and inputs
- Command routing with random command structures
- Resource limit enforcement with varying resource usage
- Quarantine operations with random file structures
- Rate limiting with random request patterns

### Property-Based Testing Configuration

- **Library**: fast-check (TypeScript property-based testing)
- **Iterations**: Minimum 100 per property test
- **Tagging**: Each test tagged with feature and property number
- **Tag Format**: `Feature: gateway-architecture, Property N: [property text]`

### Test Coverage Requirements

- **Minimum Coverage**: 80% for all modules
- **Critical Paths**: 100% coverage for validation, routing, execution
- **Error Paths**: All error handling paths must be tested

### Testing Phases

**Phase 1: Component Testing**
- Test each component in isolation
- Mock dependencies
- Verify interfaces and contracts

**Phase 2: Integration Testing**
- Test Gateway with real skills
- Test end-to-end command flow
- Verify schema validation pipeline

**Phase 3: Property Testing**
- Implement all 26 correctness properties
- Run with 100+ iterations each
- Verify universal correctness

**Phase 4: Performance Testing**
- Measure command latency (target: <10ms)
- Test memory usage under load
- Verify keep-alive performance gains

**Phase 5: Security Testing**
- Test injection attack prevention
- Verify resource limit enforcement
- Test skill isolation boundaries

### Test Organization

```
tests/
├── unit/
│   ├── gateway/
│   │   ├── core.test.ts
│   │   ├── router.test.ts
│   │   ├── validator.test.ts
│   │   └── executor.test.ts
│   ├── skills/
│   │   └── [skill-name].test.ts
│   └── auto-janitor/
│       └── janitor.test.ts
├── integration/
│   ├── gateway-flow.test.ts
│   ├── skill-execution.test.ts
│   └── migration.test.ts
└── properties/
    ├── schema-validation.properties.ts
    ├── command-routing.properties.ts
    ├── resource-limits.properties.ts
    ├── quarantine.properties.ts
    └── security.properties.ts
```

## Migration Strategy

### Phase 1: Foundation (Week 1)

1. Create Gateway core structure
2. Implement skill registry
3. Define skill schema format
4. Create first skill migration (spec-skills)

### Phase 2: Routing and Validation (Week 1-2)

1. Implement command router
2. Implement schema validator
3. Create skill executor with isolation
4. Test with migrated skills

### Phase 3: Auto-Janitor and Deep Clean (Week 2)

1. Implement constitutional rules engine
2. Create `.claud.md` with initial rules
3. Implement deep clean analyzer
4. Run initial codebase audit

### Phase 4: Daemon Mode and Keep-Alive (Week 2-3)

1. Implement persistent process mode
2. Add keep-alive mechanism
3. Implement low-power mode
4. Performance testing and optimization

### Phase 5: Monitoring and Security (Week 3)

1. Add Prometheus metrics endpoint
2. Implement distributed tracing
3. Add security validations
4. Implement rate limiting

### Phase 6: Migration and Compatibility (Week 3-4)

1. Create compatibility layer
2. Migrate remaining skills
3. Update documentation
4. Deprecate old architecture

### Rollback Plan

If critical issues arise during migration:

1. **Immediate**: Revert to previous commit
2. **Short-term**: Disable Gateway, use legacy architecture
3. **Long-term**: Fix issues, re-test, re-deploy

### Success Metrics

- All skills migrated with schemas
- Test pass rate maintained (>90%)
- Command latency reduced by 70%
- Zero shell spawning for internal commands
- Auto-Janitor preventing rule violations
- Deep clean identifying unused code

## Performance Considerations

### Optimization Targets

1. **Command Latency**: <10ms for internal routing (vs. 30-50ms with shell spawning)
2. **Memory Usage**: <200MB for Gateway process with 50 skills loaded
3. **Startup Time**: <2 seconds to load all skills and validate schemas
4. **Throughput**: >1000 commands per second

### Caching Strategy

- **Schema Compilation**: Cache compiled JSON schemas (Ajv)
- **Skill Registry**: In-memory skill lookup (O(1) access)
- **Module Loading**: Keep modules loaded between requests
- **Validation Results**: Cache validation results for identical inputs (optional)

### Resource Management

- **Memory**: Garbage collection triggered at 80% usage
- **CPU**: Skill execution time limits (default 5 seconds)
- **File Descriptors**: Limit per skill (default 100)
- **Connections**: Connection pooling for external services

## Security Considerations

### Input Validation

- All inputs validated against JSON Schema
- Injection attack pattern detection
- Input size limits (max 10MB per request)
- Type coercion prevention

### Skill Isolation

- Each skill executes in isolated context
- No shared state between skills
- Resource limits enforced per skill
- Error containment within skill boundary

### Output Sanitization

- Remove sensitive data from outputs
- Sanitize HTML/JavaScript in string outputs
- Validate output types match schema
- Prevent information leakage in errors

### Rate Limiting

- Per-skill rate limits (100 req/min default)
- Global Gateway rate limit (1000 req/min)
- IP-based rate limiting (optional)
- Exponential backoff for repeated violations

### Audit Logging

- All commands logged with correlation IDs
- Security events logged separately
- Log rotation and retention policies
- Tamper-evident logging (optional)

## Monitoring and Observability

### Metrics

**Gateway Metrics**:
- Request count (total, per skill)
- Request latency (p50, p95, p99)
- Error rate (total, per skill)
- Active connections
- Memory usage
- CPU usage

**Skill Metrics**:
- Execution count
- Execution duration
- Success rate
- Resource usage (CPU, memory)
- Validation failures

**System Metrics**:
- Uptime
- Skill count
- Registry size
- Quarantine size
- Rule violation count

### Logging

**Log Levels**:
- ERROR: Critical failures, security events
- WARN: Validation failures, rate limit hits
- INFO: Command routing, skill execution
- DEBUG: Detailed execution traces

**Log Format**:
```json
{
  "timestamp": "2026-01-19T15:30:00Z",
  "level": "INFO",
  "correlationId": "abc-123",
  "component": "router",
  "message": "Command routed to skill",
  "skill": "spec-create",
  "duration": 5.2
}
```

### Health Checks

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "memoryUsage": 150000000,
  "activeConnections": 5,
  "skillCount": 50,
  "lastError": null
}
```

### Alerting

**Alert Conditions**:
- Error rate >5% for 5 minutes
- Memory usage >90% for 2 minutes
- Response latency >100ms (p95) for 5 minutes
- Gateway process crash
- Skill validation failure rate >10%

## Documentation Requirements

### Developer Documentation

1. **Skill Development Guide**: How to create new skills with schemas
2. **Gateway API Reference**: Complete API documentation
3. **Migration Guide**: How to migrate from legacy architecture
4. **Testing Guide**: How to write unit and property tests

### Operational Documentation

1. **Deployment Guide**: How to deploy Gateway in production
2. **Monitoring Guide**: How to monitor Gateway health
3. **Troubleshooting Guide**: Common issues and solutions
4. **Security Guide**: Security best practices

### Constitutional Rules Documentation

1. **`.claud.md`**: Complete list of constitutional rules
2. **Rule Rationale**: Why each rule exists
3. **Auto-Fix Guide**: Which rules have automatic fixes
4. **Rule Evolution**: How rules are updated over time

---

**Design Status**: ✅ COMPLETE  
**Next Step**: Create implementation tasks  
**Estimated Complexity**: High (4 weeks)  
**Risk Level**: Medium (architectural change, requires careful migration)
