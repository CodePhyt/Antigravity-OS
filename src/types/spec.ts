/**
 * Core type definitions for Spec Orchestrator
 * Defines the structure of parsed specification files
 */

/**
 * Task execution status
 */
export type TaskStatus = 'not_started' | 'queued' | 'in_progress' | 'completed';

/**
 * Represents a single task from tasks.md
 */
export interface Task {
  /** Task identifier (e.g., "1.2", "2.3.1") */
  id: string;

  /** Task description */
  description: string;

  /** Current execution status */
  status: TaskStatus;

  /** Whether this task is optional (marked with *) */
  isOptional: boolean;

  /** Parent task ID, null for top-level tasks */
  parentId: string | null;

  /** Child tasks (sub-tasks) */
  children: Task[];

  /** Referenced requirement IDs (e.g., ["1.2", "3.4"]) */
  requirementRefs: string[];

  /** Referenced property names (e.g., ["Property 1", "Property 5"]) */
  propertyRefs: string[];
}

/**
 * Represents a requirement from requirements.md
 */
export interface Requirement {
  /** Requirement identifier (e.g., "1.2") */
  id: string;

  /** User story text */
  userStory: string;

  /** List of acceptance criteria */
  acceptanceCriteria: string[];
}

/**
 * Represents a correctness property from design.md
 */
export interface Property {
  /** Property number */
  number: number;

  /** Property title */
  title: string;

  /** The "for all" statement describing the property */
  statement: string;

  /** Requirements this property validates */
  requirementRefs: string[];
}

/**
 * Complete parsed specification
 */
export interface ParsedSpec {
  /** Feature name (from directory name) */
  featureName: string;

  /** All requirements from requirements.md */
  requirements: Requirement[];

  /** All correctness properties from design.md */
  properties: Property[];

  /** All tasks from tasks.md */
  tasks: Task[];
}

/**
 * Parse error with context
 */
export interface ParseError {
  /** Error message */
  message: string;

  /** File where error occurred */
  file: string;

  /** Line number (1-indexed), null if not applicable */
  lineNumber: number | null;

  /** Context around the error */
  context: string | null;
}

/**
 * Error context captured when a task fails
 * Used by Ralph-Loop for error analysis and correction
 */
export interface ErrorContext {
  /** ID of the failed task */
  taskId: string;

  /** Error message */
  errorMessage: string;

  /** Stack trace */
  stackTrace: string;

  /** Name of failed test (if test failure) */
  failedTest: string | null;

  /** When the error occurred */
  timestamp: Date;
}

/**
 * Result of test execution
 */
export interface TestResult {
  /** Whether all tests passed */
  success: boolean;

  /** Total number of tests executed */
  totalTests: number;

  /** Number of tests that passed */
  passedTests: number;

  /** Number of tests that failed */
  failedTests: number;

  /** Details of test failures */
  failures: TestFailure[];

  /** Test execution duration in milliseconds */
  duration: number;
}

/**
 * Details of a single test failure
 */
export interface TestFailure {
  /** Name of the failed test */
  testName: string;

  /** Error message from the test */
  errorMessage: string;

  /** Stack trace of the failure */
  stackTrace: string;

  /** Referenced property (extracted from test tag) */
  propertyRef: string | null;

  /** Referenced requirement (extracted from test tag) */
  requirementRef: string | null;
}
