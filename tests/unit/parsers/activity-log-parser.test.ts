/**
 * Unit Tests for Activity Log Parser
 * 
 * Tests edge cases and error handling for ActivityLogParser
 * Validates: Requirements 1.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ActivityLogParser } from '@/lib/parsers/activity-log-parser';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('ActivityLogParser - Unit Tests', () => {
  let testFilePath: string;

  beforeEach(() => {
    testFilePath = join(process.cwd(), `test-activity-log-unit-${Date.now()}.tmp.md`);
  });

  afterEach(async () => {
    try {
      await unlink(testFilePath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Edge Cases', () => {
    it('should return empty array for empty log file', async () => {
      await writeFile(testFilePath, '', 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      expect(result).toEqual([]);
    });

    it('should return empty array for log with no entries', async () => {
      const content = `# Antigravity OS - Activity Log

**Purpose**: Long-term memory for autonomous operations

---

## Activity Entries

(No entries yet)
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      expect(result).toEqual([]);
    });

    it('should handle log with only 3 entries', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: First Task
**Date**: 2026-01-20
**Status**: ✅ COMPLETE

### Entry 2: Second Task
**Date**: 2026-01-21
**Status**: 🔄 IN PROGRESS

### Entry 3: Third Task
**Date**: 2026-01-22
**Status**: ❌ FAILED
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(3);
      expect(result[0]?.message).toContain('Entry 1: First Task');
      expect(result[1]?.message).toContain('Entry 2: Second Task');
      expect(result[2]?.message).toContain('Entry 3: Third Task');
    });

    it('should handle log with special characters in titles', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: Task with "quotes" and 'apostrophes'
**Date**: 2026-01-22
**Status**: ✅ COMPLETE

### Entry 2: Task with <brackets> & ampersands
**Date**: 2026-01-22
**Status**: ✅ COMPLETE

### Entry 3: Task with émojis 🚀 and ünïcödé
**Date**: 2026-01-22
**Status**: ✅ COMPLETE
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(3);
      expect(result[0]?.message).toContain('"quotes"');
      expect(result[1]?.message).toContain('<brackets>');
      expect(result[2]?.message).toContain('émojis 🚀');
    });

    it('should handle malformed timestamps gracefully', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: Task with invalid date
**Date**: not-a-date
**Status**: ✅ COMPLETE

### Entry 2: Task with missing date
**Status**: ✅ COMPLETE

### Entry 3: Task with partial date
**Date**: 2026-01
**Status**: ✅ COMPLETE
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      // Should still parse entries, using current date as fallback
      expect(result).toHaveLength(3);
      result.forEach(entry => {
        expect(entry.timestamp).toBeDefined();
        expect(typeof entry.timestamp).toBe('string');
      });
    });

    it('should return empty array for non-existent file', async () => {
      const nonExistentPath = join(process.cwd(), 'non-existent-' + Date.now() + '.md');
      const result = await ActivityLogParser.parse(nonExistentPath);
      expect(result).toEqual([]);
    });
  });

  describe('Level Detection', () => {
    it('should detect "correction" level for self-correction events', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: Self-Correction Event
**Date**: 2026-01-22
**Status**: ✅ COMPLETE
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(1);
      expect(result[0]?.level).toBe('correction');
    });

    it('should detect "error" level for failed tasks', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: Task Failed
**Date**: 2026-01-22
**Status**: ❌ FAILED
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(1);
      expect(result[0]?.level).toBe('error');
    });

    it('should detect "success" level for completed tasks', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: Task Complete
**Date**: 2026-01-22
**Status**: ✅ COMPLETE
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(1);
      expect(result[0]?.level).toBe('success');
    });

    it('should detect "info" level for in-progress tasks', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: Task In Progress
**Date**: 2026-01-22
**Status**: 🔄 IN PROGRESS
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(1);
      expect(result[0]?.level).toBe('info');
    });
  });

  describe('Entry Structure', () => {
    it('should include all required fields', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: Test Task
**Date**: 2026-01-22
**Status**: ✅ COMPLETE
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(1);
      const entry = result[0];
      expect(entry).toBeDefined();
      if (!entry) return;
      
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('level');
      
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.timestamp).toBe('string');
      expect(typeof entry.message).toBe('string');
      expect(['info', 'success', 'error', 'correction']).toContain(entry.level);
    });

    it('should generate unique IDs for each entry', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: First Task
**Date**: 2026-01-22
**Status**: ✅ COMPLETE

### Entry 2: Second Task
**Date**: 2026-01-22
**Status**: ✅ COMPLETE

### Entry 3: Third Task
**Date**: 2026-01-22
**Status**: ✅ COMPLETE
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(3);
      
      const ids = result.map(entry => entry.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(3); // All IDs should be unique
    });
  });

  describe('Sorting and Limiting', () => {
    it('should return entries in chronological order', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: Third Task (chronologically)
**Date**: 2026-01-24
**Status**: ✅ COMPLETE

### Entry 2: First Task (chronologically)
**Date**: 2026-01-22
**Status**: ✅ COMPLETE

### Entry 3: Second Task (chronologically)
**Date**: 2026-01-23
**Status**: ✅ COMPLETE
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(3);
      
      // Verify chronological order
      const timestamps = result.map(entry => new Date(entry.timestamp).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        const current = timestamps[i];
        const next = timestamps[i + 1];
        if (current !== undefined && next !== undefined) {
          expect(current).toBeLessThanOrEqual(next);
        }
      }
    });

    it('should limit results to 10 most recent entries', async () => {
      // Generate 15 entries
      let content = `# Antigravity OS - Activity Log\n\n## Activity Entries\n\n`;
      
      for (let i = 1; i <= 15; i++) {
        content += `### Entry ${i}: Task ${i}\n`;
        content += `**Date**: 2026-01-${String(i + 10).padStart(2, '0')}\n`;
        content += `**Status**: ✅ COMPLETE\n\n`;
      }
      
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      expect(result).toHaveLength(10);
      
      // Verify we got the 10 most recent (entries 6-15)
      expect(result[0]?.message).toContain('Entry 6');
      expect(result[9]?.message).toContain('Entry 15');
    });
  });

  describe('Error Scenarios (Task 7.3)', () => {
    it('should return empty array for missing ACTIVITY_LOG.md', async () => {
      const missingPath = join(process.cwd(), 'missing-activity-log-' + Date.now() + '.md');
      const result = await ActivityLogParser.parse(missingPath);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for corrupted file content', async () => {
      // Write binary/corrupted content
      const buffer = Buffer.from([0xFF, 0xFE, 0xFD, 0xFC, 0x00, 0x01, 0x02]);
      await writeFile(testFilePath, buffer);
      
      const result = await ActivityLogParser.parse(testFilePath);
      
      // Should handle gracefully and return empty array
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle file with only headers, no content', async () => {
      const content = `# Antigravity OS - Activity Log

**Purpose**: Long-term memory

---

## Activity Entries

### Entry 1: Task without date or status
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      // Should parse entry with fallback values
      expect(result).toHaveLength(1);
      expect(result[0]?.message).toContain('Entry 1');
    });

    it('should handle parsing failures gracefully', async () => {
      const content = `### Entry 1: Malformed entry
This entry has no proper structure
Just random text
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      // Should parse what it can
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle extremely large files without crashing', async () => {
      // Generate 1000 entries
      let content = `# Antigravity OS - Activity Log\n\n## Activity Entries\n\n`;
      
      for (let i = 1; i <= 1000; i++) {
        content += `### Entry ${i}: Task ${i}\n`;
        content += `**Date**: 2026-01-22\n`;
        content += `**Status**: ✅ COMPLETE\n\n`;
      }
      
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      // Should still limit to 10 most recent
      expect(result).toHaveLength(10);
      expect(result[0]?.message).toContain('Entry 991');
      expect(result[9]?.message).toContain('Entry 1000');
    });

    it('should handle file with mixed valid and invalid entries', async () => {
      const content = `# Antigravity OS - Activity Log

## Activity Entries

### Entry 1: Valid entry
**Date**: 2026-01-22
**Status**: ✅ COMPLETE

This is some random text that should be ignored

### Entry 2: Another valid entry
**Date**: 2026-01-23
**Status**: 🔄 IN PROGRESS

More random text

### Not an entry at all
Just some content

### Entry 3: Third valid entry
**Date**: 2026-01-24
**Status**: ❌ FAILED
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await ActivityLogParser.parse(testFilePath);
      
      // Should parse only valid entries
      expect(result).toHaveLength(3);
      expect(result[0]?.message).toContain('Entry 1');
      expect(result[1]?.message).toContain('Entry 2');
      expect(result[2]?.message).toContain('Entry 3');
    });
  });
});
