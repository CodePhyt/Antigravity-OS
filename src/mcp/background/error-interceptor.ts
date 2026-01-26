/**
 * Error Interceptor
 *
 * Real-time error analysis and root cause reporting.
 * Analyzes errors from sovereign_execute and provides remediation guidance.
 *
 * Requirements: 7
 */

/**
 * Error category types
 */
export type ErrorCategory = 'environment' | 'spec' | 'dependency' | 'network' | 'unknown';

/**
 * Suggested tool for remediation
 */
export type SuggestedTool = 'validate_environment' | 'trigger_ralph_loop';

/**
 * Error analysis result
 */
export interface ErrorAnalysis {
  /** Original error message */
  originalError: string;

  /** Identified root cause */
  rootCause: string;

  /** Error category */
  category: ErrorCategory;

  /** Remediation steps */
  remediation: string[];

  /** Suggested tool to use */
  suggestedTool?: SuggestedTool;
}

/**
 * Error pattern for classification
 */
interface ErrorPattern {
  /** Pattern to match in error message */
  pattern: RegExp;

  /** Error category this pattern indicates */
  category: ErrorCategory;

  /** Root cause template */
  rootCauseTemplate: string;

  /** Suggested tool for remediation */
  suggestedTool?: SuggestedTool;
}

/**
 * Common error patterns for classification
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // Environment errors
  {
    pattern: /command not found|not recognized as an internal or external command/i,
    category: 'environment',
    rootCauseTemplate: 'Command is not installed or not in PATH',
    suggestedTool: 'validate_environment',
  },
  {
    pattern: /docker.*not found|cannot connect to the docker daemon/i,
    category: 'environment',
    rootCauseTemplate: 'Docker is not running or not installed',
    suggestedTool: 'validate_environment',
  },
  {
    pattern: /enoent|no such file or directory/i,
    category: 'environment',
    rootCauseTemplate: 'Required file or directory does not exist',
    suggestedTool: 'validate_environment',
  },
  {
    pattern: /eacces|permission denied/i,
    category: 'environment',
    rootCauseTemplate: 'Insufficient permissions to access resource',
  },
  {
    pattern: /eaddrinuse|address already in use|port.*already in use/i,
    category: 'environment',
    rootCauseTemplate: 'Port is already in use by another process',
    suggestedTool: 'validate_environment',
  },

  // Dependency errors
  {
    pattern: /cannot find module|module not found/i,
    category: 'dependency',
    rootCauseTemplate: 'Required npm package is not installed',
    suggestedTool: 'validate_environment',
  },
  {
    pattern: /package\.json.*not found/i,
    category: 'dependency',
    rootCauseTemplate: 'Not in a Node.js project directory',
  },
  {
    pattern: /npm err!/i,
    category: 'dependency',
    rootCauseTemplate: 'npm operation failed',
  },

  // Network errors
  {
    pattern: /enotfound|getaddrinfo.*failed/i,
    category: 'network',
    rootCauseTemplate: 'DNS resolution failed - check network connection',
  },
  {
    pattern: /econnrefused|connection refused/i,
    category: 'network',
    rootCauseTemplate: 'Connection refused - service may not be running',
  },
  {
    pattern: /etimedout|connection timed out/i,
    category: 'network',
    rootCauseTemplate: 'Connection timed out - check network or firewall',
  },

  // Spec errors
  {
    pattern: /test.*failed|assertion.*failed/i,
    category: 'spec',
    rootCauseTemplate: 'Test failure indicates spec violation',
    suggestedTool: 'trigger_ralph_loop',
  },
  {
    pattern: /property.*failed|counterexample/i,
    category: 'spec',
    rootCauseTemplate: 'Property-based test found counterexample',
    suggestedTool: 'trigger_ralph_loop',
  },
  {
    pattern: /expected.*to.*but|received.*expected/i,
    category: 'spec',
    rootCauseTemplate: 'Assertion mismatch - implementation does not match spec',
    suggestedTool: 'trigger_ralph_loop',
  },
];

/**
 * Error Interceptor analyzes errors and provides root cause analysis
 *
 * Responsibilities:
 * - Classify errors into categories (environment, spec, dependency, network)
 * - Extract root cause from error messages
 * - Generate remediation steps
 * - Suggest appropriate tools for fixing the error
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
 */
export class ErrorInterceptor {
  /**
   * Analyzes an error and returns root cause analysis
   *
   * Algorithm:
   * 1. Normalize error to string format
   * 2. Classify error category by matching patterns
   * 3. Detect root cause based on category
   * 4. Generate remediation steps
   * 5. Suggest appropriate tool if applicable
   *
   * @param error - Error object or string to analyze
   * @returns Error analysis with root cause and remediation
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  analyze(error: Error | string): ErrorAnalysis {
    // Step 1: Normalize error to string
    const errorMessage = typeof error === 'string' ? error : error.message;

    // Step 2: Classify error category
    const category = this.categorizeError(errorMessage);

    // Step 3: Detect root cause
    const rootCause = this.detectRootCause(errorMessage, category);

    // Step 4: Generate remediation steps
    const remediation = this.generateRemediation(category, rootCause, errorMessage);

    // Step 5: Determine suggested tool
    const suggestedTool = this.determineSuggestedTool(errorMessage, category);

    return {
      originalError: errorMessage,
      rootCause,
      category,
      remediation,
      suggestedTool,
    };
  }

  /**
   * Detects the root cause of an error
   *
   * Algorithm:
   * 1. Check error message against known patterns
   * 2. Extract specific details (command name, file path, etc.)
   * 3. Format root cause with extracted details
   * 4. Fall back to generic root cause if no pattern matches
   *
   * @param error - Error message
   * @param category - Error category
   * @returns Root cause description
   *
   * **Validates: Requirement 7.2**
   */
  private detectRootCause(error: string, category: ErrorCategory): string {
    // Check against known patterns
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(error)) {
        // Try to extract specific details
        const details = this.extractErrorDetails(error, pattern.pattern);

        if (details) {
          return `${pattern.rootCauseTemplate}: ${details}`;
        }

        return pattern.rootCauseTemplate;
      }
    }

    // Fall back to generic root cause based on category
    return this.getGenericRootCause(category, error);
  }

  /**
   * Categorizes an error into a category
   *
   * Algorithm:
   * 1. Check error message against all patterns
   * 2. Return category of first matching pattern
   * 3. Default to 'unknown' if no patterns match
   *
   * @param error - Error message
   * @returns Error category
   *
   * **Validates: Requirement 7.1**
   */
  private categorizeError(error: string): ErrorCategory {
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(error)) {
        return pattern.category;
      }
    }

    return 'unknown';
  }

  /**
   * Generates remediation steps based on error category and root cause
   *
   * Algorithm:
   * 1. Based on category, generate category-specific steps
   * 2. Add general troubleshooting steps
   * 3. Include tool suggestions if applicable
   *
   * @param category - Error category
   * @param rootCause - Root cause description
   * @param errorMessage - Original error message
   * @returns Array of remediation steps
   *
   * **Validates: Requirement 7.3**
   */
  private generateRemediation(
    category: ErrorCategory,
    _rootCause: string,
    errorMessage: string
  ): string[] {
    const steps: string[] = [];

    switch (category) {
      case 'environment':
        steps.push('Run validate_environment to check system dependencies');

        if (errorMessage.includes('command not found')) {
          const command = this.extractCommandName(errorMessage);
          if (command) {
            steps.push(`Install ${command} using your package manager`);
            steps.push(`Verify ${command} is in your PATH`);
          }
        } else if (errorMessage.includes('docker')) {
          steps.push('Start Docker Desktop or Docker daemon');
          steps.push('Verify Docker is running: docker ps');
        } else if (errorMessage.includes('port')) {
          steps.push('Check which process is using the port');
          steps.push('Stop the conflicting process or use a different port');
        } else if (errorMessage.includes('permission')) {
          steps.push('Check file/directory permissions');
          steps.push('Run with appropriate user privileges');
        }
        break;

      case 'dependency':
        steps.push('Run validate_environment to check npm packages');

        if (errorMessage.includes('cannot find module')) {
          const moduleName = this.extractModuleName(errorMessage);
          if (moduleName) {
            steps.push(`Install missing package: npm install ${moduleName}`);
          } else {
            steps.push('Run npm install to install all dependencies');
          }
        } else if (errorMessage.includes('package.json')) {
          steps.push('Initialize npm project: npm init');
          steps.push('Ensure you are in the correct project directory');
        }
        break;

      case 'network':
        steps.push('Check network connectivity');
        steps.push('Verify firewall settings');

        if (errorMessage.includes('enotfound')) {
          steps.push('Check DNS configuration');
          steps.push('Try using a different DNS server');
        } else if (errorMessage.includes('econnrefused')) {
          steps.push('Verify the service is running');
          steps.push('Check the service port and host');
        } else if (errorMessage.includes('etimedout')) {
          steps.push('Check for network latency issues');
          steps.push('Increase timeout if appropriate');
        }
        break;

      case 'spec':
        steps.push('Run trigger_ralph_loop to analyze and fix spec violations');
        steps.push('Review test expectations in design.md');
        steps.push('Update implementation to match spec requirements');
        break;

      case 'unknown':
        steps.push('Review the full error message and stack trace');
        steps.push('Check system logs for additional context');
        steps.push('Run get_system_context to check system state');
        break;
    }

    return steps;
  }

  /**
   * Determines which tool to suggest for remediation
   *
   * Algorithm:
   * 1. Check error message against patterns with suggested tools
   * 2. Return suggested tool from matching pattern
   * 3. Fall back to category-based suggestion
   *
   * @param errorMessage - Error message
   * @param category - Error category
   * @returns Suggested tool or undefined
   *
   * **Validates: Requirements 7.4, 7.5**
   */
  private determineSuggestedTool(
    errorMessage: string,
    category: ErrorCategory
  ): SuggestedTool | undefined {
    // Check patterns for explicit tool suggestions
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(errorMessage) && pattern.suggestedTool) {
        return pattern.suggestedTool;
      }
    }

    // Fall back to category-based suggestions
    switch (category) {
      case 'environment':
      case 'dependency':
        return 'validate_environment';

      case 'spec':
        return 'trigger_ralph_loop';

      default:
        return undefined;
    }
  }

  /**
   * Extracts error details from error message using pattern
   *
   * @param error - Error message
   * @param pattern - Pattern to match
   * @returns Extracted details or null
   */
  private extractErrorDetails(error: string, pattern: RegExp): string | null {
    const match = error.match(pattern);

    if (match && match[1]) {
      return match[1].trim();
    }

    return null;
  }

  /**
   * Extracts command name from error message
   *
   * @param error - Error message
   * @returns Command name or null
   */
  private extractCommandName(error: string): string | null {
    // Try to extract command from "command not found" errors
    const patterns = [
      /'([^']+)'.*not found/i,
      /"([^"]+)".*not found/i,
      /command not found:\s*(\S+)/i,
      /not recognized.*:\s*(\S+)/i,
    ];

    for (const pattern of patterns) {
      const match = error.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extracts module name from error message
   *
   * @param error - Error message
   * @returns Module name or null
   */
  private extractModuleName(error: string): string | null {
    // Try to extract module from "cannot find module" errors
    const patterns = [
      /cannot find module\s+['"]([^'"]+)['"]/i,
      /module not found:\s+['"]([^'"]+)['"]/i,
    ];

    for (const pattern of patterns) {
      const match = error.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Gets generic root cause based on category
   *
   * @param category - Error category
   * @param error - Error message
   * @returns Generic root cause description
   */
  private getGenericRootCause(category: ErrorCategory, error: string): string {
    // Get first line of error message
    const firstLine = error.split('\n')[0] || error;

    // Truncate if too long
    const truncated = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;

    switch (category) {
      case 'environment':
        return `Environment issue: ${truncated}`;

      case 'dependency':
        return `Dependency issue: ${truncated}`;

      case 'network':
        return `Network issue: ${truncated}`;

      case 'spec':
        return `Spec violation: ${truncated}`;

      case 'unknown':
      default:
        return `Unknown error: ${truncated}`;
    }
  }
}

/**
 * Creates an error interceptor instance
 *
 * @returns ErrorInterceptor instance
 */
export function createErrorInterceptor(): ErrorInterceptor {
  return new ErrorInterceptor();
}
