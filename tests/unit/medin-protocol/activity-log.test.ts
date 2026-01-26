/**
 * Unit Tests for Activity Log Manager
 * 
 * Tests specific examples and edge cases for activity logging
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ActivityLogManager } from '@/lib/medin-protocol/activity-log';
import { ActivityEntry } from '@/lib/medin-protocol/types';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

describe('Activity Log Manager - Unit Tests', () => {
  let logManager: ActivityLogManager;
  let testLogPath: string;

  beforeEach(() => {
    // Create unique temp file for each test
    testLogPath = path.join(process.cwd(), `test-activity-log-${randomBytes(8).toString('hex')}.md`);
    logManager = new ActivityLogManager(testLogPath);
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testLogPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('logEntry', () => {
    it('should create log file if it does not exist', async () => {
      const entry: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task-1',
        category: 'task',
        status: 'success',
        details: {
          description: 'Test task completed successfully',
        },
        metadata: {},
      };

      await logManager.logEntry(entry);

      // Verify file exists
      const stats = await fs.stat(testLogPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should append entries without overwriting', async () => {
      const entry1: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task-1',
        category: 'task',
        status: 'success',
        details: { description: 'First entry' },
        metadata: {},
      };

      const entry2: ActivityEntry = {
        timestamp: '2026-01-19T20:01:00.000Z',
        taskId: 'test-task-2',
        category: 'task',
        status: 'success',
        details: { description: 'Second entry' },
        metadata: {},
      };

      await logManager.logEntry(entry1);
      await logManager.logEntry(entry2);

      const entries = await logManager.queryLog();
      expect(entries).toHaveLength(2);
      expect(entries[0]?.taskId).toBe('test-task-1');
      expect(entries[1]?.taskId).toBe('test-task-2');
    });

    it('should format success status with emoji', async () => {
      const entry: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task-1',
        category: 'task',
        status: 'success',
        details: { description: 'Test' },
        metadata: {},
      };

      await logManager.logEntry(entry);

      const content = await fs.readFile(testLogPath, 'utf-8');
      expect(content).toContain('✅ Success');
    });

    it('should format failure status with emoji', async () => {
      const entry: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task-1',
        category: 'task',
        status: 'failure',
        details: { description: 'Test' },
        metadata: {},
      };

      await logManager.logEntry(entry);

      const content = await fs.readFile(testLogPath, 'utf-8');
      expect(content).toContain('❌ Failure');
    });

    it('should include validation results when present', async () => {
      const entry: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task-1',
        category: 'task',
        status: 'success',
        details: {
          description: 'Test',
          validationResults: [
            {
              passed: true,
              evidence: 'File exists',
              confidence: 95,
              duration: 50,
              timestamp: '2026-01-19T20:00:00.000Z',
            },
          ],
        },
        metadata: {},
      };

      await logManager.logEntry(entry);

      const content = await fs.readFile(testLogPath, 'utf-8');
      expect(content).toContain('### Validation Results');
      expect(content).toContain('File exists');
      expect(content).toContain('95% confidence');
    });

    it('should include error context when present', async () => {
      const entry: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task-1',
        category: 'error',
        status: 'failure',
        details: {
          description: 'Test',
          errorContext: {
            message: 'File not found',
            file: 'test.ts',
            line: 42,
            stack: 'Error: File not found\n  at test.ts:42',
          },
        },
        metadata: {},
      };

      await logManager.logEntry(entry);

      const content = await fs.readFile(testLogPath, 'utf-8');
      expect(content).toContain('### Error Context');
      expect(content).toContain('File not found');
      expect(content).toContain('test.ts:42');
    });

    it('should include corrections when present', async () => {
      const entry: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task-1',
        category: 'self-healing',
        status: 'success',
        details: {
          description: 'Test',
          corrections: [
            {
              type: 'spec-update',
              description: 'Updated requirement',
              before: 'Old requirement',
              after: 'New requirement',
              timestamp: '2026-01-19T20:00:00.000Z',
            },
          ],
        },
        metadata: {},
      };

      await logManager.logEntry(entry);

      const content = await fs.readFile(testLogPath, 'utf-8');
      expect(content).toContain('### Corrections Applied');
      expect(content).toContain('spec-update');
      expect(content).toContain('Updated requirement');
    });
  });

  describe('queryLog', () => {
    it('should return empty array for empty log', async () => {
      const entries = await logManager.queryLog();
      expect(entries).toEqual([]);
    });

    it('should filter by task ID', async () => {
      await logManager.logEntry({
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'task-1',
        category: 'task',
        status: 'success',
        details: { description: 'Test 1' },
        metadata: {},
      });

      await logManager.logEntry({
        timestamp: '2026-01-19T20:01:00.000Z',
        taskId: 'task-2',
        category: 'task',
        status: 'success',
        details: { description: 'Test 2' },
        metadata: {},
      });

      const entries = await logManager.queryLog({ taskId: 'task-1' });
      expect(entries).toHaveLength(1);
      expect(entries[0]?.taskId).toBe('task-1');
    });

    it('should filter by status', async () => {
      await logManager.logEntry({
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'task-1',
        category: 'task',
        status: 'success',
        details: { description: 'Test 1' },
        metadata: {},
      });

      await logManager.logEntry({
        timestamp: '2026-01-19T20:01:00.000Z',
        taskId: 'task-2',
        category: 'task',
        status: 'failure',
        details: { description: 'Test 2' },
        metadata: {},
      });

      const entries = await logManager.queryLog({ status: 'failure' });
      expect(entries).toHaveLength(1);
      expect(entries[0]?.status).toBe('failure');
    });

    it('should filter by category', async () => {
      await logManager.logEntry({
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'task-1',
        category: 'task',
        status: 'success',
        details: { description: 'Test 1' },
        metadata: {},
      });

      await logManager.logEntry({
        timestamp: '2026-01-19T20:01:00.000Z',
        taskId: 'task-2',
        category: 'validation',
        status: 'success',
        details: { description: 'Test 2' },
        metadata: {},
      });

      const entries = await logManager.queryLog({ category: 'validation' });
      expect(entries).toHaveLength(1);
      expect(entries[0]?.category).toBe('validation');
    });

    it('should filter by date range', async () => {
      await logManager.logEntry({
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'task-1',
        category: 'task',
        status: 'success',
        details: { description: 'Test 1' },
        metadata: {},
      });

      await logManager.logEntry({
        timestamp: '2026-01-19T21:00:00.000Z',
        taskId: 'task-2',
        category: 'task',
        status: 'success',
        details: { description: 'Test 2' },
        metadata: {},
      });

      await logManager.logEntry({
        timestamp: '2026-01-19T22:00:00.000Z',
        taskId: 'task-3',
        category: 'task',
        status: 'success',
        details: { description: 'Test 3' },
        metadata: {},
      });

      const entries = await logManager.queryLog({
        since: new Date('2026-01-19T20:30:00.000Z'),
        until: new Date('2026-01-19T21:30:00.000Z'),
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]?.taskId).toBe('task-2');
    });

    it('should limit results', async () => {
      for (let i = 0; i < 10; i++) {
        await logManager.logEntry({
          timestamp: `2026-01-19T20:${i.toString().padStart(2, '0')}:00.000Z`,
          taskId: `task-${i}`,
          category: 'task',
          status: 'success',
          details: { description: `Test ${i}` },
          metadata: {},
        });
      }

      const entries = await logManager.queryLog({ limit: 5 });
      expect(entries).toHaveLength(5);
      // Should return last 5 entries
      expect(entries[0]?.taskId).toBe('task-5');
      expect(entries[4]?.taskId).toBe('task-9');
    });
  });

  describe('exportJSON', () => {
    it('should export valid JSON', async () => {
      await logManager.logEntry({
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'task-1',
        category: 'task',
        status: 'success',
        details: { description: 'Test' },
        metadata: {},
      });

      const json = await logManager.exportJSON();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].taskId).toBe('task-1');
    });

    it('should apply filters to export', async () => {
      await logManager.logEntry({
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'task-1',
        category: 'task',
        status: 'success',
        details: { description: 'Test 1' },
        metadata: {},
      });

      await logManager.logEntry({
        timestamp: '2026-01-19T20:01:00.000Z',
        taskId: 'task-2',
        category: 'task',
        status: 'failure',
        details: { description: 'Test 2' },
        metadata: {},
      });

      const json = await logManager.exportJSON({ status: 'failure' });
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].status).toBe('failure');
    });
  });

  describe('archiveOldEntries', () => {
    it('should archive entries before specified date', async () => {
      await logManager.logEntry({
        timestamp: '2026-01-01T00:00:00.000Z',
        taskId: 'old-task',
        category: 'task',
        status: 'success',
        details: { description: 'Old entry' },
        metadata: {},
      });

      await logManager.logEntry({
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'new-task',
        category: 'task',
        status: 'success',
        details: { description: 'New entry' },
        metadata: {},
      });

      await logManager.archiveOldEntries(new Date('2026-01-15T00:00:00.000Z'));

      // Check main log only has new entry
      const entries = await logManager.queryLog();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.taskId).toBe('new-task');

      // Check archive file exists
      const archivePath = path.join(
        path.dirname(testLogPath),
        `${path.basename(testLogPath, '.md')}_archive_2026-01-15.md`
      );
      const archiveExists = await fs.access(archivePath).then(() => true).catch(() => false);
      expect(archiveExists).toBe(true);

      // Clean up archive
      if (archiveExists) {
        await fs.unlink(archivePath);
      }
    });

    it('should not create archive if no old entries', async () => {
      await logManager.logEntry({
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'new-task',
        category: 'task',
        status: 'success',
        details: { description: 'New entry' },
        metadata: {},
      });

      await logManager.archiveOldEntries(new Date('2026-01-15T00:00:00.000Z'));

      // Check main log still has entry
      const entries = await logManager.queryLog();
      expect(entries).toHaveLength(1);

      // Check no archive file created
      const archivePath = path.join(
        path.dirname(testLogPath),
        `${path.basename(testLogPath, '.md')}_archive_2026-01-15.md`
      );
      const archiveExists = await fs.access(archivePath).then(() => true).catch(() => false);
      expect(archiveExists).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty descriptions', async () => {
      const entry: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task',
        category: 'task',
        status: 'success',
        details: { description: '' },
        metadata: {},
      };

      await logManager.logEntry(entry);
      const entries = await logManager.queryLog();

      expect(entries).toHaveLength(1);
      expect(entries[0]?.details.description).toBe('');
    });

    it('should handle special characters in descriptions', async () => {
      const entry: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task',
        category: 'task',
        status: 'success',
        details: { description: 'Test with **bold** and `code`' },
        metadata: {},
      };

      await logManager.logEntry(entry);
      const entries = await logManager.queryLog();

      expect(entries).toHaveLength(1);
      expect(entries[0]?.details.description).toBe('Test with **bold** and `code`');
    });

    it('should handle metadata with various types', async () => {
      const entry: ActivityEntry = {
        timestamp: '2026-01-19T20:00:00.000Z',
        taskId: 'test-task',
        category: 'task',
        status: 'success',
        details: { description: 'Test' },
        metadata: {
          string: 'value',
          number: 42,
          boolean: true,
        },
      };

      await logManager.logEntry(entry);
      const entries = await logManager.queryLog();

      expect(entries).toHaveLength(1);
      expect(entries[0]?.metadata.string).toBe('value');
      expect(entries[0]?.metadata.number).toBe(42);
      expect(entries[0]?.metadata.boolean).toBe(true);
    });
  });
});
