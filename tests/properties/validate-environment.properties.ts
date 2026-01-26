/**
 * Property-Based Tests for Environment Validation Tool
 *
 * Tests universal correctness properties for the validate_environment tool
 * using fast-check for property-based testing.
 *
 * Requirements: 3
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateEnvironment } from '../../src/mcp/tools/validate-environment';

describe('Environment Validation Tool - Property Tests', () => {
  /**
   * Property 7: Environment Validation Completeness
   *
   * For any validate_environment invocation with multiple dependency types,
   * the response SHALL include validation results for each dependency.
   *
   * **Feature: mcp-server-transformation, Property 7: Environment Validation Completeness**
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  it('Property 7: Environment Validation Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          commands: fc.option(
            fc.array(fc.constantFrom('node', 'npm', 'git', 'docker'), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined }
          ),
          packages: fc.option(
            fc.array(fc.constantFrom('vitest', 'typescript', 'fast-check'), {
              minLength: 1,
              maxLength: 2,
            }),
            { nil: undefined }
          ),
          files: fc.option(
            fc.array(fc.constantFrom('package.json', 'tsconfig.json', '.env'), {
              minLength: 1,
              maxLength: 2,
            }),
            { nil: undefined }
          ),
          ports: fc.option(
            fc.array(fc.integer({ min: 3000, max: 9000 }), {
              minLength: 1,
              maxLength: 2,
            }),
            { nil: undefined }
          ),
        }),
        async (req) => {
          const result = await validateEnvironment(req);

          // Verify result structure
          expect(result).toHaveProperty('valid');
          expect(result).toHaveProperty('results');
          expect(result).toHaveProperty('suggestions');
          expect(typeof result.valid).toBe('boolean');
          expect(Array.isArray(result.suggestions)).toBe(true);

          // Verify results structure
          expect(result.results).toHaveProperty('commands');
          expect(result.results).toHaveProperty('packages');
          expect(result.results).toHaveProperty('files');
          expect(result.results).toHaveProperty('ports');

          // Verify all requested commands have results
          if (req.commands) {
            for (const command of req.commands) {
              expect(result.results.commands).toHaveProperty(command);
              const commandResult = result.results.commands[command];
              if (commandResult) {
                expect(commandResult).toHaveProperty('exists');
                expect(typeof commandResult.exists).toBe('boolean');
              }
            }
          }

          // Verify all requested packages have results
          if (req.packages) {
            for (const packageName of req.packages) {
              expect(result.results.packages).toHaveProperty(packageName);
              const packageResult = result.results.packages[packageName];
              if (packageResult) {
                expect(packageResult).toHaveProperty('installed');
                expect(typeof packageResult.installed).toBe('boolean');
              }
            }
          }

          // Verify all requested files have results
          if (req.files) {
            for (const filePath of req.files) {
              expect(result.results.files).toHaveProperty(filePath);
              const fileResult = result.results.files[filePath];
              if (fileResult) {
                expect(fileResult).toHaveProperty('exists');
                expect(typeof fileResult.exists).toBe('boolean');
              }
            }
          }

          // Verify all requested ports have results
          if (req.ports) {
            for (const port of req.ports) {
              expect(result.results.ports).toHaveProperty(String(port));
              const portResult = result.results.ports[port];
              if (portResult) {
                expect(portResult).toHaveProperty('available');
                expect(typeof portResult.available).toBe('boolean');
              }
            }
          }
        }
      ),
      { numRuns: 5 } // Reduced runs due to slow npm commands
    );
  }, 30000); // 30 second timeout

  /**
   * Property 8: Missing Dependency Suggestions
   *
   * For any validate_environment invocation where dependencies are missing,
   * the response SHALL include installation suggestions.
   *
   * **Feature: mcp-server-transformation, Property 8: Missing Dependency Suggestions**
   * **Validates: Requirements 3.6**
   */
  it('Property 8: Missing Dependency Suggestions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Use commands that likely don't exist
          commands: fc.option(
            fc.array(
              fc.constantFrom('nonexistent-command-xyz', 'fake-tool-abc', 'missing-binary-123'),
              { minLength: 1, maxLength: 2 }
            ),
            { nil: undefined }
          ),
          // Use packages that likely aren't installed
          packages: fc.option(
            fc.array(
              fc.constantFrom('nonexistent-package-xyz', 'fake-module-abc', 'missing-lib-123'),
              { minLength: 1, maxLength: 2 }
            ),
            { nil: undefined }
          ),
        }),
        async (req) => {
          const result = await validateEnvironment(req);

          // Count missing dependencies
          let missingCount = 0;

          if (req.commands) {
            missingCount += Object.values(result.results.commands).filter((r) => !r.exists).length;
          }

          if (req.packages) {
            missingCount += Object.values(result.results.packages).filter(
              (r) => !r.installed
            ).length;
          }

          // If there are missing dependencies, suggestions should be provided
          if (missingCount > 0) {
            expect(result.suggestions.length).toBeGreaterThan(0);
            expect(result.valid).toBe(false);
          }

          // Each suggestion should be a non-empty string
          for (const suggestion of result.suggestions) {
            expect(typeof suggestion).toBe('string');
            expect(suggestion.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 5 } // Reduced runs due to slow npm commands
    );
  }, 30000); // 30 second timeout

  /**
   * Additional Property: Empty Request Returns Valid
   *
   * For any empty validation request, the result SHALL be valid
   * with empty results and no suggestions.
   */
  it('Empty request returns valid result', async () => {
    const result = await validateEnvironment({});

    expect(result.valid).toBe(true);
    expect(result.suggestions).toEqual([]);
    expect(Object.keys(result.results.commands)).toHaveLength(0);
    expect(Object.keys(result.results.packages)).toHaveLength(0);
    expect(Object.keys(result.results.files)).toHaveLength(0);
    expect(Object.keys(result.results.ports)).toHaveLength(0);
  });

  /**
   * Additional Property: Known Commands Are Detected
   *
   * For any validation request with known commands (node, npm),
   * they SHALL be detected as existing.
   */
  it('Known commands are detected correctly', async () => {
    const result = await validateEnvironment({
      commands: ['node', 'npm'],
    });

    expect(result.results.commands.node).toBeDefined();
    expect(result.results.commands.npm).toBeDefined();

    if (result.results.commands.node && result.results.commands.npm) {
      expect(result.results.commands.node.exists).toBe(true);
      expect(result.results.commands.npm.exists).toBe(true);
      expect(result.results.commands.node.path).toBeDefined();
      expect(result.results.commands.npm.path).toBeDefined();
    }
  });

  /**
   * Additional Property: Existing Files Are Detected
   *
   * For any validation request with existing files (package.json),
   * they SHALL be detected as existing and readable.
   */
  it('Existing files are detected correctly', async () => {
    const result = await validateEnvironment({
      files: ['package.json'],
    });

    const packageJsonResult = result.results.files['package.json'];
    expect(packageJsonResult).toBeDefined();

    if (packageJsonResult) {
      expect(packageJsonResult.exists).toBe(true);
      expect(packageJsonResult.readable).toBe(true);
    }
  });

  /**
   * Additional Property: Validation Consistency
   *
   * For any validation request run multiple times,
   * the results SHALL be consistent (same dependencies, same results).
   */
  it('Validation results are consistent across invocations', async () => {
    const request = {
      commands: ['node', 'npm'],
      files: ['package.json'],
    };

    const result1 = await validateEnvironment(request);
    const result2 = await validateEnvironment(request);

    // Results should be identical
    expect(result1.valid).toBe(result2.valid);

    if (result1.results.commands.node && result2.results.commands.node) {
      expect(result1.results.commands.node.exists).toBe(result2.results.commands.node.exists);
    }

    if (result1.results.commands.npm && result2.results.commands.npm) {
      expect(result1.results.commands.npm.exists).toBe(result2.results.commands.npm.exists);
    }

    const file1 = result1.results.files['package.json'];
    const file2 = result2.results.files['package.json'];
    if (file1 && file2) {
      expect(file1.exists).toBe(file2.exists);
    }
  });
});
