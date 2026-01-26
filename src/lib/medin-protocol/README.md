# Medin Protocol - Ralph-Loop 2.0

## Overview

The Medin Protocol transforms Ralph-Loop from a reactive error-correction system into a proactive, truth-grounded autonomous agent with:

1. **Sovereign Memory & Truth**: PRD.md as immutable source of requirements
2. **Self-Validation Layer**: Real system checks verify all task completion claims
3. **Context Isolation & Safety**: Sub-tasks execute in sandboxed environments

## Components

### Core Infrastructure

- **types.ts**: TypeScript type definitions for all components
- **schema-validator.ts**: JSON schema validation for data structures
- **index.ts**: Main export file

### JSON Schemas

Located in `docs/schemas/`:

- **prd-schema.json**: PRD document validation
- **activity-log-schema.json**: Activity log entry validation
- **validation-result-schema.json**: Validation result validation

## Usage

```typescript
import {
  validatePRDDocument,
  validateActivityLogEntry,
  validateValidationResultStructure,
} from '@/lib/medin-protocol/schema-validator';

// Validate PRD
const prd = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  requirements: [
    {
      id: 'REQ-1.1',
      title: 'Test Requirement',
      description: 'Description',
      acceptanceCriteria: ['Criterion 1'],
      priority: 'high',
    },
  ],
  metadata: {},
};

validatePRDDocument(prd); // Throws SchemaValidationError if invalid
```

## Testing

Run tests with:

```bash
npm test -- tests/unit/medin-protocol/
```

## Architecture

```
src/lib/medin-protocol/
├── index.ts                    # Main exports
├── types.ts                    # Type definitions
├── schema-validator.ts         # Schema validation
├── prd-reader.ts              # PRD Reader (Task 2)
├── activity-log-manager.ts    # Activity Log Manager (Task 3)
├── validator.ts               # Validator (Task 5)
├── constitutional-pre-check.ts # Constitutional Pre-Check (Task 6)
├── isolation-context.ts       # Isolation Context (Task 8)
└── mcp-tool-wrapper.ts        # MCP Tool Wrapper (Task 9)
```

## Status

✅ Task 1: Core infrastructure and schemas - COMPLETE
- Directory structure created
- JSON schemas defined
- Type definitions implemented
- Schema validator implemented
- Unit tests passing (15/15)
