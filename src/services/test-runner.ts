/**
 * Test Runner Service
 * Executes Vitest tests and parses results
 *
 * This service spawns Vitest as a child process, captures output,
 * and parses the JSON results to extract test outcomes and failures.
 */

import { spawn } from 'child_process';
import { TestResult, TestFailure } from '@/types/spec';

/**
 * Configuration for test execution
 */
export interface TestRunnerConfig {
  /** Timeout for test execution in milliseconds (default: 30000) */
  timeout?: number;

  /** Working directory for test execution (default: process.cwd()) */
  cwd?: string;

  /** Additional Vitest CLI arguments */
  vitestArgs?: string[];
}

/**
 * Raw Vitest JSON output structure
 * Based on Vitest's JSON reporter format
 */
interface VitestJsonOutput {
  testResults?: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration?: number;
    message?: string;
    assertionResults?: Array<{
      ancestorTitles: string[];
      title: string;
      status: 'passed' | 'failed' | 'skipped';
      failureMessages?: string[];
      duration?: number;
    }>;
  }>;
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  success?: boolean;
}

/**
 * Test Runner Service
 * Handles test execution and result parsing
 */
export class TestRunner {
  private config: Required<TestRunnerConfig>;

  constructor(config: TestRunnerConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
      cwd: config.cwd ?? process.cwd(),
      vitestArgs: config.vitestArgs ?? [],
    };
  }

  /**
   * Run tests for specified test files
   *
   * @param testFiles - Array of test file paths to execute
   * @returns Promise resolving to test results
   * @throws Error if test process fails to spawn or times out
   *
   * Requirements: 4.1, 4.2
   */
  async runTests(testFiles: string[]): Promise<TestResult> {
    if (testFiles.length === 0) {
      return {
        success: true,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        failures: [],
        duration: 0,
      };
    }

    const startTime = Date.now();

    try {
      const output = await this.executeVitest(testFiles);
      const result = this.parseTestOutput(output);

      return {
        ...result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // If Vitest execution fails, return a failure result
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        failures: [
          {
            testName: 'Test Execution',
            errorMessage,
            stackTrace: error instanceof Error && error.stack ? error.stack : '',
            propertyRef: null,
            requirementRef: null,
          },
        ],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute Vitest as a child process
   *
   * @param testFiles - Test files to execute
   * @returns Promise resolving to stdout output
   * @throws Error if process fails or times out
   *
   * Requirements: 4.1, 4.2
   */
  private executeVitest(testFiles: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        'run',
        '--reporter=json',
        '--reporter=verbose',
        ...this.config.vitestArgs,
        ...testFiles,
      ];

      const vitestProcess = spawn('npx', ['vitest', ...args], {
        cwd: this.config.cwd,
        shell: true,
        env: {
          ...process.env,
          CI: 'true', // Prevent interactive mode
        },
      });

      let stdout = '';
      let stderr = '';

      // Capture stdout
      vitestProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Capture stderr
      vitestProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        vitestProcess.kill('SIGTERM');
        reject(new Error(`Test execution timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // Handle process completion
      vitestProcess.on('close', () => {
        clearTimeout(timeoutId);

        // Vitest returns non-zero exit code when tests fail, which is expected
        // We only reject if there's no output at all (indicating a process error)
        if (stdout.length === 0 && stderr.length > 0) {
          reject(new Error(`Vitest process error: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });

      // Handle process errors
      vitestProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to spawn Vitest process: ${error.message}`));
      });
    });
  }

  /**
   * Parse Vitest JSON output to extract test results
   *
   * @param output - Raw stdout from Vitest
   * @returns Parsed test result
   *
   * Requirements: 4.5, 4.7
   */
  parseTestOutput(output: string): Omit<TestResult, 'duration'> {
    try {
      // Extract JSON from output (Vitest may include non-JSON lines)
      const jsonMatch = this.extractJsonFromOutput(output);

      if (!jsonMatch) {
        // If no JSON found, try to parse the entire output
        return this.parseVerboseOutput(output);
      }

      const json: VitestJsonOutput = JSON.parse(jsonMatch);

      const failures: TestFailure[] = [];

      // Extract failures from test results
      if (json.testResults) {
        for (const testFile of json.testResults) {
          if (testFile.assertionResults) {
            for (const assertion of testFile.assertionResults) {
              if (assertion.status === 'failed') {
                const fullTestName = [...assertion.ancestorTitles, assertion.title].join(' > ');

                const failureMessage = assertion.failureMessages?.join('\n') ?? 'Test failed';

                failures.push({
                  testName: fullTestName,
                  errorMessage: this.extractErrorMessage(failureMessage),
                  stackTrace: this.extractStackTrace(failureMessage),
                  propertyRef: this.extractPropertyRef(fullTestName + ' ' + failureMessage),
                  requirementRef: this.extractRequirementRef(fullTestName + ' ' + failureMessage),
                });
              }
            }
          }
        }
      }

      return {
        success: json.success ?? json.numFailedTests === 0,
        totalTests: json.numTotalTests ?? 0,
        passedTests: json.numPassedTests ?? 0,
        failedTests: json.numFailedTests ?? 0,
        failures,
      };
    } catch (error) {
      // If JSON parsing fails, return a parse error
      return {
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        failures: [
          {
            testName: 'Output Parsing',
            errorMessage: `Failed to parse test output: ${error instanceof Error ? error.message : String(error)}`,
            stackTrace: '',
            propertyRef: null,
            requirementRef: null,
          },
        ],
      };
    }
  }

  /**
   * Extract JSON from Vitest output which may contain non-JSON lines
   *
   * @param output - Raw Vitest output
   * @returns JSON string or null if not found
   */
  private extractJsonFromOutput(output: string): string | null {
    // Look for JSON object in output
    const jsonStart = output.indexOf('{');
    const jsonEnd = output.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return output.substring(jsonStart, jsonEnd + 1);
    }

    return null;
  }

  /**
   * Parse verbose output when JSON is not available
   * This is a fallback parser for non-JSON output
   *
   * @param output - Raw Vitest output
   * @returns Parsed test result
   */
  private parseVerboseOutput(output: string): Omit<TestResult, 'duration'> {
    const lines = output.split('\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const failures: TestFailure[] = [];

    // Look for summary line like "Test Files  1 passed (1)"
    for (const line of lines) {
      if (line.includes('passed') || line.includes('failed')) {
        const passedMatch = line.match(/(\d+)\s+passed/);
        const failedMatch = line.match(/(\d+)\s+failed/);

        if (passedMatch && passedMatch[1]) {
          passedTests = parseInt(passedMatch[1], 10);
        }
        if (failedMatch && failedMatch[1]) {
          failedTests = parseInt(failedMatch[1], 10);
        }
      }
    }

    totalTests = passedTests + failedTests;

    // If we couldn't parse any test results, this is likely malformed output
    if (totalTests === 0 && output.trim().length > 0) {
      return {
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        failures: [
          {
            testName: 'Output Parsing',
            errorMessage: 'Failed to parse test output - no valid test results found',
            stackTrace: '',
            propertyRef: null,
            requirementRef: null,
          },
        ],
      };
    }

    return {
      success: failedTests === 0,
      totalTests,
      passedTests,
      failedTests,
      failures,
    };
  }

  /**
   * Extract error message from failure output
   *
   * @param failureMessage - Raw failure message
   * @returns Cleaned error message
   */
  private extractErrorMessage(failureMessage: string): string {
    // Extract the first line or the assertion error
    const lines = failureMessage.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('at ') && !trimmed.startsWith('Error:')) {
        return trimmed;
      }
    }

    return failureMessage.split('\n')[0] || 'Test failed';
  }

  /**
   * Extract stack trace from failure output
   *
   * @param failureMessage - Raw failure message
   * @returns Stack trace
   */
  private extractStackTrace(failureMessage: string): string {
    const lines = failureMessage.split('\n');
    const stackLines = lines.filter((line) => line.trim().startsWith('at '));
    return stackLines.join('\n');
  }

  /**
   * Extract property reference from test comments or failure message
   * Looks for patterns like "Property 5:" or "Property 5"
   *
   * @param text - Test failure message or output
   * @returns Property reference or null
   *
   * Requirements: 4.7
   */
  private extractPropertyRef(text: string): string | null {
    const match = text.match(/Property\s+(\d+)/i);
    return match ? `Property ${match[1]}` : null;
  }

  /**
   * Extract requirement reference from test comments or failure message
   * Looks for patterns like "Requirements 1.2" or "Requirement 3.4"
   *
   * @param text - Test failure message or output
   * @returns Requirement reference or null
   *
   * Requirements: 4.7
   */
  private extractRequirementRef(text: string): string | null {
    const match = text.match(/Requirements?\s+([\d.]+)/i);
    return match && match[1] ? match[1] : null;
  }

  /**
   * Validate property-based test configuration
   * Verifies that property tests have minimum 100 iterations configured
   *
   * @param testFiles - Array of test file paths to validate
   * @returns Validation result with any issues found
   *
   * Requirements: 4.6, 4.7
   */
  async validatePropertyTests(testFiles: string[]): Promise<PropertyTestValidation> {
    const issues: PropertyTestIssue[] = [];

    for (const testFile of testFiles) {
      try {
        // Read test file content
        const fs = await import('fs/promises');
        const content = await fs.readFile(testFile, 'utf-8');

        // Check if this is a property test file
        if (!this.isPropertyTestFile(content)) {
          continue;
        }

        // Validate iteration count
        const iterationIssues = this.validateIterationCount(content, testFile);
        issues.push(...iterationIssues);

        // Validate property tags
        const tagIssues = this.validatePropertyTags(content, testFile);
        issues.push(...tagIssues);
      } catch (error) {
        issues.push({
          file: testFile,
          issue: 'file_read_error',
          message: `Failed to read test file: ${error instanceof Error ? error.message : String(error)}`,
          line: null,
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if a test file contains property-based tests
   *
   * @param content - Test file content
   * @returns True if file contains property tests
   */
  private isPropertyTestFile(content: string): boolean {
    // Look for fast-check imports and fc.property usage
    return (
      content.includes('fast-check') ||
      content.includes('fc.property') ||
      content.includes('fc.assert')
    );
  }

  /**
   * Validate that property tests have minimum 100 iterations
   *
   * @param content - Test file content
   * @param testFile - Test file path
   * @returns Array of validation issues
   *
   * Requirements: 4.6
   */
  private validateIterationCount(content: string, testFile: string): PropertyTestIssue[] {
    const issues: PropertyTestIssue[] = [];
    const lines = content.split('\n');

    // Look for fc.assert calls with numRuns configuration
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line) continue;

      // Check if this line contains fc.assert
      if (line.includes('fc.assert')) {
        // Look for numRuns in the next few lines (within the same fc.assert call)
        let foundNumRuns = false;
        let numRunsValue: number | null = null;

        // Search within a reasonable range (up to 10 lines ahead)
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          const searchLine = lines[j];
          if (!searchLine) continue;

          // Look for numRuns: <number>
          const numRunsMatch = searchLine.match(/numRuns:\s*(\d+)/);
          if (numRunsMatch && numRunsMatch[1]) {
            foundNumRuns = true;
            numRunsValue = parseInt(numRunsMatch[1], 10);
            break;
          }

          // If we hit the end of the fc.assert call (closing parenthesis at start of line)
          if (searchLine.trim().startsWith(')')) {
            break;
          }
        }

        // Check if numRuns was found and is sufficient
        if (!foundNumRuns) {
          issues.push({
            file: testFile,
            issue: 'missing_iteration_count',
            message: 'Property test missing numRuns configuration (minimum 100 required)',
            line: i + 1,
          });
        } else if (numRunsValue !== null && numRunsValue < 100) {
          issues.push({
            file: testFile,
            issue: 'insufficient_iterations',
            message: `Property test has ${numRunsValue} iterations (minimum 100 required)`,
            line: i + 1,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate that property tests have proper property tags
   *
   * @param content - Test file content
   * @param testFile - Test file path
   * @returns Array of validation issues
   *
   * Requirements: 4.7
   */
  private validatePropertyTags(content: string, testFile: string): PropertyTestIssue[] {
    const issues: PropertyTestIssue[] = [];
    const lines = content.split('\n');

    // Look for fc.assert calls and check for property tags
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line) continue;

      // Check if this line contains fc.assert
      if (line.includes('fc.assert')) {
        // Look for property tag comment in the lines before this fc.assert
        let foundPropertyTag = false;

        // Search backwards up to 5 lines
        for (let j = Math.max(0, i - 5); j < i; j++) {
          const commentLine = lines[j];
          if (!commentLine) continue;

          // Look for comment with Property N pattern
          if (commentLine.includes('//') && /Property\s+\d+/i.test(commentLine)) {
            foundPropertyTag = true;
            break;
          }
        }

        if (!foundPropertyTag) {
          issues.push({
            file: testFile,
            issue: 'missing_property_tag',
            message:
              'Property test missing property tag comment (e.g., // Feature: spec-orchestrator, Property 20: ...)',
            line: i + 1,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Extract property information from test failure
   * Links test failures to design properties
   *
   * @param failure - Test failure details
   * @param testFileContent - Content of the test file (optional)
   * @returns Enhanced failure with property information
   *
   * Requirements: 4.7
   */
  async enrichFailureWithPropertyInfo(
    failure: TestFailure,
    testFileContent?: string
  ): Promise<EnrichedTestFailure> {
    let propertyNumber: number | null = null;
    let propertyTitle: string | null = null;

    // Extract property number from existing propertyRef
    if (failure.propertyRef) {
      const match = failure.propertyRef.match(/Property\s+(\d+)/i);
      if (match && match[1]) {
        propertyNumber = parseInt(match[1], 10);
      }
    }

    // If we have test file content, try to find more details
    if (testFileContent && propertyNumber === null) {
      const propertyMatch = testFileContent.match(/Property\s+(\d+):\s*([^\n]+)/i);
      if (propertyMatch && propertyMatch[1]) {
        propertyNumber = parseInt(propertyMatch[1], 10);
        propertyTitle = propertyMatch[2]?.trim() ?? null;
      }
    }

    return {
      ...failure,
      propertyNumber,
      propertyTitle,
    };
  }
}

/**
 * Property test validation result
 */
export interface PropertyTestValidation {
  /** Whether all property tests are valid */
  valid: boolean;

  /** List of validation issues found */
  issues: PropertyTestIssue[];
}

/**
 * Property test validation issue
 */
export interface PropertyTestIssue {
  /** Test file with the issue */
  file: string;

  /** Type of issue */
  issue:
    | 'missing_iteration_count'
    | 'insufficient_iterations'
    | 'missing_property_tag'
    | 'file_read_error';

  /** Description of the issue */
  message: string;

  /** Line number where issue was found (1-indexed) */
  line: number | null;
}

/**
 * Enhanced test failure with property information
 */
export interface EnrichedTestFailure extends TestFailure {
  /** Property number extracted from tags */
  propertyNumber: number | null;

  /** Property title if available */
  propertyTitle: string | null;
}

/**
 * Identify test files corresponding to source code files
 * Maps code files to their test files based on naming conventions
 *
 * @param codeFiles - Array of source code file paths
 * @param testDirectory - Root directory for test files (default: 'tests')
 * @returns Map of code file to array of corresponding test files
 *
 * Requirements: 4.1
 */
export async function identifyTestFiles(
  codeFiles: string[],
  testDirectory: string = 'tests'
): Promise<Map<string, string[]>> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const testFileMap = new Map<string, string[]>();

  for (const codeFile of codeFiles) {
    const testFiles: string[] = [];

    // Extract file information
    const parsedPath = path.parse(codeFile);
    const fileName = parsedPath.name;
    const fileExt = parsedPath.ext;

    // Skip non-code files
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(fileExt)) {
      continue;
    }

    // Generate possible test file names
    const possibleTestNames = [
      `${fileName}.test${fileExt}`,
      `${fileName}.spec${fileExt}`,
      `${fileName}.test.ts`,
      `${fileName}.spec.ts`,
    ];

    // Search in test directories
    const testDirs = [
      path.join(testDirectory, 'unit'),
      path.join(testDirectory, 'integration'),
      path.join(testDirectory, 'properties'),
      testDirectory,
    ];

    for (const testDir of testDirs) {
      try {
        // Check if test directory exists
        await fs.access(testDir);

        // Check each possible test file name
        for (const testName of possibleTestNames) {
          const testFilePath = path.join(testDir, testName);

          try {
            await fs.access(testFilePath);
            testFiles.push(testFilePath);
          } catch {
            // Test file doesn't exist, continue
          }
        }
      } catch {
        // Test directory doesn't exist, continue
      }
    }

    // Also check for test files in the same directory as the source file
    const sameDir = parsedPath.dir;
    if (sameDir) {
      for (const testName of possibleTestNames) {
        const testFilePath = path.join(sameDir, testName);

        try {
          await fs.access(testFilePath);
          testFiles.push(testFilePath);
        } catch {
          // Test file doesn't exist, continue
        }
      }
    }

    // Remove duplicates
    const uniqueTestFiles = [...new Set(testFiles)];

    if (uniqueTestFiles.length > 0) {
      testFileMap.set(codeFile, uniqueTestFiles);
    }
  }

  return testFileMap;
}

/**
 * Identify affected test files based on changed code files
 * This function determines which tests need to be run when specific code files change
 *
 * @param changedFiles - Array of changed source code file paths
 * @param testDirectory - Root directory for test files (default: 'tests')
 * @returns Array of unique test file paths that should be executed
 *
 * Requirements: 4.1
 */
export async function identifyAffectedTests(
  changedFiles: string[],
  testDirectory: string = 'tests'
): Promise<string[]> {
  const testFileMap = await identifyTestFiles(changedFiles, testDirectory);

  // Collect all test files from the map
  const affectedTests = new Set<string>();

  for (const testFiles of testFileMap.values()) {
    for (const testFile of testFiles) {
      affectedTests.add(testFile);
    }
  }

  return Array.from(affectedTests);
}

/**
 * Find all test files in a directory recursively
 * Useful for running all tests or discovering test files
 *
 * @param testDirectory - Root directory to search for test files
 * @returns Array of all test file paths found
 */
export async function findAllTestFiles(testDirectory: string = 'tests'): Promise<string[]> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const testFiles: string[] = [];

  async function searchDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await searchDirectory(fullPath);
        } else if (entry.isFile()) {
          // Check if this is a test file
          if (
            (entry.name.endsWith('.test.ts') ||
              entry.name.endsWith('.test.tsx') ||
              entry.name.endsWith('.spec.ts') ||
              entry.name.endsWith('.spec.tsx') ||
              entry.name.endsWith('.test.js') ||
              entry.name.endsWith('.test.jsx') ||
              entry.name.endsWith('.spec.js') ||
              entry.name.endsWith('.spec.jsx')) &&
            !entry.name.includes('.d.ts')
          ) {
            testFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read, skip
    }
  }

  await searchDirectory(testDirectory);
  return testFiles;
}

/**
 * Create a test runner instance with default configuration
 *
 * @param config - Optional configuration
 * @returns TestRunner instance
 */
export function createTestRunner(config?: TestRunnerConfig): TestRunner {
  return new TestRunner(config);
}
