/**
 * Property-Based Tests for Error Interceptor
 *
 * Tests universal correctness properties for the error interceptor
 * using fast-check for property-based testing.
 *
 * Requirements: 7
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createErrorInterceptor } from '../../src/mcp/background/error-interceptor';
import type { ErrorCategory } from '../../src/mcp/background/error-interceptor';

describe('Error Interceptor - Property Tests', () => {
  /**
   * Property 23: Error Analysis Execution
   *
   * For any error message, the error interceptor SHALL analyze it
   * and return an ErrorAnalysis with originalError, rootCause, category,
   * and remediation steps.
   *
   * **Feature: mcp-server-transformation, Property 23: Error Analysis Execution**
   * **Validates: Requirements 7.1, 7.2**
   */
  it('Property 23: Error Analysis Execution', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Environment errors
          fc.constant('command not found: docker'),
          fc.constant('Cannot connect to the Docker daemon'),
          fc.constant('ENOENT: no such file or directory'),
          fc.constant('EACCES: permission denied'),
          fc.constant('EADDRINUSE: address already in use'),

          // Dependency errors
          fc.constant('Cannot find module "express"'),
          fc.constant('Module not found: @types/node'),
          fc.constant('npm ERR! code ELIFECYCLE'),

          // Network errors
          fc.constant('ENOTFOUND: getaddrinfo failed'),
          fc.constant('ECONNREFUSED: connection refused'),
          fc.constant('ETIMEDOUT: connection timed out'),

          // Spec errors
          fc.constant('Test failed: Expected 5 to equal 10'),
          fc.constant('Property failed after 10 tests'),
          fc.constant('AssertionError: expected true to be false'),

          // Generic errors
          fc.string({ minLength: 10, maxLength: 100 })
        ),
        (errorMessage) => {
          const interceptor = createErrorInterceptor();
          const analysis = interceptor.analyze(errorMessage);

          // Verify all required fields are present
          expect(analysis).toHaveProperty('originalError');
          expect(analysis).toHaveProperty('rootCause');
          expect(analysis).toHaveProperty('category');
          expect(analysis).toHaveProperty('remediation');

          // Verify field types
          expect(typeof analysis.originalError).toBe('string');
          expect(typeof analysis.rootCause).toBe('string');
          expect(typeof analysis.category).toBe('string');
          expect(Array.isArray(analysis.remediation)).toBe(true);

          // Verify originalError matches input
          expect(analysis.originalError).toBe(errorMessage);

          // Verify rootCause is not empty
          expect(analysis.rootCause.length).toBeGreaterThan(0);

          // Verify category is valid
          const validCategories: ErrorCategory[] = [
            'environment',
            'spec',
            'dependency',
            'network',
            'unknown',
          ];
          expect(validCategories).toContain(analysis.category);

          // Verify remediation has at least one step
          expect(analysis.remediation.length).toBeGreaterThan(0);

          // Verify each remediation step is a non-empty string
          for (const step of analysis.remediation) {
            expect(typeof step).toBe('string');
            expect(step.length).toBeGreaterThan(0);
          }

          // If suggestedTool is present, verify it's valid
          if (analysis.suggestedTool) {
            expect(['validate_environment', 'trigger_ralph_loop']).toContain(
              analysis.suggestedTool
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24: Error Remediation Suggestions
   *
   * For any known error pattern, the error interceptor SHALL provide
   * specific remediation steps that are actionable.
   *
   * **Feature: mcp-server-transformation, Property 24: Error Remediation Suggestions**
   * **Validates: Requirement 7.3**
   */
  it('Property 24: Error Remediation Suggestions', () => {
    fc.assert(
      fc.property(
        fc.record({
          error: fc.constantFrom(
            'command not found: docker',
            'Cannot connect to the Docker daemon',
            'Cannot find module "express"',
            'EADDRINUSE: address already in use',
            'Test failed: Expected 5 to equal 10'
          ),
        }),
        ({ error }) => {
          const interceptor = createErrorInterceptor();
          const analysis = interceptor.analyze(error);

          // Verify remediation is present and non-empty
          expect(analysis.remediation).toBeDefined();
          expect(analysis.remediation.length).toBeGreaterThan(0);

          // Verify remediation steps are actionable (contain verbs)
          const actionVerbs = [
            'run',
            'install',
            'check',
            'verify',
            'start',
            'stop',
            'review',
            'update',
            'ensure',
            'try',
          ];

          let hasActionableStep = false;
          for (const step of analysis.remediation) {
            const lowerStep = step.toLowerCase();
            if (actionVerbs.some((verb) => lowerStep.includes(verb))) {
              hasActionableStep = true;
              break;
            }
          }

          expect(hasActionableStep).toBe(true);

          // Verify specific remediation for known errors
          if (error.includes('docker')) {
            const hasDockerRemediation = analysis.remediation.some(
              (step) =>
                step.toLowerCase().includes('docker') ||
                step.toLowerCase().includes('validate_environment')
            );
            expect(hasDockerRemediation).toBe(true);
          }

          if (error.includes('cannot find module')) {
            const hasModuleRemediation = analysis.remediation.some(
              (step) => step.toLowerCase().includes('install') || step.toLowerCase().includes('npm')
            );
            expect(hasModuleRemediation).toBe(true);
          }

          if (error.includes('test failed')) {
            const hasTestRemediation = analysis.remediation.some(
              (step) =>
                step.toLowerCase().includes('ralph_loop') || step.toLowerCase().includes('spec')
            );
            expect(hasTestRemediation).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 25: Tool Suggestion for Error Categories
   *
   * For environment and spec errors, the error interceptor SHALL
   * suggest the appropriate tool (validate_environment or trigger_ralph_loop).
   *
   * **Feature: mcp-server-transformation, Property 25: Tool Suggestion for Error Categories**
   * **Validates: Requirements 7.4, 7.5**
   */
  it('Property 25: Tool Suggestion for Error Categories', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorType: fc.constantFrom('environment', 'spec'),
          error: fc.string({ minLength: 10, maxLength: 100 }),
        }),
        ({ errorType, error }) => {
          const interceptor = createErrorInterceptor();

          // Create error message based on type
          let errorMessage: string;
          if (errorType === 'environment') {
            errorMessage = `command not found: ${error}`;
          } else {
            errorMessage = `Test failed: ${error}`;
          }

          const analysis = interceptor.analyze(errorMessage);

          // Verify category matches expected type
          if (errorType === 'environment') {
            expect(analysis.category).toBe('environment');

            // Environment errors should suggest validate_environment
            expect(analysis.suggestedTool).toBe('validate_environment');
          } else if (errorType === 'spec') {
            expect(analysis.category).toBe('spec');

            // Spec errors should suggest trigger_ralph_loop
            expect(analysis.suggestedTool).toBe('trigger_ralph_loop');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Additional Property: Error Object Handling
   *
   * For any Error object (not just strings), the error interceptor
   * SHALL extract the message and analyze it correctly.
   */
  it('Error objects are handled correctly', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 10, maxLength: 100 }), (message) => {
        const interceptor = createErrorInterceptor();
        const error = new Error(message);

        const analysis = interceptor.analyze(error);

        // Verify originalError matches error message
        expect(analysis.originalError).toBe(message);

        // Verify analysis is complete
        expect(analysis.rootCause).toBeDefined();
        expect(analysis.category).toBeDefined();
        expect(analysis.remediation).toBeDefined();
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Additional Property: Root Cause Extraction
   *
   * For any error with a known pattern, the root cause SHALL
   * be more specific than the original error.
   */
  it('Root cause is extracted from known patterns', () => {
    const knownErrors = [
      { error: 'command not found: docker', expectedInRootCause: 'not installed' },
      { error: 'Cannot connect to the Docker daemon', expectedInRootCause: 'not running' },
      { error: 'Cannot find module "express"', expectedInRootCause: 'not installed' },
      { error: 'EADDRINUSE: address already in use', expectedInRootCause: 'already in use' },
      { error: 'Test failed: Expected 5 to equal 10', expectedInRootCause: 'spec violation' },
    ];

    for (const { error, expectedInRootCause } of knownErrors) {
      const interceptor = createErrorInterceptor();
      const analysis = interceptor.analyze(error);

      // Verify root cause contains expected phrase
      expect(analysis.rootCause.toLowerCase()).toContain(expectedInRootCause.toLowerCase());
    }
  });

  /**
   * Additional Property: Category Consistency
   *
   * For any error analyzed multiple times, the category SHALL
   * remain consistent.
   */
  it('Category is consistent across multiple analyses', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'command not found: docker',
          'Cannot find module "express"',
          'Test failed: assertion error',
          'ECONNREFUSED: connection refused'
        ),
        (errorMessage) => {
          const interceptor = createErrorInterceptor();

          // Analyze same error multiple times
          const analysis1 = interceptor.analyze(errorMessage);
          const analysis2 = interceptor.analyze(errorMessage);
          const analysis3 = interceptor.analyze(errorMessage);

          // Verify category is consistent
          expect(analysis1.category).toBe(analysis2.category);
          expect(analysis2.category).toBe(analysis3.category);

          // Verify root cause is consistent
          expect(analysis1.rootCause).toBe(analysis2.rootCause);
          expect(analysis2.rootCause).toBe(analysis3.rootCause);
        }
      ),
      { numRuns: 20 }
    );
  });
});
