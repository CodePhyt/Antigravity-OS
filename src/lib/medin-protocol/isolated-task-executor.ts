/**
 * Isolated Task Executor
 * 
 * Executes tasks in isolated contexts with resource limits
 * Integrates Isolation Context with task execution
 * 
 * Requirements: 6.1, 6.3
 */

import { IsolationContextImpl } from './isolation-context';
import type { IsolationConfig, ExecutionResult } from './types';

/**
 * Default resource limits for task execution
 */
const DEFAULT_RESOURCE_LIMITS: IsolationConfig = {
  maxCPU: 80, // 80% CPU
  maxMemory: 512 * 1024 * 1024, // 512MB
  maxTime: 60000, // 60 seconds
  allowedPaths: [], // No file system restrictions by default
  allowedNetworks: [], // No network restrictions by default
};

/**
 * Task execution function type
 */
export type TaskFunction<T> = () => Promise<T>;

/**
 * Isolated Task Executor
 * 
 * Provides a high-level interface for executing tasks in isolation
 */
export class IsolatedTaskExecutor {
  private readonly isolationContext: IsolationContextImpl;
  private readonly defaultConfig: IsolationConfig;
  
  constructor(defaultConfig?: Partial<IsolationConfig>) {
    this.isolationContext = new IsolationContextImpl();
    this.defaultConfig = {
      ...DEFAULT_RESOURCE_LIMITS,
      ...defaultConfig,
    };
  }
  
  /**
   * Execute a task in an isolated context
   * 
   * @param taskFn - Task function to execute
   * @param config - Optional custom resource limits
   * @returns Execution result
   * 
   * Requirements: 6.1, 6.3
   */
  async executeTask<T>(
    taskFn: TaskFunction<T>,
    config?: Partial<IsolationConfig>
  ): Promise<ExecutionResult<T>> {
    // Merge config with defaults
    const finalConfig: IsolationConfig = {
      ...this.defaultConfig,
      ...config,
    };
    
    // Create isolation context
    const handle = await this.isolationContext.createContext(finalConfig);
    
    try {
      // Execute task in isolation
      const result = await this.isolationContext.execute(handle, taskFn);
      
      return result;
    } finally {
      // Always cleanup context
      await this.isolationContext.destroyContext(handle);
    }
  }
  
  /**
   * Execute multiple tasks in parallel with isolation
   * 
   * @param tasks - Array of task functions
   * @param config - Optional custom resource limits
   * @returns Array of execution results
   * 
   * Requirements: 6.1, 6.2
   */
  async executeTasksInParallel<T>(
    tasks: TaskFunction<T>[],
    config?: Partial<IsolationConfig>
  ): Promise<ExecutionResult<T>[]> {
    // Execute all tasks in parallel
    const results = await Promise.all(
      tasks.map(task => this.executeTask(task, config))
    );
    
    return results;
  }
  
  /**
   * Execute tasks sequentially with isolation
   * 
   * @param tasks - Array of task functions
   * @param config - Optional custom resource limits
   * @returns Array of execution results
   * 
   * Requirements: 6.1, 6.2
   */
  async executeTasksSequentially<T>(
    tasks: TaskFunction<T>[],
    config?: Partial<IsolationConfig>
  ): Promise<ExecutionResult<T>[]> {
    const results: ExecutionResult<T>[] = [];
    
    for (const task of tasks) {
      const result = await this.executeTask(task, config);
      results.push(result);
      
      // Stop on first failure if desired
      if (!result.success) {
        break;
      }
    }
    
    return results;
  }
}

/**
 * Create a new Isolated Task Executor instance
 */
export function createIsolatedTaskExecutor(config?: Partial<IsolationConfig>): IsolatedTaskExecutor {
  return new IsolatedTaskExecutor(config);
}
