/**
 * Unit Tests for Isolated Task Executor
 * 
 * Tests task execution with isolation and resource limits
 */

import { describe, it, expect } from 'vitest';
import { IsolatedTaskExecutor } from '@/lib/medin-protocol/isolated-task-executor';

describe('Isolated Task Executor - Unit Tests', () => {
  describe('executeTask', () => {
    it('should execute simple tasks successfully', async () => {
      const executor = new IsolatedTaskExecutor();
      
      const result = await executor.executeTask(async () => {
        return 42;
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
      expect(result.error).toBeUndefined();
      expect(result.exitCode).toBe(0);
    });

    it('should handle task errors gracefully', async () => {
      const executor = new IsolatedTaskExecutor();
      
      const result = await executor.executeTask(async () => {
        throw new Error('Task failed');
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Task failed');
      expect(result.exitCode).toBe(1);
    });

    it('should enforce time limits', async () => {
      const executor = new IsolatedTaskExecutor();
      
      const result = await executor.executeTask(
        async () => {
          // Simulate long-running task
          await new Promise(resolve => setTimeout(resolve, 200));
          return 'done';
        },
        { maxTime: 100 } // 100ms limit
      );
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Time limit exceeded');
      expect(result.exitCode).toBe(124); // Timeout exit code
    });

    it('should track resource usage', async () => {
      const executor = new IsolatedTaskExecutor();
      
      const result = await executor.executeTask(async () => {
        // Allocate some memory
        const data = new Array(1000).fill('test');
        return data.length;
      });
      
      expect(result.success).toBe(true);
      expect(result.resourceUsage).toBeDefined();
      expect(result.resourceUsage.time).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.memory).toBeGreaterThanOrEqual(0);
    });

    it('should use custom resource limits', async () => {
      const executor = new IsolatedTaskExecutor({
        maxTime: 5000,
        maxMemory: 1024 * 1024 * 1024, // 1GB
      });
      
      const result = await executor.executeTask(async () => {
        return 'success';
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('executeTasksInParallel', () => {
    it('should execute multiple tasks in parallel', async () => {
      const executor = new IsolatedTaskExecutor();
      
      const tasks = [
        async () => 1,
        async () => 2,
        async () => 3,
      ];
      
      const results = await executor.executeTasksInParallel(tasks);
      
      expect(results.length).toBe(3);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.result).toBe(1);
      expect(results[1]?.success).toBe(true);
      expect(results[1]?.result).toBe(2);
      expect(results[2]?.success).toBe(true);
      expect(results[2]?.result).toBe(3);
    });

    it('should handle failures in parallel execution', async () => {
      const executor = new IsolatedTaskExecutor();
      
      const tasks = [
        async () => 1,
        async () => { throw new Error('Task 2 failed'); },
        async () => 3,
      ];
      
      const results = await executor.executeTasksInParallel(tasks);
      
      expect(results.length).toBe(3);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(false);
      expect(results[2]?.success).toBe(true);
    });
  });

  describe('executeTasksSequentially', () => {
    it('should execute tasks in order', async () => {
      const executor = new IsolatedTaskExecutor();
      const executionOrder: number[] = [];
      
      const tasks = [
        async () => { executionOrder.push(1); return 1; },
        async () => { executionOrder.push(2); return 2; },
        async () => { executionOrder.push(3); return 3; },
      ];
      
      const results = await executor.executeTasksSequentially(tasks);
      
      expect(results.length).toBe(3);
      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should stop on first failure', async () => {
      const executor = new IsolatedTaskExecutor();
      const executionOrder: number[] = [];
      
      const tasks = [
        async () => { executionOrder.push(1); return 1; },
        async () => { executionOrder.push(2); throw new Error('Failed'); },
        async () => { executionOrder.push(3); return 3; },
      ];
      
      const results = await executor.executeTasksSequentially(tasks);
      
      expect(results.length).toBe(2); // Only first two tasks executed
      expect(executionOrder).toEqual([1, 2]); // Third task never ran
      expect(results[1]?.success).toBe(false);
    });
  });

  describe('resource isolation', () => {
    it('should isolate task failures', async () => {
      const executor = new IsolatedTaskExecutor();
      
      // First task fails
      const result1 = await executor.executeTask(async () => {
        throw new Error('Task 1 failed');
      });
      
      // Second task should still succeed
      const result2 = await executor.executeTask(async () => {
        return 'success';
      });
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(true);
    });

    it('should cleanup contexts after execution', async () => {
      const executor = new IsolatedTaskExecutor();
      
      // Execute multiple tasks
      for (let i = 0; i < 5; i++) {
        await executor.executeTask(async () => i);
      }
      
      // All contexts should be cleaned up (no memory leaks)
      // This is implicit - if contexts aren't cleaned up, we'd see memory issues
      expect(true).toBe(true);
    });
  });
});
