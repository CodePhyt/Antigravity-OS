/**
 * Ralph-Loop Engine Tests
 * Tests iteration tracking, max attempts, and correction coordination
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RalphLoop, createRalphLoop } from '@/core/ralph-loop';
import { TaskManager } from '@/core/task-manager';
import type { ErrorContext } from '@/types/spec';

describe('RalphLoop', () => {
  let taskManager: TaskManager;
  let ralphLoop: RalphLoop;
  const specPath = '.kiro/specs/test-feature';

  beforeEach(() => {
    taskManager = new TaskManager();
    ralphLoop = createRalphLoop(taskManager, { specPath, maxAttempts: 3 });
  });

  describe('iteration tracking', () => {
    it('should track attempt numbers correctly', async () => {
      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      // First attempt
      const result1 = await ralphLoop.executeCorrection(error);
      expect(result1.attemptNumber).toBe(1);
      expect(result1.exhausted).toBe(false);

      // Second attempt
      const result2 = await ralphLoop.executeCorrection(error);
      expect(result2.attemptNumber).toBe(2);
      expect(result2.exhausted).toBe(false);

      // Third attempt (final allowed attempt)
      const result3 = await ralphLoop.executeCorrection(error);
      expect(result3.attemptNumber).toBe(3);
      // If correction fails on the final attempt, it's exhausted
      // If correction succeeds, it's not exhausted
      // Since we don't have valid spec files, corrections will fail
      expect(result3.exhausted).toBe(true);
    });

    it('should enforce max attempts limit', async () => {
      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      // Exhaust attempts
      await ralphLoop.executeCorrection(error);
      await ralphLoop.executeCorrection(error);
      await ralphLoop.executeCorrection(error);

      // Fourth attempt should be rejected
      const result4 = await ralphLoop.executeCorrection(error);
      expect(result4.success).toBe(false);
      expect(result4.exhausted).toBe(true);
      expect(result4.error).toContain('Ralph-Loop exhausted');
      expect(result4.error).toContain('3 attempts');
    });

    it('should track attempts per task independently', async () => {
      const error1: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      const error2: ErrorContext = {
        taskId: '1.2',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:20',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      // Task 1.1: 2 attempts
      await ralphLoop.executeCorrection(error1);
      await ralphLoop.executeCorrection(error1);

      // Task 1.2: 1 attempt
      await ralphLoop.executeCorrection(error2);

      // Verify independent tracking
      expect(taskManager.getRalphLoopAttempts('1.1')).toBe(2);
      expect(taskManager.getRalphLoopAttempts('1.2')).toBe(1);
    });
  });

  describe('isExhausted', () => {
    it('should return false when attempts remain', async () => {
      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      await ralphLoop.executeCorrection(error);
      expect(ralphLoop.isExhausted('1.1')).toBe(false);

      await ralphLoop.executeCorrection(error);
      expect(ralphLoop.isExhausted('1.1')).toBe(false);
    });

    it('should return true when max attempts reached', async () => {
      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      await ralphLoop.executeCorrection(error);
      await ralphLoop.executeCorrection(error);
      await ralphLoop.executeCorrection(error);

      expect(ralphLoop.isExhausted('1.1')).toBe(true);
    });

    it('should return false for tasks with no attempts', () => {
      expect(ralphLoop.isExhausted('never-attempted')).toBe(false);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return max attempts for new tasks', () => {
      expect(ralphLoop.getRemainingAttempts('1.1')).toBe(3);
    });

    it('should decrease as attempts are made', async () => {
      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      expect(ralphLoop.getRemainingAttempts('1.1')).toBe(3);

      await ralphLoop.executeCorrection(error);
      expect(ralphLoop.getRemainingAttempts('1.1')).toBe(2);

      await ralphLoop.executeCorrection(error);
      expect(ralphLoop.getRemainingAttempts('1.1')).toBe(1);

      await ralphLoop.executeCorrection(error);
      expect(ralphLoop.getRemainingAttempts('1.1')).toBe(0);
    });

    it('should not go negative', async () => {
      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      // Exhaust attempts
      await ralphLoop.executeCorrection(error);
      await ralphLoop.executeCorrection(error);
      await ralphLoop.executeCorrection(error);

      expect(ralphLoop.getRemainingAttempts('1.1')).toBe(0);

      // Try one more (will be rejected)
      await ralphLoop.executeCorrection(error);
      expect(ralphLoop.getRemainingAttempts('1.1')).toBe(0);
    });
  });

  describe('resetAttempts', () => {
    it('should reset attempt counter to zero', async () => {
      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      // Make some attempts
      await ralphLoop.executeCorrection(error);
      await ralphLoop.executeCorrection(error);
      expect(taskManager.getRalphLoopAttempts('1.1')).toBe(2);

      // Reset
      await ralphLoop.resetAttempts('1.1');
      expect(taskManager.getRalphLoopAttempts('1.1')).toBe(0);
      expect(ralphLoop.getRemainingAttempts('1.1')).toBe(3);
    });

    it('should allow new attempts after reset', async () => {
      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      // Exhaust attempts
      await ralphLoop.executeCorrection(error);
      await ralphLoop.executeCorrection(error);
      await ralphLoop.executeCorrection(error);
      expect(ralphLoop.isExhausted('1.1')).toBe(true);

      // Reset
      await ralphLoop.resetAttempts('1.1');
      expect(ralphLoop.isExhausted('1.1')).toBe(false);

      // Should allow new attempts
      const result = await ralphLoop.executeCorrection(error);
      expect(result.attemptNumber).toBe(1);
      expect(result.exhausted).toBe(false);
    });
  });

  describe('custom max attempts', () => {
    it('should respect custom max attempts configuration', async () => {
      const customRalphLoop = createRalphLoop(taskManager, {
        specPath,
        maxAttempts: 5,
      });

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      expect(customRalphLoop.getRemainingAttempts('1.1')).toBe(5);

      // Make 5 attempts
      for (let i = 0; i < 5; i++) {
        await customRalphLoop.executeCorrection(error);
      }

      expect(customRalphLoop.isExhausted('1.1')).toBe(true);

      // 6th attempt should be rejected
      const result = await customRalphLoop.executeCorrection(error);
      expect(result.success).toBe(false);
      expect(result.exhausted).toBe(true);
      expect(result.error).toContain('5 attempts');
    });
  });

  describe('error handling', () => {
    it('should handle correction failures gracefully', async () => {
      // Create Ralph-Loop with invalid spec path to trigger errors
      const badRalphLoop = createRalphLoop(taskManager, {
        specPath: '/nonexistent/path',
        maxAttempts: 3,
      });

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      const result = await badRalphLoop.executeCorrection(error);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.attemptNumber).toBe(1);
    });

    it('should mark as exhausted on final failed attempt', async () => {
      const badRalphLoop = createRalphLoop(taskManager, {
        specPath: '/nonexistent/path',
        maxAttempts: 2,
      });

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:10',
        failedTest: 'should work',
        timestamp: new Date(),
      };

      // First attempt fails
      const result1 = await badRalphLoop.executeCorrection(error);
      expect(result1.success).toBe(false);
      expect(result1.exhausted).toBe(false);

      // Second attempt fails and exhausts
      const result2 = await badRalphLoop.executeCorrection(error);
      expect(result2.success).toBe(false);
      expect(result2.exhausted).toBe(true);
    });
  });

  describe('factory function', () => {
    it('should create Ralph-Loop instance with default config', () => {
      const instance = createRalphLoop(taskManager, { specPath });
      expect(instance).toBeInstanceOf(RalphLoop);
      expect(instance.getRemainingAttempts('test')).toBe(3);
    });

    it('should create Ralph-Loop instance with custom config', () => {
      const instance = createRalphLoop(taskManager, {
        specPath,
        maxAttempts: 10,
      });
      expect(instance).toBeInstanceOf(RalphLoop);
      expect(instance.getRemainingAttempts('test')).toBe(10);
    });
  });
});
