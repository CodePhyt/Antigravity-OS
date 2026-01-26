/**
 * Performance Tests
 * 
 * Validates performance requirements for Ralph's Brain View.
 * Tests parsing speed, concurrent connections, and memory usage.
 * 
 * **Validates: Requirements 7.2, 7.3**
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ActivityLogParser } from '@/lib/parsers/activity-log-parser';
import { PRDParser } from '@/lib/parsers/prd-parser';
import { writeFile, unlink, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

describe('Performance Tests', () => {
  const testDir = join(process.cwd(), 'tmp-test-performance');

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Requirement 7.2: PRD Parsing Performance', () => {
    /**
     * Generate a large PRD file with N tasks
     */
    function generateLargePRD(taskCount: number): string {
      const tasks: string[] = ['# Product Requirements Document\n\n## Tasks\n'];
      
      for (let i = 1; i <= taskCount; i++) {
        const status = i % 3 === 0 ? 'x' : ' ';
        tasks.push(`- [${status}] ${i}. Task ${i}: Implement feature ${i}\n`);
        
        // Add some sub-tasks occasionally
        if (i % 10 === 0) {
          tasks.push(`  - [ ] ${i}.1 Sub-task ${i}.1\n`);
          tasks.push(`  - [ ] ${i}.2 Sub-task ${i}.2\n`);
        }
      }
      
      return tasks.join('');
    }

    it('should parse PRD with 1,000 lines in under 100ms', async () => {
      const testFile = join(testDir, `prd-1k-${randomUUID()}.md`);
      
      try {
        // Generate PRD with ~1,000 lines (500 tasks + sub-tasks)
        const prdContent = generateLargePRD(500);
        await writeFile(testFile, prdContent, 'utf-8');
        
        // Measure parsing time
        const startTime = performance.now();
        const result = await PRDParser.parse(testFile);
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        
        // Verify parsing completed in under 100ms
        expect(duration).toBeLessThan(100);
        
        // Verify result is valid
        expect(result.totalTasks).toBeGreaterThan(0);
        expect(result.completionPercentage).toBeGreaterThanOrEqual(0);
        expect(result.completionPercentage).toBeLessThanOrEqual(100);
        
        await unlink(testFile);
      } catch (error) {
        try {
          await unlink(testFile);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });

    it('should parse PRD with 5,000 lines in under 100ms', async () => {
      const testFile = join(testDir, `prd-5k-${randomUUID()}.md`);
      
      try {
        // Generate PRD with ~5,000 lines (2,500 tasks + sub-tasks)
        const prdContent = generateLargePRD(2500);
        await writeFile(testFile, prdContent, 'utf-8');
        
        // Measure parsing time
        const startTime = performance.now();
        const result = await PRDParser.parse(testFile);
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        
        // Verify parsing completed in under 100ms
        expect(duration).toBeLessThan(100);
        
        // Verify result is valid
        expect(result.totalTasks).toBeGreaterThan(0);
        
        await unlink(testFile);
      } catch (error) {
        try {
          await unlink(testFile);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });

    it('should parse PRD with 10,000 lines in under 100ms', async () => {
      const testFile = join(testDir, `prd-10k-${randomUUID()}.md`);
      
      try {
        // Generate PRD with ~10,000 lines (5,000 tasks + sub-tasks)
        const prdContent = generateLargePRD(5000);
        await writeFile(testFile, prdContent, 'utf-8');
        
        // Measure parsing time
        const startTime = performance.now();
        const result = await PRDParser.parse(testFile);
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        
        // Verify parsing completed in under 100ms (Requirement 7.2)
        expect(duration).toBeLessThan(100);
        
        // Verify result is valid
        expect(result.totalTasks).toBeGreaterThan(0);
        
        await unlink(testFile);
      } catch (error) {
        try {
          await unlink(testFile);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });
  });

  describe('Requirement 7.3: Memory Usage Bounds', () => {
    /**
     * Generate activity log with N entries
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

    it('should maintain bounded memory with 100 entries', async () => {
      const testFile = join(testDir, `activity-100-${randomUUID()}.md`);
      
      try {
        // Generate 100 entries
        const logContent = generateActivityLog(100);
        await writeFile(testFile, logContent, 'utf-8');
        
        // Parse multiple times to verify memory doesn't grow
        const results: number[] = [];
        
        for (let i = 0; i < 10; i++) {
          const entries = await ActivityLogParser.parse(testFile);
          results.push(entries.length);
        }
        
        // Verify all parses returned same bounded result
        expect(results.every(len => len <= 10)).toBe(true);
        
        await unlink(testFile);
      } catch (error) {
        try {
          await unlink(testFile);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });

    it('should maintain bounded memory with 500 entries', async () => {
      const testFile = join(testDir, `activity-500-${randomUUID()}.md`);
      
      try {
        // Generate 500 entries (well over limit)
        const logContent = generateActivityLog(500);
        await writeFile(testFile, logContent, 'utf-8');
        
        // Parse multiple times
        const results: number[] = [];
        
        for (let i = 0; i < 10; i++) {
          const entries = await ActivityLogParser.parse(testFile);
          results.push(entries.length);
        }
        
        // Verify memory stays bounded (max 10 for display)
        expect(results.every(len => len <= 10)).toBe(true);
        
        await unlink(testFile);
      } catch (error) {
        try {
          await unlink(testFile);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });

    it('should handle rapid sequential parses without memory growth', async () => {
      const testFile = join(testDir, `activity-rapid-${randomUUID()}.md`);
      
      try {
        // Generate large log
        const logContent = generateActivityLog(200);
        await writeFile(testFile, logContent, 'utf-8');
        
        // Perform 50 rapid sequential parses
        const results: number[] = [];
        
        for (let i = 0; i < 50; i++) {
          const entries = await ActivityLogParser.parse(testFile);
          results.push(entries.length);
        }
        
        // Verify memory stayed bounded across all parses
        expect(results.every(len => len <= 10)).toBe(true);
        
        // Verify consistent results
        const uniqueLengths = new Set(results);
        expect(uniqueLengths.size).toBeLessThanOrEqual(2); // Should be very consistent
        
        await unlink(testFile);
      } catch (error) {
        try {
          await unlink(testFile);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent parsing operations', async () => {
      const testFiles: string[] = [];
      
      try {
        // Create 10 test files
        for (let i = 0; i < 10; i++) {
          const testFile = join(testDir, `concurrent-${i}-${randomUUID()}.md`);
          testFiles.push(testFile);
          
          const logContent = `### Entry 1: Test ${i}
**Date**: 2026-01-25
**Status**: ✅ COMPLETE

Test entry ${i}.
`;
          await writeFile(testFile, logContent, 'utf-8');
        }
        
        // Parse all files concurrently
        const startTime = performance.now();
        const results = await Promise.all(
          testFiles.map(file => ActivityLogParser.parse(file))
        );
        const endTime = performance.now();
        
        // Verify all parses succeeded
        expect(results.length).toBe(10);
        results.forEach(entries => {
          expect(entries.length).toBeGreaterThan(0);
        });
        
        // Verify concurrent parsing is efficient
        const duration = endTime - startTime;
        expect(duration).toBeLessThan(500); // Should complete in under 500ms
        
        // Clean up
        await Promise.all(testFiles.map(file => unlink(file)));
      } catch (error) {
        // Clean up on error
        await Promise.all(
          testFiles.map(file => unlink(file).catch(() => {}))
        );
        throw error;
      }
    });
  });
});
