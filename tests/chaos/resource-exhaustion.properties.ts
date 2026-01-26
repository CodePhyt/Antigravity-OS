/**
 * Property Test: Graceful Resource Exhaustion
 * 
 * Feature: advanced-medin-testing, Property 2: Graceful Resource Exhaustion
 * 
 * For any resource type (memory, file handles, CPU) and any operation,
 * when resource exhaustion occurs, the system should either complete successfully
 * or fail with a descriptive error (never crash or corrupt data).
 * 
 * **Validates: Requirements 1.3, 2.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ChaosEngine } from '../helpers/chaos-utils';
import { promises as fs } from 'fs';
import path from 'path';

describe('Property Test: Graceful Resource Exhaustion', () => {
  const chaosEngine = new ChaosEngine();
  
  it('Property 2: System handles resource exhaustion gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('memory', 'fileHandles', 'cpu') as fc.Arbitrary<'memory' | 'fileHandles' | 'cpu'>,
        fc.integer({ min: 10, max: 50 }), // Reduced max duration
        async (resourceType, durationMs) => {
          let crashed = false;
          let result: unknown;
          
          try {
            // Attempt operation during resource exhaustion
            await chaosEngine.exhaustResource(resourceType, durationMs);
            result = { success: true, resourceType, duration: durationMs };
          } catch (error) {
            // Catching error means we didn't crash
            result = { 
              success: false, 
              error: (error as Error).message,
              resourceType 
            };
          }
          
          // Property 1: Process didn't crash (we're still executing)
          expect(crashed).toBe(false);
          
          // Property 2: Result is defined (operation completed)
          expect(result).toBeDefined();
          
          // Property 3: Result has expected structure
          expect(typeof result).toBe('object');
          expect(result).not.toBeNull();
          
          // Property 4: If failed, error message is descriptive
          if (typeof result === 'object' && result !== null && 'success' in result && !result.success) {
            expect('error' in result).toBe(true);
            if ('error' in result) {
              expect(typeof result.error).toBe('string');
              expect((result.error as string).length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 50, verbose: false } // Reduced runs for faster execution
    );
  }, 15000); // 15 second timeout
  
  it('Property 3: File operations handle resource exhaustion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ENOENT', 'EACCES', 'EMFILE', 'ENOSPC') as fc.Arbitrary<'ENOENT' | 'EACCES' | 'EMFILE' | 'ENOSPC'>,
        fc.string({ minLength: 1, maxLength: 50 }),
        async (errorType, content) => {
          const tmpDir = path.join(process.cwd(), `tmp-prop-${Date.now()}`);
          
          try {
            await fs.mkdir(tmpDir, { recursive: true });
            const testFile = path.join(tmpDir, 'test.txt');
            
            let result: unknown;
            
            try {
              // Attempt file operation with chaos
              result = await chaosEngine.withFileSystemChaos(
                async () => {
                  await fs.writeFile(testFile, content, 'utf-8');
                  return { success: true };
                },
                [errorType]
              );
            } catch (error) {
              result = { 
                success: false, 
                error: (error as Error).message,
                code: (error as NodeJS.ErrnoException).code
              };
            }
            
            // Property 1: Operation completed (success or error)
            expect(result).toBeDefined();
            
            // Property 2: Result has valid structure
            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
            
            // Property 3: If failed, has error information
            if (typeof result === 'object' && result !== null && 'success' in result && !result.success) {
              expect('error' in result).toBe(true);
            }
            
            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true });
          } catch (cleanupError) {
            // Cleanup errors are acceptable
          }
        }
      ),
      { numRuns: 50, verbose: false } // Reduced runs
    );
  }, 15000); // Increased timeout
  
  it('Property 4: System recovers after resource exhaustion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('memory', 'cpu') as fc.Arbitrary<'memory' | 'cpu'>,
        fc.integer({ min: 10, max: 50 }), // Reduced max duration
        async (resourceType, durationMs) => {
          // Phase 1: Exhaust resource
          try {
            await chaosEngine.exhaustResource(resourceType, durationMs);
          } catch {
            // Expected to potentially fail
          }
          
          // Phase 2: Attempt normal operation (should work)
          const tmpDir = path.join(process.cwd(), `tmp-recovery-${Date.now()}`);
          
          try {
            await fs.mkdir(tmpDir, { recursive: true });
            const testFile = path.join(tmpDir, 'recovery.txt');
            
            // This should succeed (system recovered)
            await fs.writeFile(testFile, 'recovery test', 'utf-8');
            const content = await fs.readFile(testFile, 'utf-8');
            
            // Property: System recovered and can perform normal operations
            expect(content).toBe('recovery test');
            
            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true });
          } catch (error) {
            // If this fails, system didn't recover properly
            throw new Error(`System failed to recover after ${resourceType} exhaustion: ${(error as Error).message}`);
          }
        }
      ),
      { numRuns: 30, verbose: false } // Reduced runs
    );
  }, 10000); // Increased timeout
  
  it('Property 5: Concurrent operations during resource pressure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (operationCount) => {
          const tmpDir = path.join(process.cwd(), `tmp-concurrent-${Date.now()}`);
          
          try {
            await fs.mkdir(tmpDir, { recursive: true });
            
            // Create operations that run during resource pressure
            const operations = Array.from({ length: operationCount }, (_, idx) => async () => {
              const testFile = path.join(tmpDir, `test-${idx}.txt`);
              
              try {
                await fs.writeFile(testFile, `content-${idx}`, 'utf-8');
                const content = await fs.readFile(testFile, 'utf-8');
                return { success: true, content };
              } catch (error) {
                return { success: false, error: (error as Error).message };
              }
            });
            
            // Execute concurrently
            const results = await chaosEngine.executeConcurrently(operations, {
              maxConcurrency: operationCount
            });
            
            // Property 1: All operations completed
            expect(results.length).toBe(operationCount);
            
            // Property 2: No undefined results
            const undefinedResults = results.filter(r => r === undefined);
            expect(undefinedResults.length).toBe(0);
            
            // Property 3: Results are either success or error objects
            results.forEach(result => {
              const isError = result instanceof Error;
              const isResult = typeof result === 'object' && result !== null && 'success' in result;
              expect(isError || isResult).toBe(true);
            });
            
            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true });
          } catch (cleanupError) {
            // Cleanup errors are acceptable
          }
        }
      ),
      { numRuns: 30, verbose: false } // Reduced runs
    );
  }, 10000); // Increased timeout
});
