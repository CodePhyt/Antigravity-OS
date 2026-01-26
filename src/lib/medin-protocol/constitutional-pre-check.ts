/**
 * Constitutional Pre-Check
 * 
 * Analyzes shell commands for safety violations before execution
 * Implements Requirement 5: Constitutional Pre-Check System
 */

import { SafetyAnalysis, SafetyViolation } from './types';

/**
 * Safety pattern definitions
 */
const SAFETY_PATTERNS = {
  fileDeletion: [
    { pattern: /rm\s+-rf/i, severity: 'critical' as const, description: 'Recursive force deletion (rm -rf)' },
    { pattern: /del\s+\/[fs]/i, severity: 'critical' as const, description: 'Force deletion (del /f or /s)' },
    { pattern: /Remove-Item\s+-Recurse\s+-Force/i, severity: 'critical' as const, description: 'PowerShell recursive force deletion' },
    { pattern: /rm\s+[^-\s]/i, severity: 'high' as const, description: 'File deletion without confirmation' },
    { pattern: /rmdir\s+\/s/i, severity: 'high' as const, description: 'Directory deletion' },
  ],
  dbModification: [
    { pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/i, severity: 'critical' as const, description: 'Database DROP operation' },
    { pattern: /TRUNCATE\s+TABLE/i, severity: 'critical' as const, description: 'Table truncation' },
    { pattern: /DELETE\s+FROM\s+\w+\s*;/i, severity: 'critical' as const, description: 'DELETE without WHERE clause' },
    { pattern: /UPDATE\s+\w+\s+SET\s+.*\s*;/i, severity: 'high' as const, description: 'UPDATE without WHERE clause' },
  ],
  credentialExposure: [
    { pattern: /[A-Za-z0-9]{32,}/,severity: 'high' as const, description: 'Potential API key or token' },
    { pattern: /password\s*=\s*['"][^'"]+['"]/i, severity: 'critical' as const, description: 'Password in command' },
    { pattern: /token\s*=\s*['"][^'"]+['"]/i, severity: 'critical' as const, description: 'Token in command' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, severity: 'critical' as const, description: 'API key in command' },
    { pattern: /secret\s*=\s*['"][^'"]+['"]/i, severity: 'critical' as const, description: 'Secret in command' },
  ],
  networkExposure: [
    { pattern: /0\.0\.0\.0/i, severity: 'high' as const, description: 'Binding to all network interfaces (0.0.0.0)' },
    { pattern: /--host\s+0\.0\.0\.0/i, severity: 'high' as const, description: 'Exposing service to all interfaces' },
    { pattern: /\*:\d+/i, severity: 'medium' as const, description: 'Wildcard host binding' },
  ],
};

/**
 * Constitutional Pre-Check interface
 */
export interface ConstitutionalPreCheck {
  analyzeCommand(command: string): Promise<SafetyAnalysis>;
  suggestAlternative(command: string): string;
}

/**
 * Constitutional Pre-Check implementation
 */
export class ConstitutionalPreCheckImpl implements ConstitutionalPreCheck {
  /**
   * Analyze command for safety violations
   * @param command - Shell command to analyze
   * @returns Safety analysis result
   */
  async analyzeCommand(command: string): Promise<SafetyAnalysis> {
    const violations: SafetyViolation[] = [];

    // Check file deletion patterns
    for (const { pattern, severity, description } of SAFETY_PATTERNS.fileDeletion) {
      if (pattern.test(command)) {
        violations.push({
          type: 'file_deletion',
          severity,
          description,
          pattern: pattern.source,
        });
      }
    }

    // Check database modification patterns
    for (const { pattern, severity, description } of SAFETY_PATTERNS.dbModification) {
      if (pattern.test(command)) {
        violations.push({
          type: 'db_modification',
          severity,
          description,
          pattern: pattern.source,
        });
      }
    }

    // Check credential exposure patterns
    for (const { pattern, severity, description } of SAFETY_PATTERNS.credentialExposure) {
      if (pattern.test(command)) {
        violations.push({
          type: 'credential_exposure',
          severity,
          description,
          pattern: pattern.source,
        });
      }
    }

    // Check network exposure patterns
    for (const { pattern, severity, description } of SAFETY_PATTERNS.networkExposure) {
      if (pattern.test(command)) {
        violations.push({
          type: 'network_exposure',
          severity,
          description,
          pattern: pattern.source,
        });
      }
    }

    // Determine overall risk level
    const riskLevel = this.calculateRiskLevel(violations);

    // Determine recommendation
    const recommendation = this.determineRecommendation(riskLevel, violations);

    // Generate alternative if blocked
    const alternative = recommendation === 'block' ? this.suggestAlternative(command) : undefined;

    return {
      safe: violations.length === 0,
      violations,
      riskLevel,
      recommendation,
      alternative,
    };
  }

  /**
   * Get safer alternative for blocked command
   * @param command - Original command
   * @returns Suggested safe alternative
   */
  suggestAlternative(command: string): string {
    // File deletion alternatives
    if (/rm\s+-rf/i.test(command)) {
      return command.replace(/rm\s+-rf/i, 'rm -ri'); // Interactive mode
    }

    if (/del\s+\/[fs]/i.test(command)) {
      return command.replace(/del\s+\/[fs]/i, 'del /p'); // Prompt mode
    }

    if (/Remove-Item\s+-Recurse\s+-Force/i.test(command)) {
      return command.replace(/-Force/i, '-Confirm'); // Confirmation mode
    }

    // Database modification alternatives
    if (/DROP\s+(TABLE|DATABASE)/i.test(command)) {
      return `-- ${command}\n-- Please review and execute manually with confirmation`;
    }

    if (/DELETE\s+FROM\s+(\w+)\s*;/i.test(command)) {
      const match = command.match(/DELETE\s+FROM\s+(\w+)\s*;/i);
      if (match && match[1]) {
        return `DELETE FROM ${match[1]} WHERE id = ?; -- Add WHERE clause`;
      }
    }

    // Credential exposure alternatives
    if (/password\s*=\s*['"][^'"]+['"]/i.test(command)) {
      return command.replace(/password\s*=\s*['"][^'"]+['"]/i, 'password=$PASSWORD_ENV_VAR');
    }

    if (/token\s*=\s*['"][^'"]+['"]/i.test(command)) {
      return command.replace(/token\s*=\s*['"][^'"]+['"]/i, 'token=$TOKEN_ENV_VAR');
    }

    // Network exposure alternatives
    if (/0\.0\.0\.0/i.test(command)) {
      return command.replace(/0\.0\.0\.0/gi, '127.0.0.1'); // Localhost only
    }

    // Generic alternative
    return `# Review and modify this command:\n# ${command}\n# Add appropriate safety measures`;
  }

  /**
   * Calculate overall risk level from violations
   */
  private calculateRiskLevel(violations: SafetyViolation[]): SafetyAnalysis['riskLevel'] {
    if (violations.length === 0) {
      return 'low';
    }

    const hasCritical = violations.some((v) => v.severity === 'critical');
    const hasHigh = violations.some((v) => v.severity === 'high');
    const hasMedium = violations.some((v) => v.severity === 'medium');

    if (hasCritical) {
      return 'critical';
    }

    if (hasHigh) {
      return 'high';
    }

    if (hasMedium) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Determine recommendation based on risk level and violations
   */
  private determineRecommendation(
    riskLevel: SafetyAnalysis['riskLevel'],
    violations: SafetyViolation[]
  ): SafetyAnalysis['recommendation'] {
    if (riskLevel === 'critical') {
      return 'block';
    }

    if (riskLevel === 'high') {
      // Block if multiple high-severity violations
      const highCount = violations.filter((v) => v.severity === 'high').length;
      return highCount > 1 ? 'block' : 'warn';
    }

    if (riskLevel === 'medium') {
      return 'warn';
    }

    return 'allow';
  }
}

/**
 * Create a new Constitutional Pre-Check instance
 */
export function createConstitutionalPreCheck(): ConstitutionalPreCheck {
  return new ConstitutionalPreCheckImpl();
}
