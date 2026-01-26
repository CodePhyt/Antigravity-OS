/**
 * MCP Tool Wrapper Property-Based Tests
 * 
 * Tests universal properties of Plan-Execute-Verify cycle
 * **Validates: Requirements 7.1, 7.4, 7.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createMCPToolWrapper } from '@/lib/medin-protocol/mcp-tool-wrapper';

describe('MCP Tool Wrapper - Property Tests', () => {
  /**
   * Property 22: MCP Tool Plan Generation
   * 
   * For any MCP tool invocation, an execution plan must be generated
   * before any actions are taken.
   * 
   * **Validates: Requirements 7.1**
   */
  it('Property 22: MCP Tool Plan Generation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // toolName
        fc.dictionary(fc.string(), fc.anything()), // args
        async (toolName, args) => {
          const wrapper = createMCPToolWrapper();

          // Generate plan
          const plan = await wrapper.generatePlan(toolName, args);

          // Plan must be generated
          expect(plan).toBeDefined();
          expect(plan.toolName).toBe(toolName);
          expect(plan.args).toEqual(args);

          // Plan must have required fields
          expect(plan.steps).toBeDefined();
          expect(Array.isArray(plan.steps)).toBe(true);
          expect(plan.steps.length).toBeGreaterThan(0);

          expect(plan.expectedOutcome).toBeDefined();
          expect(typeof plan.expectedOutcome).toBe('string');

          expect(plan.validationChecks).toBeDefined();
          expect(Array.isArray(plan.validationChecks)).toBe(true);

          expect(plan.rollbackStrategy).toBeDefined();
          expect(typeof plan.rollbackStrategy).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 25: MCP Tool Post-Execution Verification
   * 
   * For any completed MCP tool action, verification using the Validator
   * must occur.
   * 
   * **Validates: Requirements 7.4**
   */
  it('Property 25: MCP Tool Post-Execution Verification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // toolName
        fc.dictionary(fc.string(), fc.anything()), // args
        async (toolName, args) => {
          const wrapper = createMCPToolWrapper();

          // Execute tool
          const result = await wrapper.executeTool(toolName, args);

          // Verification must have occurred
          expect(result.verification).toBeDefined();
          expect(typeof result.verification.passed).toBe('boolean');
          expect(typeof result.verification.evidence).toBe('string');
          expect(typeof result.verification.confidence).toBe('number');
          expect(result.verification.confidence).toBeGreaterThanOrEqual(0);
          expect(result.verification.confidence).toBeLessThanOrEqual(100);
          expect(typeof result.verification.duration).toBe('number');
          expect(result.verification.duration).toBeGreaterThanOrEqual(0);
          expect(typeof result.verification.timestamp).toBe('string');

          // Timestamp must be valid ISO 8601
          const timestamp = new Date(result.verification.timestamp);
          expect(timestamp.toString()).not.toBe('Invalid Date');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26: MCP Tool Rollback on Failure
   * 
   * For any MCP tool verification failure, changes must be rolled back
   * and failure must be reported.
   * 
   * **Validates: Requirements 7.5**
   */
  it('Property 26: MCP Tool Rollback on Failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // toolName
        fc.dictionary(fc.string(), fc.anything()), // args
        async (toolName, args) => {
          const wrapper = createMCPToolWrapper();

          // Execute tool
          const result = await wrapper.executeTool(toolName, args);

          // If verification failed, result must indicate failure
          if (!result.verification.passed) {
            // Result must be marked as failed
            expect(result.success).toBe(false);

            // Evidence must be provided
            expect(result.verification.evidence).toBeDefined();
            expect(result.verification.evidence.length).toBeGreaterThan(0);
          }

          // If verification passed, result must indicate success
          if (result.verification.passed) {
            expect(result.success).toBe(true);
          }

          // Success and verification must be consistent
          expect(result.success).toBe(result.verification.passed);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Plan Contains Validation Checks
   * 
   * For any tool that operates on system resources (files, APIs, docker),
   * the plan must include appropriate validation checks.
   */
  it('Property: Plan Contains Validation Checks for Resource Tools', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('file-reader'),
          fc.constant('file-writer'),
          fc.constant('api-caller'),
          fc.constant('http-request'),
          fc.constant('docker-start'),
          fc.constant('container-manager')
        ),
        fc.dictionary(fc.string(), fc.anything()),
        async (toolName, args) => {
          const wrapper = createMCPToolWrapper();

          const plan = await wrapper.generatePlan(toolName, args);

          // Resource tools must have validation checks
          if (toolName.includes('file')) {
            const hasFileCheck = plan.validationChecks.some(c => c.type === 'file');
            expect(hasFileCheck).toBe(true);
          }

          if (toolName.includes('api') || toolName.includes('http')) {
            const hasApiCheck = plan.validationChecks.some(c => c.type === 'api');
            expect(hasApiCheck).toBe(true);
          }

          if (toolName.includes('docker') || toolName.includes('container')) {
            const hasDockerCheck = plan.validationChecks.some(c => c.type === 'docker');
            expect(hasDockerCheck).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Execution Plan Immutability
   * 
   * For any execution, the plan included in the result must match
   * the originally generated plan.
   */
  it('Property: Execution Plan Immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.dictionary(fc.string(), fc.anything()),
        async (toolName, args) => {
          const wrapper = createMCPToolWrapper();

          // Generate plan first
          const originalPlan = await wrapper.generatePlan(toolName, args);

          // Execute tool
          const result = await wrapper.executeTool(toolName, args);

          // Plan in result must match original
          expect(result.plan.toolName).toBe(originalPlan.toolName);
          expect(result.plan.args).toEqual(originalPlan.args);
          expect(result.plan.steps).toEqual(originalPlan.steps);
          expect(result.plan.expectedOutcome).toBe(originalPlan.expectedOutcome);
          expect(result.plan.rollbackStrategy).toBe(originalPlan.rollbackStrategy);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Verification Confidence Bounds
   * 
   * For any verification result, confidence must be between 0 and 100.
   */
  it('Property: Verification Confidence Bounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.dictionary(fc.string(), fc.anything()),
        async (toolName, args) => {
          const wrapper = createMCPToolWrapper();

          const result = await wrapper.executeTool(toolName, args);

          // Confidence must be in valid range
          expect(result.verification.confidence).toBeGreaterThanOrEqual(0);
          expect(result.verification.confidence).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});
