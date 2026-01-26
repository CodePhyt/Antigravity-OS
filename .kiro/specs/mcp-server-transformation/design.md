# Design Document: Universal Sovereign MCP Engine (AS-MCP)

## Overview

The Universal Sovereign MCP Engine (AS-MCP) transforms Antigravity OS into a background infrastructure service that acts as the Source of Truth for AI agents across any IDE (Cursor, Windsurf, Claude Desktop). Built on the official `@modelcontextprotocol/sdk`, the system exposes an "anti-hallucination" toolset that provides ground truth about system state, validates dependencies before execution, and enables autonomous self-healing through the Ralph-Loop engine.

The architecture follows three core principles:

1. **Universal Connectivity**: stdio-based communication ensures compatibility with all MCP clients
2. **Anti-Hallucination**: Tools provide real-time system context, preventing AI agents from guessing
3. **Constitutional Governance**: All operations validated against the 13 Articles before execution

The dashboard transforms into an **Observer Console** that visualizes real-time AI agent interactions with neon pulse animations, creating a "nervous system" view of the autonomous infrastructure.

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        IDE CLIENTS                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Cursor  │  │ Windsurf │  │  Claude  │  │    CLI   │       │
│  │          │  │          │  │ Desktop  │  │  Agent   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                         │                                        │
│                    stdio (JSON-RPC 2.0)                         │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   AS-MCP SERVER                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  @modelcontextprotocol/sdk                                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  StdioServer│  │ JSON-RPC   │  │   Tool     │         │  │
│  │  │  Transport  │  │  Handler   │  │  Registry  │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │         ANTI-HALLUCINATION TOOLSET                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │get_system_   │  │validate_     │  │sovereign_    │   │  │
│  │  │context       │  │environment   │  │execute       │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │  ┌──────────────┐                                        │  │
│  │  │trigger_      │                                        │  │
│  │  │ralph_loop    │                                        │  │
│  │  └──────────────┘                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │         CONSTITUTIONAL VALIDATOR                          │  │
│  │  - 13 Articles enforcement                                │  │
│  │  - Docker whitelist (antigravity, test-, dev-)           │  │
│  │  - Destructive operation detection                        │  │
│  │  - Sensitive directory protection                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │         PURE FUNCTION LAYER                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │Docker        │  │System        │  │Telemetry     │   │  │
│  │  │Service       │  │Info          │  │Service       │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐                     │  │
│  │  │Ralph-Loop    │  │Port          │                     │  │
│  │  │Engine        │  │Scanner       │                     │  │
│  │  └──────────────┘  └──────────────┘                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │         DUAL INTERFACE ADAPTERS                           │  │
│  │  ┌──────────────┐              ┌──────────────┐          │  │
│  │  │MCP Response  │              │HTTP Response │          │  │
│  │  │Wrapper       │              │Wrapper       │          │  │
│  │  └──────┬───────┘              └──────┬───────┘          │  │
│  └─────────┼──────────────────────────────┼──────────────────┘  │
└────────────┼──────────────────────────────┼─────────────────────┘
             │                              │
             │                              │
    ┌────────▼────────┐          ┌─────────▼──────────┐
    │  MCP Clients    │          │  Next.js API       │
    │  (stdio)        │          │  Routes (HTTP)     │
    └─────────────────┘          └────────────────────┘
                                          │
                                 ┌────────▼────────┐
                                 │ Observer Console│
                                 │ (Dashboard UI)  │
                                 │ - Neon pulses   │
                                 │ - Real-time logs│
                                 │ - MCP config    │
                                 └─────────────────┘
```

### Layer Responsibilities

**1. MCP SDK Layer** (Requirements 1, 9)

- Handles JSON-RPC 2.0 protocol compliance
- Manages stdio transport (stdin/stdout)
- Implements MCP initialize handshake
- Validates tool schemas using JSON Schema 2020-12

**2. Anti-Hallucination Toolset** (Requirements 2-5)

- `get_system_context`: Real-time system state snapshot
- `validate_environment`: Dependency validation before execution
- `sovereign_execute`: Constitutional command wrapper
- `trigger_ralph_loop`: Autonomous self-healing trigger

**3. Constitutional Validator** (Requirement 12)

- Enforces 13 Articles of the Constitution
- Validates Docker operations against whitelist
- Detects destructive operations (rm -rf, DROP TABLE)
- Protects sensitive directories (.git, node_modules, .env)

**4. Pure Function Layer** (Requirement 11)

- Business logic isolated from I/O
- Reusable across MCP and HTTP interfaces
- Dependency injection for testability
- No side effects in function signatures

**5. Dual Interface Adapters** (Requirements 8, 11)

- MCP Response Wrapper: Formats results as JSON-RPC responses
- HTTP Response Wrapper: Formats results as Next.js responses
- Maintains backward compatibility with existing API routes

## Components and Interfaces

### 1. MCP Server Core (`src/mcp/server.ts`)

**Purpose**: Main entry point for the AS-MCP server using official SDK

**Dependencies**:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
```

**Interface**:

```typescript
interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: {
    tools: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

class AntigravityMCPServer {
  private server: Server;
  private transport: StdioServerTransport;

  constructor(config: MCPServerConfig);
  async start(): Promise<void>;
  async stop(): Promise<void>;
  registerTool(tool: MCPTool): void;
  private handleToolCall(name: string, args: unknown): Promise<unknown>;
}
```

**Responsibilities**:

- Initialize MCP server with SDK
- Register all anti-hallucination tools
- Handle tool invocations with error boundaries
- Manage server lifecycle (start/stop/restart)

**Requirements Validated**: 1, 9, 13, 14

---

### 2. Anti-Hallucination Tools (`src/mcp/tools/`)

#### 2.1 System Context Tool (`system-context.ts`)

**Purpose**: Provides real-time system state to prevent AI hallucination

**Interface**:

```typescript
interface SystemContext {
  cpu: {
    usage: number; // 0-100
    cores: number;
  };
  memory: {
    total: number; // bytes
    used: number;
    available: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
  };
  docker: {
    available: boolean;
    containers: DockerContainer[];
    images: DockerImage[];
  };
  ports: {
    active: PortBinding[];
  };
  environment: {
    nodeVersion: string;
    npmVersion: string;
    cwd: string;
    gitBranch: string | null;
  };
}

async function getSystemContext(): Promise<SystemContext>;
```

**Tool Schema** (JSON Schema 2020-12):

```json
{
  "name": "get_system_context",
  "description": "Returns real-time system state including CPU, memory, Docker, ports, and environment. Prevents AI from guessing system conditions.",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

**Requirements Validated**: 2

---

#### 2.2 Environment Validation Tool (`validate-environment.ts`)

**Purpose**: Validates dependencies before execution to prevent "command not found" errors

**Interface**:

```typescript
interface ValidationRequest {
  commands?: string[]; // e.g., ["docker", "npm", "git"]
  packages?: string[]; // e.g., ["express", "react"]
  files?: string[]; // e.g., ["package.json", ".env"]
  ports?: number[]; // e.g., [3000, 5432]
}

interface ValidationResult {
  valid: boolean;
  results: {
    commands: Record<string, { exists: boolean; path?: string }>;
    packages: Record<string, { installed: boolean; version?: string }>;
    files: Record<string, { exists: boolean; readable?: boolean }>;
    ports: Record<number, { available: boolean; process?: string }>;
  };
  suggestions: string[]; // Installation commands for missing deps
}

async function validateEnvironment(req: ValidationRequest): Promise<ValidationResult>;
```

**Tool Schema**:

```json
{
  "name": "validate_environment",
  "description": "Validates that required dependencies exist before executing tasks. Checks commands, packages, files, and ports.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "commands": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Command names to check in PATH"
      },
      "packages": {
        "type": "array",
        "items": { "type": "string" },
        "description": "npm package names to verify"
      },
      "files": {
        "type": "array",
        "items": { "type": "string" },
        "description": "File paths to check"
      },
      "ports": {
        "type": "array",
        "items": { "type": "number" },
        "description": "Port numbers to check availability"
      }
    }
  }
}
```

**Requirements Validated**: 3

---

#### 2.3 Sovereign Execute Tool (`sovereign-execute.ts`)

**Purpose**: Constitutional command wrapper that validates all operations

**Interface**:

```typescript
interface ExecuteRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number; // milliseconds
  confirmDestructive?: boolean; // Required for destructive ops
}

interface ExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  validated: boolean;
  violations: string[]; // Constitutional violations detected
  executionTime: number; // milliseconds
}

async function sovereignExecute(req: ExecuteRequest): Promise<ExecuteResult>;
```

**Constitutional Validation Rules**:

1. Destructive operations require `confirmDestructive: true`
2. Docker operations must use whitelisted images
3. File operations cannot access sensitive directories
4. Network operations logged to telemetry
5. All commands logged with full context

**Tool Schema**:

```json
{
  "name": "sovereign_execute",
  "description": "Executes commands with constitutional validation. All operations checked against 13 Articles before execution.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "command": {
        "type": "string",
        "description": "Command to execute"
      },
      "args": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Command arguments"
      },
      "cwd": {
        "type": "string",
        "description": "Working directory"
      },
      "timeout": {
        "type": "number",
        "description": "Timeout in milliseconds (default: 30000)"
      },
      "confirmDestructive": {
        "type": "boolean",
        "description": "Must be true for destructive operations"
      }
    },
    "required": ["command"]
  }
}
```

**Requirements Validated**: 4, 12

---

#### 2.4 Ralph-Loop Trigger Tool (`ralph-loop-trigger.ts`)

**Purpose**: Triggers autonomous self-healing for environment drift

**Interface**:

```typescript
interface RalphLoopRequest {
  errorContext?: {
    message: string;
    stack?: string;
    taskId?: string;
    file?: string;
  };
  mode: 'analyze' | 'correct' | 'health-check';
}

interface RalphLoopResult {
  success: boolean;
  mode: string;
  analysis?: {
    errorType: string;
    rootCause: string;
    specViolation: boolean;
  };
  correction?: {
    plan: string;
    updatedFiles: string[];
    attemptNumber: number;
  };
  healthCheck?: {
    systemHealthy: boolean;
    issues: string[];
    recommendations: string[];
  };
  exhausted: boolean;
  diagnostics: string;
}

async function triggerRalphLoop(req: RalphLoopRequest): Promise<RalphLoopResult>;
```

**Tool Schema**:

```json
{
  "name": "trigger_ralph_loop",
  "description": "Triggers autonomous self-healing engine. Analyzes errors, generates corrections, and updates specs.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "errorContext": {
        "type": "object",
        "properties": {
          "message": { "type": "string" },
          "stack": { "type": "string" },
          "taskId": { "type": "string" },
          "file": { "type": "string" }
        },
        "required": ["message"]
      },
      "mode": {
        "type": "string",
        "enum": ["analyze", "correct", "health-check"],
        "description": "Operation mode"
      }
    },
    "required": ["mode"]
  }
}
```

**Requirements Validated**: 5

---

### 3. Constitutional Validator (`src/mcp/validator.ts`)

**Purpose**: Enforces the 13 Articles of the Constitution

**Interface**:

```typescript
interface ValidationContext {
  command: string;
  args: string[];
  cwd: string;
  user: string;
}

interface ConstitutionalViolation {
  article: number;
  rule: string;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  remediation?: string;
}

class ConstitutionalValidator {
  validate(context: ValidationContext): ConstitutionalViolation[];
  isDestructive(command: string, args: string[]): boolean;
  isDockerWhitelisted(image: string): boolean;
  isSensitiveDirectory(path: string): boolean;
}
```

**13 Articles** (from `docs/global_rules.md`):

1. Memory-First Development
2. Schema-First Data Structures
3. B.L.A.S.T. Recovery Protocol
4. Time-Boxing & MVP Mindset
5. Dual Testing Requirement
6. Structured Verification
7. Hybrid Compute Optimization
8. Documentation Synchronization
9. Self-Evolution Cadence
10. Hackathon Velocity Mode
11. Human-in-the-Loop Checkpoints
12. Decision-Tree Logging
13. Strict Type-Safe Validation

**Requirements Validated**: 12

---

### 4. Pure Function Services (`src/services/`)

#### 4.1 Docker Service (`docker-service.ts`)

**Purpose**: Pure functions for Docker operations

**Interface**:

```typescript
interface DockerContainer {
  id: string;
  image: string;
  status: string;
  ports: string[];
}

interface DockerImage {
  name: string;
  id: string;
  size: string;
}

async function listContainers(): Promise<DockerContainer[]>;
async function listImages(): Promise<DockerImage[]>;
async function removeContainer(id: string): Promise<void>;
async function removeImage(id: string): Promise<void>;
async function isDockerAvailable(): Promise<boolean>;
```

**Requirements Validated**: 11

---

#### 4.2 System Info Service (`system-info-service.ts`)

**Purpose**: Pure functions for system information

**Interface**:

```typescript
interface CPUInfo {
  usage: number;
  cores: number;
}

interface MemoryInfo {
  total: number;
  used: number;
  available: number;
}

interface DiskInfo {
  total: number;
  used: number;
  available: number;
}

async function getCPUInfo(): Promise<CPUInfo>;
async function getMemoryInfo(): Promise<MemoryInfo>;
async function getDiskInfo(): Promise<DiskInfo>;
async function getNodeVersion(): Promise<string>;
async function getNpmVersion(): Promise<string>;
async function getCurrentBranch(): Promise<string | null>;
```

**Requirements Validated**: 2, 11

---

#### 4.3 Telemetry Service (`telemetry-service.ts`)

**Purpose**: Pure functions for telemetry operations

**Interface**:

```typescript
interface TelemetryData {
  metrics: {
    ralphLoopActivations: number;
    ralphLoopSuccesses: number;
    ralphLoopFailures: number;
    autonomousFixes: number;
    tasksCompleted: number;
    successRate: number;
  };
  recentEvents: TelemetryEvent[];
  generatedAt: string;
}

interface TelemetryEvent {
  timestamp: string;
  type: string;
  tool?: string;
  result: 'success' | 'failure';
  details: string;
}

async function readTelemetry(): Promise<TelemetryData>;
async function writeTelemetry(data: TelemetryData): Promise<void>;
async function logEvent(event: TelemetryEvent): Promise<void>;
```

**Requirements Validated**: 6, 11

---

### 5. Background Reasoning (`src/mcp/background/`)

#### 5.1 State Sync (`state-sync.ts`)

**Purpose**: Continuous telemetry streaming to IDE clients

**Interface**:

```typescript
interface StateSyncConfig {
  interval: number; // milliseconds
  enabled: boolean;
}

class StateSync {
  private interval: NodeJS.Timeout | null;
  private clients: Set<string>;

  start(config: StateSyncConfig): void;
  stop(): void;
  addClient(clientId: string): void;
  removeClient(clientId: string): void;
  private async pushUpdate(): Promise<void>;
}
```

**Requirements Validated**: 6

---

#### 5.2 Error Interceptor (`error-interceptor.ts`)

**Purpose**: Real-time error analysis and root cause reporting

**Interface**:

```typescript
interface ErrorAnalysis {
  originalError: string;
  rootCause: string;
  category: 'environment' | 'spec' | 'dependency' | 'network' | 'unknown';
  remediation: string[];
  suggestedTool?: 'validate_environment' | 'trigger_ralph_loop';
}

class ErrorInterceptor {
  analyze(error: Error | string): ErrorAnalysis;
  private detectRootCause(error: string): string;
  private categorizeError(error: string): string;
  private generateRemediation(category: string, rootCause: string): string[];
}
```

**Requirements Validated**: 7

---

### 6. CLI Adapter (`src/mcp/cli.ts`)

**Purpose**: Command-line binary for terminal workflows

**Interface**:

```typescript
#!/usr/bin/env node

interface CLIOptions {
  config?: boolean;
  test?: boolean;
  version?: boolean;
}

async function main(options: CLIOptions): Promise<void>;
```

**Commands**:

- `npx ag-os-mcp` - Start MCP server in stdio mode
- `npx ag-os-mcp --config` - Output MCP configuration JSON
- `npx ag-os-mcp --test` - Run connectivity test
- `npx ag-os-mcp --version` - Show version

**Requirements Validated**: 9, 14

---

### 7. MCP Config Generator (`src/mcp/config-generator.ts`)

**Purpose**: Generates IDE-specific MCP configuration

**Interface**:

```typescript
type IDEType = 'cursor' | 'windsurf' | 'claude-desktop' | 'generic';

interface MCPConfig {
  mcpServers: {
    'antigravity-os': {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

function generateConfig(ide: IDEType): MCPConfig;
```

**Example Output** (Cursor):

```json
{
  "mcpServers": {
    "antigravity-os": {
      "command": "npx",
      "args": ["ag-os-mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Requirements Validated**: 8, 14

---

### 8. Observer Console (`src/app/observer/`)

**Purpose**: Dashboard transformation for real-time visualization

**Components**:

#### 8.1 Connection Status (`ConnectionStatus.tsx`)

```typescript
interface ConnectionStatusProps {
  connected: boolean;
  clientName?: string;
  clientVersion?: string;
}

export function ConnectionStatus(props: ConnectionStatusProps): JSX.Element;
```

#### 8.2 Tool Activity Monitor (`ToolActivityMonitor.tsx`)

```typescript
interface ToolInvocation {
  id: string;
  tool: string;
  timestamp: string;
  status: 'pending' | 'success' | 'error';
  executionTime?: number;
  result?: unknown;
}

interface ToolActivityMonitorProps {
  invocations: ToolInvocation[];
}

export function ToolActivityMonitor(props: ToolActivityMonitorProps): JSX.Element;
```

#### 8.3 Neon Pulse Animation (`NeonPulse.tsx`)

```typescript
interface NeonPulseProps {
  active: boolean;
  color: 'blue' | 'green' | 'red' | 'yellow';
  intensity: number; // 0-100
}

export function NeonPulse(props: NeonPulseProps): JSX.Element;
```

#### 8.4 MCP Config Display (`MCPConfigDisplay.tsx`)

```typescript
interface MCPConfigDisplayProps {
  ide: IDEType;
  config: MCPConfig;
}

export function MCPConfigDisplay(props: MCPConfigDisplayProps): JSX.Element;
```

**Requirements Validated**: 10

---

## Data Models

### MCP Tool Definition

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (args: unknown) => Promise<unknown>;
}

type JSONSchema = {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
};

type JSONSchemaProperty = {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
};
```

### JSON-RPC Message Types

```typescript
// Request
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

// Success Response
interface JSONRPCSuccessResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: unknown;
}

// Error Response
interface JSONRPCErrorResponse {
  jsonrpc: '2.0';
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Notification
interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}
```

### Standard Error Codes

```typescript
enum JSONRPCErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerError = -32000,
  Unauthorized = -32001,
}
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: stdio Communication Exclusivity

_For any_ MCP server instance, all communication SHALL occur exclusively via stdin/stdout, with no output to other channels (stderr for errors only).
**Validates: Requirements 1.2**

### Property 2: MCP Handshake Completion

_For any_ IDE client connection, the initialize handshake SHALL complete successfully and return server capabilities.
**Validates: Requirements 1.3**

### Property 3: Tool List Completeness

_For any_ tools/list request, the response SHALL include all four anti-hallucination tools (get_system_context, validate_environment, sovereign_execute, trigger_ralph_loop) with valid JSON Schema definitions.
**Validates: Requirements 1.4**

### Property 4: Parameter Validation Rejection

_For any_ tool invocation with invalid parameters, the server SHALL reject the request with error code -32602 (Invalid params).
**Validates: Requirements 1.5**

### Property 5: Error Code Compliance

_For any_ error condition, the server SHALL return a JSON-RPC error code in the standard range (-32700 to -32603) or custom range (-32000 to -32099).
**Validates: Requirements 1.6**

### Property 6: System Context Completeness

_For any_ get_system_context invocation, the response SHALL include all required fields: cpu, memory, disk, docker, ports, and environment information.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 7: Environment Validation Completeness

_For any_ validate_environment invocation with multiple dependency types (commands, packages, files, ports), the response SHALL include validation results for each dependency.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 8: Missing Dependency Suggestions

_For any_ validate_environment invocation where dependencies are missing, the response SHALL include installation suggestions for each missing dependency.
**Validates: Requirements 3.6**

### Property 9: Constitutional Validation Enforcement

_For any_ sovereign_execute invocation, the command SHALL be validated against all 13 Articles of the Constitution before execution.
**Validates: Requirements 4.1, 12.1**

### Property 10: Destructive Operation Detection

_For any_ sovereign_execute invocation with destructive commands (rm -rf, DROP TABLE, docker rmi), the system SHALL detect the operation and require confirmDestructive flag.
**Validates: Requirements 4.2, 12.2**

### Property 11: Docker Whitelist Enforcement

_For any_ Docker operation via sovereign_execute, only images with whitelisted prefixes (antigravity, test-, dev-) SHALL be allowed.
**Validates: Requirements 4.3, 12.3**

### Property 12: Command Output Capture

_For any_ sovereign_execute invocation, the response SHALL include stdout, stderr, and exitCode fields.
**Validates: Requirements 4.4**

### Property 13: Execution Telemetry Logging

_For any_ tool invocation, the Telemetry_System SHALL record an event with tool name, parameters, result, and timestamp.
**Validates: Requirements 4.5, 12.5**

### Property 14: Constitutional Violation Rejection

_For any_ sovereign_execute invocation that violates constitutional rules, the system SHALL reject it with a detailed explanation of the violation.
**Validates: Requirements 4.6**

### Property 15: Ralph-Loop Error Analysis

_For any_ trigger_ralph_loop invocation with error context, the system SHALL analyze the error and return analysis including errorType and rootCause.
**Validates: Requirements 5.1**

### Property 16: Spec Violation Correction

_For any_ trigger_ralph_loop invocation that identifies a spec violation, the system SHALL generate a correction plan.
**Validates: Requirements 5.2**

### Property 17: Spec File Updates

_For any_ trigger_ralph_loop correction that is applied, the relevant spec file SHALL be updated with the correction.
**Validates: Requirements 5.3**

### Property 18: Correction Plan Response

_For any_ successful trigger_ralph_loop invocation, the response SHALL include the correction plan and list of updated files.
**Validates: Requirements 5.4**

### Property 19: Telemetry Update Push

_For any_ telemetry data change, the system SHALL push updates to all connected IDE clients.
**Validates: Requirements 6.2**

### Property 20: State Sync Completeness

_For any_ state sync request, the response SHALL include the complete current telemetry snapshot.
**Validates: Requirements 6.3**

### Property 21: Telemetry File Change Detection

_For any_ modification to the telemetry.json file, the system SHALL detect the change and push updates to connected clients.
**Validates: Requirements 6.5**

### Property 22: Streaming Pause Without Clients

_For any_ state where no IDE clients are connected, the telemetry streaming SHALL be paused.
**Validates: Requirements 6.6**

### Property 23: Error Analysis Execution

_For any_ command failure via sovereign_execute, the error interceptor SHALL analyze the error message and return root cause analysis.
**Validates: Requirements 7.1, 7.2**

### Property 24: Error Remediation Suggestions

_For any_ analyzed error with a known solution, the response SHALL include remediation steps.
**Validates: Requirements 7.3**

### Property 25: Tool Suggestion for Error Categories

_For any_ environment-related error, the system SHALL suggest validate_environment; for spec-related errors, the system SHALL suggest trigger_ralph_loop.
**Validates: Requirements 7.4, 7.5**

### Property 26: Novel Error Logging

_For any_ error that is not recognized, the system SHALL log it to the memory graph for future learning.
**Validates: Requirements 7.6**

### Property 27: IDE Config Generation Completeness

_For any_ IDE type (Cursor, Windsurf, Claude Desktop), the generated configuration SHALL include the correct stdio command and all available tools.
**Validates: Requirements 8.4, 8.5**

### Property 28: CLI stdio Communication

_For any_ CLI invocation piped to another process, the MCP server SHALL communicate exclusively via stdin/stdout.
**Validates: Requirements 9.4**

### Property 29: HTTP and MCP Function Reuse

_For any_ system function, both HTTP API routes and MCP tools SHALL invoke the same underlying pure function.
**Validates: Requirements 11.2, 11.3**

### Property 30: Sensitive Directory Protection

_For any_ file operation via sovereign_execute targeting sensitive directories (.git, node_modules, .env), the system SHALL reject the operation.
**Validates: Requirements 12.4**

### Property 31: Unauthorized Operation Rejection

_For any_ unauthorized operation, the system SHALL reject it with error code -32001 (Unauthorized).
**Validates: Requirements 12.6**

### Property 32: Exception Handling

_For any_ tool invocation that throws an exception, the system SHALL catch it and return a structured JSON-RPC error response.
**Validates: Requirements 13.1**

### Property 33: Tool Timeout Handling

_For any_ tool invocation that exceeds 30 seconds, the system SHALL return error code -32000 (Server Error) with a timeout message.
**Validates: Requirements 13.5**

### Property 34: Configuration Loading

_For any_ server startup, the system SHALL read configuration from .env file or environment variables.
**Validates: Requirements 14.2**

### Property 35: Development vs Production Modes

_For any_ deployment mode (development or production), the system SHALL adjust logging behavior accordingly (verbose in dev, silent in prod).
**Validates: Requirements 14.4**

### Property 36: Dependency Validation on Startup

_For any_ server startup, the system SHALL validate that @modelcontextprotocol/sdk is installed and fail gracefully if missing.
**Validates: Requirements 14.6**

---

## Error Handling

### Error Categories

**1. Protocol Errors** (JSON-RPC)

- Parse Error (-32700): Invalid JSON syntax
- Invalid Request (-32600): Malformed JSON-RPC request
- Method Not Found (-32601): Unknown tool name
- Invalid Params (-32602): Parameters don't match schema
- Internal Error (-32603): Server-side exception

**2. Application Errors** (Custom)

- Server Error (-32000): General server error, timeouts
- Unauthorized (-32001): Constitutional violation, unauthorized operation

### Error Response Format

```typescript
interface ErrorResponse {
  jsonrpc: '2.0';
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: {
      details?: string;
      violations?: string[];
      remediation?: string[];
      category?: string;
    };
  };
}
```

### Error Handling Strategy

**1. Graceful Degradation**

- Docker unavailable → Return partial system context with availability flags
- Telemetry corrupted → Return baseline metrics, log warning
- Network timeout → Return timeout error, don't crash

**2. Error Interception**

- All errors analyzed for root cause
- Known errors include remediation steps
- Novel errors logged to memory graph

**3. Constitutional Violations**

- Detailed explanation of which article was violated
- Suggestion for how to fix the command
- Logged to telemetry for audit trail

**4. Retry Logic**

- Ralph-Loop: 3 attempts maximum
- Network operations: 2 retries with exponential backoff
- File operations: No retries (fail fast)

---

## Testing Strategy

### Dual Testing Approach

The AS-MCP system requires both **unit tests** and **property-based tests** for comprehensive coverage:

**Unit Tests** (Vitest):

- Specific examples of tool invocations
- Edge cases (Docker unavailable, corrupted telemetry)
- Integration points (HTTP routes calling pure functions)
- CLI command behavior
- Error conditions with specific inputs

**Property-Based Tests** (fast-check):

- Universal properties across all inputs
- Tool parameter validation with random invalid inputs
- Constitutional validation with random commands
- Error code compliance with random error conditions
- Minimum 100 iterations per property test

### Property Test Configuration

All property tests MUST:

1. Run minimum 100 iterations
2. Reference the design property number
3. Use tag format: `**Feature: mcp-server-transformation, Property {N}: {property_text}**`
4. Test universal correctness, not specific examples

### Test Coverage Requirements

- **Minimum 80% code coverage** across all modules
- **100% coverage** for constitutional validator
- **100% coverage** for error interceptor
- **All 36 properties** implemented as property-based tests
- **All edge cases** covered by unit tests

### Testing Tools

**Property-Based Testing**:

```typescript
import fc from 'fast-check';

// Example property test
test('Property 4: Parameter Validation Rejection', () => {
  fc.assert(
    fc.property(
      fc.record({
        tool: fc.constantFrom('get_system_context', 'validate_environment'),
        params: fc.object(), // Random invalid params
      }),
      async ({ tool, params }) => {
        const result = await mcpServer.callTool(tool, params);
        expect(result.error.code).toBe(-32602);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Unit Testing**:

```typescript
import { describe, it, expect } from 'vitest';

// Example unit test
describe('get_system_context', () => {
  it('should return Docker unavailable when Docker is not running', async () => {
    // Mock Docker unavailable
    const result = await getSystemContext();
    expect(result.docker.available).toBe(false);
  });
});
```

### Integration Testing

**MCP Client Simulation**:

- Simulate Cursor, Windsurf, Claude Desktop connections
- Test full request/response cycle
- Verify stdio communication
- Test handshake protocol

**CLI Testing**:

- Test all CLI commands (--config, --test, --version)
- Test piping to other processes
- Test signal handling (SIGTERM)

**Observer Console Testing**:

- Test real-time updates
- Test connection status display
- Test MCP config generation
- Test neon pulse animations (visual regression)

---

## Implementation Notes

### MCP SDK Integration

**Installation**:

```bash
npm install @modelcontextprotocol/sdk
```

**Server Initialization**:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'antigravity-os',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Tool Registration**:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_system_context',
      description: 'Returns real-time system state',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    // ... other tools
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_system_context':
      return { content: [{ type: 'text', text: JSON.stringify(await getSystemContext()) }] };
    // ... other tools
  }
});
```

### Constitutional Validator Implementation

**13 Articles Enforcement**:

```typescript
const CONSTITUTIONAL_RULES = [
  {
    article: 1,
    rule: 'Memory-First Development',
    check: (cmd: string) => !cmd.includes('--skip-memory'),
  },
  {
    article: 3,
    rule: 'B.L.A.S.T. Recovery Protocol',
    check: (cmd: string) => !cmd.includes('--no-recovery'),
  },
  // ... other articles
];

function validateConstitutional(command: string): ConstitutionalViolation[] {
  return CONSTITUTIONAL_RULES.filter((rule) => !rule.check(command)).map((rule) => ({
    article: rule.article,
    rule: rule.rule,
    severity: 'error',
    message: `Command violates Article ${rule.article}: ${rule.rule}`,
  }));
}
```

### Observer Console Real-Time Updates

**WebSocket Connection** (for real-time updates):

```typescript
// Server-side
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3002 });

wss.on('connection', (ws) => {
  // Send initial state
  ws.send(JSON.stringify({ type: 'init', data: getCurrentState() }));

  // Subscribe to updates
  subscribeToUpdates((update) => {
    ws.send(JSON.stringify({ type: 'update', data: update }));
  });
});

// Client-side (Observer Console)
const ws = new WebSocket('ws://localhost:3002');

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);

  if (type === 'tool_invocation') {
    triggerNeonPulse(data.tool);
  }
};
```

### Deployment Configuration

**package.json Scripts**:

```json
{
  "scripts": {
    "mcp:start": "node dist/mcp/server.js",
    "mcp:dev": "NODE_ENV=development tsx src/mcp/server.ts",
    "mcp:test": "node dist/mcp/cli.js --test"
  },
  "bin": {
    "ag-os-mcp": "./dist/mcp/cli.js"
  }
}
```

**Environment Variables**:

```bash
# .env
NODE_ENV=production
MCP_LOG_LEVEL=silent
TELEMETRY_PATH=./docs/telemetry.json
DOCKER_WHITELIST=antigravity,test-,dev-
RALPH_LOOP_MAX_ATTEMPTS=3
TOOL_TIMEOUT=30000
```

---

## Security Considerations

### Input Validation

- All tool parameters validated against JSON Schema
- Command injection prevention in sovereign_execute
- Path traversal prevention in file operations
- SQL injection prevention (if database operations added)

### Docker Security

- Whitelist enforcement for all image operations
- No privileged container operations
- Volume mount restrictions
- Network isolation for containers

### File System Security

- Sensitive directory protection (.git, node_modules, .env)
- Read-only access for system context
- Write access only for spec files in .kiro/specs/
- No access to parent directories (../)

### Telemetry Privacy

- No PII logged to telemetry
- Command parameters sanitized before logging
- Error messages sanitized to remove sensitive paths
- Telemetry file permissions restricted (600)

---

## Performance Considerations

### Optimization Strategies

**1. Lazy Loading**

- Load Docker info only when requested
- Load telemetry only when needed
- Cache system info for 5 seconds

**2. Streaming**

- Stream large command outputs
- Stream telemetry updates (don't poll)
- Use WebSocket for real-time updates

**3. Caching**

- Cache system context for 5 seconds
- Cache Docker info for 10 seconds
- Cache environment validation for 30 seconds

**4. Async Operations**

- All I/O operations async
- Parallel execution where possible
- Non-blocking stdio communication

### Performance Targets

- Tool invocation latency: <100ms (excluding command execution)
- System context retrieval: <50ms
- Environment validation: <200ms
- Ralph-Loop analysis: <500ms
- Telemetry update push: <10ms

---

## Monitoring and Observability

### Metrics to Track

**MCP Server Metrics**:

- Tool invocation count (per tool)
- Tool invocation latency (p50, p95, p99)
- Error rate (per error code)
- Active client connections
- Telemetry update frequency

**Ralph-Loop Metrics**:

- Activation count
- Success rate
- Exhaustion rate
- Average attempts per correction
- Spec update frequency

**System Metrics**:

- CPU usage
- Memory usage
- Disk usage
- Docker container count
- Active port count

### Logging Strategy

**Development Mode**:

- Verbose logging to stderr
- All tool invocations logged
- All errors logged with stack traces
- Performance metrics logged

**Production Mode**:

- Silent mode (no stdout/stderr except JSON-RPC)
- Errors logged to file
- Metrics logged to telemetry
- Critical errors only to stderr

---

## Future Enhancements

### Phase 2: Advanced Tools

- `analyze_codebase`: Static analysis tool
- `generate_tests`: Auto-generate property tests
- `optimize_performance`: Performance profiling tool
- `security_audit`: Security vulnerability scanner

### Phase 3: Multi-Agent Coordination

- Multiple MCP servers working together
- Agent-to-agent communication
- Distributed Ralph-Loop
- Consensus-based decision making

### Phase 4: Learning and Adaptation

- Machine learning for error prediction
- Adaptive constitutional rules
- Self-optimizing performance
- Automated spec generation from code

---

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/index) - Official MCP spec
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - Official SDK
- [Building stdio MCP Servers](https://mcpcat.io/guides/building-stdio-mcp-server/) - Implementation guide
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification) - Protocol foundation
- [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/json-schema-core.html) - Schema validation

_Content was rephrased for compliance with licensing restrictions_

---

**Design Status**: ✅ COMPLETE  
**Next Step**: Task Creation  
**Last Updated**: 2026-01-19
