/**
 * Property-Based Tests for Activity Log Parser
 * 
 * Feature: ralphs-brain-view
 * Property 1: Activity Stream Completeness
 * 
 * Validates: Requirements 1.1
 * 
 * For any ACTIVITY_LOG.md file with N entries, when the Brain_API is queried,
 * it should return min(10, N) entries in chronological order.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ActivityLogParser } from '@/lib/parsers/activity-log-parser';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('ActivityLogParser - Property Tests', () => {
  // Generate unique file path for each test to avoid Windows file locking issues
  const getTestFilePath = () => join(process.cwd(), `test-activity-log-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp.md`);

  /**
   * Generate a random activity log entry
   */
  const activityEntryArbitrary = fc.record({
    entryNumber: fc.integer({ min: 1, max: 100 }),
    title: fc.string({ minLength: 5, maxLength: 50 }),
    date: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
      .map(d => d.toISOString().split('T')[0]),
    status: fc.constantFrom('COMPLETE', 'IN PROGRESS', 'FAILED', 'PENDING'),
    statusEmoji: fc.constantFrom('✅', '🔄', '❌', '⏸️'),
  });

  /**
   * Generate a complete activity log markdown file
   */
  function generateActivityLog(entries: Array<{
    entryNumber: number;
    title: string;
    date: string | undefined;
    status: string;
    statusEmoji: string;
  }>): string {
    const header = `# Antigravity OS - Activity Log

**Purpose**: Long-term memory for autonomous operations  
**Started**: 2026-01-22  
**Status**: 🟢 ACTIVE

---

## Activity Entries

`;

    const entryContent = entries.map(entry => `
### Entry ${entry.entryNumber}: ${entry.title}
**Date**: ${entry.date || '2026-01-22'}  
**Phase**: Test Phase  
**Status**: ${entry.statusEmoji} ${entry.status}

**Actions Taken**:
1. Test action 1
2. Test action 2

**Commands Executed**:
- test command

**Validation Results**:
- ✅ Test validation

**Files Created**:
- test-file.ts

**Decisions Made**:
1. Test decision

**Issues Encountered**:
- None

**Next Steps**:
- Continue testing

---
`).join('\n');

    return header + entryContent;
  }

  it('**Property 1: Activity Stream Completeness** - should return min(10, N) entries for any log size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityEntryArbitrary, { minLength: 0, maxLength: 50 }),
        async (entries) => {
          const testFilePath = getTestFilePath();
          
          // Generate activity log content
          const logContent = generateActivityLog(entries);
          
          // Write to temporary file
          await writeFile(testFilePath, logContent, 'utf-8');

          try {
            // Parse the log
            const result = await ActivityLogParser.parse(testFilePath);

            // Property: returned entries = min(10, total_entries)
            const expectedCount = Math.min(10, entries.length);
            expect(result.length).toBe(expectedCount);

            // Property: all returned entries have required fields
            result.forEach(entry => {
              expect(entry).toHaveProperty('id');
              expect(entry).toHaveProperty('timestamp');
              expect(entry).toHaveProperty('message');
              expect(entry).toHaveProperty('level');
              expect(typeof entry.id).toBe('string');
              expect(typeof entry.timestamp).toBe('string');
              expect(typeof entry.message).toBe('string');
              expect(['info', 'success', 'error', 'correction']).toContain(entry.level);
            });

            // Property: entries are in chronological order (latest last)
            if (result.length > 1) {
              for (let i = 0; i < result.length - 1; i++) {
                const currentEntry = result[i];
                const nextEntry = result[i + 1];
                if (currentEntry && nextEntry) {
                  const current = new Date(currentEntry.timestamp);
                  const next = new Date(nextEntry.timestamp);
                  expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
                }
              }
            }
          } finally {
            // Cleanup
            try {
              await unlink(testFilePath);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('**Property 1 (Edge Case)**: should return empty array for empty log file', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const testFilePath = getTestFilePath();
          
          // Create empty log file
          await writeFile(testFilePath, '# Empty Log\n\n', 'utf-8');

          try {
            const result = await ActivityLogParser.parse(testFilePath);
            expect(result).toEqual([]);
          } finally {
            await unlink(testFilePath);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('**Property 1 (Edge Case)**: should return empty array for non-existent file', async () => {
    const nonExistentPath = join(process.cwd(), 'non-existent-file-' + Date.now() + '.md');
    const result = await ActivityLogParser.parse(nonExistentPath);
    expect(result).toEqual([]);
  });

  it('**Property 1 (Correctness)**: should correctly detect activity levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.constantFrom(
            'Self-Correction Event',
            'Error Handling',
            'Task Complete',
            'System Initialization'
          ),
          status: fc.constantFrom('COMPLETE', 'FAILED', 'IN PROGRESS'),
        }),
        async ({ title, status }) => {
          const testFilePath = getTestFilePath();
          
          const entry = {
            entryNumber: 1,
            title,
            date: '2026-01-22',
            status,
            statusEmoji: status === 'COMPLETE' ? '✅' : status === 'FAILED' ? '❌' : '🔄',
          };

          const logContent = generateActivityLog([entry]);
          await writeFile(testFilePath, logContent, 'utf-8');

          try {
            const result = await ActivityLogParser.parse(testFilePath);
            expect(result.length).toBe(1);

            const parsedEntry = result[0];
            expect(parsedEntry).toBeDefined();
            if (!parsedEntry) return;

            // Verify level detection logic
            if (title.toLowerCase().includes('correction')) {
              expect(parsedEntry.level).toBe('correction');
            } else if (title.toLowerCase().includes('error') || status === 'FAILED') {
              expect(parsedEntry.level).toBe('error');
            } else if (title.toLowerCase().includes('complete') || status === 'COMPLETE') {
              expect(parsedEntry.level).toBe('success');
            } else {
              expect(parsedEntry.level).toBe('info');
            }
          } finally {
            await unlink(testFilePath);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
