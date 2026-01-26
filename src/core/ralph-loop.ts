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
import { PRDReaderImpl } from '@/lib/medin-protocol/prd-reader';
import { ActivityLogManager } from '@/lib/medin-protocol/activity-log';
import type { PRDDocument, Requirement, ActivityEntry } from '@/lib/medin-protocol/types';

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

  /** PRD requirements loaded for this task */
  prdRequirements?: Requirement[];
}

/**
 * Ralph-Loop configuration
 */
export interface RalphLoopConfig {
  /** Maximum correction attempts per task (default: 3) */
  maxAttempts?: number;

  /** Spec directory path */
  specPath: string;

  /** PRD file path (optional, defaults to docs/PRD.md) */
  prdPath?: string;

  /** Activity log file path (optional, defaults to ACTIVITY_LOG.md) */
  activityLogPath?: string;

  /** False positive rate threshold (default: 0.001 = 0.1%) */
  falsePositiveThreshold?: number;
}

/**
 * False positive tracking data
 * Requirements: 9.3, 9.4, 9.5
 */
export interface FalsePositiveStats {
  /** Total number of task completions */
  totalCompletions: number;

  /** Number of false positives detected */
  falsePositives: number;

  /** False positive rate (0-1) */
  rate: number;

  /** Whether rate exceeds threshold */
  alertTriggered: boolean;

  /** List of task IDs with false positives */
  falsePositiveTaskIds: string[];
}

/**
 * Ralph-Loop Engine
 * Coordinates the self-correction process with iteration tracking
 * Enhanced with Medin Protocol: PRD-first execution, validation, and activity logging
 */
export class RalphLoop {
  private readonly errorAnalyzer = createErrorAnalyzer();
  private readonly correctionGenerator = createCorrectionGenerator();
  private readonly correctionApplier = createCorrectionApplier();
  private readonly maxAttempts: number;
  private readonly specPath: string;
  private readonly prdReader: PRDReaderImpl;
  private readonly activityLog: ActivityLogManager;
  private readonly falsePositiveThreshold: number;
  private prdDocument: PRDDocument | null = null;

  // False positive tracking (Requirements: 9.3, 9.4, 9.5)
  private totalCompletions = 0;
  private falsePositiveCount = 0;
  private falsePositiveTaskIds: Set<string> = new Set();
  private validationBypassAttempts: Map<string, { count: number; justification?: string }> = new Map();

  constructor(
    private readonly taskManager: TaskManager,
    config: RalphLoopConfig
  ) {
    this.maxAttempts = config.maxAttempts ?? 3;
    this.specPath = config.specPath;
    this.prdReader = new PRDReaderImpl(config.prdPath || 'docs/PRD.md');
    this.activityLog = new ActivityLogManager(config.activityLogPath || 'ACTIVITY_LOG.md');
    this.falsePositiveThreshold = config.falsePositiveThreshold ?? 0.001; // 0.1% default
  }

  /**
   * Initialize Ralph-Loop by loading PRD
   * MUST be called before executing any tasks
   * 
   * Requirements: 1.1, 1.2
   */
  async initialize(): Promise<void> {
    try {
      this.prdDocument = await this.prdReader.loadPRD();
    } catch (error) {
      throw new Error(
        `Ralph-Loop initialization failed: Cannot load PRD. ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get requirements relevant to a specific task
   * 
   * Requirements: 1.4
   */
  getRequirementsForTask(taskId: string): Requirement[] {
    if (!this.prdDocument) {
      throw new Error('Ralph-Loop not initialized. Call initialize() first.');
    }

    return this.prdReader.getRequirementsForTask(taskId);
  }

  /**
   * Reload PRD from disk
   * Called when PRD changes are detected
   * 
   * Requirements: 1.5, 12.1, 12.2, 12.4
   */
  async reloadPRD(): Promise<void> {
    try {
      const oldVersion = this.prdDocument?.version;
      this.prdDocument = await this.prdReader.reloadPRD();
      const newVersion = this.prdDocument.version;

      // Log PRD reload event (Requirement 12.4)
      await this.activityLog.logEntry({
        timestamp: new Date().toISOString(),
        taskId: 'system',
        category: 'task',
        status: 'success',
        details: {
          description: `PRD reloaded: version ${oldVersion || 'unknown'} → ${newVersion}`,
        },
        metadata: {
          oldVersion,
          newVersion,
          requirementCount: this.prdDocument.requirements.length,
        },
      });
    } catch (error) {
      // Log PRD reload failure
      await this.activityLog.logEntry({
        timestamp: new Date().toISOString(),
        taskId: 'system',
        category: 'error',
        status: 'failure',
        details: {
          description: 'PRD reload failed',
          errorContext: {
            message: error instanceof Error ? error.message : String(error),
          },
        },
        metadata: {},
      });

      throw new Error(
        `PRD reload failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute Ralph-Loop correction for a failed task
   *
   * @param error - Error context from failed task
   * @returns Ralph-Loop execution result
   *
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   * Enhanced with Medin Protocol: PRD-first execution (Requirements 1.1, 1.3, 1.4)
   * Activity logging (Requirements 2.1, 2.2, 2.3)
   */
  async executeCorrection(error: ErrorContext): Promise<RalphLoopResult> {
    const taskId = error.taskId;

    // Get requirements for this task if PRD is loaded (Requirement 1.4)
    const prdRequirements = this.prdDocument ? this.getRequirementsForTask(taskId) : [];

    // Get current attempt count
    const currentAttempts = this.taskManager.getRalphLoopAttempts(taskId);
    const attemptNumber = currentAttempts + 1;

    // Check if max attempts exhausted (Requirement 5.6)
    if (attemptNumber > this.maxAttempts) {
      // Log failure (Requirement 2.2)
      await this.activityLog.logEntry({
        timestamp: new Date().toISOString(),
        taskId,
        category: 'error',
        status: 'failure',
        details: {
          description: `Ralph-Loop exhausted: ${this.maxAttempts} attempts failed`,
          errorContext: {
            message: error.errorMessage,
            stack: error.stackTrace,
          },
        },
        metadata: {
          attemptNumber: currentAttempts,
          maxAttempts: this.maxAttempts,
          failedTest: error.failedTest,
        },
      });

      return {
        success: false,
        plan: null,
        error: `Ralph-Loop exhausted: ${this.maxAttempts} attempts failed for task ${taskId}`,
        exhausted: true,
        attemptNumber: currentAttempts,
        prdRequirements,
      };
    }

    try {
      // Increment attempt counter
      await this.taskManager.incrementRalphLoopAttempts(taskId);

      // Step 1: Analyze error (Requirement 5.1)
      const analysis = this.errorAnalyzer.analyze(error);

      // Step 2: Generate correction (Requirement 5.2)
      // Include PRD requirements in correction context
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

      // Log self-healing event (Requirement 2.3)
      await this.activityLog.logEntry({
        timestamp: new Date().toISOString(),
        taskId,
        category: 'self-healing',
        status: 'success',
        details: {
          description: `Self-healing correction applied (attempt ${attemptNumber}/${this.maxAttempts})`,
          errorContext: {
            message: error.errorMessage,
            stack: error.stackTrace,
          },
          corrections: [
            {
              type: plan.targetFile.includes('requirements.md') || plan.targetFile.includes('design.md') || plan.targetFile.includes('tasks.md')
                ? 'spec-update'
                : plan.targetFile.includes('.config') || plan.targetFile.includes('.json')
                ? 'config-change'
                : 'code-fix',
              description: plan.correction,
              before: plan.targetFile || '',
              after: plan.updatedContent,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        metadata: {
          attemptNumber,
          maxAttempts: this.maxAttempts,
          analysisType: analysis.errorType,
          prdRequirements: prdRequirements.map(r => r.id),
        },
      });

      return {
        success: true,
        plan,
        exhausted: false,
        attemptNumber,
        prdRequirements,
      };
    } catch (correctionError) {
      const exhausted = attemptNumber >= this.maxAttempts;

      // Log correction failure (Requirement 2.2)
      await this.activityLog.logEntry({
        timestamp: new Date().toISOString(),
        taskId,
        category: 'error',
        status: 'failure',
        details: {
          description: `Correction attempt ${attemptNumber} failed`,
          errorContext: {
            message: correctionError instanceof Error ? correctionError.message : String(correctionError),
          },
        },
        metadata: {
          attemptNumber,
          maxAttempts: this.maxAttempts,
          exhausted,
        },
      });

      return {
        success: false,
        plan: null,
        error: correctionError instanceof Error ? correctionError.message : String(correctionError),
        exhausted,
        attemptNumber,
        prdRequirements,
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

  /**
   * Log task completion to activity log
   * 
   * @param taskId - Task ID
   * @param success - Whether task completed successfully
   * @param validationResults - Optional validation results
   * @param error - Optional error context if failed
   * 
   * Requirements: 2.1, 2.2
   */
  async logTaskCompletion(
    taskId: string,
    success: boolean,
    validationResults?: ActivityEntry['details']['validationResults'],
    error?: ErrorContext
  ): Promise<void> {
    const entry: ActivityEntry = {
      timestamp: new Date().toISOString(),
      taskId,
      category: 'task',
      status: success ? 'success' : 'failure',
      details: {
        description: success
          ? `Task completed successfully`
          : `Task failed: ${error?.errorMessage || 'Unknown error'}`,
        validationResults,
        errorContext: error
          ? {
              message: error.errorMessage,
              stack: error.stackTrace,
            }
          : undefined,
      },
      metadata: {
        ralphLoopAttempts: this.taskManager.getRalphLoopAttempts(taskId),
      },
    };

    await this.activityLog.logEntry(entry);

    // Track completion for false positive rate calculation (Requirement 9.3)
    if (success) {
      this.totalCompletions++;
      await this.checkFalsePositiveRate();
    }
  }

  /**
   * Track validation bypass attempt
   * Requirement 9.5: Validation bypass requires justification
   * 
   * @param taskId - Task ID
   * @param justification - Reason for bypass
   */
  trackValidationBypass(taskId: string, justification: string): void {
    const existing = this.validationBypassAttempts.get(taskId);
    this.validationBypassAttempts.set(taskId, {
      count: (existing?.count || 0) + 1,
      justification,
    });
  }

  /**
   * Get validation bypass attempts for a task
   * 
   * @param taskId - Task ID
   * @returns Bypass attempt data
   */
  getValidationBypassAttempts(taskId: string): { count: number; justification?: string } | undefined {
    return this.validationBypassAttempts.get(taskId);
  }

  /**
   * Report false positive retroactively
   * Requirement 9.4: Support retroactive false positive correction
   * 
   * @param taskId - Task ID with false positive
   * @param reason - Reason for false positive
   */
  async reportFalsePositive(taskId: string, reason: string): Promise<void> {
    if (this.falsePositiveTaskIds.has(taskId)) {
      // Already reported
      return;
    }

    this.falsePositiveCount++;
    this.falsePositiveTaskIds.add(taskId);

    // Log false positive detection
    await this.activityLog.logEntry({
      timestamp: new Date().toISOString(),
      taskId,
      category: 'validation',
      status: 'failure',
      details: {
        description: `False positive detected: ${reason}`,
      },
      metadata: {
        falsePositiveRate: this.getFalsePositiveRate(),
        totalCompletions: this.totalCompletions,
        falsePositiveCount: this.falsePositiveCount,
      },
    });

    // Check if rate exceeds threshold
    await this.checkFalsePositiveRate();
  }

  /**
   * Get false positive statistics
   * Requirement 9.3: Track false positive rate
   * 
   * @returns False positive statistics
   */
  getFalsePositiveStats(): FalsePositiveStats {
    const rate = this.getFalsePositiveRate();
    const alertTriggered = rate > this.falsePositiveThreshold;

    return {
      totalCompletions: this.totalCompletions,
      falsePositives: this.falsePositiveCount,
      rate,
      alertTriggered,
      falsePositiveTaskIds: Array.from(this.falsePositiveTaskIds),
    };
  }

  /**
   * Calculate false positive rate
   * 
   * @returns False positive rate (0-1)
   */
  private getFalsePositiveRate(): number {
    if (this.totalCompletions === 0) {
      return 0;
    }
    return this.falsePositiveCount / this.totalCompletions;
  }

  /**
   * Check false positive rate and alert if threshold exceeded
   * Requirement 9.3: Alert when rate exceeds 0.1%
   */
  private async checkFalsePositiveRate(): Promise<void> {
    const rate = this.getFalsePositiveRate();

    if (rate > this.falsePositiveThreshold) {
      // Log alert
      await this.activityLog.logEntry({
        timestamp: new Date().toISOString(),
        taskId: 'system',
        category: 'validation',
        status: 'failure',
        details: {
          description: `⚠️ FALSE POSITIVE RATE ALERT: ${(rate * 100).toFixed(2)}% exceeds threshold ${(this.falsePositiveThreshold * 100).toFixed(2)}%`,
        },
        metadata: {
          falsePositiveRate: rate,
          threshold: this.falsePositiveThreshold,
          totalCompletions: this.totalCompletions,
          falsePositiveCount: this.falsePositiveCount,
          falsePositiveTaskIds: Array.from(this.falsePositiveTaskIds),
        },
      });
    }
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
