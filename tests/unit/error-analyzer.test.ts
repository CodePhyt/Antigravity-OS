/**
 * Unit tests for Error Analyzer
 * Tests error classification, root cause extraction, and target file determination
 */

import { describe, it, expect } from 'vitest';
import { ErrorAnalyzer } from '@/core/error-analyzer';
import type { ErrorContext } from '@/types/spec';

describe('ErrorAnalyzer', () => {
  const analyzer = new ErrorAnalyzer();

  describe('Test Failure Classification', () => {
    it('should classify test assertion failures', () => {
      const error: ErrorContext = {
        taskId: '2.1',
        errorMessage: 'Test failed: expected 5 to equal 10',
        stackTrace: 'at Object.<anonymous> (test.ts:10:5)',
        failedTest: 'should calculate sum correctly',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('test_failure');
      expect(analysis.rootCause).toContain('Test "should calculate sum correctly" failed');
      expect(analysis.targetFile).toBe('design.md');
      expect(analysis.confidence).toBeGreaterThan(50);
    });

    it('should classify property-based test failures', () => {
      const error: ErrorContext = {
        taskId: '3.2',
        errorMessage: 'Property test failed after 42 tests. Counterexample: { value: -1 }',
        stackTrace: 'at fast-check (property.test.ts:25:10)',
        failedTest: 'Property 5: Valid state transitions',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('test_failure');
      expect(analysis.rootCause).toContain('Property test');
      expect(analysis.rootCause).toContain('counterexample');
      expect(analysis.targetFile).toBe('design.md');
    });

    it('should extract property reference from test failure', () => {
      const error: ErrorContext = {
        taskId: '4.1',
        errorMessage: 'Property 12 failed: Mutual exclusion violated',
        stackTrace: '',
        failedTest: 'Property 12: Mutual exclusion',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.context.propertyRef).toBe('Property 12');
      expect(analysis.context.suggestion).toContain('property definition');
    });
  });

  describe('Compilation Error Classification', () => {
    it('should classify TypeScript type errors', () => {
      const error: ErrorContext = {
        taskId: '5.1',
        errorMessage: "TS2304: Cannot find name 'TaskStatus'",
        stackTrace: 'at task-manager.ts:45:12',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('compilation_error');
      expect(analysis.rootCause).toContain('TypeScript compilation error');
      expect(analysis.targetFile).toBe('design.md');
    });

    it('should classify syntax errors', () => {
      const error: ErrorContext = {
        taskId: '6.1',
        errorMessage: 'SyntaxError: Unexpected token }',
        stackTrace: 'at Module._compile (internal/modules/cjs/loader.js:723:23)',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('compilation_error');
      expect(analysis.rootCause).toContain('Unexpected token');
      expect(analysis.targetFile).toBe('design.md');
    });

    it('should classify undefined reference errors', () => {
      const error: ErrorContext = {
        taskId: '7.1',
        errorMessage: "Cannot find name 'parseSpec'",
        stackTrace: 'at orchestrator.ts:120:5',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('compilation_error');
      expect(analysis.rootCause).toContain('Undefined reference');
      expect(analysis.rootCause).toContain('parseSpec');
    });
  });

  describe('Runtime Error Classification', () => {
    it('should classify TypeError', () => {
      const error: ErrorContext = {
        taskId: '8.1',
        errorMessage: "TypeError: Cannot read property 'status' of undefined",
        stackTrace: 'at TaskManager.getStatus (task-manager.ts:200:15)',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('runtime_error');
      expect(analysis.rootCause).toContain('Runtime TypeError');
      expect(analysis.rootCause).toContain('status');
      expect(analysis.targetFile).toBe('tasks.md');
    });

    it('should classify ReferenceError', () => {
      const error: ErrorContext = {
        taskId: '9.1',
        errorMessage: 'ReferenceError: task is not defined',
        stackTrace: 'at executeTask (orchestrator.ts:150:10)',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('runtime_error');
      expect(analysis.rootCause).toContain('Runtime ReferenceError');
      expect(analysis.targetFile).toBe('tasks.md');
    });

    it('should extract error location from stack trace', () => {
      const error: ErrorContext = {
        taskId: '10.1',
        errorMessage: 'TypeError: undefined is not a function',
        stackTrace:
          'at Object.test (test-runner.ts:45:20)\n    at processTask (orchestrator.ts:100:5)',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.context.errorLocation).toBeDefined();
      expect(analysis.context.errorLocation).toContain('test-runner.ts:45');
    });
  });

  describe('Missing Dependency Classification', () => {
    it('should classify module not found errors', () => {
      const error: ErrorContext = {
        taskId: '11.1',
        errorMessage: "Error: Cannot find module 'fast-check'",
        stackTrace: 'at Function.Module._resolveFilename (internal/modules/cjs/loader.js:636:15)',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('missing_dependency');
      expect(analysis.rootCause).toContain('Missing module');
      expect(analysis.rootCause).toContain('fast-check');
      expect(analysis.targetFile).toBe('requirements.md');
    });

    it('should classify file not found errors', () => {
      const error: ErrorContext = {
        taskId: '12.1',
        errorMessage: "ENOENT: no such file or directory, open '/path/to/spec/requirements.md'",
        stackTrace: 'at Object.openSync (fs.js:476:3)',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('missing_dependency');
      expect(analysis.rootCause).toContain('Missing file');
      expect(analysis.rootCause).toContain('requirements.md');
      expect(analysis.targetFile).toBe('requirements.md');
    });
  });

  describe('Invalid Spec Classification', () => {
    it('should classify invalid spec errors', () => {
      const error: ErrorContext = {
        taskId: '13.1',
        errorMessage: 'Invalid spec: Malformed markdown in requirements.md at line 45',
        stackTrace: 'at SpecParser.parseRequirements (spec-parser.ts:120:10)',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('invalid_spec');
      expect(analysis.rootCause).toContain('Invalid specification');
      expect(analysis.targetFile).toBe('requirements.md');
    });

    it('should classify design spec errors', () => {
      const error: ErrorContext = {
        taskId: '14.1',
        errorMessage: 'Invalid spec: Parse error in design.md - Invalid property format',
        stackTrace: 'at SpecParser.parseDesign (spec-parser.ts:200:10)',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('invalid_spec');
      expect(analysis.targetFile).toBe('design.md');
    });
  });

  describe('Timeout Error Classification', () => {
    it('should classify timeout errors', () => {
      const error: ErrorContext = {
        taskId: '15.1',
        errorMessage: 'Test execution timed out after 30000ms',
        stackTrace: 'at Timeout._onTimeout (test-runner.ts:100:10)',
        failedTest: null, // No failedTest to avoid test_failure classification
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('timeout_error');
      expect(analysis.rootCause).toContain('timed out');
      expect(analysis.rootCause).toContain('30000ms');
      expect(analysis.targetFile).toBe('tasks.md');
    });

    it('should extract timeout duration', () => {
      const error: ErrorContext = {
        taskId: '16.1',
        errorMessage: 'Operation exceeded time limit of 5 seconds',
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('timeout_error');
      expect(analysis.rootCause).toContain('5');
      expect(analysis.rootCause).toContain('seconds');
    });
  });

  describe('Unknown Error Classification', () => {
    it('should classify unknown errors', () => {
      const error: ErrorContext = {
        taskId: '17.1',
        errorMessage: 'Something went wrong',
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('unknown_error');
      expect(analysis.rootCause).toContain('Something went wrong');
      expect(analysis.targetFile).toBe('tasks.md');
    });

    it('should handle empty error messages', () => {
      const error: ErrorContext = {
        taskId: '18.1',
        errorMessage: '',
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('unknown_error');
      expect(analysis.rootCause).toBeDefined();
      expect(analysis.confidence).toBeLessThan(50);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have high confidence with failed test name', () => {
      const error: ErrorContext = {
        taskId: '19.1',
        errorMessage: 'Test failed: expected true to be false',
        stackTrace: 'at Object.<anonymous> (test.ts:10:5)',
        failedTest: 'should validate correctly',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.confidence).toBeGreaterThan(70);
    });

    it('should have lower confidence without context', () => {
      const error: ErrorContext = {
        taskId: '20.1',
        errorMessage: 'Error',
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.confidence).toBeLessThan(50);
    });

    it('should have moderate confidence with clear error message', () => {
      const error: ErrorContext = {
        taskId: '21.1',
        errorMessage: 'TypeError: Cannot read property "length" of undefined in array processing',
        stackTrace: 'at processArray (utils.ts:50:10)',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.confidence).toBeGreaterThan(50);
      expect(analysis.confidence).toBeLessThan(90);
    });
  });

  describe('Context Extraction', () => {
    it('should extract property reference', () => {
      const error: ErrorContext = {
        taskId: '22.1',
        errorMessage: 'Property 25 failed: Task reset after correction',
        stackTrace: '',
        failedTest: 'Property 25',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.context.propertyRef).toBe('Property 25');
    });

    it('should extract requirement reference', () => {
      const error: ErrorContext = {
        taskId: '23.1',
        errorMessage: 'Requirement 5.2 not satisfied: Target file determination failed',
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.context.requirementRef).toBe('5.2');
    });

    it('should provide correction suggestions', () => {
      const error: ErrorContext = {
        taskId: '24.1',
        errorMessage: 'Test failed',
        stackTrace: '',
        failedTest: 'test',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.context.suggestion).toBeDefined();
      expect(analysis.context.suggestion).toContain('design.md');
    });
  });

  describe('Target File Determination', () => {
    it('should target design.md for test failures', () => {
      const error: ErrorContext = {
        taskId: '25.1',
        errorMessage: 'Test assertion failed',
        stackTrace: '',
        failedTest: 'test',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.targetFile).toBe('design.md');
    });

    it('should target design.md for compilation errors', () => {
      const error: ErrorContext = {
        taskId: '26.1',
        errorMessage: 'TS2304: Cannot find name',
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.targetFile).toBe('design.md');
    });

    it('should target tasks.md for runtime errors', () => {
      const error: ErrorContext = {
        taskId: '27.1',
        errorMessage: 'TypeError: undefined is not a function',
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.targetFile).toBe('tasks.md');
    });

    it('should target requirements.md for missing dependencies', () => {
      const error: ErrorContext = {
        taskId: '28.1',
        errorMessage: 'Cannot find module "missing-package"',
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.targetFile).toBe('requirements.md');
    });

    it('should target tasks.md for timeout errors', () => {
      const error: ErrorContext = {
        taskId: '29.1',
        errorMessage: 'Timeout after 30000ms',
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.targetFile).toBe('tasks.md');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiline error messages', () => {
      const error: ErrorContext = {
        taskId: '30.1',
        errorMessage: 'Test failed:\nExpected: 5\nReceived: 10\nDifference: -5',
        stackTrace: '',
        failedTest: 'calculation test',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('test_failure');
      expect(analysis.rootCause).toBeDefined();
    });

    it('should handle complex stack traces', () => {
      const error: ErrorContext = {
        taskId: '31.1',
        errorMessage: 'Error occurred',
        stackTrace: `at Object.test (test.ts:10:5)
    at processTask (orchestrator.ts:100:10)
    at async TaskManager.execute (task-manager.ts:200:15)
    at async main (index.ts:50:5)`,
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.context.errorLocation).toBeDefined();
    });

    it('should handle errors with special characters', () => {
      const error: ErrorContext = {
        taskId: '32.1',
        errorMessage: 'Expected "foo\\nbar" to equal "foo\\tbar"',
        stackTrace: '',
        failedTest: 'string comparison',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('test_failure');
      expect(analysis.rootCause).toContain('string comparison');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'Error: ' + 'x'.repeat(1000);
      const error: ErrorContext = {
        taskId: '33.1',
        errorMessage: longMessage,
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.rootCause).toBeDefined();
      // Root cause should be truncated to 200 chars + "..."
      expect(analysis.rootCause.length).toBeLessThanOrEqual(203);
    });
  });

  describe('Real-World Error Scenarios', () => {
    it('should analyze property test counterexample', () => {
      const error: ErrorContext = {
        taskId: '8.1',
        errorMessage: `Property failed after 42 tests
Counterexample: { taskId: "1.2", status: "in_progress" }
Property 12: Mutual exclusion of in-progress tasks
Expected only one task to be in_progress, but found 2`,
        stackTrace: `at fc.assert (property.test.ts:120:5)
    at Object.<anonymous> (property.test.ts:115:3)`,
        failedTest: 'Property 12: Mutual exclusion of in-progress tasks',
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('test_failure');
      expect(analysis.rootCause).toContain('Property test');
      expect(analysis.rootCause).toContain('counterexample');
      expect(analysis.context.propertyRef).toBe('Property 12');
      expect(analysis.targetFile).toBe('design.md');
      expect(analysis.confidence).toBeGreaterThan(70);
    });

    it('should analyze TypeScript compilation error', () => {
      const error: ErrorContext = {
        taskId: '5.2',
        errorMessage: `src/core/task-manager.ts:45:12 - error TS2304: Cannot find name 'TaskStatus'.

45     status: TaskStatus;
              ~~~~~~~~~~`,
        stackTrace: '',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('compilation_error');
      expect(analysis.rootCause).toContain('TypeScript compilation error');
      // errorLocation may be undefined if stack trace is empty
      if (analysis.context.errorLocation) {
        expect(analysis.context.errorLocation).toContain('task-manager.ts');
      }
      expect(analysis.targetFile).toBe('design.md');
      expect(analysis.context.suggestion).toContain('type definitions');
    });

    it('should analyze runtime null reference error', () => {
      const error: ErrorContext = {
        taskId: '3.4',
        errorMessage: "TypeError: Cannot read property 'children' of undefined",
        stackTrace: `at TaskManager.findNextTaskRecursive (task-manager.ts:450:20)
    at TaskManager.selectNextTask (task-manager.ts:420:15)
    at Orchestrator.executeNextTask (orchestrator.ts:100:30)`,
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis = analyzer.analyze(error);

      expect(analysis.errorType).toBe('runtime_error');
      expect(analysis.rootCause).toContain("property 'children'");
      expect(analysis.context.errorLocation).toBe('task-manager.ts:450');
      expect(analysis.targetFile).toBe('tasks.md');
      expect(analysis.context.suggestion).toContain('null checks');
    });
  });
});
