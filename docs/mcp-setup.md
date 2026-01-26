# Antigravity OS MCP Server Setup Guide

## Overview

The Antigravity OS MCP (Model Context Protocol) Server provides anti-hallucination tools to AI agents across any IDE. This guide covers installation, configuration, and troubleshooting.

## Installation

### Prerequisites

- Node.js 18+ and npm
- Docker (optional, for Docker-related tools)
- Git

### Install via npm

```bash
npm install -g antigravity-os
```

### Build from source

```bash
git clone https://github.com/your-org/antigravity-os.git
cd antigravity-os
npm install
npm run mcp:build
```

## IDE Configuration

### Cursor

1. Open Cursor settings (Cmd/Ctrl + ,)
2. Navigate to "MCP Servers"
3. Add new server configuration:

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

4. Restart Cursor

### Windsurf

1. Open Windsurf settings
2. Navigate to Extensions → MCP
3. Add server configuration:

```json
{
  "antigravity-os": {
    "command": "npx ag-os-mcp",
    "type": "stdio"
  }
}
```

4. Reload window

### Claude Desktop

1. Open `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
2. Add configuration:

```json
{
  "mcpServers": {
    "antigravity-os": {
      "command": "npx",
      "args": ["ag-os-mcp"]
    }
  }
}
```

3. Restart Claude Desktop

## CLI Usage

### Start MCP Server

```bash
# Start in stdio mode (default)
npx ag-os-mcp

# Or use the installed binary
ag-os-mcp
```

### Generate IDE Configuration

```bash
# Generate config for specific IDE
npx ag-os-mcp --config cursor
npx ag-os-mcp --config windsurf
npx ag-os-mcp --config claude-desktop

# Output to file
npx ag-os-mcp --config cursor > cursor-config.json
```

### Test Connection

```bash
# Run connectivity test
npx ag-os-mcp --test
```

### Show Version

```bash
npx ag-os-mcp --version
```

## Available Tools

### 1. get_system_context

Retrieves complete system state including CPU, memory, disk, Docker containers, and environment info.

**Use case**: Before executing commands, check system resources and Docker availability.

### 2. validate_environment

Validates that required dependencies (commands, npm packages, files, ports) are available.

**Use case**: Verify environment before starting development or deployment.

### 3. sovereign_execute

Executes shell commands with constitutional validation (13 Articles of safe execution).

**Use case**: Run commands safely with automatic validation against destructive operations.

### 4. trigger_ralph_loop

Triggers the Ralph-Loop self-healing engine for error analysis and correction.

**Use case**: Analyze test failures and generate correction plans.

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# Node Environment
NODE_ENV=development

# MCP Server
MCP_LOG_LEVEL=info

# Telemetry
TELEMETRY_PATH=docs/telemetry.json

# Docker Whitelist
DOCKER_WHITELIST=antigravity,test-,dev-

# Ralph-Loop
RALPH_LOOP_MAX_ATTEMPTS=3

# Tool Timeout
TOOL_TIMEOUT=30000
```

## Troubleshooting

### Server won't start

**Problem**: `Error: Cannot find module '@modelcontextprotocol/sdk'`

**Solution**: Install dependencies:

```bash
npm install
```

### IDE doesn't detect server

**Problem**: Server not showing in IDE's MCP server list

**Solution**:

1. Verify configuration JSON is valid
2. Check server path is correct
3. Restart IDE completely
4. Check IDE logs for errors

### Tools not working

**Problem**: Tool invocations fail or timeout

**Solution**:

1. Check Docker is running (for Docker tools)
2. Verify file permissions
3. Increase `TOOL_TIMEOUT` in `.env`
4. Check logs: `tail -f docs/telemetry.json`

### Connection drops

**Problem**: MCP server disconnects frequently

**Solution**:

1. Check system resources (CPU/memory)
2. Disable other MCP servers temporarily
3. Restart IDE
4. Check for conflicting processes on stdio

## Observer Console

Access the real-time monitoring dashboard:

```bash
# Start Next.js dev server
npm run dev

# Open browser
open http://localhost:3001/observer
```

Features:

- Real-time tool invocation monitoring
- Connection status indicator
- Neon pulse animations on tool calls
- MCP configuration display
- Success rate metrics

## Support

- Documentation: https://github.com/your-org/antigravity-os/docs
- Issues: https://github.com/your-org/antigravity-os/issues
- Discord: https://discord.gg/antigravity-os

## Next Steps

- Read [Tool Usage Examples](./mcp-examples.md)
- Explore [API Documentation](./schemas/api-schema.json)
- Join the community on Discord
