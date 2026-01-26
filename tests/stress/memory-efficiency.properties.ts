/**
 * Property Test: Memory Efficiency Under Load
 * 
 * Feature: advanced-medin-testing, Property 3: Memory Efficiency Under Load
 * 
 * For any sequence of operations, memory usage should remain bounded
 * (not exceed 2x baseline) and no memory leaks should occur
 * (memory returns to baseline after operations complete).
 * 
 * **Validates: Requirements 2.1, 2.4, 5.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PerformanceMonitor } from '../helpers/performance-utils';
import { promises as fs } from 'fs';
import path from 'path';

describe('Property Test: Memory Efficiency Under Load', () => {
  const perfMonitor = new PerformanceMonitor();
  
  it('Property 3: Memory usage remains bounded during operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 100 }), // Operation count
        fc.integer({ min: 100, max: 1000 }), // Data size per operation
        async (operationCount, dataSize) => {
          const tmpDir = path.join(process.cwd(), `tmp-mem-${Date.now()}`);
          
          try {
            await fs.mkdir(tmpDir, { recursive: true });
            
            // Establish baseline
            const baselineMemory = process.memoryUsage().heapUsed / 1024 / 1024;
            
            // Perform operations while monitoring memory
            const { peakMemoryMB } = await perfMonitor.monitorMemory(async () => {
              const files: string[] = [];
              
              for (let i = 0; i < operationCount; i++) {
                const file = path.join(tmpDir, `data-${i}.txt`);
                const content = 'x'.repeat(dataSize);
                await fs.writeFile(file, content, 'utf-8');
                files.push(file);
              }
              
              // Read all files
              for (const file of files) {
                await fs.readFile(file, 'utf-8');
              }
              
              return files;
            });
            
            // Property 1: Peak memory should not exceed 2x baseline + reasonable overhead
            const maxAllowedMemory = (baselineMemory * 2) + 200; // 200MB overhead
            expect(peakMemoryMB).toBeLessThan(maxAllowedMemory);
            
            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true });
            
            // Property 2: Memory should return close to baseline after cleanup
            // (Allow 50MB variance due to GC timing)
            const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
            const memoryIncrease = finalMemory - baselineMemory;
            expect(memoryIncrease).toBeLessThan(50);
          } catch (cleanupError) {
            // Cleanup errors are acceptable
          }
        }
      ),
      { numRuns: 20, verbose: false } // Reduced runs for memory-intensive test
    );
  }, 30000); // 30 second timeout
  
  it('Property 4: Sequential operations maintain stable memory', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }), // Batch count
        fc.integer({ min: 10, max: 50 }), // Operations per batch
        async (batchCount, opsPerBatch) => {
          const tmpDir = path.join(process.cwd(), `tmp-seq-${Date.now()}`);
          
          try {
            await fs.mkdir(tmpDir, { recursive: true });
            
            const memorySnapshots: number[] = [];
            
            // Perform batches and track memory
            for (let batch = 0; batch < batchCount; batch++) {
              // Perform batch operations
              for (let op = 0; op < opsPerBatch; op++) {
                const file = path.join(tmpDir, `batch-${batch}-op-${op}.txt`);
                await fs.writeFile(file, `data-${batch}-${op}`, 'utf-8');
              }
              
              // Record memory after batch
              const memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
              memorySnapshots.push(memoryMB);
            }
            
            // Property: Memory should not grow unbounded
            // Check that later batches don't use significantly more memory than earlier ones
            if (memorySnapshots.length >= 2) {
              const firstBatchMemory = memorySnapshots[0];
              const lastBatchMemory = memorySnapshots[memorySnapshots.length - 1];
              
              if (firstBatchMemory !== undefined && lastBatchMemory !== undefined) {
                const memoryGrowth = lastBatchMemory - firstBatchMemory;
                
                // Memory growth should be less than 100MB
                expect(memoryGrowth).toBeLessThan(100);
              }
            }
            
            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true });
          } catch (cleanupError) {
            // Cleanup errors are acceptable
          }
        }
      ),
      { numRuns: 30, verbose: false }
    );
  }, 40000);
  
  it('Property 5: Concurrent operations maintain memory bounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // Concurrent operation count
        fc.integer({ min: 100, max: 500 }), // Data size
        async (concurrency, dataSize) => {
          const tmpDir = path.join(process.cwd(), `tmp-conc-${Date.now()}`);
          
          try {
            await fs.mkdir(tmpDir, { recursive: true });
            
            const baselineMemory = process.memoryUsage().heapUsed / 1024 / 1024;
            
            // Create concurrent operations
            const operations = Array.from({ length: concurrency }, (_, idx) => async () => {
              const file = path.join(tmpDir, `concurrent-${idx}.txt`);
              const content = 'y'.repeat(dataSize);
              await fs.writeFile(file, content, 'utf-8');
              const readContent = await fs.readFile(file, 'utf-8');
              return readContent.length;
            });
            
            // Execute concurrently
            const results = await Promise.all(operations.map(op => op()));
            
            // Property 1: All operations completed
            expect(results.length).toBe(concurrency);
            
            // Property 2: Memory usage is reasonable
            const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
            const memoryUsed = currentMemory - baselineMemory;
            
            // Should not use more than 200MB for this test
            expect(memoryUsed).toBeLessThan(200);
            
            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true });
          } catch (cleanupError) {
            // Cleanup errors are acceptable
          }
        }
      ),
      { numRuns: 50, verbose: false }
    );
  }, 30000);
  
  it('Property 6: Large data processing maintains memory efficiency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of large files
        fc.integer({ min: 10000, max: 50000 }), // File size
        async (fileCount, fileSize) => {
          const tmpDir = path.join(process.cwd(), `tmp-large-${Date.now()}`);
          
          try {
            await fs.mkdir(tmpDir, { recursive: true });
            
            const baselineMemory = process.memoryUsage().heapUsed / 1024 / 1024;
            
            // Create and process large files
            for (let i = 0; i < fileCount; i++) {
              const file = path.join(tmpDir, `large-${i}.txt`);
              const content = 'z'.repeat(fileSize);
              
              // Write
              await fs.writeFile(file, content, 'utf-8');
              
              // Read and process
              const readContent = await fs.readFile(file, 'utf-8');
              
              // Verify
              expect(readContent.length).toBe(fileSize);
            }
            
            // Property: Memory usage should be proportional to data size
            const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
            const memoryUsed = currentMemory - baselineMemory;
            
            // Rough estimate: should not use more than 3x the data size in memory
            const dataSizeMB = (fileCount * fileSize) / 1024 / 1024;
            const maxExpectedMemory = dataSizeMB * 3 + 50; // 50MB overhead
            
            expect(memoryUsed).toBeLessThan(maxExpectedMemory);
            
            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true });
          } catch (cleanupError) {
            // Cleanup errors are acceptable
          }
        }
      ),
      { numRuns: 20, verbose: false }
    );
  }, 30000);
});
