/**
 * Property-Based Tests for Graceful Error Handling
 * 
 * **Property 5: Graceful Error Handling**
 * **Validates: Requirements 2.3, 8.1, 8.2, 8.4, 8.5**
 * 
 * For any invalid or malformed input (missing files, invalid syntax, parsing errors),
 * the system should return a structured error response, maintain previous valid state,
 * and continue operating without crashing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ActivityLogParser } from '@/lib/parsers/activity-log-parser';
import { PRDParser } from '@/lib/parsers/prd-parser';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Error Handling - Property-Based Tests', () => {
  const testDir = join(process.cwd(), `test-error-handling-${Date.now()}`);

  beforeEach(async () => {
    // Create test directory
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      const { rm } = await import('fs/promises');
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('Property 5: Graceful Error Handling', () => {
    it('should handle missing files without crashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // Random filename
          async (filename) => {
            const filepath = join(testDir, `${filename}.md`);
            
            // Try to parse non-existent file
            const activityResult = await ActivityLogParser.parse(filepath);
            const prdResult = await PRDParser.parse(filepath);

            // Should return empty arrays/objects, not throw
            expect(Array.isArray(activityResult)).toBe(true);
            expect(activityResult.length).toBe(0);
            
            expect(prdResult).toHaveProperty('totalTasks');
            expect(prdResult.totalTasks).toBe(0);
            expect(prdResult.tasks.length).toBe(0);

            return true;
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });

    it('should handle corrupted file content gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 1000 }), // Random content
          async (content) => {
            const activityPath = join(testDir, `activity-${Date.now()}-${Math.random()}.md`);
            const prdPath = join(testDir, `prd-${Date.now()}-${Math.random()}.md`);

            try {
              // Write random/corrupted content
              await writeFile(activityPath, content, 'utf-8');
              await writeFile(prdPath, content, 'utf-8');

              // Parse should not crash
              const activityResult = await ActivityLogParser.parse(activityPath);
              const prdResult = await PRDParser.parse(prdPath);

              // Should return valid structures
              expect(Array.isArray(activityResult)).toBe(true);
              expect(prdResult).toHaveProperty('totalTasks');
              expect(prdResult).toHaveProperty('completionPercentage');

              return true;
            } finally {
              // Cleanup
              try {
                await unlink(activityPath);
                await unlink(prdPath);
              } catch (error) {
                // File might not exist
              }
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });

    it('should maintain valid structure with invalid markdown', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 0, maxLength: 50 }), // Random lines
          async (lines) => {
            const content = lines.join('\n');
            const filepath = join(testDir, `test-${Date.now()}-${Math.random()}.md`);

            try {
              await writeFile(filepath, content, 'utf-8');

              // Parse both types
              const activityResult = await ActivityLogParser.parse(filepath);
              const prdResult = await PRDParser.parse(filepath);

              // Should return valid structures (possibly empty)
              expect(Array.isArray(activityResult)).toBe(true);
              expect(activityResult.every(entry => 
                entry.id && entry.timestamp && entry.message && entry.level
              )).toBe(true);

              expect(prdResult).toHaveProperty('totalTasks');
              expect(prdResult).toHaveProperty('completedTasks');
              expect(prdResult).toHaveProperty('completionPercentage');
              expect(Array.isArray(prdResult.tasks)).toBe(true);

              // Completion percentage should be valid (0-100)
              expect(prdResult.completionPercentage).toBeGreaterThanOrEqual(0);
              expect(prdResult.completionPercentage).toBeLessThanOrEqual(100);

              return true;
            } finally {
              try {
                await unlink(filepath);
              } catch (error) {
                // File might not exist
              }
            }
          }
        ),
        { numRuns: 50, timeout: 15000 } // Reduced runs for file I/O
      );
    }, 20000); // Test timeout

    it('should handle special characters without crashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.unicodeString({ minLength: 0, maxLength: 500 }), // Unicode content
          async (content) => {
            const filepath = join(testDir, `unicode-${Date.now()}-${Math.random()}.md`);

            try {
              await writeFile(filepath, content, 'utf-8');

              // Should not crash with unicode/special chars
              const activityResult = await ActivityLogParser.parse(filepath);
              const prdResult = await PRDParser.parse(filepath);

              expect(Array.isArray(activityResult)).toBe(true);
              expect(prdResult).toHaveProperty('totalTasks');

              return true;
            } finally {
              try {
                await unlink(filepath);
              } catch (error) {
                // File might not exist
              }
            }
          }
        ),
        { numRuns: 50, timeout: 15000 }
      );
    }, 20000);

    it('should return consistent empty state for errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No input needed
          async () => {
            const nonExistentPath = join(testDir, `non-existent-${Date.now()}.md`);

            // Parse non-existent file multiple times
            const result1 = await PRDParser.parse(nonExistentPath);
            const result2 = await PRDParser.parse(nonExistentPath);

            // Should return consistent empty state
            expect(result1).toEqual(result2);
            expect(result1.totalTasks).toBe(0);
            expect(result1.completedTasks).toBe(0);
            expect(result1.completionPercentage).toBe(0);
            expect(result1.tasks.length).toBe(0);

            return true;
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });
  });

  describe('Property: System Continues Operating', () => {
    it('should not throw exceptions for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(null), // Missing file
            fc.string(), // Random content
            fc.unicodeString(), // Unicode content
            fc.array(fc.string()).map(arr => arr.join('\n')) // Random lines
          ),
          async (input) => {
            const filepath = join(testDir, `test-${Date.now()}-${Math.random()}.md`);

            try {
              if (input !== null) {
                await writeFile(filepath, input, 'utf-8');
              }

              // Should never throw
              let activityError = null;
              let prdError = null;

              try {
                await ActivityLogParser.parse(filepath);
              } catch (error) {
                activityError = error;
              }

              try {
                await PRDParser.parse(filepath);
              } catch (error) {
                prdError = error;
              }

              // No exceptions should be thrown
              expect(activityError).toBeNull();
              expect(prdError).toBeNull();

              return true;
            } finally {
              try {
                await unlink(filepath);
              } catch (error) {
                // File might not exist
              }
            }
          }
        ),
        { numRuns: 50, timeout: 15000 }
      );
    }, 20000);
  });
});
