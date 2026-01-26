/**
 * Sovereign Execute Tool
 *
 * Constitutional command wrapper that validates all operations
 * against the 13 Articles before execution.
 *
 * Requirements: 4, 12
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ConstitutionalValidator,
  type ValidationContext,
  type ConstitutionalViolation,
} from '../../mcp/validator';
import { logEvent } from '../../services/telemetry-service';

const execAsync = promisify(exec);

/**
 * Execute request
 */
export interface ExecuteRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number; // milliseconds
  confirmDestructive?: boolean; // Required for destructive ops
}

/**
 * Execute result
 */
export interface ExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  validated: boolean;
  violations: string[]; // Constitutional violations detected
  executionTime: number; // milliseconds
}

/**
 * Sovereign execute with constitutional validation
 *
 * Validates all commands against the 13 Articles of the Constitution
 * before execution. Captures stdout, stderr, and exitCode.
 * Logs all executions to telemetry.
 *
 * @param req - Execute request
 * @returns Execute result
 */
export async function sovereignExecute(req: ExecuteRequest): Promise<ExecuteResult> {
  const startTime = Date.now();
  const validator = new ConstitutionalValidator();

  // Build validation context
  const context: ValidationContext = {
    command: req.command,
    args: req.args || [],
    cwd: req.cwd || process.cwd(),
    user: process.env.USER || process.env.USERNAME,
  };

  // Validate against constitutional rules
  const violations: ConstitutionalViolation[] = validator.validate(context);

  // Check for destructive operations
  const isDestructive = validator.isDestructive(req.command, req.args || []);
  if (isDestructive && !req.confirmDestructive) {
    violations.push({
      article: 12,
      rule: 'Destructive Operation Protection',
      severity: 'critical',
      message: 'Destructive operation requires explicit confirmation',
      remediation: 'Set confirmDestructive: true in request',
    });
  }

  // If there are violations, reject execution
  if (violations.length > 0) {
    const violationMessages = violations.map((v) => `[Article ${v.article}] ${v.message}`);

    // Log rejection to telemetry
    await logEvent({
      timestamp: new Date().toISOString(),
      type: 'sovereign_execute',
      tool: 'sovereign_execute',
      result: 'failure',
      details: `Constitutional violations: ${violationMessages.join(', ')}`,
    });

    return {
      success: false,
      stdout: '',
      stderr: violationMessages.join('\n'),
      exitCode: -1,
      validated: false,
      violations: violationMessages,
      executionTime: Date.now() - startTime,
    };
  }

  // Execute command
  try {
    const fullCommand = `${req.command} ${(req.args || []).join(' ')}`;
    const options = {
      cwd: req.cwd || process.cwd(),
      env: { ...process.env, ...req.env },
      timeout: req.timeout || 30000, // 30 second default timeout
    };

    const { stdout, stderr } = await execAsync(fullCommand, options);

    const executionTime = Date.now() - startTime;

    // Log success to telemetry
    await logEvent({
      timestamp: new Date().toISOString(),
      type: 'sovereign_execute',
      tool: 'sovereign_execute',
      result: 'success',
      details: `Executed: ${fullCommand}`,
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      validated: true,
      violations: [],
      executionTime,
    };
  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;

    // Type guard for exec error
    const execError = error as { stdout?: string; stderr?: string; code?: number; message: string };

    // Log failure to telemetry
    await logEvent({
      timestamp: new Date().toISOString(),
      type: 'sovereign_execute',
      tool: 'sovereign_execute',
      result: 'failure',
      details: `Command failed: ${execError.message}`,
    });

    return {
      success: false,
      stdout: execError.stdout?.trim() || '',
      stderr: execError.stderr?.trim() || execError.message,
      exitCode: execError.code || 1,
      validated: true,
      violations: [],
      executionTime,
    };
  }
}
