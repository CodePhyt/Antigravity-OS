/**
 * Main Orchestrator Class
 * Coordinates all components for spec-driven development execution
 *
 * Requirements: All (3.1, 3.2, 3.3, 3.4, 3.5, 2.7)
 */

import { TaskManager } from './task-manager';
import { createRalphLoop, type RalphLoop } from './ralph-loop';
import { createTestRunner, type TestRunner } from '@/services/test-runner';
import type { ErrorContext, Task } from '@/types/spec';

/**
 * Model routing strategy
 */
export type ModelRoutingStrategy = 'cloud' | 'local' | 'hybrid';

/**
 * Task type for model routing
 */
export type TaskType = 'generation' | 'validation' | 'review' | 'parsing';

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Path to spec directory */
  specPath: string;

  /** Maximum Ralph-Loop attempts per task (default: 3) */
  maxRalphLoopAttempts?: number;

  /** Whether to run tests automatically (default: true) */
  autoRunTests?: boolean;

  /** Model routing strategy (default: 'hybrid') */
  modelRouting?: ModelRoutingStrategy;

  /** Whether to use Docker sandboxing (default: true if available) */
  useSandboxing?: boolean;

  /** Whether to use n8n workflows (default: true if available) */
  useN8nWorkflows?: boolean;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  /** Whether execution completed successfully */
  success: boolean;

  /** IDs of completed tasks */
  completedTasks: string[];

  /** ID of failed task (if any) */
  failedTask: string | null;

  /** Error context (if failed) */
  error: ErrorContext | null;

  /** Total execution time in milliseconds */
  duration: number;
}

/**
 * Main Orchestrator
 * Coordinates spec parsing, task execution, testing, and self-correction
 */
export class Orchestrator {
  private readonly taskManager: TaskManager;
  private readonly ralphLoop: RalphLoop;
  private readonly testRunner: TestRunner;
  private readonly config: Required<OrchestratorConfig>;
  private executionStartTime: number = 0;

  constructor(config: OrchestratorConfig) {
    this.config = {
      maxRalphLoopAttempts: 3,
      autoRunTests: true,
      modelRouting: 'hybrid',
      useSandboxing: true,
      useN8nWorkflows: true,
      ...config,
    };

    this.taskManager = new TaskManager();
    this.ralphLoop = createRalphLoop(this.taskManager, {
      specPath: this.config.specPath,
      maxAttempts: this.config.maxRalphLoopAttempts,
    });
    this.testRunner = createTestRunner();
  }

  /**
   * Get model routing configuration
   *
   * @returns Current routing strategy
   */
  getModelRouting(): ModelRoutingStrategy {
    return this.config.modelRouting || 'hybrid';
  }

  /**
   * Update model routing strategy
   *
   * @param strategy - New routing strategy
   */
  setModelRouting(strategy: ModelRoutingStrategy): void {
    this.config.modelRouting = strategy;
  }

  /**
   * Load spec and initialize task manager
   *
   * @returns Whether loading was successful
   */
  async loadSpec(): Promise<boolean> {
    try {
      const result = await this.taskManager.loadSpec(this.config.specPath);
      return result.success;
    } catch (error) {
      console.error('Failed to load spec:', error);
      return false;
    }
  }

  /**
   * Execute all tasks in the spec
   *
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   *
   * @returns Execution result
   */
  async execute(): Promise<ExecutionResult> {
    this.executionStartTime = Date.now();

    try {
      // Load spec if not already loaded
      if (!this.taskManager.getSpec()) {
        const loaded = await this.loadSpec();
        if (!loaded) {
          return {
            success: false,
            completedTasks: [],
            failedTask: null,
            error: {
              taskId: 'load-spec',
              errorMessage: 'Failed to load spec',
              stackTrace: '',
              failedTest: null,
              timestamp: new Date(),
            },
            duration: Date.now() - this.executionStartTime,
          };
        }
      }

      // Main execution loop
      while (true) {
        // Select next task (Requirement 3.1)
        const nextTask = this.taskManager.selectNextTask();

        if (!nextTask) {
          // No more tasks - check if execution is complete
          if (this.taskManager.isExecutionComplete()) {
            // Success! All tasks completed
            return {
              success: true,
              completedTasks: this.taskManager.getState().completedTasks,
              failedTask: null,
              error: null,
              duration: Date.now() - this.executionStartTime,
            };
          } else {
            // No task selected but execution not complete - might be waiting for something
            break;
          }
        }

        // Queue the task
        await this.taskManager.queueTask(nextTask.id);

        // Start the task
        await this.taskManager.startTask(nextTask.id);

        // Execute the task
        const taskResult = await this.executeTask(nextTask);

        if (taskResult.success) {
          // Task succeeded - complete it and continue
          await this.taskManager.completeTask(nextTask.id);
        } else {
          // Task failed - trigger Ralph-Loop (Requirement 3.5)
          const ralphLoopResult = await this.ralphLoop.executeCorrection(taskResult.error!);

          if (ralphLoopResult.success) {
            // Correction applied successfully - task will be retried
            console.log(
              `Ralph-Loop corrected task ${nextTask.id} (attempt ${ralphLoopResult.attemptNumber})`
            );
            // Continue to next iteration - the reset task will be selected again
          } else if (ralphLoopResult.exhausted) {
            // Max attempts exhausted - halt execution
            return {
              success: false,
              completedTasks: this.taskManager.getState().completedTasks,
              failedTask: nextTask.id,
              error: taskResult.error || null,
              duration: Date.now() - this.executionStartTime,
            };
          } else {
            // Correction failed but not exhausted - continue trying
            console.log(
              `Ralph-Loop attempt ${ralphLoopResult.attemptNumber} failed: ${ralphLoopResult.error}`
            );
          }
        }
      }

      // Execution halted for some reason
      return {
        success: false,
        completedTasks: this.taskManager.getState().completedTasks,
        failedTask: null,
        error: null,
        duration: Date.now() - this.executionStartTime,
      };
    } catch (error) {
      return {
        success: false,
        completedTasks: this.taskManager.getState().completedTasks,
        failedTask: null,
        error: {
          taskId: 'orchestrator',
          errorMessage: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack || '' : '',
          failedTest: null,
          timestamp: new Date(),
        },
        duration: Date.now() - this.executionStartTime,
      };
    }
  }

  /**
   * Execute a single task
   *
   * @param task - Task to execute
   * @returns Task execution result
   */
  private async executeTask(task: Task): Promise<{ success: boolean; error?: ErrorContext }> {
    try {
      // For now, we'll simulate task execution
      // In a real implementation, this would:
      // 1. Determine task type (code generation, testing, etc.)
      // 2. Execute the appropriate action
      // 3. Run tests if configured
      // 4. Return success/failure

      // If this is a test task and auto-run is enabled
      if (this.config.autoRunTests && task.description.toLowerCase().includes('test')) {
        // Run tests
        const testResult = await this.testRunner.runTests([]);

        if (!testResult.success) {
          // Tests failed - create error context
          const error: ErrorContext = {
            taskId: task.id,
            errorMessage: `${testResult.failedTests} test(s) failed`,
            stackTrace: testResult.failures.map((f) => f.stackTrace).join('\n'),
            failedTest: testResult.failures[0]?.testName || null,
            timestamp: new Date(),
          };

          return { success: false, error };
        }
      }

      // Task succeeded
      return { success: true };
    } catch (error) {
      // Task execution failed
      const errorContext: ErrorContext = {
        taskId: task.id,
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack || '' : '',
        failedTest: null,
        timestamp: new Date(),
      };

      return { success: false, error: errorContext };
    }
  }

  /**
   * Get current execution status
   *
   * @returns Execution status
   */
  getStatus() {
    return this.taskManager.getStatus();
  }

  /**
   * Get task manager instance
   *
   * @returns Task manager
   */
  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  /**
   * Get Ralph-Loop instance
   *
   * @returns Ralph-Loop
   */
  getRalphLoop(): RalphLoop {
    return this.ralphLoop;
  }
}

/**
 * Factory function to create Orchestrator instance
 *
 * @param config - Orchestrator configuration
 * @returns Orchestrator instance
 */
export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  return new Orchestrator(config);
}
