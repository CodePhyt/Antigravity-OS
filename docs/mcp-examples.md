# Antigravity OS MCP Tool Usage Examples

## Overview

This guide provides practical examples of using each MCP tool provided by Antigravity OS.

## 1. get_system_context

Retrieves complete system state including CPU, memory, disk, Docker, and environment information.

### Example 1: Check System Resources

**Prompt to AI**:

```
Before we start the deployment, can you check the system resources?
```

**Tool Invocation**:

```json
{
  "tool": "get_system_context",
  "arguments": {}
}
```

**Response**:

```json
{
  "cpu": {
    "model": "Intel Core i7-9750H",
    "cores": 12,
    "usage": 45.2
  },
  "memory": {
    "total": "16 GB",
    "used": "8.5 GB",
    "free": "7.5 GB",
    "usagePercent": 53
  },
  "disk": {
    "total": "500 GB",
    "used": "320 GB",
    "free": "180 GB",
    "usagePercent": 64
  },
  "docker": {
    "available": true,
    "containers": [
      {
        "id": "abc123",
        "image": "postgres:14",
        "status": "running"
      }
    ],
    "images": [
      {
        "name": "postgres:14",
        "id": "def456",
        "size": "350MB"
      }
    ]
  },
  "environment": {
    "nodeVersion": "v18.17.0",
    "npmVersion": "9.6.7",
    "currentBranch": "main"
  }
}
```

### Example 2: Check Docker Availability

**Prompt to AI**:

```
Is Docker running? I need to start a database container.
```

**Tool Invocation**:

```json
{
  "tool": "get_system_context",
  "arguments": {}
}
```

**AI Response**:

```
Yes, Docker is available and running. You currently have 1 container running (postgres:14).
You have sufficient resources: 7.5 GB free memory and 180 GB free disk space.
```

## 2. validate_environment

Validates that required dependencies are available before executing tasks.

### Example 1: Validate Development Environment

**Prompt to AI**:

```
I want to start developing a React app. Can you check if I have everything installed?
```

**Tool Invocation**:

```json
{
  "tool": "validate_environment",
  "arguments": {
    "commands": ["node", "npm", "git"],
    "npmPackages": ["react", "typescript"],
    "files": ["package.json", "tsconfig.json"]
  }
}
```

**Response**:

```json
{
  "valid": false,
  "results": {
    "commands": {
      "node": { "available": true, "version": "v18.17.0" },
      "npm": { "available": true, "version": "9.6.7" },
      "git": { "available": true, "version": "2.40.0" }
    },
    "npmPackages": {
      "react": { "installed": false },
      "typescript": { "installed": true, "version": "5.0.4" }
    },
    "files": {
      "package.json": { "exists": true, "readable": true },
      "tsconfig.json": { "exists": true, "readable": true }
    }
  },
  "suggestions": ["Install missing npm package: npm install react"]
}
```

### Example 2: Validate Deployment Prerequisites

**Prompt to AI**:

```
Before deploying, verify that Docker and the required ports are available.
```

**Tool Invocation**:

```json
{
  "tool": "validate_environment",
  "arguments": {
    "commands": ["docker"],
    "ports": [3000, 5432, 6379]
  }
}
```

**Response**:

```json
{
  "valid": true,
  "results": {
    "commands": {
      "docker": { "available": true, "version": "24.0.2" }
    },
    "ports": {
      "3000": { "available": true },
      "5432": { "available": false, "inUse": true },
      "6379": { "available": true }
    }
  },
  "suggestions": ["Port 5432 is in use. Stop the process or use a different port."]
}
```

## 3. sovereign_execute

Executes shell commands with constitutional validation (13 Articles of safe execution).

### Example 1: Safe Command Execution

**Prompt to AI**:

```
Run the tests for me.
```

**Tool Invocation**:

```json
{
  "tool": "sovereign_execute",
  "arguments": {
    "command": "npm test",
    "timeout": 60000
  }
}
```

**Response**:

```json
{
  "success": true,
  "stdout": "✓ 42 tests passed\n",
  "stderr": "",
  "exitCode": 0,
  "executionTime": 3542
}
```

### Example 2: Blocked Destructive Command

**Prompt to AI**:

```
Delete all node_modules folders.
```

**Tool Invocation**:

```json
{
  "tool": "sovereign_execute",
  "arguments": {
    "command": "rm -rf node_modules"
  }
}
```

**Response**:

```json
{
  "success": false,
  "error": "Constitutional violation: Destructive operation detected",
  "violations": [
    {
      "article": "Article 2: No Destructive Operations",
      "reason": "Command contains 'rm -rf' which is destructive"
    }
  ]
}
```

### Example 3: Docker Command with Whitelist

**Prompt to AI**:

```
Start the test database container.
```

**Tool Invocation**:

```json
{
  "tool": "sovereign_execute",
  "arguments": {
    "command": "docker run -d --name test-db postgres:14"
  }
}
```

**Response**:

```json
{
  "success": true,
  "stdout": "abc123def456...\n",
  "stderr": "",
  "exitCode": 0,
  "executionTime": 1250
}
```

## 4. trigger_ralph_loop

Triggers the Ralph-Loop self-healing engine for error analysis and correction.

### Example 1: Analyze Test Failure

**Prompt to AI**:

```
The tests are failing. Can you analyze what's wrong?
```

**Tool Invocation**:

```json
{
  "tool": "trigger_ralph_loop",
  "arguments": {
    "mode": "analyze",
    "errorContext": {
      "taskId": "3.2",
      "errorMessage": "TypeError: Cannot read property 'length' of undefined",
      "stackTrace": "at validateInput (src/utils.ts:42:15)",
      "failedTest": "should validate user input"
    }
  }
}
```

**Response**:

```json
{
  "analysis": {
    "rootCause": "Missing null check before accessing array property",
    "category": "type_error",
    "severity": "medium",
    "affectedFiles": ["src/utils.ts"],
    "suggestedFix": "Add null/undefined check before accessing .length property"
  },
  "recommendations": [
    "Add input validation: if (!input || !Array.isArray(input)) return false;",
    "Update test to cover null/undefined cases",
    "Consider using TypeScript strict null checks"
  ]
}
```

### Example 2: Generate Correction Plan

**Prompt to AI**:

```
Generate a correction plan for this spec violation.
```

**Tool Invocation**:

```json
{
  "tool": "trigger_ralph_loop",
  "arguments": {
    "mode": "correct",
    "errorContext": {
      "taskId": "5.1",
      "errorMessage": "Property test failed: Input validation not working",
      "specPath": ".kiro/specs/user-auth/design.md",
      "property": "Property 3: Input Validation"
    }
  }
}
```

**Response**:

```json
{
  "correctionPlan": {
    "targetFile": "src/auth/validator.ts",
    "changes": [
      {
        "type": "add_validation",
        "location": "line 15",
        "code": "if (!email || typeof email !== 'string') throw new ValidationError('Invalid email');"
      },
      {
        "type": "update_test",
        "location": "tests/auth/validator.test.ts",
        "code": "expect(() => validate({ email: null })).toThrow(ValidationError);"
      }
    ],
    "estimatedImpact": "low",
    "requiresReview": false
  }
}
```

### Example 3: Health Check

**Prompt to AI**:

```
Run a health check on the Ralph-Loop system.
```

**Tool Invocation**:

```json
{
  "tool": "trigger_ralph_loop",
  "arguments": {
    "mode": "health-check"
  }
}
```

**Response**:

```json
{
  "health": {
    "status": "healthy",
    "metrics": {
      "totalActivations": 42,
      "successRate": 85.7,
      "averageExecutionTime": 2340,
      "recentFailures": 6
    },
    "recommendations": [
      "Success rate is good (>80%)",
      "Consider investigating recent failures for patterns"
    ]
  }
}
```

## Best Practices

### 1. Always Check System Context First

Before executing resource-intensive operations, check system resources:

```
AI: "Before we build the Docker image, let me check system resources..."
[Invokes get_system_context]
AI: "You have 7.5 GB free memory and 180 GB free disk. Proceeding with build..."
```

### 2. Validate Environment Before Starting

Validate dependencies before starting development:

```
AI: "Let me verify your development environment..."
[Invokes validate_environment]
AI: "Missing react package. Installing: npm install react"
```

### 3. Use Ralph-Loop for Self-Healing

When tests fail, use Ralph-Loop for analysis:

```
AI: "Test failed. Analyzing with Ralph-Loop..."
[Invokes trigger_ralph_loop with mode: analyze]
AI: "Root cause identified: Missing null check. Applying fix..."
```

### 4. Trust Constitutional Validation

Let sovereign_execute handle safety:

```
AI: "Executing command with constitutional validation..."
[Invokes sovereign_execute]
AI: "Command blocked: Destructive operation detected. Using safer alternative..."
```

## Troubleshooting

### Tool Timeout

If tools timeout, increase the timeout value:

```json
{
  "tool": "sovereign_execute",
  "arguments": {
    "command": "npm run build",
    "timeout": 120000
  }
}
```

### Docker Not Available

If Docker tools fail, check Docker status:

```json
{
  "tool": "get_system_context",
  "arguments": {}
}
```

Check `docker.available` in response.

### Permission Denied

If commands fail with permission errors, check file permissions or use sudo (if whitelisted).

## Next Steps

- Read [MCP Setup Guide](./mcp-setup.md)
- Explore [API Schema](./schemas/api-schema.json)
- Join the community on Discord
