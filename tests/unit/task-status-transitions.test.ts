/**
 * Unit tests for task status transitions
 * Tests Requirements 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskManager } from '@/core/task-manager';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('TaskManager - Task Status Transitions', () => {
  const testSpecPath = '.kiro/specs/test-feature';
  const testStatePath = '.kiro/state/test-orchestrator-state.json';
  let taskManager: TaskManager;

  beforeEach(async () => {
    // Create test spec directory and files
    await fs.mkdir(testSpecPath, { recursive: true });

    // Create minimal requirements.md
    await fs.writeFile(
      join(testSpecPath, 'requirements.md'),
      `# Requirements Document: Test Feature

## Requirements

### Requirement 1: Test Requirement

**User Story:** As a developer, I want to test task transitions.

#### Acceptance Criteria

1. Tasks should transition through valid states
`
    );

    // Create minimal design.md
    await fs.writeFile(
      join(testSpecPath, 'design.md'),
      `# Design Document: Test Feature

## Correctness Properties

**Property 1: Valid state transitions**
*For any* task, status transitions should follow the valid sequence.
**Validates: Requirements 1**
`
    );

    // Create tasks.md with test tasks
    await fs.writeFile(
      join(testSpecPath, 'tasks.md'),
      `# Implementation Plan: Test Feature

## Tasks

- [ ] 1. First task
  - _Requirements: 1_

- [ ] 2. Second task
  - _Requirements: 1_

- [ ] 3. Third task with subtasks
  - [ ] 3.1 First subtask
  - [ ] 3.2 Second subtask
`
    );

    // Create task manager and load spec
    taskManager = new TaskManager(testStatePath);
    const result = await taskManager.loadSpec(testSpecPath);
    expect(result.success).toBe(true);
  });

  afterEach(async () => {
    // Clean up test files
    await fs.rm(testSpecPath, { recursive: true, force: true });
    await fs.rm('.kiro/state', { recursive: true, force: true });
    await fs.rm('.kiro/backups', { recursive: true, force: true });
  });

  describe('Valid State Transitions (Requirement 2.2, 2.3, 2.4)', () => {
    it('should parse tasks correctly', () => {
      const spec = taskManager.getSpec();
      expect(spec).not.toBeNull();

      if (spec) {
        expect(spec.tasks.length).toBeGreaterThan(0);
        // Task IDs should include the period: "1.", "2.", "3."
        expect(spec.tasks[0]?.id).toBe('1.');
      }
    });

    it('should allow not_started → queued transition', async () => {
      const success = await taskManager.queueTask('1.');
      expect(success).toBe(true);

      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('queued');
    });

    it('should allow queued → in_progress transition', async () => {
      await taskManager.queueTask('1.');
      const success = await taskManager.startTask('1.');
      expect(success).toBe(true);

      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('in_progress');
    });

    it('should allow in_progress → completed transition', async () => {
      await taskManager.queueTask('1.');
      await taskManager.startTask('1.');
      const success = await taskManager.completeTask('1.');
      expect(success).toBe(true);

      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('completed');
    });

    it('should allow in_progress → not_started transition (Ralph-Loop reset)', async () => {
      await taskManager.queueTask('1.');
      await taskManager.startTask('1.');
      const success = await taskManager.resetTask('1.');
      expect(success).toBe(true);

      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('not_started');
    });

    it('should complete full transition sequence: not_started → queued → in_progress → completed', async () => {
      // Queue task
      let success = await taskManager.queueTask('2.');
      expect(success).toBe(true);
      expect(taskManager.getTaskStatus('2.')).toBe('queued');

      // Start task
      success = await taskManager.startTask('2.');
      expect(success).toBe(true);
      expect(taskManager.getTaskStatus('2.')).toBe('in_progress');

      // Complete task
      success = await taskManager.completeTask('2.');
      expect(success).toBe(true);
      expect(taskManager.getTaskStatus('2.')).toBe('completed');
    });
  });

  describe('Invalid State Transitions', () => {
    it('should reject not_started → in_progress (skipping queued)', async () => {
      const success = await taskManager.updateTaskStatus('1.', 'in_progress');
      expect(success).toBe(false);

      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('not_started');
    });

    it('should reject not_started → completed (skipping intermediate states)', async () => {
      const success = await taskManager.updateTaskStatus('1.', 'completed');
      expect(success).toBe(false);

      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('not_started');
    });

    it('should reject queued → completed (skipping in_progress)', async () => {
      await taskManager.queueTask('1.');
      const success = await taskManager.updateTaskStatus('1.', 'completed');
      expect(success).toBe(false);

      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('queued');
    });

    it('should reject completed → any transition (completed is terminal)', async () => {
      await taskManager.queueTask('1.');
      await taskManager.startTask('1.');
      await taskManager.completeTask('1.');

      // Try to transition back to in_progress
      let success = await taskManager.updateTaskStatus('1.', 'in_progress');
      expect(success).toBe(false);

      // Try to transition back to queued
      success = await taskManager.updateTaskStatus('1.', 'queued');
      expect(success).toBe(false);

      // Try to transition back to not_started
      success = await taskManager.updateTaskStatus('1.', 'not_started');
      expect(success).toBe(false);

      // Status should remain completed
      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('completed');
    });

    it('should reject queued → not_started (backward transition)', async () => {
      await taskManager.queueTask('1.');
      const success = await taskManager.updateTaskStatus('1.', 'not_started');
      expect(success).toBe(false);

      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('queued');
    });
  });

  describe('Immediate tasks.md Update (Requirement 2.5)', () => {
    it('should update tasks.md immediately on status change', async () => {
      await taskManager.queueTask('1.');

      // Read tasks.md directly
      const content = await fs.readFile(join(testSpecPath, 'tasks.md'), 'utf-8');

      // Should have queued marker [~]
      expect(content).toContain('[~] 1. First task');
    });

    it('should update tasks.md for in_progress status', async () => {
      await taskManager.queueTask('1.');
      await taskManager.startTask('1.');

      const content = await fs.readFile(join(testSpecPath, 'tasks.md'), 'utf-8');

      // Should have in_progress marker [>]
      expect(content).toContain('[>] 1. First task');
    });

    it('should update tasks.md for completed status', async () => {
      await taskManager.queueTask('1.');
      await taskManager.startTask('1.');
      await taskManager.completeTask('1.');

      const content = await fs.readFile(join(testSpecPath, 'tasks.md'), 'utf-8');

      // Should have completed marker [x]
      expect(content).toContain('[x] 1. First task');
    });

    it('should preserve markdown formatting when updating status', async () => {
      await taskManager.queueTask('3.1');

      const content = await fs.readFile(join(testSpecPath, 'tasks.md'), 'utf-8');

      // Should preserve indentation for subtask
      expect(content).toContain('  - [~] 3.1 First subtask');
    });

    it('should update multiple tasks independently', async () => {
      await taskManager.queueTask('1.');
      await taskManager.queueTask('2.');
      await taskManager.startTask('1.');

      const content = await fs.readFile(join(testSpecPath, 'tasks.md'), 'utf-8');

      // Task 1 should be in_progress
      expect(content).toContain('[>] 1. First task');

      // Task 2 should be queued
      expect(content).toContain('[~] 2. Second task');

      // Task 3 should still be not_started
      expect(content).toContain('[ ] 3. Third task');
    });
  });

  describe('Event Emission', () => {
    it('should emit event on status change', async () => {
      const events: any[] = [];

      taskManager.onStatusTransition((event) => {
        events.push(event);
      });

      await taskManager.queueTask('1.');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        taskId: '1.',
        previousStatus: 'not_started',
        newStatus: 'queued',
      });
      expect(events[0].timestamp).toBeInstanceOf(Date);
    });

    it('should emit events for full transition sequence', async () => {
      const events: any[] = [];

      taskManager.onStatusTransition((event) => {
        events.push(event);
      });

      await taskManager.queueTask('1.');
      await taskManager.startTask('1.');
      await taskManager.completeTask('1.');

      expect(events).toHaveLength(3);

      // First event: not_started → queued
      expect(events[0]).toMatchObject({
        taskId: '1.',
        previousStatus: 'not_started',
        newStatus: 'queued',
      });

      // Second event: queued → in_progress
      expect(events[1]).toMatchObject({
        taskId: '1.',
        previousStatus: 'queued',
        newStatus: 'in_progress',
      });

      // Third event: in_progress → completed
      expect(events[2]).toMatchObject({
        taskId: '1.',
        previousStatus: 'in_progress',
        newStatus: 'completed',
      });
    });

    it('should not emit event on invalid transition', async () => {
      const events: any[] = [];

      taskManager.onStatusTransition((event) => {
        events.push(event);
      });

      // Try invalid transition
      await taskManager.updateTaskStatus('1.', 'completed');

      // No event should be emitted
      expect(events).toHaveLength(0);
    });

    it('should support multiple listeners', async () => {
      const events1: any[] = [];
      const events2: any[] = [];

      taskManager.onStatusTransition((event) => {
        events1.push(event);
      });

      taskManager.onStatusTransition((event) => {
        events2.push(event);
      });

      await taskManager.queueTask('1.');

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
    });

    it('should support removing listeners', async () => {
      const events: any[] = [];

      const listener = (event: any) => {
        events.push(event);
      };

      taskManager.onStatusTransition(listener);
      await taskManager.queueTask('1.');

      expect(events).toHaveLength(1);

      // Remove listener
      taskManager.offStatusTransition(listener);

      // This should not trigger the listener
      await taskManager.startTask('1.');

      // Still only 1 event
      expect(events).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when updating status without loaded spec', async () => {
      const emptyManager = new TaskManager('.kiro/state/empty-state.json');

      await expect(emptyManager.queueTask('1.')).rejects.toThrow(
        'No spec loaded - cannot update task status'
      );
    });

    it('should throw error when updating non-existent task', async () => {
      await expect(taskManager.queueTask('999')).rejects.toThrow('Task not found: 999');
    });

    it('should rollback in-memory change if tasks.md update fails', async () => {
      // Delete tasks.md to cause update failure
      await fs.unlink(join(testSpecPath, 'tasks.md'));

      await expect(taskManager.queueTask('1.')).rejects.toThrow('Failed to update tasks.md');

      // Status should remain not_started
      const status = taskManager.getTaskStatus('1.');
      expect(status).toBe('not_started');
    });
  });

  describe('State Persistence', () => {
    it('should persist state after status update', async () => {
      await taskManager.queueTask('1.');
      await taskManager.startTask('1.');

      // Create new manager and load state
      const newManager = new TaskManager(testStatePath);
      const loaded = await newManager.loadState();

      expect(loaded).toBe(true);

      const state = newManager.getState();
      expect(state.currentTask).toBe('1.');
    });
  });
});
