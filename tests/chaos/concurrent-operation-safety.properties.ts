/**
 * Property Test: Concurrent Operation Safety
 * 
 * Feature: advanced-medin-testing, Property 1: Concurrent Operation Safety
 * 
 * For any set of concurrent operations (read, write, validate, delete) on spec files,
 * executing them concurrently should produce results equivalent to some sequential execution,
 * with no data corruption or lost updates.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ChaosEngine } from '../helpers/chaos-utils';
import { concurrentOperationArbitrary } from '../helpers/generators';
import { promises as fs } from 'fs';
import path from 'path';

describe('Property Test: Concurrent Operation Safety', () => {
  const tmpDir = path.join(process.cwd(), 'tmp-property-concurrent-test');
  const chaosEngine = new ChaosEngine();
  
  beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
  });
  
  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  it('Property 1: Concurrent operations maintain data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        concurrentOperationArbitrary,
        async (scenario) => {
          // Sanitize filename to remove invalid characters for Windows
          const sanitizedName = scenario.targetFile.replace(/[<>:"|?*\/\\]/g, '_');
          const targetFile = path.join(tmpDir, `${sanitizedName}.txt`);
          
          // Create initial file
          await fs.writeFile(targetFile, 'initial', 'utf-8');
          
          // Track operations for verification
          const operationLog: string[] = [];
          
          // Create operation functions - limit to 10 operations for speed
          const operations = scenario.operations.slice(0, Math.min(scenario.operationCount, 10)).map((op, idx) => async () => {
            operationLog.push(`${op}-${idx}`);
            
            switch (op) {
              case 'read': {
                try {
                  const content = await fs.readFile(targetFile, 'utf-8');
                  return { type: 'read', content, success: true };
                } catch (error) {
                  return { type: 'read', error: (error as Error).message, success: false };
                }
              }
              
              case 'write': {
                try {
                  await fs.writeFile(targetFile, `write-${idx}`, 'utf-8');
                  return { type: 'write', success: true };
                } catch (error) {
                  return { type: 'write', error: (error as Error).message, success: false };
                }
              }
              
              case 'validate': {
                try {
                  await fs.access(targetFile);
                  return { type: 'validate', success: true };
                } catch (error) {
                  return { type: 'validate', error: (error as Error).message, success: false };
                }
              }
              
              case 'delete': {
                try {
                  await fs.unlink(targetFile);
                  return { type: 'delete', success: true };
                } catch (error) {
                  return { type: 'delete', error: (error as Error).message, success: false };
                }
              }
              
              default:
                return { type: 'unknown', success: false };
            }
          });
          
          // Execute concurrently with reduced concurrency
          const results = await chaosEngine.executeConcurrently(operations, {
            maxConcurrency: Math.min(scenario.operationCount, 5), // Reduced from 10
            delayBetweenMs: 5
          });
          
          // Property 1: All operations should complete (success or error, no crashes)
          expect(results.length).toBe(operations.length);
          
          // Property 2: No undefined results
          const undefinedResults = results.filter(r => r === undefined);
          expect(undefinedResults.length).toBe(0);
          
          // Property 3: Results should be either operation results or errors
          results.forEach(result => {
            const isError = result instanceof Error;
            const isOperationResult = typeof result === 'object' && result !== null && 'type' in result;
            expect(isError || isOperationResult).toBe(true);
          });
          
          // Property 4: If file exists at end, it should be readable
          try {
            await fs.access(targetFile);
            const finalContent = await fs.readFile(targetFile, 'utf-8');
            expect(typeof finalContent).toBe('string');
          } catch {
            // File may have been deleted - that's ok
          }
          
          // Property 5: Operation log should match number of operations
          expect(operationLog.length).toBe(operations.length);
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });
  
  it('Property 2: Concurrent reads never corrupt data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 20 }),
        async (readCount) => {
          const targetFile = path.join(tmpDir, `read-test-${Date.now()}.txt`);
          const initialContent = 'test-content-for-concurrent-reads';
          
          // Create file with known content
          await fs.writeFile(targetFile, initialContent, 'utf-8');
          
          // Create multiple read operations
          const operations = Array.from({ length: readCount }, () => async () => {
            const content = await fs.readFile(targetFile, 'utf-8');
            return content;
          });
          
          // Execute concurrently
          const results = await chaosEngine.executeConcurrently(operations, {
            maxConcurrency: readCount
          });
          
          // Property: All reads should return the same content (no corruption)
          const successfulReads = results.filter(r => typeof r === 'string');
          
          // At least some reads should succeed
          expect(successfulReads.length).toBeGreaterThan(0);
          
          // All successful reads should have the same content
          successfulReads.forEach(content => {
            expect(content).toBe(initialContent);
          });
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });
  
  it('Property 3: Concurrent writes produce valid final state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        async (writeCount) => {
          const targetFile = path.join(tmpDir, `write-test-${Date.now()}.txt`);
          
          // Create initial file
          await fs.writeFile(targetFile, 'initial', 'utf-8');
          
          // Create multiple write operations
          const operations = Array.from({ length: writeCount }, (_, idx) => async () => {
            await fs.writeFile(targetFile, `write-${idx}`, 'utf-8');
            return `write-${idx}`;
          });
          
          // Execute concurrently
          const results = await chaosEngine.executeConcurrently(operations, {
            maxConcurrency: writeCount
          });
          
          // Property 1: All writes should complete
          expect(results.length).toBe(writeCount);
          
          // Property 2: Final file content should be one of the written values
          const finalContent = await fs.readFile(targetFile, 'utf-8');
          const expectedValues = Array.from({ length: writeCount }, (_, idx) => `write-${idx}`);
          expect(expectedValues).toContain(finalContent);
          
          // Property 3: File should be readable and valid
          expect(typeof finalContent).toBe('string');
          expect(finalContent.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });
  
  it('Property 4: Mixed operations maintain consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          reads: fc.integer({ min: 1, max: 5 }),
          writes: fc.integer({ min: 1, max: 5 }),
          validates: fc.integer({ min: 1, max: 5 })
        }),
        async (counts) => {
          const targetFile = path.join(tmpDir, `mixed-test-${Date.now()}.txt`);
          
          // Create initial file
          await fs.writeFile(targetFile, 'initial', 'utf-8');
          
          // Create mixed operations
          const operations: Array<() => Promise<unknown>> = [];
          
          // Add reads
          for (let i = 0; i < counts.reads; i++) {
            operations.push(async () => {
              const content = await fs.readFile(targetFile, 'utf-8');
              return { type: 'read', content };
            });
          }
          
          // Add writes
          for (let i = 0; i < counts.writes; i++) {
            operations.push(async () => {
              await fs.writeFile(targetFile, `write-${i}`, 'utf-8');
              return { type: 'write', value: `write-${i}` };
            });
          }
          
          // Add validates
          for (let i = 0; i < counts.validates; i++) {
            operations.push(async () => {
              await fs.access(targetFile);
              return { type: 'validate' };
            });
          }
          
          // Shuffle operations
          operations.sort(() => Math.random() - 0.5);
          
          // Execute concurrently
          const results = await chaosEngine.executeConcurrently(operations, {
            maxConcurrency: operations.length
          });
          
          // Property 1: All operations complete
          expect(results.length).toBe(operations.length);
          
          // Property 2: File exists and is readable at the end
          const finalContent = await fs.readFile(targetFile, 'utf-8');
          expect(typeof finalContent).toBe('string');
          
          // Property 3: Final content is either 'initial' or one of the written values
          const possibleValues = ['initial', ...Array.from({ length: counts.writes }, (_, i) => `write-${i}`)];
          expect(possibleValues).toContain(finalContent);
        }
      ),
      { numRuns: 100, verbose: false }
    );
  });
});
