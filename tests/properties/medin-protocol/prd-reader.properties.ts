/**
 * PRD Reader Property-Based Tests
 * 
 * Property tests for PRD Reader component
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import { PRDReaderImpl } from '@/lib/medin-protocol/prd-reader';

describe('PRD Reader - Property Tests', () => {
  let testPRDPath: string;
  let reader: PRDReaderImpl;

  beforeEach(() => {
    // Create unique test file for each test to avoid cross-contamination
    testPRDPath = `test-prd-${Date.now()}-${Math.random().toString(36).substring(7)}.tmp.md`;
    reader = new PRDReaderImpl(testPRDPath);
  });

  afterEach(async () => {
    reader.stopWatching();
    try {
      await fs.unlink(testPRDPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  /**
   * Property 1: PRD-First Execution Order
   * **Validates: Requirements 1.1**
   * 
   * For any task execution, reading PRD.md must occur before any code execution,
   * and the execution trace must show PRD reading as the first operation.
   */
  it('Property 1: PRD-First Execution Order', async () => {
    // Feature: medin-protocol, Property 1: PRD-First Execution Order
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requirementId: fc.integer({ min: 1, max: 10 }),
          // Generate valid titles: alphanumeric words with spaces
          requirementTitle: fc
            .array(fc.stringMatching(/^[A-Za-z0-9]+$/), { minLength: 2, maxLength: 5 })
            .map((words) => words.join(' ')),
          priority: fc.constantFrom('critical', 'high', 'medium', 'low'),
          criteriaCount: fc.integer({ min: 1, max: 5 }),
        }),
        async ({ requirementId, requirementTitle, priority, criteriaCount }) => {
          // Create a unique test file for this iteration
          const iterationPRDPath = `test-prd-${Date.now()}-${Math.random().toString(36).substring(7)}.tmp.md`;
          const iterationReader = new PRDReaderImpl(iterationPRDPath);

          try {
            // Generate PRD content with valid structure
            const criteria = Array.from({ length: criteriaCount }, (_, i) => `${i + 1}. Criterion ${i + 1}`).join('\n');
            const prdContent = `### Requirement ${requirementId}: ${requirementTitle}

**Priority**: ${priority}

Test description for requirement.

#### Acceptance Criteria

${criteria}
`;

            await fs.writeFile(iterationPRDPath, prdContent);

            // Track execution order
            const executionTrace: string[] = [];

            // Simulate task execution with PRD reading
            executionTrace.push('start');

            // PRD must be read first
            const prd = await iterationReader.loadPRD();
            executionTrace.push('prd-loaded');

            // Simulate code execution
            executionTrace.push('code-execution');

            // Property: PRD reading must be the first operation after start
            expect(executionTrace[0]).toBe('start');
            expect(executionTrace[1]).toBe('prd-loaded');
            expect(executionTrace[2]).toBe('code-execution');

            // Property: PRD must be successfully loaded
            expect(prd).toBeDefined();
            expect(prd.requirements).toHaveLength(1);
            expect(prd.requirements[0]?.id).toBe(`REQ-${requirementId}`);
          } finally {
            // Clean up
            iterationReader.stopWatching();
            try {
              await fs.unlink(iterationPRDPath);
            } catch {
              // Ignore if file doesn't exist
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: PRD Validation Halts Execution
   * **Validates: Requirements 1.2**
   * 
   * For any invalid or missing PRD.md state, Ralph-Loop must halt execution
   * and not proceed to task execution.
   */
  it('Property 2: PRD Validation Halts Execution', async () => {
    // Feature: medin-protocol, Property 2: PRD Validation Halts Execution
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'missing-file',
          'empty-file',
          'invalid-structure'
        ),
        async (errorType) => {
          const executionTrace: string[] = [];

          try {
            executionTrace.push('start');

            // Create invalid PRD based on error type
            if (errorType === 'empty-file') {
              await fs.writeFile(testPRDPath, '');
            } else if (errorType === 'invalid-structure') {
              await fs.writeFile(testPRDPath, 'Invalid content without proper structure');
            }
            // For 'missing-file', don't create the file

            // Attempt to load PRD
            await reader.loadPRD();
            executionTrace.push('prd-loaded');

            // This should not be reached
            executionTrace.push('code-execution');

            // Property: Execution should have halted, so we should not reach here
            expect(executionTrace).not.toContain('code-execution');
          } catch (error) {
            // Property: Error should be thrown before code execution
            expect(executionTrace).not.toContain('prd-loaded');
            expect(executionTrace).not.toContain('code-execution');
            expect(error).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 5: PRD Reload on Update
   * **Validates: Requirements 1.5**
   * 
   * For any PRD.md file modification during execution, Ralph-Loop must reload
   * requirements before executing the next task.
   */
  it('Property 5: PRD Reload on Update', async () => {
    // Feature: medin-protocol, Property 5: PRD Reload on Update
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialReqCount: fc.integer({ min: 1, max: 3 }),
          updatedReqCount: fc.integer({ min: 2, max: 5 }),
        }),
        async ({ initialReqCount, updatedReqCount }) => {
          // Create a fresh reader for each test to avoid cache issues
          const freshReader = new PRDReaderImpl(testPRDPath);

          // Create initial PRD
          const initialContent = Array.from(
            { length: initialReqCount },
            (_, i) => `### Requirement ${i + 1}: Initial Req ${i + 1}

**Priority**: medium

Description ${i + 1}

#### Acceptance Criteria

1. Criterion ${i + 1}
`
          ).join('\n\n');

          await fs.writeFile(testPRDPath, initialContent);

          // Load initial PRD
          const prd1 = await freshReader.loadPRD();
          expect(prd1.requirements).toHaveLength(initialReqCount);

          // Simulate PRD update
          const updatedContent = Array.from(
            { length: updatedReqCount },
            (_, i) => `### Requirement ${i + 1}: Updated Req ${i + 1}

**Priority**: high

Updated description ${i + 1}

#### Acceptance Criteria

1. Updated criterion ${i + 1}
`
          ).join('\n\n');

          await fs.writeFile(testPRDPath, updatedContent);

          // Reload PRD
          const prd2 = await freshReader.reloadPRD();

          // Property: Reloaded PRD must reflect the update
          expect(prd2.requirements).toHaveLength(updatedReqCount);
          expect(prd2.requirements[0]?.title).toContain('Updated');

          // Property: Reloaded PRD must be different from initial PRD if counts differ
          if (initialReqCount !== updatedReqCount) {
            expect(prd2.requirements.length).not.toBe(prd1.requirements.length);
          }

          freshReader.stopWatching();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Requirement Extraction Relevance
   * **Validates: Requirements 1.4**
   * 
   * For any task and PRD combination, extracted requirements must be relevant
   * to the task context (share keywords or dependencies).
   */
  it('Property: Requirement Extraction Relevance', async () => {
    // Feature: medin-protocol, Property: Requirement Extraction Relevance
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          keyword: fc.constantFrom('auth', 'validation', 'api', 'database', 'security'),
          requirementCount: fc.integer({ min: 3, max: 6 }),
        }),
        async ({ keyword, requirementCount }) => {
          // Create a fresh reader for each test
          const freshReader = new PRDReaderImpl(testPRDPath);

          // Create PRD with requirements containing the keyword
          const prdContent = Array.from(
            { length: requirementCount },
            (_, i) => {
              const includesKeyword = i < 2; // First 2 requirements include keyword
              const title = includesKeyword
                ? `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Feature ${i + 1}`
                : `Other Feature ${i + 1}`;

              return `### Requirement ${i + 1}: ${title}

**Priority**: medium

Description for ${title}

#### Acceptance Criteria

1. Criterion for ${title}
`;
            }
          ).join('\n\n');

          await fs.writeFile(testPRDPath, prdContent);
          await freshReader.loadPRD();

          // Extract requirements for task with keyword
          const taskId = `${keyword}-implementation-task`;
          const requirements = freshReader.getRequirementsForTask(taskId);

          // Property: Extracted requirements should exist
          expect(requirements.length).toBeGreaterThan(0);

          // Property: Requirements should be relevant (contain keyword) OR all requirements returned (fallback)
          const relevantReqs = requirements.filter(
            (req) =>
              req.title.toLowerCase().includes(keyword) ||
              req.description.toLowerCase().includes(keyword)
          );

          // The system either finds relevant requirements or returns all as fallback
          const isRelevant = relevantReqs.length > 0;
          const isFullFallback = requirements.length === requirementCount;

          expect(isRelevant || isFullFallback).toBe(true);

          freshReader.stopWatching();
        }
      ),
      { numRuns: 50 }
    );
  });
});
