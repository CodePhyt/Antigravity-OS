/**
 * Ralph-Loop Engine - Self-Correction Coordinator
 * Coordinates error analysis, correction generation, and application with iteration tracking
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import type { ErrorContext } from '@/types/spec';
import type { CorrectionPlan } from './correction-generator';
import type { TaskManager } from './task-manager';
import { createErrorAnalyzer } from './error-analyzer';
import { createCorrectionGenerator } from './correction-generator';
import { createCorrectionApplier } from './correction-applier';

/**
 * Ralph-Loop execution result
 */
export interface RalphLoopResult {
  /** Whether correction was successful */
  success: boolean;

  /** Correction plan that was applied */
  plan: CorrectionPlan | null;

  /** Error message if correction failed */
  error?: string;

  /** Whether max attempts were exhausted */
  exhausted: boolean;

  /** Current attempt number */
  attemptNumber: number;
}

/**
 * Ralph-Loop configuration
 */
export interface RalphLoopConfig {
  /** Maximum correction attempts per task (default: 3) */
  maxAttempts?: number;

  /** Spec directory path */
  specPath: string;
}

/**
 * Ralph-Loop Engine
 * Coordinates the self-correction process with iteration tracking
 */
export class RalphLoop {
  private readonly errorAnalyzer = createErrorAnalyzer();
  private readonly correctionGenerator = createCorrectionGenerator();
  private readonly correctionApplier = createCorrectionApplier();
  private readonly maxAttempts: number;
  private readonly specPath: string;

  constructor(
    private readonly taskManager: TaskManager,
    config: RalphLoopConfig
  ) {
    this.maxAttempts = config.maxAttempts ?? 3;
    this.specPath = config.specPath;
  }

  /**
   * Execute Ralph-Loop correction for a failed task
   *
   * @param error - Error context from failed task
   * @returns Ralph-Loop execution result
   *
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   */
  async executeCorrection(error: ErrorContext): Promise<RalphLoopResult> {
    const taskId = error.taskId;

    // Get current attempt count
    const currentAttempts = this.taskManager.getRalphLoopAttempts(taskId);
    const attemptNumber = currentAttempts + 1;

    // Check if max attempts exhausted (Requirement 5.6)
    if (attemptNumber > this.maxAttempts) {
      return {
        success: false,
        plan: null,
        error: `Ralph-Loop exhausted: ${this.maxAttempts} attempts failed for task ${taskId}`,
        exhausted: true,
        attemptNumber: currentAttempts,
      };
    }

    try {
      // Increment attempt counter
      await this.taskManager.incrementRalphLoopAttempts(taskId);

      // Step 1: Analyze error (Requirement 5.1)
      const analysis = this.errorAnalyzer.analyze(error);

      // Step 2: Generate correction (Requirement 5.2)
      const plan = await this.correctionGenerator.generateCorrection(error, analysis, {
        specPath: this.specPath,
        attemptNumber,
      });

      // Step 3: Apply correction (Requirement 5.3)
      await this.correctionApplier.applyCorrection(plan, {
        specPath: this.specPath,
        createBackup: true,
      });

      // Step 4: Reset task status (Requirement 5.4)
      await this.taskManager.resetTask(taskId);

      return {
        success: true,
        plan,
        exhausted: false, // Successful corrections are never exhausted
        attemptNumber,
      };
    } catch (correctionError) {
      // Mark as exhausted if this was the final allowed attempt
      // attemptNumber is 1-based, so attemptNumber === maxAttempts means this was the last try
      const exhausted = attemptNumber >= this.maxAttempts;

      return {
        success: false,
        plan: null,
        error: correctionError instanceof Error ? correctionError.message : String(correctionError),
        exhausted,
        attemptNumber,
      };
    }
  }

  /**
   * Check if a task has exhausted its Ralph-Loop attempts
   *
   * @param taskId - Task ID to check
   * @returns True if attempts exhausted
   *
   * Requirement: 5.6
   */
  isExhausted(taskId: string): boolean {
    return this.taskManager.getRalphLoopAttempts(taskId) >= this.maxAttempts;
  }

  /**
   * Get remaining attempts for a task
   *
   * @param taskId - Task ID
   * @returns Number of remaining attempts
   *
   * Requirement: 5.6
   */
  getRemainingAttempts(taskId: string): number {
    const current = this.taskManager.getRalphLoopAttempts(taskId);
    return Math.max(0, this.maxAttempts - current);
  }

  /**
   * Reset Ralph-Loop attempts for a task
   * Used when task completes successfully
   *
   * @param taskId - Task ID
   *
   * Requirement: 5.4
   */
  async resetAttempts(taskId: string): Promise<void> {
    await this.taskManager.resetRalphLoopAttempts(taskId);
  }
}

/**
 * Factory function to create Ralph-Loop instance
 *
 * @param taskManager - Task manager instance
 * @param config - Ralph-Loop configuration
 * @returns Ralph-Loop instance
 */
export function createRalphLoop(taskManager: TaskManager, config: RalphLoopConfig): RalphLoop {
  return new RalphLoop(taskManager, config);
}
