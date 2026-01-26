# Skill Discovery Protocol

**Version**: 1.0.0  
**Status**: 🟢 ACTIVE  
**Last Updated**: 2026-01-20

---

## Purpose

This protocol enables Antigravity OS to autonomously discover, evaluate, integrate, and utilize new skills from external sources. It implements a self-learning capability that allows the system to expand its execution capabilities without manual intervention.

---

## Discovery Process

### Phase 1: Skill Identification

**When discovering a new skill, the agent MUST**:

1. **Analyze Skill Definition**
   - Read skill documentation (README, skill.md, etc.)
   - Identify skill purpose and use cases
   - Extract input/output specifications
   - Determine dependencies and requirements

2. **Evaluate Skill Relevance**
   - Does this skill solve a problem we encounter?
   - Does it align with our 3-Layer Architecture?
   - Is it deterministic enough for Execution Layer?
   - What is the integration complexity?

3. **Assess Skill Quality**
   - Is the skill well-documented?
   - Does it have tests?
   - Is it actively maintained?
   - Are there known issues or limitations?

### Phase 2: Skill Classification

**Classify the skill into one of these categories**:

#### Category A: Direct Integration (High Priority)

- **Criteria**: Deterministic, well-documented, high-impact
- **Examples**: File operations, data formatting, validation
- **Action**: Integrate immediately into Execution Layer

#### Category B: Adaptation Required (Medium Priority)

- **Criteria**: Useful but needs modification for our architecture
- **Examples**: Skills with AI decision-making that should be in Orchestration
- **Action**: Refactor to fit 3-Layer Architecture, then integrate

#### Category C: Reference Only (Low Priority)

- **Criteria**: Useful concepts but not directly applicable
- **Examples**: Platform-specific skills, deprecated patterns
- **Action**: Document in memory graph, defer integration

#### Category D: Reject (No Integration)

- **Criteria**: Conflicts with our principles, security risks, low quality
- **Examples**: Insecure code execution, anti-patterns
- **Action**: Document rejection reason, do not integrate

---

## Integration Workflow

### Step 1: Create Directive (SOP)

**Location**: `/directives/skills/{skill-name}.md`

**Required Sections**:

````markdown
# Skill: {Skill Name}

## Goal

What this skill achieves (one sentence)

## When to Use

Specific scenarios where this skill should be invoked

## Inputs

- Parameter 1: Type, description, constraints
- Parameter 2: Type, description, constraints

## Outputs

- Return value: Type, description
- Side effects: File modifications, API calls, etc.

## Execution Tool

Path to deterministic script: `/execution/skills/{skill-name}.ts`

## Edge Cases

- Edge case 1: Description and handling strategy
- Edge case 2: Description and handling strategy

## Failure Modes

- Failure mode 1: Symptoms, cause, recovery
- Failure mode 2: Symptoms, cause, recovery

## Examples

```typescript
// Example 1: Basic usage
const result = await executeSkill('skill-name', {
  param1: 'value1',
  param2: 'value2'
});

// Example 2: Error handling
try {
  const result = await executeSkill('skill-name', { ... });
} catch (error) {
  // Recovery strategy
}
```
````

## Dependencies

- Dependency 1: Version, purpose
- Dependency 2: Version, purpose

## Testing

- Unit test coverage: X%
- Property-based tests: Yes/No
- Integration tests: Yes/No

## Maintenance

- Last updated: YYYY-MM-DD
- Known issues: Link to issue tracker
- Deprecation status: Active/Deprecated

````

### Step 2: Implement Execution Script

**Location**: `/execution/skills/{skill-name}.ts`

**Required Structure**:
```typescript
/**
 * Skill: {Skill Name}
 *
 * @description {One-sentence description}
 * @category {Category: file-ops, data-transform, validation, etc.}
 * @deterministic true
 * @sandboxed {true/false}
 */

import { z } from 'zod';

// Input schema (Zod for runtime validation)
const InputSchema = z.object({
  param1: z.string().min(1),
  param2: z.number().positive(),
  // ... more parameters
});

// Output schema
const OutputSchema = z.object({
  result: z.string(),
  metadata: z.object({
    executionTime: z.number(),
    success: z.boolean(),
  }),
});

// Type inference
type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

/**
 * Execute the skill
 *
 * @param input - Validated input parameters
 * @returns Skill execution result
 * @throws {SkillExecutionError} If execution fails
 */
export async function executeSkill(input: Input): Promise<Output> {
  // Validate input
  const validatedInput = InputSchema.parse(input);

  // Execute deterministic logic
  const startTime = Date.now();

  try {
    // Core skill logic here
    const result = await performSkillOperation(validatedInput);

    // Return validated output
    return OutputSchema.parse({
      result,
      metadata: {
        executionTime: Date.now() - startTime,
        success: true,
      },
    });
  } catch (error) {
    // Error handling
    throw new SkillExecutionError(
      `Skill execution failed: ${error.message}`,
      { cause: error, input: validatedInput }
    );
  }
}

// Helper functions (private)
async function performSkillOperation(input: Input): Promise<string> {
  // Deterministic implementation
  // No AI decision-making
  // Pure function logic only
  return 'result';
}

// Error class
class SkillExecutionError extends Error {
  constructor(message: string, public context: Record<string, unknown>) {
    super(message);
    this.name = 'SkillExecutionError';
  }
}
````

### Step 3: Write Tests

**Location**: `/tests/unit/skills/{skill-name}.test.ts`

**Required Tests**:

```typescript
import { describe, it, expect } from 'vitest';
import { executeSkill } from '@/execution/skills/{skill-name}';

describe('Skill: {Skill Name}', () => {
  describe('Unit Tests', () => {
    it('should execute successfully with valid input', async () => {
      const result = await executeSkill({
        param1: 'test',
        param2: 42,
      });

      expect(result.metadata.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('should throw error with invalid input', async () => {
      await expect(
        executeSkill({
          param1: '', // Invalid: empty string
          param2: -1, // Invalid: negative number
        })
      ).rejects.toThrow('SkillExecutionError');
    });

    it('should handle edge case: {description}', async () => {
      // Edge case test
    });
  });

  describe('Property-Based Tests', () => {
    it('should maintain invariant: {property description}', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), fc.integer({ min: 1 }), async (param1, param2) => {
          const result = await executeSkill({ param1, param2 });
          // Assert property holds
          expect(result.metadata.success).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });
});
```

### Step 4: Register Skill

**Location**: `docs/SKILLS_REGISTRY.md`

**Add entry**:

```markdown
### {Skill Name}

- **Category**: {Category}
- **Status**: Active
- **Directive**: `/directives/skills/{skill-name}.md`
- **Execution**: `/execution/skills/{skill-name}.ts`
- **Tests**: `/tests/unit/skills/{skill-name}.test.ts`
- **Coverage**: X%
- **Last Updated**: YYYY-MM-DD
- **Dependencies**: {List}
```

### Step 5: Update Orchestrator

**Location**: `src/core/orchestrator.ts`

**Add skill to index**:

```typescript
// In skill registry
const SKILL_REGISTRY = {
  // ... existing skills
  '{skill-name}': {
    name: '{Skill Name}',
    category: '{Category}',
    directive: '/directives/skills/{skill-name}.md',
    executor: () => import('@/execution/skills/{skill-name}'),
    keywords: ['keyword1', 'keyword2', 'keyword3'],
  },
};
```

---

## Skill Routing Logic

### When to Use a Skill

**The orchestrator MUST use a skill when**:

1. Task description matches skill keywords
2. Skill is deterministic and tested
3. Using skill is faster than generating new code
4. Skill has >80% test coverage

### Skill Selection Algorithm

```typescript
async function selectSkill(taskDescription: string): Promise<Skill | null> {
  // 1. Extract keywords from task description
  const keywords = extractKeywords(taskDescription);

  // 2. Find matching skills
  const matches = Object.values(SKILL_REGISTRY).filter((skill) =>
    skill.keywords.some((keyword) => keywords.includes(keyword))
  );

  // 3. Rank by relevance
  const ranked = rankByRelevance(matches, taskDescription);

  // 4. Return best match (or null if no good match)
  return ranked.length > 0 && ranked[0].score > 0.7 ? ranked[0].skill : null;
}
```

---

## Skill Maintenance

### Regular Review

**Every 30 days, review all skills**:

- [ ] Are tests still passing?
- [ ] Are dependencies up-to-date?
- [ ] Are there new edge cases to handle?
- [ ] Is documentation still accurate?
- [ ] Should skill be deprecated?

### Deprecation Process

**To deprecate a skill**:

1. Mark as deprecated in SKILLS_REGISTRY.md
2. Add deprecation notice to directive
3. Update orchestrator to warn when skill is used
4. Provide migration path to replacement skill
5. Remove after 90 days if no usage

### Skill Evolution

**When a skill needs improvement**:

1. Create new version: `{skill-name}-v2.ts`
2. Maintain backward compatibility
3. Update tests for new version
4. Migrate users gradually
5. Deprecate old version after migration

---

## External Skill Sources

### Trusted Sources

**Approved skill repositories**:

1. **Antigravity Awesome Skills**: https://github.com/sickn33/antigravity-awesome-skills
2. **Anthropic Official Skills**: https://github.com/anthropics/skills
3. **Vercel AI Skills**: https://github.com/vercel/ai-skills

### Evaluation Criteria

**Before integrating external skills, verify**:

- [ ] Source is trusted and reputable
- [ ] License is compatible (MIT, Apache 2.0, BSD)
- [ ] Code is well-documented
- [ ] Tests are included
- [ ] No security vulnerabilities
- [ ] Actively maintained (updated within 6 months)

---

## Security Considerations

### Sandboxing Requirements

**Skills MUST be sandboxed if they**:

- Execute user-provided code
- Make network requests
- Access file system outside workspace
- Interact with external APIs
- Perform system-level operations

### Security Review Checklist

**Before integrating any skill**:

- [ ] No hardcoded credentials
- [ ] Input validation implemented
- [ ] Output sanitization implemented
- [ ] Error messages don't leak sensitive data
- [ ] No SQL injection vulnerabilities
- [ ] No command injection vulnerabilities
- [ ] No path traversal vulnerabilities
- [ ] Rate limiting implemented (if applicable)

---

## Telemetry & Monitoring

### Skill Usage Metrics

**Track for each skill**:

- Invocation count
- Success rate
- Average execution time
- Error rate by error type
- User satisfaction (if applicable)

### Performance Optimization

**If a skill is slow (>1s execution time)**:

1. Profile execution to find bottlenecks
2. Optimize hot paths
3. Add caching if appropriate
4. Consider parallelization
5. Document performance characteristics

---

## Examples

### Example 1: Integrating "File Organizer" Skill

**Step 1: Create Directive**

```bash
# Create /directives/skills/file-organizer.md
# Document goal, inputs, outputs, edge cases
```

**Step 2: Implement Execution Script**

```bash
# Create /execution/skills/file-organizer.ts
# Implement deterministic file organization logic
```

**Step 3: Write Tests**

```bash
# Create /tests/unit/skills/file-organizer.test.ts
# Test with various file structures
```

**Step 4: Register**

```bash
# Add to docs/SKILLS_REGISTRY.md
# Add to src/core/orchestrator.ts skill index
```

**Step 5: Verify**

```bash
npm test -- file-organizer
npm run validate:quick
```

### Example 2: Adapting "Systematic Debugging" Skill

**Original**: AI-driven debugging workflow  
**Adaptation**: Split into Directive (workflow) + Execution (debug tools)

**Directive** (`/directives/skills/systematic-debugging.md`):

- Define debugging workflow steps
- When to use each debugging technique
- How to interpret results

**Execution** (`/execution/skills/debug-tools.ts`):

- Stack trace parser
- Error classifier
- Log analyzer
- Deterministic debugging utilities

---

## Continuous Improvement

### Learning from Skill Usage

**After each skill execution, log**:

- Was the skill helpful?
- Did it complete successfully?
- How long did it take?
- Were there any errors?
- Would you use it again?

**Update memory graph with**:

- Successful skill usage patterns
- Failed skill usage patterns
- Skill combination strategies
- Performance optimization opportunities

---

## Conclusion

This Skill Discovery Protocol enables Antigravity OS to continuously expand its capabilities by autonomously discovering, evaluating, and integrating new skills. By following this protocol, the system maintains high quality standards while remaining flexible and adaptive to new challenges.

**Remember**: Skills are tools, not solutions. The orchestrator must still make intelligent decisions about when and how to use them.

---

**Status**: 🟢 ACTIVE  
**Version**: 1.0.0  
**Last Updated**: 2026-01-20  
**Next Review**: 2026-02-20
