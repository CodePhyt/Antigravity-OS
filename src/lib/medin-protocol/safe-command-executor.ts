/**
 * Safe Command Executor
 * 
 * Wraps shell command execution with Constitutional Pre-Check
 * Ensures all commands are analyzed for safety before execution
 * 
 * Requirements: 5.1, 5.5
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ConstitutionalPreCheckImpl } from './constitutional-pre-check';
import type { SafetyAnalysis } from './types';

const execAsync = promisify(exec);

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  /** Whether command executed successfully */
  success: boolean;
  
  /** Command output (stdout) */
  output: string;
  
  /** Error output (stderr) */
  error?: string;
  
  /** Exit code */
  exitCode: number;
  
  /** Safety analysis result */
  safetyAnalysis: SafetyAnalysis;
  
  /** Whether command was blocked */
  blocked: boolean;
  
  /** Whether human approval was requested */
  approvalRequested: boolean;
}

/**
 * Command execution options
 */
export interface CommandExecutionOptions {
  /** Working directory */
  cwd?: string;
  
  /** Environment variables */
  env?: NodeJS.ProcessEnv;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Whether to skip constitutional pre-check (use with caution) */
  skipPreCheck?: boolean;
  
  /** Approval callback for blocked commands */
  approvalCallback?: (analysis: SafetyAnalysis) => Promise<boolean>;
}

/**
 * Safe Command Executor
 * 
 * Wraps shell command execution with Constitutional Pre-Check
 */
export class SafeCommandExecutor {
  private readonly preCheck: ConstitutionalPreCheckImpl;
  
  constructor() {
    this.preCheck = new ConstitutionalPreCheckImpl();
  }
  
  /**
   * Execute shell command with safety pre-check
   * 
   * @param command - Shell command to execute
   * @param options - Execution options
   * @returns Execution result
   * 
   * Requirements: 5.1, 5.5
   */
  async executeCommand(
    command: string,
    options: CommandExecutionOptions = {}
  ): Promise<CommandExecutionResult> {
    // Skip pre-check if explicitly requested (use with caution)
    if (options.skipPreCheck) {
      return this.executeWithoutPreCheck(command, options);
    }
    
    // Step 1: Analyze command for safety violations (Requirement 5.1)
    const safetyAnalysis = await this.preCheck.analyzeCommand(command);
    
    // Step 2: Handle based on recommendation
    if (safetyAnalysis.recommendation === 'block') {
      // Command is blocked - request approval (Requirement 5.5)
      if (options.approvalCallback) {
        const approved = await options.approvalCallback(safetyAnalysis);
        
        if (!approved) {
          return {
            success: false,
            output: '',
            error: `Command blocked by Constitutional Pre-Check: ${safetyAnalysis.violations.map(v => v.description).join(', ')}`,
            exitCode: -1,
            safetyAnalysis,
            blocked: true,
            approvalRequested: true,
          };
        }
        
        // Approved - execute with warning
        return this.executeWithWarning(command, options, safetyAnalysis);
      }
      
      // No approval callback - block execution
      return {
        success: false,
        output: '',
        error: `Command blocked by Constitutional Pre-Check: ${safetyAnalysis.violations.map(v => v.description).join(', ')}\nSuggested alternative: ${safetyAnalysis.alternative || 'None'}`,
        exitCode: -1,
        safetyAnalysis,
        blocked: true,
        approvalRequested: false,
      };
    }
    
    if (safetyAnalysis.recommendation === 'warn') {
      // Command has warnings - execute with caution
      return this.executeWithWarning(command, options, safetyAnalysis);
    }
    
    // Command is safe - execute normally
    return this.executeWithoutPreCheck(command, options, safetyAnalysis);
  }
  
  /**
   * Execute command without pre-check
   */
  private async executeWithoutPreCheck(
    command: string,
    options: CommandExecutionOptions,
    safetyAnalysis?: SafetyAnalysis
  ): Promise<CommandExecutionResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options.cwd,
        env: options.env,
        timeout: options.timeout,
      });
      
      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
        exitCode: 0,
        safetyAnalysis: safetyAnalysis || {
          safe: true,
          violations: [],
          riskLevel: 'low',
          recommendation: 'allow',
        },
        blocked: false,
        approvalRequested: false,
      };
    } catch (error) {
      const execError = error as { code?: number; stdout?: string; stderr?: string };
      
      return {
        success: false,
        output: execError.stdout || '',
        error: execError.stderr || (error instanceof Error ? error.message : String(error)),
        exitCode: execError.code || 1,
        safetyAnalysis: safetyAnalysis || {
          safe: true,
          violations: [],
          riskLevel: 'low',
          recommendation: 'allow',
        },
        blocked: false,
        approvalRequested: false,
      };
    }
  }
  
  /**
   * Execute command with warning
   */
  private async executeWithWarning(
    command: string,
    options: CommandExecutionOptions,
    safetyAnalysis: SafetyAnalysis
  ): Promise<CommandExecutionResult> {
    // Log warning about safety violations
    console.warn(`⚠️ Safety Warning: ${safetyAnalysis.violations.map(v => v.description).join(', ')}`);
    
    // Execute command
    return this.executeWithoutPreCheck(command, options, safetyAnalysis);
  }
}

/**
 * Create a new Safe Command Executor instance
 */
export function createSafeCommandExecutor(): SafeCommandExecutor {
  return new SafeCommandExecutor();
}
