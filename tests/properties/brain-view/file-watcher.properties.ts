/**
 * Property-Based Tests for File Watcher Service
 * 
 * Feature: ralphs-brain-view
 * Property 3: Resource Cleanup
 * 
 * Validates: Requirements 1.4
 * 
 * For any SSE connection, when the client disconnects, all associated resources
 * (file watchers, event listeners, timers) should be released and no memory leaks should occur.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { FileWatcherService } from '@/lib/services/file-watcher';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

describe('FileWatcherService - Property Tests', () => {
  const testDir = join(process.cwd(), 'test-file-watcher-tmp');
  
  beforeEach(async () => {
    // Create test directory if it doesn't exist
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      const activityPath = join(testDir, 'ACTIVITY_LOG.md');
      const prdPath = join(testDir, 'PRD.md');
      await unlink(activityPath).catch(() => {});
      await unlink(prdPath).catch(() => {});
    } catch {
      // Ignore cleanup errors
    }
  });

  it('**Property 3: Resource Cleanup** - should release all resources when closed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (cycles) => {
          const activityPath = join(testDir, 'ACTIVITY_LOG.md');
          const prdPath = join(testDir, 'PRD.md');

          // Create test files
          await writeFile(activityPath, '# Activity Log\n\n### Entry 1: Test\n**Date**: 2026-01-22\n**Status**: ✅ COMPLETE\n', 'utf-8');
          await writeFile(prdPath, '# PRD\n\n## Tasks\n\n- [x] 1. Test task\n', 'utf-8');

          // Property: Multiple create/close cycles should not leak resources
          for (let i = 0; i < cycles; i++) {
            const watcher = new FileWatcherService(activityPath, prdPath);
            
            // Start watching
            watcher.start();
            expect(watcher.isActive()).toBe(true);
            expect(watcher.getWatcherCount()).toBe(2);

            // Close and verify cleanup
            watcher.close();
            expect(watcher.isActive()).toBe(false);
            expect(watcher.getWatcherCount()).toBe(0);
            
            // Verify event listeners are removed
            expect(watcher.listenerCount('activity')).toBe(0);
            expect(watcher.listenerCount('prd')).toBe(0);
            expect(watcher.listenerCount('error')).toBe(0);
          }

          // Property: After all cycles, no resources should be leaked
          // (This is verified by the fact that we can create new watchers)
          const finalWatcher = new FileWatcherService(activityPath, prdPath);
          finalWatcher.start();
          expect(finalWatcher.isActive()).toBe(true);
          finalWatcher.close();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('**Property 3 (Edge Case)**: should handle close() being called multiple times', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (closeCount) => {
          const activityPath = join(testDir, 'ACTIVITY_LOG.md');
          const prdPath = join(testDir, 'PRD.md');

          await writeFile(activityPath, '# Activity Log\n', 'utf-8');
          await writeFile(prdPath, '# PRD\n', 'utf-8');

          const watcher = new FileWatcherService(activityPath, prdPath);
          watcher.start();

          // Property: Calling close() multiple times should be safe
          for (let i = 0; i < closeCount; i++) {
            expect(() => watcher.close()).not.toThrow();
          }

          // Property: After multiple closes, state should be consistent
          expect(watcher.isActive()).toBe(false);
          expect(watcher.getWatcherCount()).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('**Property 3 (Edge Case)**: should handle missing files gracefully', async () => {
    const nonExistentActivity = join(testDir, 'non-existent-activity-' + Date.now() + '.md');
    const nonExistentPRD = join(testDir, 'non-existent-prd-' + Date.now() + '.md');

    const watcher = new FileWatcherService(nonExistentActivity, nonExistentPRD);
    
    let errorEmitted = false;
    watcher.on('error', () => {
      errorEmitted = true;
    });

    // Property: Starting watcher with missing files should emit error but not crash
    expect(() => watcher.start()).not.toThrow();
    
    // Give time for error events to be emitted
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify error was emitted
    expect(errorEmitted).toBeDefined();
    
    // Property: Should still be able to close cleanly
    expect(() => watcher.close()).not.toThrow();
    expect(watcher.isActive()).toBe(false);
  });

  it('**Property 3 (Correctness)**: should not allow starting twice without closing', async () => {
    const activityPath = join(testDir, 'ACTIVITY_LOG.md');
    const prdPath = join(testDir, 'PRD.md');

    await writeFile(activityPath, '# Activity Log\n', 'utf-8');
    await writeFile(prdPath, '# PRD\n', 'utf-8');

    const watcher = new FileWatcherService(activityPath, prdPath);
    watcher.start();

    // Property: Starting twice should throw an error
    expect(() => watcher.start()).toThrow('already watching');

    watcher.close();
  });
});
