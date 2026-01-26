/**
 * Ralph-Loop Trigger Tool
 *
 * Triggers autonomous self-healing for environment drift.
 * Integrates with the existing Ralph-Loop engine.
 *
 * Requirements: 5
 */

import { createErrorAnalyzer } from '../../core/error-analyzer';
import type { ErrorContext } from '../../types/spec';

/**
 * Ralph-Loop request
 */
export interface RalphLoopRequest {
  errorContext?: {
    message: string;
    stack?: string;
    taskId?: string;
    file?: string;
  };
  mode: 'analyze' | 'correct' | 'health-check';
}

/**
 * Ralph-Loop result
 */
export interface RalphLoopResult {
  success: boolean;
  mode: string;
  analysis?: {
    errorType: string;
    rootCause: string;
    specViolation: boolean;
  };
  correction?: {
    plan: string;
    updatedFiles: string[];
    attemptNumber: number;
  };
  healthCheck?: {
    systemHealthy: boolean;
    issues: string[];
    recommendations: string[];
  };
  exhausted: boolean;
  diagnostics: string;
}

/**
 * Trigger Ralph-Loop for autonomous self-healing
 *
 * Supports three modes:
 * - analyze: Analyze error and return root cause
 * - correct: Generate correction plan (requires full Ralph-Loop integration)
 * - health-check: Check system health
 *
 * @param req - Ralph-Loop request
 * @returns Ralph-Loop result
 */
export async function triggerRalphLoop(req: RalphLoopRequest): Promise<RalphLoopResult> {
  const { mode, errorContext } = req;

  switch (mode) {
    case 'analyze':
      return analyzeError(errorContext);

    case 'correct':
      return generateCorrection(errorContext);

    case 'health-check':
      return await performHealthCheck();

    default: {
      const unknownMode: never = mode;
      return {
        success: false,
        mode: unknownMode as string,
        exhausted: false,
        diagnostics: `Unknown mode: ${unknownMode as string}. Use 'analyze', 'correct', or 'health-check'.`,
      };
    }
  }
}

/**
 * Analyze error and return root cause
 */
function analyzeError(errorContext?: RalphLoopRequest['errorContext']): RalphLoopResult {
  if (!errorContext) {
    return {
      success: false,
      mode: 'analyze',
      exhausted: false,
      diagnostics: 'Error context is required for analysis mode',
    };
  }

  try {
    const analyzer = createErrorAnalyzer();

    // Convert to ErrorContext format
    const context: ErrorContext = {
      errorMessage: errorContext.message,
      stackTrace: errorContext.stack || '',
      taskId: errorContext.taskId || 'unknown',
      failedTest: errorContext.file || null,
      timestamp: new Date(),
    };

    // Analyze error
    const analysis = analyzer.analyze(context);

    return {
      success: true,
      mode: 'analyze',
      analysis: {
        errorType: analysis.errorType,
        rootCause: analysis.rootCause,
        specViolation: analysis.errorType === 'invalid_spec',
      },
      exhausted: false,
      diagnostics: `Error analyzed: ${analysis.errorType}`,
    };
  } catch (error) {
    return {
      success: false,
      mode: 'analyze',
      exhausted: false,
      diagnostics: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Generate correction plan
 *
 * Note: Full correction requires TaskManager integration.
 * This is a simplified version that provides correction guidance.
 */
function generateCorrection(errorContext?: RalphLoopRequest['errorContext']): RalphLoopResult {
  if (!errorContext) {
    return {
      success: false,
      mode: 'correct',
      exhausted: false,
      diagnostics: 'Error context is required for correction mode',
    };
  }

  try {
    const analyzer = createErrorAnalyzer();

    // Convert to ErrorContext format
    const context: ErrorContext = {
      errorMessage: errorContext.message,
      stackTrace: errorContext.stack || '',
      taskId: errorContext.taskId || 'unknown',
      failedTest: errorContext.file || null,
      timestamp: new Date(),
    };

    // Analyze error
    const analysis = analyzer.analyze(context);

    // Generate correction guidance
    const correctionPlan = generateCorrectionGuidance(analysis);

    return {
      success: true,
      mode: 'correct',
      analysis: {
        errorType: analysis.errorType,
        rootCause: analysis.rootCause,
        specViolation: analysis.errorType === 'invalid_spec',
      },
      correction: {
        plan: correctionPlan,
        updatedFiles: [], // Would be populated by full Ralph-Loop
        attemptNumber: 1,
      },
      exhausted: false,
      diagnostics: 'Correction plan generated',
    };
  } catch (error) {
    return {
      success: false,
      mode: 'correct',
      exhausted: false,
      diagnostics: `Correction failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Generate correction guidance based on error analysis
 */
function generateCorrectionGuidance(analysis: { errorType: string; rootCause: string }): string {
  const { errorType, rootCause } = analysis;

  switch (errorType) {
    case 'compilation_error':
      return `Fix compilation error: ${rootCause}. Check for missing brackets, semicolons, or type errors.`;

    case 'runtime_error':
      return `Fix runtime error: ${rootCause}. Add null checks, error handling, or validation.`;

    case 'missing_dependency':
      return `Fix missing dependency: ${rootCause}. Install required packages or check import paths.`;

    case 'invalid_spec':
      return `Update spec: ${rootCause}. The specification needs correction or clarification.`;

    case 'test_failure':
      return `Fix test failure: ${rootCause}. Update implementation or adjust test expectations.`;

    case 'timeout_error':
      return `Fix timeout: ${rootCause}. Optimize performance or increase timeout limit.`;

    default:
      return `Address error: ${rootCause}. Review error message and stack trace for details.`;
  }
}

/**
 * Perform system health check
 */
async function performHealthCheck(): Promise<RalphLoopResult> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check Node.js version
  const nodeVersion = process.version;
  if (!nodeVersion.startsWith('v18') && !nodeVersion.startsWith('v20')) {
    issues.push(`Node.js version ${nodeVersion} may not be optimal`);
    recommendations.push('Consider upgrading to Node.js 18 or 20 LTS');
  }

  // Check if in a git repository
  try {
    const { execSync } = await import('child_process');
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch {
    issues.push('Not in a git repository');
    recommendations.push('Initialize git repository for version control');
  }

  // Check if package.json exists
  const fs = await import('fs');
  if (!fs.existsSync('package.json')) {
    issues.push('No package.json found');
    recommendations.push('Initialize npm project with: npm init');
  }

  const systemHealthy = issues.length === 0;

  return {
    success: true,
    mode: 'health-check',
    healthCheck: {
      systemHealthy,
      issues,
      recommendations,
    },
    exhausted: false,
    diagnostics: systemHealthy ? 'System is healthy' : `Found ${issues.length} issue(s)`,
  };
}
