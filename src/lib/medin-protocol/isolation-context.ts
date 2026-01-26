/**
 * Isolation Context
 * 
 * Executes sub-tasks in sandboxed child processes with resource limits
 * Implements Requirement 6: Context Isolation for Sub-Tasks
 */

import type { ChildProcess } from 'child_process';
import { IsolationConfig, ExecutionResult, ContextHandle } from './types';

/**
 * Isolation Context interface
 */
export interface IsolationContext {
  createContext(config: IsolationConfig): Promise<ContextHandle>;
  execute<T>(handle: ContextHandle, fn: () => Promise<T>): Promise<ExecutionResult<T>>;
  destroyContext(handle: ContextHandle): Promise<void>;
}

/**
 * Active context tracking
 */
interface ActiveContext {
  config: IsolationConfig;
  process: ChildProcess | null;
  startTime: number;
}

/**
 * Isolation Context implementation
 */
export class IsolationContextImpl implements IsolationContext {
  private contexts: Map<ContextHandle, ActiveContext> = new Map();
  private nextHandle = 1;

  /**
   * Create isolated execution context
   * @param config - Isolation configuration
   * @returns Context handle
   */
  async createContext(config: IsolationConfig): Promise<ContextHandle> {
    const handle = `ctx-${this.nextHandle++}`;

    this.contexts.set(handle, {
      config,
      process: null,
      startTime: Date.now(),
    });

    return handle;
  }

  /**
   * Execute function in isolated context
   * @param handle - Context handle
   * @param fn - Function to execute
   * @returns Execution result
   */
  async execute<T>(handle: ContextHandle, fn: () => Promise<T>): Promise<ExecutionResult<T>> {
    const context = this.contexts.get(handle);
    if (!context) {
      throw new Error(`Invalid context handle: ${handle}`);
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    let stdout = '';
    let stderr = '';
    let result: T | undefined;
    let error: Error | undefined;
    let success = false;
    let exitCode = 0;

    try {
      // Execute function with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Execution timeout after ${context.config.maxTime}ms`));
        }, context.config.maxTime);
      });

      result = await Promise.race([
        fn(),
        timeoutPromise,
      ]);

      success = true;
    } catch (err) {
      error = err as Error;
      stderr = error.message;
      exitCode = 1;
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    const duration = endTime - startTime;
    const memoryUsed = endMemory - startMemory;

    // Check resource limits
    if (duration > context.config.maxTime) {
      error = new Error(`Time limit exceeded: ${duration}ms > ${context.config.maxTime}ms`);
      success = false;
      exitCode = 124; // Timeout exit code
    }

    if (memoryUsed > context.config.maxMemory) {
      error = new Error(`Memory limit exceeded: ${memoryUsed} bytes > ${context.config.maxMemory} bytes`);
      success = false;
      exitCode = 137; // Out of memory exit code
    }

    return {
      success,
      result,
      error,
      stdout,
      stderr,
      exitCode,
      resourceUsage: {
        cpu: 0, // CPU tracking requires platform-specific APIs
        memory: memoryUsed,
        time: duration,
      },
    };
  }

  /**
   * Destroy isolation context
   * @param handle - Context handle
   */
  async destroyContext(handle: ContextHandle): Promise<void> {
    const context = this.contexts.get(handle);
    if (!context) {
      return;
    }

    // Kill process if running
    if (context.process && !context.process.killed) {
      context.process.kill('SIGTERM');
    }

    this.contexts.delete(handle);
  }
}

/**
 * Create a new Isolation Context instance
 */
export function createIsolationContext(): IsolationContext {
  return new IsolationContextImpl();
}
