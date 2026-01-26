/**
 * Isolation Context Unit Tests
 * 
 * Tests for process sandboxing and resource limits
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createIsolationContext } from '@/lib/medin-protocol/isolation-context';
import type { IsolationConfig } from '@/lib/medin-protocol/types';

describe('Isolation Context - Unit Tests', () => {
  let context: ReturnType<typeof createIsolationContext>;
  let config: IsolationConfig;

  beforeEach(() => {
    context = createIsolationContext();
    config = {
      maxCPU: 50,
      maxMemory: 100 * 1024 * 1024, // 100MB
      maxTime: 5000, // 5 seconds
      allowedPaths: ['/tmp'],
      allowedNetworks: ['127.0.0.1'],
    };
  });

  describe('Context Creation', () => {
    it('should create a new context', async () => {
      const handle = await context.createContext(config);

      expect(handle).toBeDefined();
      expect(typeof handle).toBe('string');
      expect(handle).toMatch(/^ctx-\d+$/);
    });

    it('should create unique handles for multiple contexts', async () => {
      const handle1 = await context.createContext(config);
      const handle2 = await context.createContext(config);

      expect(handle1).not.toBe(handle2);
    });
  });

  describe('Function Execution', () => {
    it('should execute a simple function successfully', async () => {
      const handle = await context.createContext(config);

      const result = await context.execute(handle, async () => {
        return 42;
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
      expect(result.error).toBeUndefined();
      expect(result.exitCode).toBe(0);
    });

    it('should capture function errors', async () => {
      const handle = await context.createContext(config);

      const result = await context.execute(handle, async () => {
        throw new Error('Test error');
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
      expect(result.exitCode).toBe(1);
    });

    it('should track execution time', async () => {
      const handle = await context.createContext(config);

      const result = await context.execute(handle, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      });

      expect(result.resourceUsage.time).toBeGreaterThanOrEqual(100);
      expect(result.resourceUsage.time).toBeLessThan(200);
    });

    it('should track memory usage', async () => {
      const handle = await context.createContext(config);

      const result = await context.execute(handle, async () => {
        const arr = new Array(1000).fill('test');
        return arr.length;
      });

      expect(result.resourceUsage.memory).toBeGreaterThan(0);
    });
  });

  describe('Resource Limits', () => {
    it('should enforce time limits', async () => {
      const shortConfig = { ...config, maxTime: 100 };
      const handle = await context.createContext(shortConfig);

      const result = await context.execute(handle, async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'should not complete';
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Time limit exceeded');
      expect(result.exitCode).toBe(124);
    });

    it('should allow execution within time limit', async () => {
      const handle = await context.createContext(config);

      const result = await context.execute(handle, async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'completed';
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('completed');
    });
  });

  describe('Context Destruction', () => {
    it('should destroy context successfully', async () => {
      const handle = await context.createContext(config);

      await expect(context.destroyContext(handle)).resolves.toBeUndefined();
    });

    it('should handle destroying non-existent context', async () => {
      await expect(context.destroyContext('invalid-handle')).resolves.toBeUndefined();
    });

    it('should not allow execution after context is destroyed', async () => {
      const handle = await context.createContext(config);
      await context.destroyContext(handle);

      await expect(
        context.execute(handle, async () => 42)
      ).rejects.toThrow('Invalid context handle');
    });
  });

  describe('Output Capture', () => {
    it('should capture stderr on error', async () => {
      const handle = await context.createContext(config);

      const result = await context.execute(handle, async () => {
        throw new Error('Error message');
      });

      expect(result.stderr).toContain('Error message');
    });

    it('should return empty stdout/stderr for successful execution', async () => {
      const handle = await context.createContext(config);

      const result = await context.execute(handle, async () => {
        return 'success';
      });

      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    });
  });
});
