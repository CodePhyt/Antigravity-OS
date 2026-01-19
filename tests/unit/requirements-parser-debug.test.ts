import { describe, it, expect } from 'vitest';
import { parseRequirements } from '@/services/requirements-parser';

describe('Requirements Parser Debug', () => {
  it('should parse a simple requirement', () => {
    const content = `
### Requirement 1: Parse Specification Files

**User Story:** As a developer, I want the orchestrator to read and parse spec files, so that it can extract structured task data for execution.

#### Acceptance Criteria

1. WHEN a spec directory path is provided, THE Spec_Parser SHALL read all three spec files
2. WHEN parsing tasks.md, THE Spec_Parser SHALL extract task identifiers
`;

    const requirements = parseRequirements(content);
    // eslint-disable-next-line no-console
    console.log('Parsed requirements:', JSON.stringify(requirements, null, 2));

    expect(requirements.length).toBe(1);
    expect(requirements[0]?.id).toBe('1');
    expect(requirements[0]?.userStory).toContain('developer');
  });
});
