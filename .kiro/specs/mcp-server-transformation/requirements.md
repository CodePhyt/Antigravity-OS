# Requirements Document: Universal Sovereign MCP Engine (AS-MCP)

## Introduction

This specification defines the transformation of Antigravity OS from a visual-only dashboard into a **Universal Sovereign MCP Engine** - a background service that acts as the Source of Truth for any AI Agent (Cursor, Windsurf, Claude Desktop, CLI agents). The system will expose an "anti-hallucination" toolset that prevents AI agents from guessing environment state, validates dependencies before execution, and provides autonomous self-healing capabilities. The MCP server will communicate via Standard I/O (stdio) for universal compatibility, while the dashboard transforms into an **Observer Console** that visualizes real-time AI agent interactions.

## Glossary

- **MCP (Model Context Protocol)**: A standardized protocol for LLM-tool communication using JSON-RPC over Standard I/O
- **AS-MCP (Antigravity Sovereign MCP)**: The universal MCP server implementation for Antigravity OS
- **MCP_SDK**: The official @modelcontextprotocol/sdk library used for server implementation
- **Anti_Hallucination_Toolset**: Collection of tools that provide ground truth about system state
- **CLI_Adapter**: Command-line interface wrapper (ag-os-mcp) for terminal workflows
- **Ralph_Loop**: The autonomous self-healing engine that corrects errors and updates specs
- **Infrastructure_Service**: Docker containers, ports, and system resources managed by Antigravity OS
- **Telemetry_System**: Metrics collection and reporting system tracking system health
- **Tool**: An MCP-exposed function that LLMs can invoke (e.g., get_system_context, sovereign_execute)
- **JSON-RPC**: Remote procedure call protocol encoded in JSON format
- **Standard_I/O (stdio)**: Communication channel using stdin/stdout for universal IDE compatibility
- **IDE_Client**: Development environment (Cursor/Windsurf/Claude Desktop) that connects via MCP
- **Observer_Console**: Dashboard UI that visualizes real-time AI agent interactions with the MCP server
- **Sovereign_Execute**: Constitutional command wrapper that validates against system rules before execution
- **State_Sync**: Continuous telemetry streaming into LLM context windows
- **Error_Interception**: Real-time error analysis and root cause reporting
- **MCP_Config_Generator**: Tool that generates IDE-specific configuration JSON

## Requirements

### Requirement 1: MCP Server Foundation (SDK Implementation)

**User Story:** As an AI agent developer, I want the MCP server built on the official SDK, so that it maintains compatibility with all MCP-compliant clients.

#### Acceptance Criteria

1. WHEN the AS-MCP server initializes, THE AS-MCP SHALL use @modelcontextprotocol/sdk as the foundation
2. WHEN the AS-MCP server starts, THE AS-MCP SHALL communicate exclusively via Standard_I/O (stdin/stdout)
3. WHEN an IDE_Client connects, THE AS-MCP SHALL complete the MCP initialize handshake protocol
4. WHEN the AS-MCP server receives a tools/list request, THE AS-MCP SHALL return all tools with complete JSON Schema definitions
5. WHEN the AS-MCP server receives a tools/call request, THE AS-MCP SHALL validate parameters against the tool schema
6. WHEN the AS-MCP server encounters an error, THE AS-MCP SHALL use standard JSON-RPC error codes (-32700 to -32603)

### Requirement 2: Anti-Hallucination Tool - System Context

**User Story:** As an AI agent, I want to get real-time system state, so that I never guess or hallucinate environment conditions.

#### Acceptance Criteria

1. WHEN get_system_context is invoked, THE AS-MCP SHALL return CPU usage, memory usage, and disk space
2. WHEN get_system_context is invoked, THE AS-MCP SHALL return Docker daemon status and running containers
3. WHEN get_system_context is invoked, THE AS-MCP SHALL return active network ports and their bindings
4. WHEN get_system_context is invoked, THE AS-MCP SHALL return Node.js version and npm version
5. WHEN get_system_context is invoked, THE AS-MCP SHALL return the current working directory and Git branch
6. WHEN system resources are unavailable, THE AS-MCP SHALL return partial context with availability flags

### Requirement 3: Anti-Hallucination Tool - Environment Validation

**User Story:** As an AI agent, I want to validate dependencies before executing tasks, so that I prevent "command not found" errors.

#### Acceptance Criteria

1. WHEN validate_environment is invoked with a command name, THE AS-MCP SHALL check if the command exists in PATH
2. WHEN validate_environment is invoked with a package name, THE AS-MCP SHALL check if the npm package is installed
3. WHEN validate_environment is invoked with a file path, THE AS-MCP SHALL verify the file exists and is accessible
4. WHEN validate_environment is invoked with a port number, THE AS-MCP SHALL check if the port is available
5. WHEN validate_environment is invoked with multiple dependencies, THE AS-MCP SHALL return validation status for each
6. WHEN a dependency is missing, THE AS-MCP SHALL suggest installation commands

### Requirement 4: Anti-Hallucination Tool - Sovereign Execute

**User Story:** As an AI agent, I want to execute commands through a constitutional wrapper, so that all operations are validated against system rules.

#### Acceptance Criteria

1. WHEN sovereign_execute is invoked with a command, THE AS-MCP SHALL validate it against the 13 Articles of the Constitution
2. WHEN sovereign_execute validates a command, THE AS-MCP SHALL check for destructive operations (rm -rf, DROP TABLE)
3. WHEN sovereign_execute validates a command, THE AS-MCP SHALL enforce Docker image whitelist for container operations
4. WHEN sovereign_execute executes a command, THE AS-MCP SHALL capture stdout, stderr, and exit code
5. WHEN sovereign_execute completes, THE AS-MCP SHALL log the command, result, and validation status to Telemetry_System
6. WHEN a command violates constitutional rules, THE AS-MCP SHALL reject it with a detailed explanation

### Requirement 5: Anti-Hallucination Tool - Ralph-Loop Trigger

**User Story:** As an AI agent, I want to trigger autonomous self-healing, so that I can recover from environment drift without manual intervention.

#### Acceptance Criteria

1. WHEN trigger_ralph_loop is invoked with an error context, THE AS-MCP SHALL analyze the error against specs
2. WHEN trigger_ralph_loop identifies a spec violation, THE AS-MCP SHALL generate a correction plan
3. WHEN trigger_ralph_loop applies a correction, THE AS-MCP SHALL update the relevant spec file
4. WHEN trigger_ralph_loop completes successfully, THE AS-MCP SHALL return the correction plan and updated files
5. WHEN trigger_ralph_loop exhausts 3 attempts, THE AS-MCP SHALL return exhaustion status with diagnostic information
6. WHEN trigger_ralph_loop is invoked without error context, THE AS-MCP SHALL perform a general system health check

### Requirement 6: Background Reasoning - State Sync

**User Story:** As an AI agent, I want continuous telemetry streaming, so that my context window always reflects current system state.

#### Acceptance Criteria

1. WHEN the AS-MCP server starts, THE AS-MCP SHALL establish a telemetry streaming channel
2. WHEN telemetry data updates, THE AS-MCP SHALL push the update to connected IDE_Clients
3. WHEN an IDE_Client requests state sync, THE AS-MCP SHALL return the complete current telemetry snapshot
4. WHEN telemetry streaming is active, THE AS-MCP SHALL update metrics every 5 seconds
5. WHEN the Telemetry_System file changes, THE AS-MCP SHALL detect the change and push updates
6. WHEN no IDE_Clients are connected, THE AS-MCP SHALL pause streaming to conserve resources

### Requirement 7: Background Reasoning - Error Interception

**User Story:** As an AI agent, I want real-time error analysis, so that I receive root causes instead of generic error messages.

#### Acceptance Criteria

1. WHEN a command fails via sovereign_execute, THE AS-MCP SHALL analyze the error message
2. WHEN an error is analyzed, THE AS-MCP SHALL identify the root cause (e.g., "Docker socket not found")
3. WHEN an error has a known solution, THE AS-MCP SHALL include remediation steps in the response
4. WHEN an error is environment-related, THE AS-MCP SHALL suggest running validate_environment
5. WHEN an error is spec-related, THE AS-MCP SHALL suggest running trigger_ralph_loop
6. WHEN an error is novel, THE AS-MCP SHALL log it to the memory graph for future learning

### Requirement 8: Cross-Platform Adaptability - IDE Configuration

**User Story:** As a developer, I want automatic configuration generation for my IDE, so that I can connect any MCP-compatible client to Antigravity OS.

#### Acceptance Criteria

1. WHEN the MCP_Config_Generator is invoked for Cursor, THE AS-MCP SHALL generate Cursor-specific MCP configuration JSON
2. WHEN the MCP_Config_Generator is invoked for Windsurf, THE AS-MCP SHALL generate Windsurf-specific MCP configuration JSON
3. WHEN the MCP_Config_Generator is invoked for Claude Desktop, THE AS-MCP SHALL generate Claude Desktop MCP configuration JSON
4. WHEN configuration is generated, THE AS-MCP SHALL include the correct stdio command for the platform
5. WHEN configuration is generated, THE AS-MCP SHALL include all available tools with descriptions
6. WHEN configuration is displayed in the Observer_Console, THE AS-MCP SHALL provide copy-to-clipboard functionality

### Requirement 9: Cross-Platform Adaptability - CLI Binary

**User Story:** As a developer, I want a CLI binary for terminal workflows, so that I can pipe Antigravity OS into any command-line process.

#### Acceptance Criteria

1. WHEN "npx ag-os-mcp" is executed, THE CLI_Adapter SHALL start the MCP server in stdio mode
2. WHEN "npx ag-os-mcp --config" is executed, THE CLI_Adapter SHALL output the MCP configuration JSON
3. WHEN "npx ag-os-mcp --test" is executed, THE CLI_Adapter SHALL run a connectivity test
4. WHEN the CLI_Adapter is piped to another process, THE AS-MCP SHALL communicate via stdin/stdout
5. WHEN the CLI_Adapter receives SIGTERM, THE AS-MCP SHALL shut down gracefully
6. WHEN the CLI_Adapter is installed globally, THE AS-MCP SHALL be accessible from any directory

### Requirement 10: Observer Console - Real-Time Visualization

**User Story:** As a system administrator, I want to see AI agent interactions in real-time, so that I can monitor what external agents are doing.

#### Acceptance Criteria

1. WHEN an IDE_Client connects, THE Observer_Console SHALL display a connection indicator with client name
2. WHEN a tool is invoked, THE Observer_Console SHALL show a neon pulse animation on the corresponding tool card
3. WHEN a tool completes, THE Observer_Console SHALL display the result and execution time
4. WHEN an error occurs, THE Observer_Console SHALL highlight the error with red pulsing
5. WHEN telemetry updates, THE Observer_Console SHALL update metrics in real-time without page refresh
6. WHEN no IDE_Clients are connected, THE Observer_Console SHALL display a "Waiting for Connection" state

### Requirement 11: Backend Modularization - Pure Functions

**User Story:** As a system architect, I want backend functions to be pure and reusable, so that they work seamlessly with both HTTP and MCP interfaces.

#### Acceptance Criteria

1. WHEN a system function is implemented, THE Infrastructure_Service SHALL expose it as a pure function with no side effects in the signature
2. WHEN an HTTP API route is called, THE Infrastructure_Service SHALL invoke the pure function and wrap the result in HTTP response
3. WHEN an MCP tool is called, THE AS-MCP SHALL invoke the same pure function and wrap the result in MCP response
4. WHEN backend functions are refactored, THE Infrastructure_Service SHALL maintain backward compatibility with existing API routes
5. WHEN a function requires I/O, THE Infrastructure_Service SHALL use dependency injection for testability
6. WHEN functions are documented, THE Infrastructure_Service SHALL include JSDoc with parameter types and return types

### Requirement 12: Security and Constitutional Validation

**User Story:** As a security engineer, I want all operations validated against constitutional rules, so that the system remains secure and auditable.

#### Acceptance Criteria

1. WHEN sovereign_execute validates a command, THE AS-MCP SHALL check against the 13 Articles of the Constitution
2. WHEN a destructive operation is detected, THE AS-MCP SHALL require explicit confirmation flag
3. WHEN Docker operations are requested, THE AS-MCP SHALL enforce the image whitelist (antigravity, test-, dev-)
4. WHEN file operations are requested, THE AS-MCP SHALL prevent access to sensitive directories (.git, node_modules, .env)
5. WHEN all tool invocations are logged, THE Telemetry_System SHALL record tool name, parameters, result, and timestamp
6. WHEN an unauthorized operation is attempted, THE AS-MCP SHALL reject it with error code -32001 (Unauthorized)

### Requirement 13: Error Handling and Resilience

**User Story:** As a system operator, I want the MCP server to handle errors gracefully, so that it never crashes and always provides useful feedback.

#### Acceptance Criteria

1. WHEN a tool invocation throws an exception, THE AS-MCP SHALL catch it and return a structured JSON-RPC error
2. WHEN Docker is unavailable, THE AS-MCP SHALL return partial system context with Docker status marked as unavailable
3. WHEN the Telemetry_System file is corrupted, THE AS-MCP SHALL return baseline metrics and log a warning
4. WHEN the AS-MCP encounters a fatal error, THE AS-MCP SHALL log the error to stderr and restart gracefully
5. WHEN a tool times out after 30 seconds, THE AS-MCP SHALL return error code -32000 (Server Error) with timeout message
6. WHEN the AS-MCP restarts, THE AS-MCP SHALL preserve connection state and notify connected IDE_Clients

### Requirement 14: Configuration and Deployment

**User Story:** As a developer, I want simple setup and deployment, so that I can start using the MCP server immediately.

#### Acceptance Criteria

1. WHEN "npm run mcp:start" is executed, THE AS-MCP SHALL start the MCP server in stdio mode
2. WHEN the AS-MCP starts, THE AS-MCP SHALL read configuration from .env file or environment variables
3. WHEN the Observer_Console displays documentation, THE AS-MCP SHALL show the exact MCP configuration for each IDE
4. WHEN the AS-MCP is deployed, THE AS-MCP SHALL support both development (with logging) and production (silent) modes
5. WHEN the AS-MCP is installed via npm, THE CLI_Adapter SHALL be accessible via "npx ag-os-mcp"
6. WHEN the AS-MCP starts, THE AS-MCP SHALL validate that all required dependencies (@modelcontextprotocol/sdk) are installed
