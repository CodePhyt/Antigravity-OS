/**
 * Error Analyzer Component
 * Classifies errors and determines correction strategies for Ralph-Loop
 * 
 * This component analyzes error context to:
 * 1. Classify error types (test_failure, compilation_error, runtime_error, etc.)
 * 2. Extract root cause from error context
 * 3. Determine which spec file needs updating
 * 
 * Requirements: 5.1, 5.2
 */

import type { ErrorContext } from '@/types/spec';

/**
 * Types of errors that can occur during task execution
 */
export type ErrorType =
  | 'test_failure'
  | 'compilation_error'
  | 'runtime_error'
  | 'missing_dependency'
  | 'invalid_spec'
  | 'timeout_error'
  | 'unknown_error';

/**
 * Target spec file for correction
 */
export type TargetSpecFile = 'requirements.md' | 'design.md' | 'tasks.md';

/**
 * Result of error analysis
 */
export interface ErrorAnalysis {
  /** Classified error type */
  errorType: ErrorType;

  /** Root cause description */
  rootCause: string;

  /** Which spec file should be updated */
  targetFile: TargetSpecFile;

  /** Confidence level in the analysis (0-100) */
  confidence: number;

  /** Additional context for correction */
  context: {
    /** Property reference if test failure */
    propertyRef?: string;

    /** Requirement reference if applicable */
    requirementRef?: string;

    /** Specific file/line where error occurred */
    errorLocation?: string;

    /** Suggested correction approach */
    suggestion?: string;
  };
}

/**
 * Error patterns for classification
 */
interface ErrorPattern {
  /** Pattern to match in error message or stack trace */
  pattern: RegExp;

  /** Error type this pattern indicates */
  errorType: ErrorType;

  /** Confidence boost if pattern matches (0-50) */
  confidenceBoost: number;
}

/**
 * Common error patterns for classification
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // Test failures (check these first with higher priority)
  {
    pattern: /property.*failed|counterexample/i,
    errorType: 'test_failure',
    confidenceBoost: 50,
  },
  {
    pattern: /test.*failed|assertion.*failed|expect.*to.*but/i,
    errorType: 'test_failure',
    confidenceBoost: 45,
  },

  // Timeout errors (check before test failures since tests can timeout)
  {
    pattern: /timeout|timed out|exceeded.*time/i,
    errorType: 'timeout_error',
    confidenceBoost: 45,
  },

  // Missing dependencies (check before compilation errors)
  {
    pattern: /cannot find module|module not found/i,
    errorType: 'missing_dependency',
    confidenceBoost: 50,
  },
  {
    pattern: /enoent|no such file or directory/i,
    errorType: 'missing_dependency',
    confidenceBoost: 45,
  },

  // Invalid spec
  {
    pattern: /invalid spec|malformed markdown|parse.*spec.*failed/i,
    errorType: 'invalid_spec',
    confidenceBoost: 50,
  },

  // Runtime errors (check before compilation errors to catch runtime-specific patterns)
  {
    pattern: /cannot read property.*of (undefined|null)/i,
    errorType: 'runtime_error',
    confidenceBoost: 50,
  },
  {
    pattern: /typeerror:|referenceerror:|rangeerror:/i,
    errorType: 'runtime_error',
    confidenceBoost: 45,
  },

  // Compilation errors (TypeScript specific patterns first)
  {
    pattern: /typescript error|ts\d+:|error ts\d+/i,
    errorType: 'compilation_error',
    confidenceBoost: 50,
  },
  {
    pattern: /syntaxerror|unexpected token/i,
    errorType: 'compilation_error',
    confidenceBoost: 45,
  },
  {
    pattern: /cannot find name/i,
    errorType: 'compilation_error',
    confidenceBoost: 40,
  },
];

/**
 * Error Analyzer analyzes error context and determines correction strategy
 * 
 * Responsibilities:
 * - Classify error types based on error message and stack trace
 * - Extract root cause from error context
 * - Determine which spec file needs updating
 * - Provide confidence level in analysis
 * - Extract relevant context for correction
 * 
 * **Validates: Requirements 5.1, 5.2**
 */
export class ErrorAnalyzer {
  /**
   * Analyzes an error context and determines correction strategy
   * 
   * Algorithm:
   * 1. Classify error type by matching patterns in error message and stack trace
   * 2. Extract root cause based on error type
   * 3. Determine target spec file based on error type and context
   * 4. Calculate confidence level
   * 5. Extract additional context for correction
   * 
   * @param error - Error context from failed task
   * @returns Error analysis with correction strategy
   * 
   * **Validates: Requirements 5.1, 5.2**
   */
  analyze(error: ErrorContext): ErrorAnalysis {
    // Step 1: Classify error type
    const errorType = this.classifyError(error);

    // Step 2: Extract root cause
    const rootCause = this.extractRootCause(error, errorType);

    // Step 3: Determine target spec file
    const targetFile = this.determineTargetFile(error, errorType);

    // Step 4: Calculate confidence
    const confidence = this.calculateConfidence(error, errorType);

    // Step 5: Extract additional context
    const context = this.extractContext(error, errorType);

    return {
      errorType,
      rootCause,
      targetFile,
      confidence,
      context,
    };
  }

  /**
   * Classifies the error type based on error message and stack trace
   * 
   * Algorithm:
   * 1. Check error message and stack trace against known patterns
   * 2. Accumulate confidence scores for each error type
   * 3. Return error type with highest confidence
   * 4. Default to 'unknown_error' if no patterns match
   * 
   * @param error - Error context
   * @returns Classified error type
   * 
   * **Validates: Requirement 5.1**
   */
  private classifyError(error: ErrorContext): ErrorType {
    const combinedText = `${error.errorMessage} ${error.stackTrace}`;

    // Track confidence scores for each error type
    const scores: Partial<Record<ErrorType, number>> = {};

    // Check against all patterns
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(combinedText)) {
        const currentScore = scores[pattern.errorType] || 0;
        scores[pattern.errorType] = currentScore + pattern.confidenceBoost;
      }
    }

    // Additional heuristics based on error context
    // Only boost test_failure if the error message actually contains test-related keywords
    if (error.failedTest && /test|assertion|expect|property.*failed/i.test(error.errorMessage)) {
      // If we have a failed test name AND test-related keywords, it's definitely a test failure
      scores.test_failure = (scores.test_failure || 0) + 50;
    }

    // Find error type with highest score
    let maxScore = 0;
    let bestType: ErrorType = 'unknown_error';

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestType = type as ErrorType;
      }
    }

    return bestType;
  }

  /**
   * Extracts the root cause description from error context
   * 
   * Algorithm:
   * 1. Based on error type, extract relevant information
   * 2. For test failures: extract assertion details
   * 3. For compilation errors: extract type/syntax issues
   * 4. For runtime errors: extract the specific error
   * 5. Format as human-readable description
   * 
   * @param error - Error context
   * @param errorType - Classified error type
   * @returns Root cause description
   * 
   * **Validates: Requirement 5.1**
   */
  private extractRootCause(error: ErrorContext, errorType: ErrorType): string {
    switch (errorType) {
      case 'test_failure':
        return this.extractTestFailureRootCause(error);

      case 'compilation_error':
        return this.extractCompilationErrorRootCause(error);

      case 'runtime_error':
        return this.extractRuntimeErrorRootCause(error);

      case 'missing_dependency':
        return this.extractMissingDependencyRootCause(error);

      case 'invalid_spec':
        return this.extractInvalidSpecRootCause(error);

      case 'timeout_error':
        return this.extractTimeoutErrorRootCause(error);

      case 'unknown_error':
      default:
        return this.extractGenericRootCause(error);
    }
  }

  /**
   * Extracts root cause for test failures
   */
  private extractTestFailureRootCause(error: ErrorContext): string {
    const testName = error.failedTest || 'Unknown test';

    // Check if this is a property-based test (look for counterexample or "failed after N tests")
    const isPropertyTest = /counterexample|failed after \d+ tests|property.*failed/i.test(
      error.errorMessage
    );

    if (isPropertyTest) {
      // Try to extract counterexample details (prioritize this)
      const counterexampleMatch = error.errorMessage.match(
        /counterexample:\s*(.+?)(?:\n|$)/i
      );

      if (counterexampleMatch && counterexampleMatch[1]) {
        return `Property test "${testName}" found counterexample:${counterexampleMatch[1]}`;
      }

      // Try to extract "failed after N tests"
      const failedAfterMatch = error.errorMessage.match(/failed after (\d+) tests/i);
      if (failedAfterMatch) {
        return `Property test "${testName}" failed after ${failedAfterMatch[1]} tests`;
      }

      // Generic property test failure
      return `Property test "${testName}" failed: ${error.errorMessage.split('\n')[0]}`;
    }

    // Try to extract the assertion that failed
    const assertionMatch = error.errorMessage.match(
      /expected.*to.*but|received.*expected|assertion failed:(.+)/i
    );

    if (assertionMatch) {
      return `Test "${testName}" failed: ${assertionMatch[0]}`;
    }

    // Generic test failure
    return `Test "${testName}" failed: ${error.errorMessage.split('\n')[0]}`;
  }

  /**
   * Extracts root cause for compilation errors
   */
  private extractCompilationErrorRootCause(error: ErrorContext): string {
    // Try to extract the specific TypeScript error
    const tsErrorMatch = error.errorMessage.match(/TS\d+:(.+?)(?:\n|$)/i);
    if (tsErrorMatch && tsErrorMatch[1]) {
      return `TypeScript compilation error: ${tsErrorMatch[1].trim()}`;
    }

    // Try to extract syntax error details (handle SyntaxError: format)
    const syntaxMatch = error.errorMessage.match(/syntaxerror:\s*(.+?)(?:\n|$)/i);
    if (syntaxMatch && syntaxMatch[1]) {
      return `Syntax error: ${syntaxMatch[1].trim()}`;
    }

    // Try to extract undefined reference
    const undefinedMatch = error.errorMessage.match(/cannot find name ['"](.+)['"]/i);
    if (undefinedMatch && undefinedMatch[1]) {
      return `Undefined reference: "${undefinedMatch[1]}" is not defined`;
    }

    // Generic compilation error
    return `Compilation error: ${error.errorMessage.split('\n')[0]}`;
  }

  /**
   * Extracts root cause for runtime errors
   */
  private extractRuntimeErrorRootCause(error: ErrorContext): string {
    // Try to extract the specific runtime error (handle both formats: "TypeError:" and "TypeError: ")
    const runtimeMatch = error.errorMessage.match(
      /(TypeError|ReferenceError|RangeError):\s*(.+?)(?:\n|$)/i
    );

    if (runtimeMatch && runtimeMatch[2]) {
      return `Runtime ${runtimeMatch[1]}: ${runtimeMatch[2].trim()}`;
    }

    // Try to extract undefined property access with quotes
    const undefinedPropMatch = error.errorMessage.match(
      /cannot read property ['"](.+)['"] of (undefined|null)/i
    );

    if (undefinedPropMatch && undefinedPropMatch[1]) {
      return `Attempted to access property '${undefinedPropMatch[1]}' of ${undefinedPropMatch[2]}`;
    }

    // Generic runtime error
    return `Runtime error: ${error.errorMessage.split('\n')[0]}`;
  }

  /**
   * Extracts root cause for missing dependency errors
   */
  private extractMissingDependencyRootCause(error: ErrorContext): string {
    // Try to extract module name
    const moduleMatch = error.errorMessage.match(/cannot find module ['"](.+)['"]/i);
    if (moduleMatch && moduleMatch[1]) {
      return `Missing module: "${moduleMatch[1]}" is not installed or cannot be found`;
    }

    // Try to extract file path
    const fileMatch = error.errorMessage.match(/no such file or directory.*['"](.+)['"]/i);
    if (fileMatch && fileMatch[1]) {
      return `Missing file: "${fileMatch[1]}" does not exist`;
    }

    // Generic missing dependency
    return `Missing dependency: ${error.errorMessage.split('\n')[0]}`;
  }

  /**
   * Extracts root cause for invalid spec errors
   */
  private extractInvalidSpecRootCause(error: ErrorContext): string {
    return `Invalid specification: ${error.errorMessage.split('\n')[0]}`;
  }

  /**
   * Extracts root cause for timeout errors
   */
  private extractTimeoutErrorRootCause(error: ErrorContext): string {
    // Try to extract timeout duration
    const timeoutMatch = error.errorMessage.match(/timeout.*?(\d+)\s*(ms|seconds?)/i);
    if (timeoutMatch && timeoutMatch[1]) {
      return `Operation timed out after ${timeoutMatch[1]}${timeoutMatch[2]}`;
    }

    return `Operation timed out: ${error.errorMessage.split('\n')[0]}`;
  }

  /**
   * Extracts generic root cause
   */
  private extractGenericRootCause(error: ErrorContext): string {
    // Get the first line of the error message
    const firstLine = error.errorMessage.split('\n')[0] || 'Unknown error occurred';
    
    // Truncate if too long (keep first 200 characters)
    if (firstLine.length > 200) {
      return firstLine.substring(0, 200) + '...';
    }
    
    return firstLine;
  }

  /**
   * Determines which spec file should be updated based on error type
   * 
   * Decision Logic:
   * - test_failure → design.md (property may be too strict)
   * - compilation_error → design.md (design may be incomplete)
   * - runtime_error → tasks.md (implementation guidance needed)
   * - missing_dependency → requirements.md (missing requirement)
   * - invalid_spec → requirements.md or design.md (spec issue)
   * - timeout_error → tasks.md (implementation optimization needed)
   * - unknown_error → tasks.md (add clarification)
   * 
   * @param error - Error context
   * @param errorType - Classified error type
   * @returns Target spec file for correction
   * 
   * **Validates: Requirement 5.2**
   */
  private determineTargetFile(error: ErrorContext, errorType: ErrorType): TargetSpecFile {
    switch (errorType) {
      case 'test_failure':
        // Test failures usually indicate property is too strict or implementation is wrong
        // Update design.md to adjust property or add clarification
        return 'design.md';

      case 'compilation_error':
        // Compilation errors often indicate incomplete design
        // Update design.md to add missing type definitions or interfaces
        return 'design.md';

      case 'runtime_error':
        // Runtime errors indicate implementation issues
        // Update tasks.md to add implementation guidance
        return 'tasks.md';

      case 'missing_dependency':
        // Missing dependencies indicate missing requirements
        // Update requirements.md to add dependency requirement
        return 'requirements.md';

      case 'invalid_spec':
        // Invalid spec could be requirements or design issue
        // Check error message to determine which
        if (error.errorMessage.toLowerCase().includes('requirement')) {
          return 'requirements.md';
        }
        return 'design.md';

      case 'timeout_error':
        // Timeout errors indicate implementation needs optimization
        // Update tasks.md to add performance guidance
        return 'tasks.md';

      case 'unknown_error':
      default:
        // For unknown errors, add clarification to tasks.md
        return 'tasks.md';
    }
  }

  /**
   * Calculates confidence level in the error analysis
   * 
   * Confidence factors:
   * - Pattern match strength (0-50)
   * - Presence of failed test name (+20)
   * - Clear error message (+10)
   * - Stack trace available (+10)
   * - Property/requirement references (+10)
   * 
   * @param error - Error context
   * @param errorType - Classified error type
   * @returns Confidence level (0-100)
   */
  private calculateConfidence(error: ErrorContext, errorType: ErrorType): number {
    let confidence = 0;

    // Base confidence from pattern matching (already done in classification)
    // Start with moderate confidence
    confidence += 30;

    // Boost confidence if we have a failed test name
    if (error.failedTest) {
      confidence += 20;
    }

    // Boost confidence if error message is clear (not empty, not too short)
    if (error.errorMessage && error.errorMessage.length > 20) {
      confidence += 10;
    }

    // Boost confidence if we have a stack trace
    if (error.stackTrace && error.stackTrace.length > 0) {
      confidence += 10;
    }

    // Boost confidence if error type is not unknown
    if (errorType !== 'unknown_error') {
      confidence += 20;
    }

    // Cap at 100
    return Math.min(confidence, 100);
  }

  /**
   * Extracts additional context for correction
   * 
   * @param error - Error context
   * @param errorType - Classified error type
   * @returns Additional context object
   */
  private extractContext(
    error: ErrorContext,
    errorType: ErrorType
  ): ErrorAnalysis['context'] {
    const context: ErrorAnalysis['context'] = {};

    // Extract error location from stack trace
    const locationMatch = error.stackTrace.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (locationMatch && locationMatch[2] && locationMatch[3]) {
      context.errorLocation = `${locationMatch[2]}:${locationMatch[3]}`;
    }

    // Extract property reference from error message
    const propertyMatch = error.errorMessage.match(/Property\s+(\d+)/i);
    if (propertyMatch && propertyMatch[1]) {
      context.propertyRef = `Property ${propertyMatch[1]}`;
    }

    // Extract requirement reference from error message
    const requirementMatch = error.errorMessage.match(/Requirement[s]?\s+([\d.]+)/i);
    if (requirementMatch && requirementMatch[1]) {
      context.requirementRef = requirementMatch[1];
    }

    // Add correction suggestions based on error type
    context.suggestion = this.generateSuggestion(error, errorType);

    return context;
  }

  /**
   * Generates a correction suggestion based on error type
   * 
   * @param error - Error context
   * @param errorType - Classified error type
   * @returns Suggestion for correction
   */
  private generateSuggestion(error: ErrorContext, errorType: ErrorType): string {
    switch (errorType) {
      case 'test_failure':
        return 'Review the property definition in design.md. The property may be too strict or the implementation may need adjustment.';

      case 'compilation_error':
        return 'Add missing type definitions or interfaces to design.md. Ensure all referenced types are defined.';

      case 'runtime_error':
        return 'Add implementation guidance to tasks.md. Include null checks, error handling, or validation steps.';

      case 'missing_dependency':
        return 'Add a requirement for the missing dependency in requirements.md. Specify the dependency and its purpose.';

      case 'invalid_spec':
        return 'Review and fix the specification file. Ensure all markdown syntax is correct and all references are valid.';

      case 'timeout_error':
        return 'Add performance optimization guidance to tasks.md. Consider adding caching, pagination, or async processing.';

      case 'unknown_error':
      default:
        return 'Add clarification or additional context to tasks.md to help resolve this issue.';
    }
  }
}

/**
 * Creates an error analyzer instance
 * 
 * @returns ErrorAnalyzer instance
 */
export function createErrorAnalyzer(): ErrorAnalyzer {
  return new ErrorAnalyzer();
}
