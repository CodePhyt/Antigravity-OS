/**
 * Constitutional Pre-Check Property-Based Tests
 * 
 * Property tests for command safety analysis
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createConstitutionalPreCheck } from '@/lib/medin-protocol/constitutional-pre-check';

describe('Constitutional Pre-Check - Property Tests', () => {
  /**
   * Property 16: Constitutional Pre-Check Always Runs
   * **Validates: Requirements 5.1**
   * 
   * For any shell command execution, constitutional pre-check analysis must occur
   * before the command executes.
   */
  it('Property 16: Constitutional Pre-Check Always Runs', async () => {
    const preCheck = createConstitutionalPreCheck();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (command) => {
          // Execute pre-check analysis
          const result = await preCheck.analyzeCommand(command);

          // Property: Analysis must always return a result
          expect(result).toBeDefined();
          expect(result.safe).toBeDefined();
          expect(result.violations).toBeDefined();
          expect(result.riskLevel).toBeDefined();
          expect(result.recommendation).toBeDefined();

          // Property: Result must have valid structure
          expect(typeof result.safe).toBe('boolean');
          expect(Array.isArray(result.violations)).toBe(true);
          expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
          expect(['allow', 'warn', 'block']).toContain(result.recommendation);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17: Safety Rule Enforcement
   * **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
   * 
   * For any command matching safety violation patterns (file deletion, DB modification,
   * credential exposure), the constitutional pre-check must block execution and suggest
   * alternatives.
   */
  it('Property 17: Safety Rule Enforcement', async () => {
    const preCheck = createConstitutionalPreCheck();

    // Define dangerous command patterns
    const dangerousPatterns = fc.oneof(
      // File deletion patterns
      fc.constant('rm -rf /tmp/test'),
      fc.constant('del /f C:\\test.txt'),
      fc.constant('Remove-Item -Recurse -Force C:\\temp'),
      
      // Database modification patterns
      fc.constant('DROP TABLE users'),
      fc.constant('DROP DATABASE production'),
      fc.constant('TRUNCATE TABLE logs'),
      fc.constant('DELETE FROM users;'),
      
      // Credential exposure patterns
      fc.constant('mysql -p password="secret123"'),
      fc.constant('export API_KEY="sk-1234567890abcdef1234567890abcdef"'),
      fc.constant('curl -H "token="abc123xyz456def789012345678901234""'),
      
      // Network exposure patterns
      fc.constant('npm run dev --host 0.0.0.0'),
      fc.constant('node server.js *:3000')
    );

    await fc.assert(
      fc.asyncProperty(
        dangerousPatterns,
        async (command) => {
          const result = await preCheck.analyzeCommand(command);

          // Property: Dangerous commands must be flagged as unsafe
          expect(result.safe).toBe(false);

          // Property: Violations must be detected
          expect(result.violations.length).toBeGreaterThan(0);

          // Property: Risk level must be at least medium
          expect(['medium', 'high', 'critical']).toContain(result.riskLevel);

          // Property: Critical violations must be blocked
          const hasCritical = result.violations.some(v => v.severity === 'critical');
          if (hasCritical) {
            expect(result.recommendation).toBe('block');
            expect(result.alternative).toBeDefined();
          }

          // Property: Each violation must have required fields
          for (const violation of result.violations) {
            expect(violation.type).toBeDefined();
            expect(violation.severity).toBeDefined();
            expect(violation.description).toBeDefined();
            expect(violation.pattern).toBeDefined();
            expect(['file_deletion', 'db_modification', 'credential_exposure', 'network_exposure']).toContain(violation.type);
            expect(['low', 'medium', 'high', 'critical']).toContain(violation.severity);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Safe Commands Always Allowed
   * 
   * For any command that doesn't match safety patterns, the pre-check must allow execution.
   */
  it('Property: Safe Commands Always Allowed', async () => {
    const preCheck = createConstitutionalPreCheck();

    // Define safe command patterns
    const safeCommands = fc.oneof(
      fc.constant('ls -la /tmp'),
      fc.constant('cat file.txt'),
      fc.constant('echo "Hello World"'),
      fc.constant('npm install'),
      fc.constant('git status'),
      fc.constant('SELECT * FROM users WHERE id = 123'),
      fc.constant('npm run dev --host 127.0.0.1'),
      fc.constant('node server.js localhost:3000')
    );

    await fc.assert(
      fc.asyncProperty(
        safeCommands,
        async (command) => {
          const result = await preCheck.analyzeCommand(command);

          // Property: Safe commands must be allowed
          expect(result.safe).toBe(true);
          expect(result.violations).toHaveLength(0);
          expect(result.riskLevel).toBe('low');
          expect(result.recommendation).toBe('allow');
          expect(result.alternative).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Alternative Suggestions for Blocked Commands
   * 
   * For any blocked command, an alternative suggestion must be provided.
   */
  it('Property: Alternative Suggestions for Blocked Commands', async () => {
    const preCheck = createConstitutionalPreCheck();

    const blockedCommands = fc.oneof(
      fc.constant('rm -rf /tmp/test'),
      fc.constant('DROP TABLE users'),
      fc.constant('mysql -p password="secret"'),
      fc.constant('npm run dev --host 0.0.0.0')
    );

    await fc.assert(
      fc.asyncProperty(
        blockedCommands,
        async (command) => {
          const result = await preCheck.analyzeCommand(command);

          // Property: Blocked commands must have alternatives
          if (result.recommendation === 'block') {
            expect(result.alternative).toBeDefined();
            expect(typeof result.alternative).toBe('string');
            expect(result.alternative!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Risk Level Consistency
   * 
   * For any command, risk level must be consistent with violations detected.
   */
  it('Property: Risk Level Consistency', async () => {
    const preCheck = createConstitutionalPreCheck();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (command) => {
          const result = await preCheck.analyzeCommand(command);

          // Property: No violations = low risk
          if (result.violations.length === 0) {
            expect(result.riskLevel).toBe('low');
          }

          // Property: Critical violations = critical risk
          const hasCritical = result.violations.some(v => v.severity === 'critical');
          if (hasCritical) {
            expect(result.riskLevel).toBe('critical');
          }

          // Property: High violations without critical = high risk
          const hasHigh = result.violations.some(v => v.severity === 'high');
          if (hasHigh && !hasCritical) {
            expect(['high', 'medium']).toContain(result.riskLevel);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Recommendation Consistency
   * 
   * For any command, recommendation must be consistent with risk level.
   */
  it('Property: Recommendation Consistency', async () => {
    const preCheck = createConstitutionalPreCheck();

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (command) => {
          const result = await preCheck.analyzeCommand(command);

          // Property: Critical risk = block
          if (result.riskLevel === 'critical') {
            expect(result.recommendation).toBe('block');
          }

          // Property: Low risk = allow
          if (result.riskLevel === 'low') {
            expect(result.recommendation).toBe('allow');
          }

          // Property: Medium risk = warn
          if (result.riskLevel === 'medium') {
            expect(result.recommendation).toBe('warn');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
