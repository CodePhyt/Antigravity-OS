# Antigravity OS - Schema Validation

## Purpose

This directory contains JSON Schema definitions for all data structures in Antigravity OS. Schemas enforce structured validation (Pydantic-style) to prevent runtime errors and ensure data consistency.

## Schema Files

### api-schema.json

Complete API and data structure schemas including:

- Task, Requirement, Property definitions
- ParsedSpec structure
- ExecutionRequest/Status
- ErrorContext

## Validation Protocol

### Pre-Execution Validation

Before any task execution:

1. Load relevant schema
2. Validate input data structure
3. If validation fails → Trigger B.L.A.S.T. Schema-Fix
4. Only proceed after validation passes

### B.L.A.S.T. Schema-Fix Protocol

When schema validation fails:

1. **Build**: Attempt to construct valid object
2. **Log**: Record validation errors with context
3. **Analyze**: Determine if schema or data is incorrect
4. **Spec**: Update schema or fix data source
5. **Test**: Re-validate until green

## Usage Examples

### TypeScript Validation

```typescript
import Ajv from 'ajv';
import schema from '@/docs/schemas/api-schema.json';

const ajv = new Ajv();
const validate = ajv.compile(schema.definitions.Task);

if (!validate(taskData)) {
  throw new ValidationError(validate.errors);
}
```

### Runtime Validation

```typescript
import { validateTask } from '@/lib/validation';

const task = parseTaskFromMarkdown(content);
validateTask(task); // Throws if invalid
```

## Schema Evolution

### Adding New Schemas

1. Define schema in api-schema.json under `definitions`
2. Add validation function in src/lib/validation.ts
3. Update this README with usage example
4. Add tests in tests/unit/validation.test.ts

### Modifying Existing Schemas

1. Update schema definition
2. Run validation tests to catch breaking changes
3. Update dependent code
4. Document migration path in DEVLOG.md

## Integration with Memory Graph

Schema validation failures are automatically logged to `/docs/memory/insight-graph.md` as Failed Patterns, enabling continuous improvement of data structures.

---

**Last Updated**: 2026-01-19  
**Schema Version**: 1.0.0
