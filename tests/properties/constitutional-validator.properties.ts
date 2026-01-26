/**
 * Property-Based Tests for Constitutional Validator
 *
 * Tests universal correctness properties for the Constitutional Validator
 * using fast-check for property-based testing.
 *
 * Requirements: 4, 12
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ConstitutionalValidator, ValidationContext } from '../../src/mcp/validator';

describe('Constitutional Validator - Property Tests', () => {
  const validator = new ConstitutionalValidator();

  /**
   * Property 9: Constitutional Validation Enforcement
   *
   * For any command execution context, the validator SHALL check
   * against all 13 Articles of the Constitution.
   *
   * **Feature: mcp-server-transformation, Property 9: Constitutional Validation Enforcement**
   * **Validates: Requirements 4.1, 12.1**
   */
  it('Property 9: Constitutional Validation Enforcement', () => {
    fc.assert(
      fc.property(
        fc.record({
          command: fc.oneof(
            fc.constantFrom('ls', 'cat', 'echo', 'docker', 'npm', 'git'),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          args: fc.array(fc.string({ maxLength: 50 }), { maxLength: 10 }),
          cwd: fc.constantFrom('/home/user', '/tmp', '.git', 'node_modules', '/app'),
          user: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
        }),
        (context: ValidationContext) => {
          // Validate the context
          const violations = validator.validate(context);

          // Violations should be an array
          expect(Array.isArray(violations)).toBe(true);

          // Each violation should have required fields
          violations.forEach((violation) => {
            expect(violation).toHaveProperty('article');
            expect(violation).toHaveProperty('rule');
            expect(violation).toHaveProperty('severity');
            expect(violation).toHaveProperty('message');
            expect(typeof violation.article).toBe('number');
            expect(violation.article).toBeGreaterThanOrEqual(1);
            expect(violation.article).toBeLessThanOrEqual(13);
            expect(['warning', 'error', 'critical']).toContain(violation.severity);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Destructive Operation Detection
   *
   * For any command with destructive patterns (rm -rf, DROP TABLE, docker rmi),
   * the validator SHALL detect it as destructive.
   *
   * **Feature: mcp-server-transformation, Property 10: Destructive Operation Detection**
   * **Validates: Requirements 4.2, 12.2**
   */
  it('Property 10: Destructive Operation Detection', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Known destructive commands
          fc.record({
            command: fc.constantFrom('rm', 'rmdir', 'del', 'docker'),
            args: fc.constantFrom(
              ['-rf', '/tmp/test'],
              ['-r', '-f', 'file.txt'],
              ['--force', 'container'],
              ['rmi', '--force', 'image']
            ),
          }),
          // SQL destructive commands
          fc.record({
            command: fc.constant('psql'),
            args: fc.constantFrom(['-c', 'DROP TABLE users'], ['-c', 'TRUNCATE logs']),
          }),
          // Git destructive commands
          fc.record({
            command: fc.constant('git'),
            args: fc.constantFrom(['reset', '--hard', 'HEAD'], ['clean', '-fd']),
          })
        ),
        ({ command, args }) => {
          const isDestructive = validator.isDestructive(command, args);

          // All these patterns should be detected as destructive
          expect(isDestructive).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Docker Whitelist Enforcement
   *
   * For any Docker image, only images with whitelisted prefixes
   * (antigravity, test-, dev-) SHALL be allowed.
   *
   * **Feature: mcp-server-transformation, Property 11: Docker Whitelist Enforcement**
   * **Validates: Requirements 4.3, 12.3**
   */
  it('Property 11: Docker Whitelist Enforcement', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Whitelisted images
          fc.record({
            image: fc.oneof(
              fc.constant('antigravity-os'),
              fc.constant('test-container'),
              fc.constant('dev-environment')
            ),
            shouldBeWhitelisted: fc.constant(true),
          }),
          // Non-whitelisted images
          fc.record({
            image: fc.oneof(
              fc.constant('ubuntu'),
              fc.constant('nginx'),
              fc.constant('postgres'),
              fc.constant('redis')
            ),
            shouldBeWhitelisted: fc.constant(false),
          })
        ),
        ({ image, shouldBeWhitelisted }) => {
          const isWhitelisted = validator.isDockerWhitelisted(image);

          expect(isWhitelisted).toBe(shouldBeWhitelisted);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 30: Sensitive Directory Protection
   *
   * For any path targeting sensitive directories (.git, node_modules, .env),
   * the validator SHALL detect it as sensitive.
   *
   * **Feature: mcp-server-transformation, Property 30: Sensitive Directory Protection**
   * **Validates: Requirements 12.4**
   */
  it('Property 30: Sensitive Directory Protection', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Sensitive paths
          fc.record({
            path: fc.constantFrom(
              '.git',
              '.git/config',
              'node_modules',
              'node_modules/package',
              '.env',
              '.env.local',
              '.kiro/logs',
              '.ssh/id_rsa',
              '.aws/credentials'
            ),
            shouldBeSensitive: fc.constant(true),
          }),
          // Non-sensitive paths
          fc.record({
            path: fc.constantFrom('src', 'src/app', 'tests', 'docs', 'README.md', 'package.json'),
            shouldBeSensitive: fc.constant(false),
          })
        ),
        ({ path, shouldBeSensitive }) => {
          const isSensitive = validator.isSensitiveDirectory(path);

          expect(isSensitive).toBe(shouldBeSensitive);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Non-Destructive Commands Are Safe
   *
   * For any non-destructive command (ls, cat, echo without dangerous flags),
   * the validator SHALL NOT detect it as destructive.
   */
  it('Non-destructive commands are not flagged as destructive', () => {
    fc.assert(
      fc.property(
        fc.record({
          command: fc.constantFrom('ls', 'cat', 'echo', 'pwd', 'whoami'),
          args: fc.array(
            fc
              .string({ minLength: 1, maxLength: 20 })
              .filter(
                (s) =>
                  !s.includes('-rf') &&
                  !s.includes('--force') &&
                  !s.includes('DROP') &&
                  !s.includes('TRUNCATE')
              ),
            { maxLength: 5 }
          ),
        }),
        ({ command, args }) => {
          const isDestructive = validator.isDestructive(command, args);

          // Safe commands should not be detected as destructive
          expect(isDestructive).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional Property: Validation Context Completeness
   *
   * For any validation context, the validator SHALL handle
   * missing optional fields gracefully.
   */
  it('Validator handles incomplete contexts gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          command: fc.string({ minLength: 1, maxLength: 20 }),
          args: fc.array(fc.string({ maxLength: 50 }), { maxLength: 10 }),
          cwd: fc.string({ minLength: 1, maxLength: 100 }),
          // user is optional
        }),
        (context: ValidationContext) => {
          // Should not throw
          expect(() => validator.validate(context)).not.toThrow();

          const violations = validator.validate(context);
          expect(Array.isArray(violations)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
