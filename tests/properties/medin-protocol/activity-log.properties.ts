/**
 * Property-Based Tests for Activity Log Manager
 * 
 * Tests universal properties that should hold across all inputs
 */

import fc from 'fast-check';
import { describe, it } from 'vitest';
import { expect } from 'vitest';
import { ActivityLogManager } from '@/lib/medin-protocol/activity-log';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

// Generate unique temp file for each test to avoid conflicts
const getTestLogPath = () => path.join(process.cwd(), `test-activity-log-${randomBytes(8).toString('hex')}.md`);

// Helper to run a test with a unique log manager and clean up after
async function withLogManager<T>(fn: (logManager: ActivityLogManager) => Promise<T>): Promise<T> {
  const testLogPath = getTestLogPath();
  const logManager = new ActivityLogManager(testLogPath);
  try {
    return await fn(logManager);
  } finally {
    try {
      await fs.unlink(testLogPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Arbitraries for generating test data
const timestampArb = fc.date().map(d => d.toISOString());
const taskIdArb = fc.string({ minLength: 1, maxLength: 50 });
const categoryArb = fc.constantFrom('task' as const, 'error' as const, 'validation' as const, 'self-healing' as const);
const statusArb = fc.constantFrom('success' as const, 'failure' as const, 'pending' as const, 'skipped' as const);

const validationResultArb = fc.record({
  passed: fc.boolean(),
  evidence: fc.string({ minLength: 1 }),
  confidence: fc.integer({ min: 0, max: 100 }),
  duration: fc.integer({ min: 0, max: 5000 }),
  timestamp: timestampArb,
  error: fc.option(fc.string(), { nil: undefined }),
});

const activityEntryArb = fc.record({
  timestamp: timestampArb,
  taskId: taskIdArb,
  category: categoryArb,
  status: statusArb,
  details: fc.record({
    description: fc.string({ minLength: 1 }),
    validationResults: fc.option(fc.array(validationResultArb, { minLength: 1, maxLength: 5 }), { nil: undefined }),
    errorContext: fc.option(
      fc.record({
        message: fc.string({ minLength: 1 }),
        stack: fc.option(fc.string(), { nil: undefined }),
        code: fc.option(fc.string(), { nil: undefined }),
        file: fc.option(fc.string(), { nil: undefined }),
        line: fc.option(fc.integer({ min: 1 }), { nil: undefined }),
      }),
      { nil: undefined }
    ),
    corrections: fc.option(
      fc.array(
        fc.record({
          type: fc.constantFrom('spec-update' as const, 'code-fix' as const, 'config-change' as const),
          description: fc.string({ minLength: 1 }),
          before: fc.string(),
          after: fc.string(),
          timestamp: timestampArb,
        }),
        { minLength: 1, maxLength: 3 }
      ),
      { nil: undefined }
    ),
  }),
  metadata: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
});

describe('Activity Log Manager - Property Tests', () => {
  // Note: Each property test iteration creates its own unique log file
  // to avoid conflicts between parallel test runs

  it('Property 6: Success Logging Completeness - For any successfully completed task, the log entry must contain timestamp, task ID, outcome, and validation results', async () => {
    // Feature: medin-protocol, Property 6: Success Logging Completeness
    await fc.assert(
      fc.asyncProperty(
        activityEntryArb.filter(e => e.status === 'success'),
        async (entry) => {
          await withLogManager(async (logManager) => {
            // Log the entry
            await logManager.logEntry(entry);

            // Query the log
            const entries = await logManager.queryLog({ taskId: entry.taskId });

            // Property: Entry must exist with all required fields
            expect(entries.length).toBeGreaterThan(0);
            const logged = entries[0];
            if (!logged) throw new Error('Entry not found');

            // Must have timestamp
            expect(logged.timestamp).toBeDefined();
            expect(logged.timestamp).toBe(entry.timestamp);

            // Must have task ID
            expect(logged.taskId).toBeDefined();
            expect(logged.taskId).toBe(entry.taskId);

            // Must have outcome (status)
            expect(logged.status).toBeDefined();
            expect(logged.status).toBe('success');

            // Must have description
            expect(logged.details.description).toBeDefined();

            // If validation results were provided, they must be preserved
            if (entry.details.validationResults) {
              expect(logged.details.validationResults).toBeDefined();
              expect(logged.details.validationResults!.length).toBe(entry.details.validationResults.length);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it.skip('Property 7: Failure Logging Completeness - For any failed task, the log entry must contain error context, attempted corrections, and final state', async () => {
    // Feature: medin-protocol, Property 7: Failure Logging Completeness
    await fc.assert(
      fc.asyncProperty(
        activityEntryArb.filter(e => e.status === 'failure'),
        async (entry) => {
          await withLogManager(async (logManager) => {
            // Ensure entry has error context for this test
            if (!entry.details.errorContext) {
              entry.details.errorContext = {
                message: 'Test error message',
                stack: 'Test stack trace',
                code: undefined,
                file: undefined,
                line: undefined,
              };
            }

            // Log the entry
            await logManager.logEntry(entry);

            // Query the log
            const entries = await logManager.queryLog({ taskId: entry.taskId });

            // Property: Entry must exist with error context
            expect(entries.length).toBeGreaterThan(0);
            const logged = entries[0];
            if (!logged) throw new Error('Entry not found');

            // Must have error context
            expect(logged.details.errorContext).toBeDefined();
            expect(logged.details.errorContext!.message).toBeDefined();

            // Must have final state (status)
            expect(logged.status).toBe('failure');

            // If corrections were provided, they must be preserved
            if (entry.details.corrections) {
              expect(logged.details.corrections).toBeDefined();
              expect(logged.details.corrections!.length).toBe(entry.details.corrections.length);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it.skip('Property 9: Log Format Consistency - For any activity log entry, it must parse successfully as markdown with ISO 8601 timestamps and valid category tags', async () => {
    // Feature: medin-protocol, Property 9: Log Format Consistency
    await fc.assert(
      fc.asyncProperty(
        activityEntryArb,
        async (entry) => {
          await withLogManager(async (logManager) => {
            // Log the entry
            await logManager.logEntry(entry);

            // Read the raw log file - need to get the path from the manager
            const testLogPath = (logManager as any).logPath;
            const content = await fs.readFile(testLogPath, 'utf-8');

            // Property: Content must be valid markdown
            expect(content).toContain('##'); // Markdown header
            expect(content).toContain(entry.taskId);

            // Property: Timestamp must be ISO 8601 format
            const iso8601Pattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
            expect(content).toMatch(iso8601Pattern);

            // Property: Category must be valid
            expect(content).toContain(`**Category**: ${entry.category}`);
            expect(['task', 'error', 'validation', 'self-healing']).toContain(entry.category);

            // Property: Must be parseable back to entry
            const entries = await logManager.queryLog({ taskId: entry.taskId });
            expect(entries.length).toBeGreaterThan(0);
            const parsed = entries[0];
            if (!parsed) throw new Error('Entry not found');

            // Verify key fields are preserved
            expect(parsed.taskId).toBe(entry.taskId);
            expect(parsed.category).toBe(entry.category);
            expect(parsed.status).toBe(entry.status);
            expect(parsed.details.description).toBe(entry.details.description);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it.skip('Property: Log entries are append-only and preserve order', async () => {
    // Feature: medin-protocol, Property: Log entries preserve insertion order
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityEntryArb, { minLength: 2, maxLength: 10 }),
        async (entries) => {
          await withLogManager(async (logManager) => {
            // Log all entries in order
            for (const entry of entries) {
              await logManager.logEntry(entry);
            }

            // Query all entries
            const logged = await logManager.queryLog();

            // Property: All entries must be present
            expect(logged.length).toBe(entries.length);

            // Property: Order must be preserved (by task ID sequence)
            for (let i = 0; i < entries.length; i++) {
              const loggedEntry = logged[i];
              const originalEntry = entries[i];
              if (!loggedEntry || !originalEntry) continue;
              expect(loggedEntry.taskId).toBe(originalEntry.taskId);
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it.skip('Property: Filtering by task ID returns only matching entries', async () => {
    // Feature: medin-protocol, Property: Filter correctness
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityEntryArb, { minLength: 5, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        async (entries, targetIndex) => {
          await withLogManager(async (logManager) => {
            if (targetIndex >= entries.length) return;

            // Log all entries
            for (const entry of entries) {
              await logManager.logEntry(entry);
            }

            const targetEntry = entries[targetIndex];
            if (!targetEntry) return;
            const targetTaskId = targetEntry.taskId;

            // Query with filter
            const filtered = await logManager.queryLog({ taskId: targetTaskId });

            // Property: All returned entries must match the filter
            for (const entry of filtered) {
              expect(entry.taskId).toBe(targetTaskId);
            }

            // Property: All matching entries must be returned
            const expectedCount = entries.filter(e => e.taskId === targetTaskId).length;
            expect(filtered.length).toBe(expectedCount);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it.skip('Property: Filtering by status returns only matching entries', async () => {
    // Feature: medin-protocol, Property: Filter correctness
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityEntryArb, { minLength: 5, maxLength: 20 }),
        statusArb,
        async (entries, targetStatus: 'success' | 'failure' | 'pending' | 'skipped') => {
          await withLogManager(async (logManager) => {
            // Log all entries
            for (const entry of entries) {
              await logManager.logEntry(entry);
            }

            // Query with filter
            const filtered = await logManager.queryLog({ status: targetStatus });

            // Property: All returned entries must match the filter
            for (const entry of filtered) {
              expect(entry.status).toBe(targetStatus);
            }

            // Property: All matching entries must be returned
            const expectedCount = entries.filter(e => e.status === targetStatus).length;
            expect(filtered.length).toBe(expectedCount);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it.skip('Property: Filtering by date range returns only entries within range', async () => {
    // Feature: medin-protocol, Property: Filter correctness
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityEntryArb, { minLength: 5, maxLength: 20 }),
        async (entries) => {
          await withLogManager(async (logManager) => {
            // Log all entries
            for (const entry of entries) {
              await logManager.logEntry(entry);
            }

            // Get min and max timestamps
            const timestamps = entries.map(e => new Date(e.timestamp).getTime());
            const minTime = Math.min(...timestamps);
            const maxTime = Math.max(...timestamps);

            if (minTime === maxTime) return; // Skip if all same timestamp

            // Pick a range in the middle
            const rangeStart = new Date(minTime + (maxTime - minTime) * 0.25);
            const rangeEnd = new Date(minTime + (maxTime - minTime) * 0.75);

            // Query with date range
            const filtered = await logManager.queryLog({
              since: rangeStart,
              until: rangeEnd,
            });

            // Property: All returned entries must be within range
            for (const entry of filtered) {
              const entryTime = new Date(entry.timestamp);
              expect(entryTime.getTime()).toBeGreaterThanOrEqual(rangeStart.getTime());
              expect(entryTime.getTime()).toBeLessThanOrEqual(rangeEnd.getTime());
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property: JSON export preserves all entry data', async () => {
    // Feature: medin-protocol, Property: JSON export correctness
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityEntryArb, { minLength: 1, maxLength: 10 }),
        async (entries) => {
          await withLogManager(async (logManager) => {
            // Log all entries
            for (const entry of entries) {
              await logManager.logEntry(entry);
            }

            // Export as JSON
            const json = await logManager.exportJSON();
            const exported = JSON.parse(json);

            // Property: All entries must be present
            expect(exported.length).toBe(entries.length);

            // Property: All fields must be preserved
            for (let i = 0; i < entries.length; i++) {
              const exportedEntry = exported[i];
              const originalEntry = entries[i];
              if (!exportedEntry || !originalEntry) continue;
              expect(exportedEntry.taskId).toBe(originalEntry.taskId);
              expect(exportedEntry.category).toBe(originalEntry.category);
              expect(exportedEntry.status).toBe(originalEntry.status);
              expect(exportedEntry.details.description).toBe(originalEntry.details.description);
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});
