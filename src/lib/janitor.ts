/**
 * The Auto-Janitor - Zero-Error Architecture
 * 
 * Autonomous code quality enforcement system that ensures:
 * - Zero TypeScript errors
 * - Zero ESLint errors
 * - 100% type safety
 * 
 * Integrates with Medin Protocol (Ralph-Loop) for autonomous error correction.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface JanitorError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface JanitorReport {
  totalErrors: number;
  totalWarnings: number;
  errors: JanitorError[];
  isClean: boolean;
  timestamp: string;
}

/**
 * Run TypeScript compiler check
 */
async function checkTypeScript(): Promise<JanitorError[]> {
  try {
    await execAsync('npx tsc --noEmit');
    return [];
  } catch (error: any) {
    const output = error.stdout || error.stderr || '';
    return parseTypeScriptErrors(output);
  }
}

/**
 * Parse TypeScript error output
 */
function parseTypeScriptErrors(output: string): JanitorError[] {
  const errors: JanitorError[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Format: src/file.ts(10,5): error TS2532: Object is possibly 'undefined'.
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/);
    if (match) {
      const [, file, lineNum, column, severity, code, message] = match;
      if (!file || !lineNum || !column || !severity || !code || !message) continue;
      
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum, 10),
        column: parseInt(column, 10),
        code,
        message: message.trim(),
        severity: severity as 'error' | 'warning',
      });
    }
  }

  return errors;
}

/**
 * Run ESLint check
 */
async function checkESLint(): Promise<JanitorError[]> {
  try {
    await execAsync('npx eslint . --format json');
    return [];
  } catch (error: any) {
    const output = error.stdout || '';
    return parseESLintErrors(output);
  }
}

/**
 * Parse ESLint error output
 */
function parseESLintErrors(output: string): JanitorError[] {
  const errors: JanitorError[] = [];

  try {
    const results = JSON.parse(output);
    for (const result of results) {
      for (const message of result.messages) {
        errors.push({
          file: result.filePath,
          line: message.line,
          column: message.column,
          code: message.ruleId || 'eslint',
          message: message.message,
          severity: message.severity === 2 ? 'error' : 'warning',
        });
      }
    }
  } catch {
    // If JSON parsing fails, return empty array
  }

  return errors;
}

/**
 * Run full janitor check
 */
export async function runJanitor(): Promise<JanitorReport> {
  console.log('[Auto-Janitor] Starting codebase scan...');

  const [tsErrors, eslintErrors] = await Promise.all([
    checkTypeScript(),
    checkESLint(),
  ]);

  const allErrors = [...tsErrors, ...eslintErrors];
  const errors = allErrors.filter(e => e.severity === 'error');
  const warnings = allErrors.filter(e => e.severity === 'warning');

  const report: JanitorReport = {
    totalErrors: errors.length,
    totalWarnings: warnings.length,
    errors: allErrors,
    isClean: errors.length === 0,
    timestamp: new Date().toISOString(),
  };

  console.log(`[Auto-Janitor] Scan complete: ${report.totalErrors} errors, ${report.totalWarnings} warnings`);

  return report;
}

/**
 * Get errors grouped by file
 */
export function groupErrorsByFile(errors: JanitorError[]): Map<string, JanitorError[]> {
  const grouped = new Map<string, JanitorError[]>();

  for (const error of errors) {
    const existing = grouped.get(error.file) || [];
    existing.push(error);
    grouped.set(error.file, existing);
  }

  return grouped;
}

/**
 * Format error for display
 */
export function formatError(error: JanitorError): string {
  return `${error.file}:${error.line}:${error.column} - ${error.code}: ${error.message}`;
}

/**
 * Check if janitor is clean (zero errors)
 */
export async function isCodebaseClean(): Promise<boolean> {
  const report = await runJanitor();
  return report.isClean;
}
