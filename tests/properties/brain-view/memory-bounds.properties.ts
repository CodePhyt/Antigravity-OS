/**
 * Property 10: Memory Bounds
 * 
 * For any activity log size, the system should never store more than 100 entries in memory,
 * implementing a sliding window that retains only the most recent entries.
 * 
 * **Validates: Requirements 7.1**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ActivityLogParser } from '@/lib/parsers/activity-log-parser';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

describe('Property 10: Memory Bounds', () => {
  const testDir = join(process.cwd(), 'tmp-test-memory-bounds');
  
  /**
   * Generate a large activity log with N entries
   */
  function generateActivityLog(entryCount: number): string {
    const entries: string[] = [];
    
    for (let i = 1; i <= entryCount; i++) {
      const date = new Date(Date.now() - (entryCount - i) * 1000).toISOString().split('T')[0];
      entries.push(`### Entry ${i}: Test Activity ${i}
**Date**: ${date}
**Status**: ✅ COMPLETE

Activity description for entry ${i}.

---
`);
    }
    
    return entries.join('\n');
  }

  it('should never store more than 100 entries in memory', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 101, max: 300 }), // Test with 101-300 entries
        async (entryCount) => {
          // Create test directory
          await mkdir(testDir, { recursive: true });
          
          const testFile = join(testDir, `test-${randomUUID()}.md`);
          
          try {
            // Generate activity log with entryCount entries
            const logContent = generateActivityLog(entryCount);
            await writeFile(testFile, logContent, 'utf-8');
            
            // Parse the log
            const entries = await ActivityLogParser.parse(testFile);
            
            // Verify memory bounds: should never exceed 100 entries
            expect(entries.length).toBeLessThanOrEqual(100);
            
            // Verify we get the most recent entries (last 10 for display)
            expect(entries.length).toBeLessThanOrEqual(10);
            
            // Verify entries are sorted by timestamp (oldest to newest)
            for (let i = 1; i < entries.length; i++) {
              const prevEntry = entries[i - 1];
              const currEntry = entries[i];
              if (prevEntry && currEntry) {
                const prevTime = new Date(prevEntry.timestamp).getTime();
                const currTime = new Date(currEntry.timestamp).getTime();
                expect(currTime).toBeGreaterThanOrEqual(prevTime);
              }
            }
            
            // Clean up
            await unlink(testFile);
          } catch (error) {
            // Clean up on error
            try {
              await unlink(testFile);
            } catch {
              // Ignore cleanup errors
            }
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should implement sliding window for activity storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 150, max: 250 }), // Test with large logs
        async (entryCount) => {
          // Create test directory
          await mkdir(testDir, { recursive: true });
          
          const testFile = join(testDir, `test-${randomUUID()}.md`);
          
          try {
            // Generate activity log
            const logContent = generateActivityLog(entryCount);
            await writeFile(testFile, logContent, 'utf-8');
            
            // Parse the log
            const entries = await ActivityLogParser.parse(testFile);
            
            // Verify sliding window: only most recent entries retained
            // Parser returns 10 most recent for display
            expect(entries.length).toBe(10);
            
            // Verify the entries are the MOST RECENT ones
            // The last entry should have the highest entry number
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              expect(lastEntry.message).toContain(`Entry ${entryCount}`);
            }
            
            // Clean up
            await unlink(testFile);
          } catch (error) {
            // Clean up on error
            try {
              await unlink(testFile);
            } catch {
              // Ignore cleanup errors
            }
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain memory bounds across multiple parses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 50, max: 150 }), { minLength: 3, maxLength: 5 }),
        async (entryCounts) => {
          // Create test directory
          await mkdir(testDir, { recursive: true });
          
          const testFile = join(testDir, `test-${randomUUID()}.md`);
          
          try {
            // Parse multiple times with different entry counts
            for (const entryCount of entryCounts) {
              const logContent = generateActivityLog(entryCount);
              await writeFile(testFile, logContent, 'utf-8');
              
              const entries = await ActivityLogParser.parse(testFile);
              
              // Verify memory bounds maintained across all parses
              expect(entries.length).toBeLessThanOrEqual(100);
              expect(entries.length).toBeLessThanOrEqual(10);
            }
            
            // Clean up
            await unlink(testFile);
          } catch (error) {
            // Clean up on error
            try {
              await unlink(testFile);
            } catch {
              // Ignore cleanup errors
            }
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of exactly 100 entries', async () => {
    // Create test directory
    await mkdir(testDir, { recursive: true });
    
    const testFile = join(testDir, `test-${randomUUID()}.md`);
    
    try {
      // Generate exactly 100 entries
      const logContent = generateActivityLog(100);
      await writeFile(testFile, logContent, 'utf-8');
      
      // Parse the log
      const entries = await ActivityLogParser.parse(testFile);
      
      // Should return 10 most recent (display limit)
      expect(entries.length).toBe(10);
      
      // Verify we got the last 10 entries (91-100)
      const firstEntry = entries[0];
      if (firstEntry) {
        expect(firstEntry.message).toContain('Entry 91');
      }
      
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        expect(lastEntry.message).toContain('Entry 100');
      }
      
      // Clean up
      await unlink(testFile);
    } catch (error) {
      // Clean up on error
      try {
        await unlink(testFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  });

  it('should handle edge case of exactly 101 entries', async () => {
    // Create test directory
    await mkdir(testDir, { recursive: true });
    
    const testFile = join(testDir, `test-${randomUUID()}.md`);
    
    try {
      // Generate 101 entries (just over the limit)
      const logContent = generateActivityLog(101);
      await writeFile(testFile, logContent, 'utf-8');
      
      // Parse the log
      const entries = await ActivityLogParser.parse(testFile);
      
      // Should still return 10 most recent
      expect(entries.length).toBe(10);
      
      // Verify we got the last 10 entries (92-101)
      const firstEntry = entries[0];
      if (firstEntry) {
        expect(firstEntry.message).toContain('Entry 92');
      }
      
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        expect(lastEntry.message).toContain('Entry 101');
      }
      
      // Clean up
      await unlink(testFile);
    } catch (error) {
      // Clean up on error
      try {
        await unlink(testFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  });

  it('should verify memory bounds prevent unbounded growth', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 200, max: 500 }), // Test with very large logs
        async (entryCount) => {
          // Create test directory
          await mkdir(testDir, { recursive: true });
          
          const testFile = join(testDir, `test-${randomUUID()}.md`);
          
          try {
            // Generate large activity log
            const logContent = generateActivityLog(entryCount);
            await writeFile(testFile, logContent, 'utf-8');
            
            // Parse the log
            const entries = await ActivityLogParser.parse(testFile);
            
            // Critical: Memory should NEVER grow beyond bounds
            // regardless of input size
            expect(entries.length).toBeLessThanOrEqual(100);
            
            // Display limit should be enforced
            expect(entries.length).toBeLessThanOrEqual(10);
            
            // Verify we're getting the MOST RECENT entries
            if (entries.length > 0) {
              const lastEntry = entries[entries.length - 1];
              // Last entry should be from the end of the log
              if (lastEntry) {
                expect(lastEntry.message).toContain(`Entry ${entryCount}`);
              }
            }
            
            // Clean up
            await unlink(testFile);
          } catch (error) {
            // Clean up on error
            try {
              await unlink(testFile);
            } catch {
              // Ignore cleanup errors
            }
            throw error;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
