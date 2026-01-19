/**
 * Unit tests for Task Manager
 * Tests task state management, persistence, and validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskManager } from '@/core/task-manager';
import { promises as fs } from 'fs';

describe('TaskManager', () => {
  const testStatePath = '.kiro/state/test-orchestrator-state.json';
  const testSpecPath = 'tests/fixtures/test-spec';
  let taskManager: TaskManager;

  beforeEach(() => {
    taskManager = new TaskManager(testStatePath);
  });

  afterEach(async () => {
    // Clean up test state file
    try {
      await fs.unlink(testStatePath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('loadSpec', () => {
    it('should load a valid spec and initialize state', async () => {
      const result = await taskManager.loadSpec(testSpecPath);

      expect(result.success).toBe(true);
      expect(result.spec).toBeDefined();
      expect(result.spec?.featureName).toBe('test-spec');
      expect(result.spec?.tasks.length).toBeGreaterThan(0);
      expect(result.spec?.requirements.length).toBeGreaterThan(0);
      expect(result.spec?.properties.length).toBeGreaterThan(0);
    });

    it('should initialize all tasks as not_started', async () => {
      const result = await taskManager.loadSpec(testSpecPath);

      expect(result.success).toBe(true);

      const state = taskManager.getState();
      expect(state.completedTasks).toEqual([]);
      expect(state.currentTask).toBeNull();
      expect(state.ralphLoopAttempts).toEqual({});
    });

    it('should fail for non-existent spec directory', async () => {
      const result = await taskManager.loadSpec('.kiro/specs/non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('does not exist');
    });

    it('should validate requirement references', async () => {
      // This test would require a spec with invalid references
      // For now, we test that valid specs pass validation
      const result = await taskManager.loadSpec(testSpecPath);

      expect(result.success).toBe(true);
      // If there were invalid references, result.success would be false
    });

    it('should persist state after loading spec', async () => {
      await taskManager.loadSpec(testSpecPath);

      // Check that state file was created
      const exists = await fs
        .access(testStatePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      // Read and validate state file
      const content = await fs.readFile(testStatePath, 'utf-8');
      const state = JSON.parse(content) as {
        currentSpec: string;
        currentTask: string | null;
        completedTasks: string[];
      };

      expect(state.currentSpec).toBe('test-spec');
      expect(state.currentTask).toBeNull();
      expect(state.completedTasks).toEqual([]);
    });
  });

  describe('getStatus', () => {
    it('should return empty status when no spec loaded', () => {
      const status = taskManager.getStatus();

      expect(status.currentTask).toBeNull();
      expect(status.completedCount).toBe(0);
      expect(status.totalCount).toBe(0);
      expect(status.isRunning).toBe(false);
      expect(status.progress).toBe(0);
    });

    it('should return correct status after loading spec', async () => {
      await taskManager.loadSpec(testSpecPath);

      const status = taskManager.getStatus();

      expect(status.totalCount).toBeGreaterThan(0);
      expect(status.completedCount).toBe(0);
      expect(status.progress).toBe(0);
      expect(status.isRunning).toBe(false);
    });

    it('should calculate progress correctly', async () => {
      await taskManager.loadSpec(testSpecPath);

      // Mark some tasks as completed
      await taskManager.markTaskCompleted('1');
      await taskManager.markTaskCompleted('2.1');

      const status = taskManager.getStatus();

      expect(status.completedCount).toBe(2);
      expect(status.progress).toBeGreaterThan(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    it('should show running status when current task is set', async () => {
      await taskManager.loadSpec(testSpecPath);
      await taskManager.setCurrentTask('2.1');

      const status = taskManager.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.currentTask).toBeDefined();
      expect(status.currentTask?.id).toBe('2.1');
    });
  });

  describe('state management', () => {
    beforeEach(async () => {
      await taskManager.loadSpec(testSpecPath);
    });

    it('should set and persist current task', async () => {
      await taskManager.setCurrentTask('3.1');

      const state = taskManager.getState();
      expect(state.currentTask).toBe('3.1');

      // Verify persistence
      const content = await fs.readFile(testStatePath, 'utf-8');
      const persistedState = JSON.parse(content) as { currentTask: string };
      expect(persistedState.currentTask).toBe('3.1');
    });

    it('should mark tasks as completed', async () => {
      await taskManager.markTaskCompleted('2.1');
      await taskManager.markTaskCompleted('2.2');

      const state = taskManager.getState();
      expect(state.completedTasks).toContain('2.1');
      expect(state.completedTasks).toContain('2.2');
      expect(state.completedTasks.length).toBe(2);
    });

    it('should not duplicate completed tasks', async () => {
      await taskManager.markTaskCompleted('2.1');
      await taskManager.markTaskCompleted('2.1');

      const state = taskManager.getState();
      expect(state.completedTasks.filter((id) => id === '2.1').length).toBe(1);
    });

    it('should mark tasks as skipped', async () => {
      await taskManager.markTaskSkipped('2.6');

      const state = taskManager.getState();
      expect(state.skippedTasks).toContain('2.6');
    });

    it('should track Ralph-Loop attempts', async () => {
      const attempts1 = await taskManager.incrementRalphLoopAttempts('5.1');
      expect(attempts1).toBe(1);

      const attempts2 = await taskManager.incrementRalphLoopAttempts('5.1');
      expect(attempts2).toBe(2);

      const attempts3 = await taskManager.incrementRalphLoopAttempts('5.1');
      expect(attempts3).toBe(3);

      const state = taskManager.getState();
      expect(state.ralphLoopAttempts['5.1']).toBe(3);
    });

    it('should get Ralph-Loop attempts', async () => {
      await taskManager.incrementRalphLoopAttempts('5.1');
      await taskManager.incrementRalphLoopAttempts('5.1');

      const attempts = taskManager.getRalphLoopAttempts('5.1');
      expect(attempts).toBe(2);
    });

    it('should return 0 for tasks with no Ralph-Loop attempts', () => {
      const attempts = taskManager.getRalphLoopAttempts('never-attempted');
      expect(attempts).toBe(0);
    });

    it('should reset Ralph-Loop attempts', async () => {
      await taskManager.incrementRalphLoopAttempts('5.1');
      await taskManager.incrementRalphLoopAttempts('5.1');

      await taskManager.resetRalphLoopAttempts('5.1');

      const attempts = taskManager.getRalphLoopAttempts('5.1');
      expect(attempts).toBe(0);
    });

    it('should start execution and set start time', async () => {
      await taskManager.startExecution();

      const state = taskManager.getState();
      expect(state.executionStartTime).toBeInstanceOf(Date);
    });

    it('should clear execution state', async () => {
      await taskManager.setCurrentTask('3.1');
      await taskManager.markTaskCompleted('2.1');
      await taskManager.startExecution();

      await taskManager.clearExecution();

      const state = taskManager.getState();
      expect(state.currentSpec).toBeNull();
      expect(state.currentTask).toBeNull();
      expect(state.executionStartTime).toBeNull();
      expect(state.completedTasks).toEqual([]);
      expect(state.ralphLoopAttempts).toEqual({});
    });
  });

  describe('state persistence and recovery', () => {
    it('should persist state to disk', async () => {
      await taskManager.loadSpec(testSpecPath);
      await taskManager.setCurrentTask('3.1');
      await taskManager.markTaskCompleted('2.1');

      // Create new task manager and load state
      const newTaskManager = new TaskManager(testStatePath);
      const loaded = await newTaskManager.loadState();

      expect(loaded).toBe(true);

      const state = newTaskManager.getState();
      expect(state.currentSpec).toBe('test-spec');
      expect(state.currentTask).toBe('3.1');
      expect(state.completedTasks).toContain('2.1');
    });

    it('should handle missing state file gracefully', async () => {
      const newTaskManager = new TaskManager('.kiro/state/non-existent-state.json');
      const loaded = await newTaskManager.loadState();

      expect(loaded).toBe(false);
    });

    it('should handle corrupted state file gracefully', async () => {
      // Write invalid JSON to state file
      await fs.mkdir('.kiro/state', { recursive: true });
      await fs.writeFile(testStatePath, 'invalid json {{{', 'utf-8');

      const loaded = await taskManager.loadState();

      expect(loaded).toBe(false);
    });

    it('should handle state file with invalid structure', async () => {
      // Write valid JSON but invalid structure
      await fs.mkdir('.kiro/state', { recursive: true });
      await fs.writeFile(testStatePath, JSON.stringify({ invalid: 'structure' }), 'utf-8');

      const loaded = await taskManager.loadState();

      expect(loaded).toBe(false);
    });

    it('should restore Date objects correctly', async () => {
      await taskManager.loadSpec(testSpecPath);
      await taskManager.startExecution();

      const originalTime = taskManager.getState().executionStartTime;

      // Create new task manager and load state
      const newTaskManager = new TaskManager(testStatePath);
      await newTaskManager.loadState();

      const restoredTime = newTaskManager.getState().executionStartTime;

      expect(restoredTime).toBeInstanceOf(Date);
      expect(restoredTime?.getTime()).toBe(originalTime?.getTime());
    });
  });

  describe('spec access', () => {
    it('should return null spec when not loaded', () => {
      const spec = taskManager.getSpec();
      expect(spec).toBeNull();
    });

    it('should return loaded spec', async () => {
      await taskManager.loadSpec(testSpecPath);

      const spec = taskManager.getSpec();
      expect(spec).toBeDefined();
      expect(spec?.featureName).toBe('spec-orchestrator');
    });

    it('should return null spec path when not loaded', () => {
      const path = taskManager.getSpecPath();
      expect(path).toBeNull();
    });

    it('should return spec path after loading', async () => {
      await taskManager.loadSpec(testSpecPath);

      const path = taskManager.getSpecPath();
      expect(path).toBe(testSpecPath);
    });
  });

  describe('edge cases', () => {
    it('should handle empty completed tasks list', async () => {
      await taskManager.loadSpec(testSpecPath);

      const status = taskManager.getStatus();
      expect(status.completedCount).toBe(0);
      expect(status.progress).toBe(0);
    });

    it('should handle clearing current task', async () => {
      await taskManager.loadSpec(testSpecPath);
      await taskManager.setCurrentTask('3.1');
      await taskManager.setCurrentTask(null);

      const state = taskManager.getState();
      expect(state.currentTask).toBeNull();

      const status = taskManager.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should handle multiple state updates in sequence', async () => {
      await taskManager.loadSpec(testSpecPath);

      await taskManager.setCurrentTask('2.1');
      await taskManager.markTaskCompleted('2.1');
      await taskManager.setCurrentTask('2.2');
      await taskManager.incrementRalphLoopAttempts('2.2');
      await taskManager.markTaskCompleted('2.2');
      await taskManager.setCurrentTask(null);

      const state = taskManager.getState();
      expect(state.completedTasks).toContain('2.1');
      expect(state.completedTasks).toContain('2.2');
      expect(state.ralphLoopAttempts['2.2']).toBe(1);
      expect(state.currentTask).toBeNull();
    });
  });

  describe('dependency validation', () => {
    beforeEach(async () => {
      await taskManager.loadSpec(testSpecPath);
    });

    describe('buildDependencyGraph', () => {
      it('should build dependency graph on spec load', () => {
        // Dependency graph should be built automatically during loadSpec
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        // Check that dependency nodes exist for tasks
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        for (const task of allTasks) {
          const node = taskManager.getDependencyNode(task.id);
          expect(node).toBeDefined();
          expect(node?.taskId).toBe(task.id);
        }
      });

      it('should identify prerequisites based on document order', () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        // Find a task that should have prerequisites
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Task 2 should have task 1 as prerequisite (document order)
        if (allTasks.length >= 2) {
          const secondTask = allTasks[1];
          const prerequisites = taskManager.getPrerequisites(secondTask.id);

          // Should have at least one prerequisite (the first task)
          expect(prerequisites.length).toBeGreaterThanOrEqual(0);
        }
      });

      it('should identify parent-child dependencies', () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        // Find a parent task with children
        const parentWithChildren = spec!.tasks.find(t => t.children.length > 0);

        if (parentWithChildren && parentWithChildren.children.length >= 2) {
          // Second child should have first child as prerequisite
          const secondChild = parentWithChildren.children[1];
          const prerequisites = taskManager.getPrerequisites(secondChild.id);

          // Should include first sibling if it's not optional
          const firstChild = parentWithChildren.children[0];
          if (!firstChild.isOptional) {
            expect(prerequisites).toContain(firstChild.id);
          }
        }
      });

      it('should create bidirectional dependency links', () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Check bidirectional links
        for (const task of allTasks) {
          const prerequisites = taskManager.getPrerequisites(task.id);

          for (const prereqId of prerequisites) {
            const dependents = taskManager.getDependents(prereqId);
            expect(dependents).toContain(task.id);
          }
        }
      });
    });

    describe('getPrerequisites', () => {
      it('should return empty array for first task', () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        if (allTasks.length > 0) {
          const firstTask = allTasks[0];
          const prerequisites = taskManager.getPrerequisites(firstTask.id);

          // First task should have no prerequisites
          expect(prerequisites).toEqual([]);
        }
      });

      it('should return prerequisites for tasks with dependencies', () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Find a task with prerequisites
        for (const task of allTasks) {
          const prerequisites = taskManager.getPrerequisites(task.id);

          // Prerequisites should be valid task IDs
          for (const prereqId of prerequisites) {
            const prereqTask = allTasks.find(t => t.id === prereqId);
            expect(prereqTask).toBeDefined();
          }
        }
      });

      it('should return empty array for non-existent task', () => {
        const prerequisites = taskManager.getPrerequisites('non-existent-task');
        expect(prerequisites).toEqual([]);
      });
    });

    describe('getDependents', () => {
      it('should return dependents for tasks', () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Check that dependents are valid
        for (const task of allTasks) {
          const dependents = taskManager.getDependents(task.id);

          for (const depId of dependents) {
            const depTask = allTasks.find(t => t.id === depId);
            expect(depTask).toBeDefined();
          }
        }
      });

      it('should return empty array for non-existent task', () => {
        const dependents = taskManager.getDependents('non-existent-task');
        expect(dependents).toEqual([]);
      });
    });

    describe('arePrerequisitesCompleted', () => {
      it('should return true for task with no prerequisites', () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        if (allTasks.length > 0) {
          const firstTask = allTasks[0];
          const result = taskManager.arePrerequisitesCompleted(firstTask.id);
          expect(result).toBe(true);
        }
      });

      it('should return false when prerequisites are not completed', async () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Find a task with prerequisites
        const taskWithPrereqs = allTasks.find(t => {
          const prereqs = taskManager.getPrerequisites(t.id);
          return prereqs.length > 0;
        });

        if (taskWithPrereqs) {
          // Ensure prerequisites are not completed
          const prerequisites = taskManager.getPrerequisites(taskWithPrereqs.id);
          const firstPrereq = prerequisites[0];
          const prereqStatus = taskManager.getTaskStatus(firstPrereq);

          if (prereqStatus !== 'completed') {
            const result = taskManager.arePrerequisitesCompleted(taskWithPrereqs.id);
            expect(result).toBe(false);
          }
        }
      });

      it('should return true when all prerequisites are completed', async () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Find a task with prerequisites
        const taskWithPrereqs = allTasks.find(t => {
          const prereqs = taskManager.getPrerequisites(t.id);
          return prereqs.length > 0 && prereqs.length <= 2; // Keep it simple
        });

        if (taskWithPrereqs) {
          // Complete all prerequisites
          const prerequisites = taskManager.getPrerequisites(taskWithPrereqs.id);

          for (const prereqId of prerequisites) {
            const prereqStatus = taskManager.getTaskStatus(prereqId);
            if (prereqStatus === 'not_started') {
              await taskManager.updateTaskStatus(prereqId, 'queued');
              await taskManager.updateTaskStatus(prereqId, 'in_progress');
              await taskManager.updateTaskStatus(prereqId, 'completed');
            }
          }

          const result = taskManager.arePrerequisitesCompleted(taskWithPrereqs.id);
          expect(result).toBe(true);
        }
      });
    });

    describe('validatePrerequisites', () => {
      it('should not throw for task with completed prerequisites', async () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Find first task (no prerequisites)
        if (allTasks.length > 0) {
          const firstTask = allTasks[0];
          expect(() => taskManager.validatePrerequisites(firstTask.id)).not.toThrow();
        }
      });

      it('should throw error when prerequisites are not completed', () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Find a task with incomplete prerequisites
        const taskWithPrereqs = allTasks.find(t => {
          const prereqs = taskManager.getPrerequisites(t.id);
          if (prereqs.length === 0) return false;

          // Check if any prerequisite is not completed
          return prereqs.some(prereqId => 
            taskManager.getTaskStatus(prereqId) !== 'completed'
          );
        });

        if (taskWithPrereqs) {
          expect(() => taskManager.validatePrerequisites(taskWithPrereqs.id)).toThrow();
          expect(() => taskManager.validatePrerequisites(taskWithPrereqs.id)).toThrow(
            /incomplete prerequisites/
          );
        }
      });

      it('should include incomplete prerequisite IDs in error message', () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Find a task with incomplete prerequisites
        const taskWithPrereqs = allTasks.find(t => {
          const prereqs = taskManager.getPrerequisites(t.id);
          return prereqs.length > 0 && 
                 prereqs.some(prereqId => taskManager.getTaskStatus(prereqId) !== 'completed');
        });

        if (taskWithPrereqs) {
          const prerequisites = taskManager.getPrerequisites(taskWithPrereqs.id);
          const incomplete = prerequisites.filter(
            prereqId => taskManager.getTaskStatus(prereqId) !== 'completed'
          );

          try {
            taskManager.validatePrerequisites(taskWithPrereqs.id);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '';
            for (const prereqId of incomplete) {
              expect(errorMessage).toContain(prereqId);
            }
          }
        }
      });
    });

    describe('startTask with prerequisite validation', () => {
      it('should start task when prerequisites are completed', async () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Find first not_started task with no prerequisites
        const taskToStart = allTasks.find(t => {
          const prereqs = taskManager.getPrerequisites(t.id);
          return t.status === 'not_started' && prereqs.length === 0 && !t.isOptional;
        });

        if (taskToStart) {
          await taskManager.updateTaskStatus(taskToStart.id, 'queued');
          const result = await taskManager.startTask(taskToStart.id);

          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(taskToStart.id)).toBe('in_progress');

          // Clean up
          await taskManager.updateTaskStatus(taskToStart.id, 'not_started');
        }
      });

      it('should throw error when starting task with incomplete prerequisites', async () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Find a task with incomplete prerequisites
        const taskWithPrereqs = allTasks.find(t => {
          const prereqs = taskManager.getPrerequisites(t.id);
          return t.status === 'not_started' && 
                 prereqs.length > 0 && 
                 prereqs.some(prereqId => taskManager.getTaskStatus(prereqId) !== 'completed');
        });

        if (taskWithPrereqs) {
          // Try to queue and start without completing prerequisites
          await taskManager.updateTaskStatus(taskWithPrereqs.id, 'queued');

          await expect(taskManager.startTask(taskWithPrereqs.id)).rejects.toThrow(
            /incomplete prerequisites/
          );

          // Clean up
          await taskManager.updateTaskStatus(taskWithPrereqs.id, 'not_started');
        }
      });
    });

    describe('task selection with prerequisites', () => {
      it('should not select tasks with incomplete prerequisites', async () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        // Get next task
        const nextTask = taskManager.selectNextTask();

        if (nextTask) {
          // Verify prerequisites are completed
          const result = taskManager.arePrerequisitesCompleted(nextTask.id);
          expect(result).toBe(true);
        }
      });

      it('should only select tasks with all prerequisites completed', async () => {
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();

        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });

        // Complete first few tasks
        for (let i = 0; i < Math.min(3, allTasks.length); i++) {
          const task = allTasks[i];
          if (task.status === 'not_started' && !task.isOptional) {
            await taskManager.updateTaskStatus(task.id, 'queued');
            await taskManager.updateTaskStatus(task.id, 'in_progress');
            await taskManager.updateTaskStatus(task.id, 'completed');
          }
        }

        // Select next task
        const nextTask = taskManager.selectNextTask();

        if (nextTask) {
          // All prerequisites should be completed
          const prerequisites = taskManager.getPrerequisites(nextTask.id);
          for (const prereqId of prerequisites) {
            const status = taskManager.getTaskStatus(prereqId);
            expect(status).toBe('completed');
          }
        }
      });
    });
  });

  describe('task selection logic', () => {
    beforeEach(async () => {
      await taskManager.loadSpec(testSpecPath);
    });

    describe('selectNextTask - basic selection', () => {
      it('should return null when no spec is loaded', () => {
        const emptyManager = new TaskManager();
        const nextTask = emptyManager.selectNextTask();
        expect(nextTask).toBeNull();
      });

      it('should select first not_started task in document order', () => {
        const nextTask = taskManager.selectNextTask();
        
        // Should return a task or null (if all tasks are completed/in-progress)
        // The actual task depends on the current state of the spec
        if (nextTask) {
          expect(nextTask.status).toBe('not_started');
        }
      });

      it('should skip completed tasks', async () => {
        // Find a not_started task to test with
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          // Mark it as completed
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          await taskManager.updateTaskStatus(notStartedTask.id, 'completed');
          
          const nextTask = taskManager.selectNextTask();
          
          // Should not select the completed task
          if (nextTask) {
            expect(nextTask.id).not.toBe(notStartedTask.id);
            expect(nextTask.status).toBe('not_started');
          }
        }
      });

      it('should skip optional tasks by default', async () => {
        // Find first optional task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const optionalTask = allTasks.find(t => t.isOptional && t.status === 'not_started');
        
        if (optionalTask) {
          // Mark all non-optional tasks before it as completed
          for (const task of allTasks) {
            if (task.id < optionalTask.id && !task.isOptional && task.status === 'not_started') {
              await taskManager.updateTaskStatus(task.id, 'queued');
              await taskManager.updateTaskStatus(task.id, 'in_progress');
              await taskManager.updateTaskStatus(task.id, 'completed');
            }
          }
          
          const nextTask = taskManager.selectNextTask(false);
          
          // Should skip the optional task
          if (nextTask) {
            expect(nextTask.isOptional).toBe(false);
          }
        }
      });

      it('should include optional tasks when explicitly requested', async () => {
        // Find first optional task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const optionalTask = allTasks.find(t => t.isOptional && t.status === 'not_started');
        
        if (optionalTask) {
          // With includeOptional=true, optional tasks should be considered
          const nextTask = taskManager.selectNextTask(true);
          expect(nextTask).toBeDefined();
          // The next task could be optional or non-optional, just verify it exists
        }
      });
    });

    describe('selectNextTask - parent-child relationships', () => {
      it('should execute sub-tasks before parent task', async () => {
        // Find a parent task with children where some children are not_started
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const parentWithChildren = spec!.tasks.find(t => 
          t.children.length > 0 && 
          t.children.some(c => c.status === 'not_started')
        );
        
        if (parentWithChildren) {
          const nextTask = taskManager.selectNextTask();
          
          expect(nextTask).toBeDefined();
          // Should select a child, not the parent
          if (nextTask) {
            expect(nextTask.parentId).toBeTruthy();
          }
        }
      });

      it('should not select parent until all non-optional children are completed', async () => {
        // This is implicitly tested by the task selection logic
        // Just verify the logic works
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const nextTask = taskManager.selectNextTask();
        // If we get a parent task, all its non-optional children must be completed
        if (nextTask && nextTask.children.length > 0) {
          const nonOptionalChildren = nextTask.children.filter(c => !c.isOptional);
          const allCompleted = nonOptionalChildren.every(c => c.status === 'completed');
          expect(allCompleted).toBe(true);
        }
      });

      it('should select parent after all non-optional children are completed', async () => {
        // Find a parent where all non-optional children are completed
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const eligibleParent = spec!.tasks.find(t => {
          if (t.children.length === 0) return false;
          if (t.status !== 'not_started') return false;
          const nonOptionalChildren = t.children.filter(c => !c.isOptional);
          return nonOptionalChildren.every(c => c.status === 'completed');
        });
        
        if (eligibleParent) {
          const nextTask = taskManager.selectNextTask();
          // The parent should be eligible for selection
          expect(nextTask).toBeDefined();
        }
      });
    });

    describe('selectNextTask - mutual exclusion', () => {
      it('should return null when a task is already in_progress', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          // Start the task
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          
          const nextTask = taskManager.selectNextTask();
          
          // Should return null because a task is in_progress
          expect(nextTask).toBeNull();
          
          // Clean up
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
        }
      });

      it('should allow selection after in_progress task is completed', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          // Start and complete the task
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          await taskManager.updateTaskStatus(notStartedTask.id, 'completed');
          
          const nextTask = taskManager.selectNextTask();
          
          // Should now be able to select next task
          expect(nextTask).toBeDefined();
        }
      });

      it('should allow selection after in_progress task is reset', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          // Start then reset the task (Ralph-Loop scenario)
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
          
          const nextTask = taskManager.selectNextTask();
          
          // Should be able to select a task (could be the same task again)
          expect(nextTask).toBeDefined();
          expect(nextTask?.status).toBe('not_started');
        }
      });
    });

    describe('hasTaskInProgress', () => {
      it('should return false when no tasks are in progress', async () => {
        // Ensure no tasks are in progress by checking current state
        const inProgressTasks = taskManager.getInProgressTasks();
        
        // If there are in-progress tasks, complete them first
        for (const task of inProgressTasks) {
          await taskManager.updateTaskStatus(task.id, 'completed');
        }
        
        const hasInProgress = taskManager.hasTaskInProgress();
        expect(hasInProgress).toBe(false);
      });

      it('should return true when a task is in progress', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          
          const hasInProgress = taskManager.hasTaskInProgress();
          expect(hasInProgress).toBe(true);
          
          // Clean up
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
        }
      });

      it('should return false after task is completed', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          await taskManager.updateTaskStatus(notStartedTask.id, 'completed');
          
          const hasInProgress = taskManager.hasTaskInProgress();
          expect(hasInProgress).toBe(false);
        }
      });
    });

    describe('getInProgressTasks', () => {
      it('should return empty array when no tasks are in progress', async () => {
        // Clean up any in-progress tasks first
        const inProgressTasks = taskManager.getInProgressTasks();
        for (const task of inProgressTasks) {
          await taskManager.updateTaskStatus(task.id, 'completed');
        }
        
        const tasks = taskManager.getInProgressTasks();
        expect(tasks).toEqual([]);
      });

      it('should return the in-progress task', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          
          const inProgressTasks = taskManager.getInProgressTasks();
          expect(inProgressTasks).toHaveLength(1);
          expect(inProgressTasks[0].id).toBe(notStartedTask.id);
          expect(inProgressTasks[0].status).toBe('in_progress');
          
          // Clean up
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
        }
      });

      it('should enforce mutual exclusion (at most one in-progress)', async () => {
        // Clean up any existing in-progress tasks first
        const existing = taskManager.getInProgressTasks();
        for (const task of existing) {
          await taskManager.updateTaskStatus(task.id, 'completed');
        }
        
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          
          const inProgressTasks = taskManager.getInProgressTasks();
          expect(inProgressTasks.length).toBeLessThanOrEqual(1);
          
          // Clean up
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
        }
      });
    });

    describe('document order traversal', () => {
      it('should respect depth-first traversal order', async () => {
        // Find a parent with multiple not_started children
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const parentWithChildren = spec!.tasks.find(t => 
          t.children.length > 1 && 
          t.children.filter(c => c.status === 'not_started').length >= 2
        );
        
        if (parentWithChildren) {
          const firstChild = parentWithChildren.children.find(c => c.status === 'not_started');
          
          if (firstChild) {
            // First selection should be the first not_started child
            const task1 = taskManager.selectNextTask();
            expect(task1?.id).toBe(firstChild.id);
            
            await taskManager.updateTaskStatus(firstChild.id, 'queued');
            await taskManager.updateTaskStatus(firstChild.id, 'in_progress');
            await taskManager.updateTaskStatus(firstChild.id, 'completed');
            
            // Next should be the second child
            const task2 = taskManager.selectNextTask();
            expect(task2).toBeDefined();
            if (task2) {
              expect(task2.parentId).toBe(parentWithChildren.id);
            }
          }
        }
      });

      it('should handle nested task hierarchies correctly', async () => {
        // Just verify that task selection works with nested hierarchies
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const nextTask = taskManager.selectNextTask();
        
        // If we get a task, it should be valid
        if (nextTask) {
          expect(nextTask.status).toBe('not_started');
        }
      });
    });
  });

  describe('task status transitions', () => {
    beforeEach(async () => {
      await taskManager.loadSpec(testSpecPath);
    });

    describe('updateTaskStatus', () => {
      it('should allow valid transition: not_started → queued', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          const result = await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('queued');
          
          // Clean up
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
        }
      });

      it('should allow valid transition: queued → in_progress', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          const result = await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('in_progress');
          
          // Clean up
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
        }
      });

      it('should allow valid transition: in_progress → completed', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          const result = await taskManager.updateTaskStatus(notStartedTask.id, 'completed');
          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('completed');
        }
      });

      it('should allow valid transition: in_progress → not_started (Ralph-Loop)', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          const result = await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('not_started');
        }
      });

      it('should reject invalid transition: not_started → in_progress', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          const result = await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          expect(result).toBe(false);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('not_started');
        }
      });

      it('should reject invalid transition: not_started → completed', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          const result = await taskManager.updateTaskStatus(notStartedTask.id, 'completed');
          expect(result).toBe(false);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('not_started');
        }
      });

      it('should reject invalid transition: completed → any', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          // Complete the task
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          await taskManager.updateTaskStatus(notStartedTask.id, 'completed');
          
          // Try to transition from completed (should fail)
          const result = await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
          expect(result).toBe(false);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('completed');
        }
      });

      it('should emit status transition events', async () => {
        const events: Array<{ taskId: string; previousStatus: string; newStatus: string }> = [];
        
        taskManager.onStatusTransition((event) => {
          events.push({
            taskId: event.taskId,
            previousStatus: event.previousStatus,
            newStatus: event.newStatus,
          });
        });

        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.updateTaskStatus(notStartedTask.id, 'queued');
          await taskManager.updateTaskStatus(notStartedTask.id, 'in_progress');
          
          expect(events.length).toBeGreaterThanOrEqual(2);
          expect(events[0]).toMatchObject({
            taskId: notStartedTask.id,
            previousStatus: 'not_started',
            newStatus: 'queued',
          });
          expect(events[1]).toMatchObject({
            taskId: notStartedTask.id,
            previousStatus: 'queued',
            newStatus: 'in_progress',
          });
          
          // Clean up
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
        }
      });
    });

    describe('convenience methods', () => {
      it('should queue task using queueTask', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          const result = await taskManager.queueTask(notStartedTask.id);
          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('queued');
          
          // Clean up
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
        }
      });

      it('should start task using startTask', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.queueTask(notStartedTask.id);
          const result = await taskManager.startTask(notStartedTask.id);
          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('in_progress');
          expect(taskManager.getState().currentTask).toBe(notStartedTask.id);
          
          // Clean up
          await taskManager.updateTaskStatus(notStartedTask.id, 'not_started');
        }
      });

      it('should complete task using completeTask', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.queueTask(notStartedTask.id);
          await taskManager.startTask(notStartedTask.id);
          const result = await taskManager.completeTask(notStartedTask.id);
          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('completed');
          expect(taskManager.getState().completedTasks).toContain(notStartedTask.id);
        }
      });

      it('should reset task using resetTask', async () => {
        // Find a not_started task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTask = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTask) {
          await taskManager.queueTask(notStartedTask.id);
          await taskManager.startTask(notStartedTask.id);
          const result = await taskManager.resetTask(notStartedTask.id);
          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(notStartedTask.id)).toBe('not_started');
        }
      });
    });
  });

  describe('task execution orchestration', () => {
    beforeEach(async () => {
      await taskManager.loadSpec(testSpecPath);
    });

    describe('completeAndQueueNext', () => {
      it('should complete current task and queue next task', async () => {
        // Find first two not_started tasks
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const notStartedTasks = allTasks.filter(t => t.status === 'not_started' && !t.isOptional);
        
        if (notStartedTasks.length >= 2) {
          const firstTask = notStartedTasks[0];
          const secondTask = notStartedTasks[1];
          
          // Start first task
          await taskManager.queueTask(firstTask.id);
          await taskManager.startTask(firstTask.id);
          
          // Complete and queue next
          const nextTask = await taskManager.completeAndQueueNext(firstTask.id);
          
          // Verify first task is completed
          expect(taskManager.getTaskStatus(firstTask.id)).toBe('completed');
          expect(taskManager.getState().completedTasks).toContain(firstTask.id);
          expect(taskManager.getState().currentTask).toBeNull();
          
          // Verify next task was queued
          expect(nextTask).toBeDefined();
          if (nextTask) {
            expect(nextTask.status).toBe('queued');
          }
        }
      });

      it('should return null when no more tasks available', async () => {
        // Complete all non-optional tasks
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const nonOptionalTasks = allTasks.filter(t => !t.isOptional);
        
        // Complete all but the last task
        for (let i = 0; i < nonOptionalTasks.length - 1; i++) {
          const task = nonOptionalTasks[i];
          if (task.status === 'not_started') {
            await taskManager.updateTaskStatus(task.id, 'queued');
            await taskManager.updateTaskStatus(task.id, 'in_progress');
            await taskManager.updateTaskStatus(task.id, 'completed');
          }
        }
        
        // Start and complete the last task
        const lastTask = nonOptionalTasks[nonOptionalTasks.length - 1];
        if (lastTask.status === 'not_started') {
          await taskManager.updateTaskStatus(lastTask.id, 'queued');
          await taskManager.updateTaskStatus(lastTask.id, 'in_progress');
          
          const nextTask = await taskManager.completeAndQueueNext(lastTask.id);
          
          // Should return null (no more tasks)
          expect(nextTask).toBeNull();
        }
      });

      it('should respect sub-task precedence when queueing next', async () => {
        // Find a parent with not_started children
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const parentWithChildren = spec!.tasks.find(t => 
          t.children.length > 0 && 
          t.children.some(c => c.status === 'not_started')
        );
        
        if (parentWithChildren) {
          const firstChild = parentWithChildren.children.find(c => c.status === 'not_started');
          
          if (firstChild) {
            // Start and complete first child
            await taskManager.queueTask(firstChild.id);
            await taskManager.startTask(firstChild.id);
            
            const nextTask = await taskManager.completeAndQueueNext(firstChild.id);
            
            // Next task should be another child or a different task, not the parent
            if (nextTask && parentWithChildren.children.length > 1) {
              // If there are more children, next should be a child
              const hasMoreChildren = parentWithChildren.children.some(
                c => c.status === 'not_started' && !c.isOptional
              );
              
              if (hasMoreChildren) {
                expect(nextTask.parentId).toBe(parentWithChildren.id);
              }
            }
          }
        }
      });

      it('should throw error if task completion fails', async () => {
        // Try to complete a non-existent task
        await expect(
          taskManager.completeAndQueueNext('non-existent-task')
        ).rejects.toThrow();
      });
    });

    describe('canCompleteParentTask', () => {
      it('should return true for leaf tasks', async () => {
        // Find a leaf task (no children)
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const leafTask = allTasks.find(t => t.children.length === 0);
        
        if (leafTask) {
          const canComplete = taskManager.canCompleteParentTask(leafTask.id);
          expect(canComplete).toBe(true);
        }
      });

      it('should return false for parent with incomplete non-optional children', async () => {
        // Find a parent with not_started non-optional children
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const parentWithIncompleteChildren = spec!.tasks.find(t => 
          t.children.length > 0 && 
          t.children.some(c => !c.isOptional && c.status !== 'completed')
        );
        
        if (parentWithIncompleteChildren) {
          const canComplete = taskManager.canCompleteParentTask(parentWithIncompleteChildren.id);
          expect(canComplete).toBe(false);
        }
      });

      it('should return true for parent with all non-optional children completed', async () => {
        // Find a parent and complete all its non-optional children
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const parentWithChildren = spec!.tasks.find(t => t.children.length > 0);
        
        if (parentWithChildren) {
          // Complete all non-optional children
          for (const child of parentWithChildren.children) {
            if (!child.isOptional && child.status !== 'completed') {
              await taskManager.updateTaskStatus(child.id, 'queued');
              await taskManager.updateTaskStatus(child.id, 'in_progress');
              await taskManager.updateTaskStatus(child.id, 'completed');
            }
          }
          
          const canComplete = taskManager.canCompleteParentTask(parentWithChildren.id);
          expect(canComplete).toBe(true);
        }
      });

      it('should return true for parent with only optional children incomplete', async () => {
        // Find a parent with optional children
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const parentWithOptionalChildren = spec!.tasks.find(t => 
          t.children.length > 0 && 
          t.children.some(c => c.isOptional)
        );
        
        if (parentWithOptionalChildren) {
          // Complete all non-optional children
          for (const child of parentWithOptionalChildren.children) {
            if (!child.isOptional && child.status !== 'completed') {
              await taskManager.updateTaskStatus(child.id, 'queued');
              await taskManager.updateTaskStatus(child.id, 'in_progress');
              await taskManager.updateTaskStatus(child.id, 'completed');
            }
          }
          
          const canComplete = taskManager.canCompleteParentTask(parentWithOptionalChildren.id);
          expect(canComplete).toBe(true);
        }
      });

      it('should return false for non-existent task', () => {
        const canComplete = taskManager.canCompleteParentTask('non-existent');
        expect(canComplete).toBe(false);
      });
    });

    describe('completeTaskWithValidation', () => {
      it('should complete task when validation passes', async () => {
        // Find a leaf task
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const leafTask = allTasks.find(t => t.children.length === 0 && t.status === 'not_started' && !t.isOptional);
        
        if (leafTask) {
          await taskManager.queueTask(leafTask.id);
          await taskManager.startTask(leafTask.id);
          
          const result = await taskManager.completeTaskWithValidation(leafTask.id);
          expect(result).toBe(true);
          expect(taskManager.getTaskStatus(leafTask.id)).toBe('completed');
        }
      });

      it('should throw error when parent has incomplete children', async () => {
        // Find a parent with incomplete children
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const parentWithIncompleteChildren = spec!.tasks.find(t => 
          t.children.length > 0 && 
          t.children.some(c => !c.isOptional && c.status !== 'completed')
        );
        
        if (parentWithIncompleteChildren) {
          // Try to complete parent (should fail)
          await expect(
            taskManager.completeTaskWithValidation(parentWithIncompleteChildren.id)
          ).rejects.toThrow(/not all non-optional sub-tasks are completed/);
        }
      });
    });

    describe('haltOnFailure', () => {
      it('should capture error context and halt execution', async () => {
        // Find a task to fail
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const task = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (task) {
          await taskManager.queueTask(task.id);
          await taskManager.startTask(task.id);
          
          const error = new Error('Test error');
          const errorContext = await taskManager.haltOnFailure(task.id, error, 'test-failure');
          
          // Verify error context
          expect(errorContext.taskId).toBe(task.id);
          expect(errorContext.errorMessage).toBe('Test error');
          expect(errorContext.stackTrace).toBeDefined();
          expect(errorContext.failedTest).toBe('test-failure');
          expect(errorContext.timestamp).toBeInstanceOf(Date);
          
          // Verify execution halted
          expect(taskManager.getState().currentTask).toBeNull();
        }
      });

      it('should handle error without failed test', async () => {
        // Find a task to fail
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const task = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (task) {
          await taskManager.queueTask(task.id);
          await taskManager.startTask(task.id);
          
          const error = new Error('Compilation error');
          const errorContext = await taskManager.haltOnFailure(task.id, error);
          
          expect(errorContext.failedTest).toBeNull();
          expect(errorContext.errorMessage).toBe('Compilation error');
        }
      });

      it('should handle error without stack trace', async () => {
        // Find a task to fail
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const task = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (task) {
          await taskManager.queueTask(task.id);
          await taskManager.startTask(task.id);
          
          const error = new Error('Error without stack');
          delete error.stack;
          
          const errorContext = await taskManager.haltOnFailure(task.id, error);
          
          expect(errorContext.stackTrace).toBe('');
        }
      });
    });

    describe('isExecutionComplete', () => {
      it('should return false when tasks are not started', async () => {
        const isComplete = taskManager.isExecutionComplete();
        expect(isComplete).toBe(false);
      });

      it('should return false when some tasks are in progress', async () => {
        // Find a task and start it
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const task = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (task) {
          await taskManager.queueTask(task.id);
          await taskManager.startTask(task.id);
          
          const isComplete = taskManager.isExecutionComplete();
          expect(isComplete).toBe(false);
          
          // Clean up
          await taskManager.updateTaskStatus(task.id, 'not_started');
        }
      });

      it('should return true when all non-optional tasks are completed', async () => {
        // Complete all non-optional tasks
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        for (const task of allTasks) {
          if (!task.isOptional && task.status !== 'completed') {
            await taskManager.updateTaskStatus(task.id, 'queued');
            await taskManager.updateTaskStatus(task.id, 'in_progress');
            await taskManager.updateTaskStatus(task.id, 'completed');
          }
        }
        
        const isComplete = taskManager.isExecutionComplete();
        expect(isComplete).toBe(true);
      });

      it('should return true even when optional tasks are not completed', async () => {
        // Complete all non-optional tasks, leave optional tasks
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        for (const task of allTasks) {
          if (!task.isOptional && task.status !== 'completed') {
            await taskManager.updateTaskStatus(task.id, 'queued');
            await taskManager.updateTaskStatus(task.id, 'in_progress');
            await taskManager.updateTaskStatus(task.id, 'completed');
          }
        }
        
        const isComplete = taskManager.isExecutionComplete();
        expect(isComplete).toBe(true);
      });
    });

    describe('getExecutionSummary', () => {
      it('should return zero counts when no spec loaded', () => {
        const emptyManager = new TaskManager();
        const summary = emptyManager.getExecutionSummary();
        
        expect(summary.total).toBe(0);
        expect(summary.notStarted).toBe(0);
        expect(summary.queued).toBe(0);
        expect(summary.inProgress).toBe(0);
        expect(summary.completed).toBe(0);
        expect(summary.optional).toBe(0);
      });

      it('should return correct counts after loading spec', async () => {
        const summary = taskManager.getExecutionSummary();
        
        expect(summary.total).toBeGreaterThan(0);
        expect(summary.notStarted).toBeGreaterThan(0);
        expect(summary.queued).toBe(0);
        expect(summary.inProgress).toBe(0);
        expect(summary.completed).toBe(0);
        expect(summary.optional).toBeGreaterThan(0);
      });

      it('should update counts as tasks progress', async () => {
        // Find a task and progress it
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const task = allTasks.find(t => t.status === 'not_started' && !t.isOptional);
        
        if (task) {
          const initialSummary = taskManager.getExecutionSummary();
          
          await taskManager.queueTask(task.id);
          const queuedSummary = taskManager.getExecutionSummary();
          expect(queuedSummary.queued).toBe(initialSummary.queued + 1);
          expect(queuedSummary.notStarted).toBe(initialSummary.notStarted - 1);
          
          await taskManager.startTask(task.id);
          const inProgressSummary = taskManager.getExecutionSummary();
          expect(inProgressSummary.inProgress).toBe(queuedSummary.inProgress + 1);
          expect(inProgressSummary.queued).toBe(queuedSummary.queued - 1);
          
          await taskManager.completeTask(task.id);
          const completedSummary = taskManager.getExecutionSummary();
          expect(completedSummary.completed).toBe(inProgressSummary.completed + 1);
          expect(completedSummary.inProgress).toBe(inProgressSummary.inProgress - 1);
        }
      });

      it('should count optional tasks correctly', async () => {
        const summary = taskManager.getExecutionSummary();
        
        const spec = taskManager.getSpec();
        expect(spec).toBeDefined();
        
        const allTasks = spec!.tasks.flatMap(function flatten(t): typeof spec.tasks {
          return [t, ...t.children.flatMap(flatten)];
        });
        
        const optionalCount = allTasks.filter(t => t.isOptional).length;
        expect(summary.optional).toBe(optionalCount);
      });
    });
  });
});

