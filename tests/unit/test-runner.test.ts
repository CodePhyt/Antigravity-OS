/**
 * Unit tests for Test Runner service
 * Tests test execution wrapper functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TestRunner,
  identifyTestFiles,
  identifyAffectedTests,
  findAllTestFiles,
} from '@/services/test-runner';
import type { TestFailure } from '@/types/spec';
import { promises as fs } from 'fs';
import path from 'path';

describe('TestRunner', () => {
  let testRunner: TestRunner;

  beforeEach(() => {
    testRunner = new TestRunner({ timeout: 5000 });
  });

  describe('parseTestOutput', () => {
    it('should parse successful test output', () => {
      const output = JSON.stringify({
        success: true,
        numTotalTests: 5,
        numPassedTests: 5,
        numFailedTests: 0,
        testResults: [],
      });

      const result = testRunner.parseTestOutput(output);

      expect(result.success).toBe(true);
      expect(result.totalTests).toBe(5);
      expect(result.passedTests).toBe(5);
      expect(result.failedTests).toBe(0);
      expect(result.failures).toHaveLength(0);
    });

    it('should parse failed test output with failures', () => {
      const output = JSON.stringify({
        success: false,
        numTotalTests: 3,
        numPassedTests: 2,
        numFailedTests: 1,
        testResults: [
          {
            name: 'test-file.test.ts',
            status: 'failed',
            assertionResults: [
              {
                ancestorTitles: ['TestSuite'],
                title: 'should pass',
                status: 'passed',
              },
              {
                ancestorTitles: ['TestSuite'],
                title: 'should fail',
                status: 'failed',
                failureMessages: ['Expected 2 to equal 3'],
              },
            ],
          },
        ],
      });

      const result = testRunner.parseTestOutput(output);

      expect(result.success).toBe(false);
      expect(result.totalTests).toBe(3);
      expect(result.passedTests).toBe(2);
      expect(result.failedTests).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]?.testName).toBe('TestSuite > should fail');
      expect(result.failures[0]?.errorMessage).toBe('Expected 2 to equal 3');
    });

    it('should extract property references from failure messages', () => {
      const output = JSON.stringify({
        success: false,
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 1,
        testResults: [
          {
            name: 'test.ts',
            status: 'failed',
            assertionResults: [
              {
                ancestorTitles: [],
                title: 'Property 5 test',
                status: 'failed',
                failureMessages: ['Property 5: Test failed'],
              },
            ],
          },
        ],
      });

      const result = testRunner.parseTestOutput(output);

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]?.propertyRef).toBe('Property 5');
    });

    it('should extract requirement references from failure messages', () => {
      const output = JSON.stringify({
        success: false,
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 1,
        testResults: [
          {
            name: 'test.ts',
            status: 'failed',
            assertionResults: [
              {
                ancestorTitles: [],
                title: 'requirement test',
                status: 'failed',
                failureMessages: ['Requirements 1.2: Test failed'],
              },
            ],
          },
        ],
      });

      const result = testRunner.parseTestOutput(output);

      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]?.requirementRef).toBe('1.2');
    });

    it('should handle malformed JSON output', () => {
      const output = 'This is not valid JSON';

      const result = testRunner.parseTestOutput(output);

      expect(result.success).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0]?.testName).toBe('Output Parsing');
    });

    it('should parse verbose output when JSON is not available', () => {
      const output = `
        Test Files  1 passed (1)
        Tests  5 passed (5)
        Duration  123ms
      `;

      const result = testRunner.parseTestOutput(output);

      expect(result.success).toBe(true);
      expect(result.totalTests).toBe(5);
      expect(result.passedTests).toBe(5);
      expect(result.failedTests).toBe(0);
    });

    it('should handle empty test file list', async () => {
      const result = await testRunner.runTests([]);

      expect(result.success).toBe(true);
      expect(result.totalTests).toBe(0);
      expect(result.passedTests).toBe(0);
      expect(result.failedTests).toBe(0);
      expect(result.failures).toHaveLength(0);
    });
  });

  describe('error extraction', () => {
    it('should extract error message from stack trace', () => {
      const output = JSON.stringify({
        success: false,
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 1,
        testResults: [
          {
            name: 'test.ts',
            status: 'failed',
            assertionResults: [
              {
                ancestorTitles: [],
                title: 'test',
                status: 'failed',
                failureMessages: [
                  'Expected value to be truthy\n  at test.ts:10:5\n  at run (test.ts:5:3)',
                ],
              },
            ],
          },
        ],
      });

      const result = testRunner.parseTestOutput(output);

      expect(result.failures[0]?.errorMessage).toBe('Expected value to be truthy');
      expect(result.failures[0]?.stackTrace).toContain('at test.ts:10:5');
    });

    it('should handle multiple failure messages', () => {
      const output = JSON.stringify({
        success: false,
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 1,
        testResults: [
          {
            name: 'test.ts',
            status: 'failed',
            assertionResults: [
              {
                ancestorTitles: [],
                title: 'test',
                status: 'failed',
                failureMessages: ['Error 1', 'Error 2'],
              },
            ],
          },
        ],
      });

      const result = testRunner.parseTestOutput(output);

      expect(result.failures[0]?.errorMessage).toContain('Error 1');
    });
  });

  describe('property test validation', () => {
    it('should detect missing iteration count', async () => {
      const testContent = `
        import fc from 'fast-check';
        
        // Feature: spec-orchestrator, Property 1: Test property
        fc.assert(
          fc.property(fc.integer(), (n) => {
            expect(n).toBeDefined();
          })
        );
      `;

      // Create a temporary test file
      const fs = await import('fs/promises');
      const path = await import('path');
      const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-test-'));
      const testFile = path.join(tmpDir, 'test.property.test.ts');

      try {
        await fs.writeFile(testFile, testContent);

        const validation = await testRunner.validatePropertyTests([testFile]);

        expect(validation.valid).toBe(false);
        expect(validation.issues.length).toBeGreaterThan(0);
        expect(validation.issues.some((i) => i.issue === 'missing_iteration_count')).toBe(true);
      } finally {
        // Cleanup
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should detect insufficient iteration count', async () => {
      const testContent = `
        import fc from 'fast-check';
        
        // Feature: spec-orchestrator, Property 1: Test property
        fc.assert(
          fc.property(fc.integer(), (n) => {
            expect(n).toBeDefined();
          }),
          { numRuns: 50 }
        );
      `;

      const fs = await import('fs/promises');
      const path = await import('path');
      const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-test-'));
      const testFile = path.join(tmpDir, 'test.property.test.ts');

      try {
        await fs.writeFile(testFile, testContent);

        const validation = await testRunner.validatePropertyTests([testFile]);

        expect(validation.valid).toBe(false);
        expect(validation.issues.length).toBeGreaterThan(0);
        const insufficientIssue = validation.issues.find(
          (i) => i.issue === 'insufficient_iterations'
        );
        expect(insufficientIssue).toBeDefined();
        expect(insufficientIssue?.message).toContain('50 iterations');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should accept valid iteration count', async () => {
      const testContent = `
        import fc from 'fast-check';
        
        // Feature: spec-orchestrator, Property 20: Property test iteration minimum
        fc.assert(
          fc.property(fc.integer(), (n) => {
            expect(n).toBeDefined();
          }),
          { numRuns: 100 }
        );
      `;

      const fs = await import('fs/promises');
      const path = await import('path');
      const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-test-'));
      const testFile = path.join(tmpDir, 'test.property.test.ts');

      try {
        await fs.writeFile(testFile, testContent);

        const validation = await testRunner.validatePropertyTests([testFile]);

        expect(validation.valid).toBe(true);
        expect(validation.issues).toHaveLength(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should detect missing property tag', async () => {
      const testContent = `
        import fc from 'fast-check';
        
        fc.assert(
          fc.property(fc.integer(), (n) => {
            expect(n).toBeDefined();
          }),
          { numRuns: 100 }
        );
      `;

      const fs = await import('fs/promises');
      const path = await import('path');
      const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-test-'));
      const testFile = path.join(tmpDir, 'test.property.test.ts');

      try {
        await fs.writeFile(testFile, testContent);

        const validation = await testRunner.validatePropertyTests([testFile]);

        expect(validation.valid).toBe(false);
        expect(validation.issues.some((i) => i.issue === 'missing_property_tag')).toBe(true);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should skip non-property test files', async () => {
      const testContent = `
        import { describe, it, expect } from 'vitest';
        
        describe('Unit test', () => {
          it('should pass', () => {
            expect(true).toBe(true);
          });
        });
      `;

      const fs = await import('fs/promises');
      const path = await import('path');
      const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-test-'));
      const testFile = path.join(tmpDir, 'test.test.ts');

      try {
        await fs.writeFile(testFile, testContent);

        const validation = await testRunner.validatePropertyTests([testFile]);

        expect(validation.valid).toBe(true);
        expect(validation.issues).toHaveLength(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should handle file read errors gracefully', async () => {
      const validation = await testRunner.validatePropertyTests(['/nonexistent/file.test.ts']);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0]?.issue).toBe('file_read_error');
    });
  });

  describe('enrichFailureWithPropertyInfo', () => {
    it('should extract property number from propertyRef', () => {
      const failure: TestFailure = {
        testName: 'test',
        errorMessage: 'failed',
        stackTrace: '',
        propertyRef: 'Property 5',
        requirementRef: null,
      };

      const enriched = testRunner.enrichFailureWithPropertyInfo(failure);

      expect(enriched.propertyNumber).toBe(5);
    });

    it('should extract property info from test file content', () => {
      const failure: TestFailure = {
        testName: 'test',
        errorMessage: 'failed',
        stackTrace: '',
        propertyRef: null,
        requirementRef: null,
      };

      const testContent = `
        // Feature: spec-orchestrator, Property 20: Property test iteration minimum
        fc.assert(fc.property(...));
      `;

      const enriched = testRunner.enrichFailureWithPropertyInfo(failure, testContent);

      expect(enriched.propertyNumber).toBe(20);
      expect(enriched.propertyTitle).toBe('Property test iteration minimum');
    });

    it('should handle missing property information', () => {
      const failure: TestFailure = {
        testName: 'test',
        errorMessage: 'failed',
        stackTrace: '',
        propertyRef: null,
        requirementRef: null,
      };

      const enriched = testRunner.enrichFailureWithPropertyInfo(failure);

      expect(enriched.propertyNumber).toBeNull();
      expect(enriched.propertyTitle).toBeNull();
    });
  });

  describe('test file identification', () => {
    let tmpDir: string;

    beforeEach(async () => {
      // Create temporary directory structure for testing
      tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-test-id-'));

      // Create test directory structure
      await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'tests', 'unit'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'tests', 'integration'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'tests', 'properties'), { recursive: true });
    });

    afterEach(async () => {
      // Cleanup temporary directory
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    describe('identifyTestFiles', () => {
      it('should map code file to corresponding test file in tests/unit', async () => {
        // Create source file
        const srcFile = path.join(tmpDir, 'src', 'example.ts');
        await fs.writeFile(srcFile, 'export function example() {}');

        // Create corresponding test file
        const testFile = path.join(tmpDir, 'tests', 'unit', 'example.test.ts');
        await fs.writeFile(testFile, 'import { example } from "@/src/example";');

        const testFileMap = await identifyTestFiles([srcFile], path.join(tmpDir, 'tests'));

        expect(testFileMap.has(srcFile)).toBe(true);
        expect(testFileMap.get(srcFile)).toContain(testFile);
      });

      it('should find test files with .spec extension', async () => {
        const srcFile = path.join(tmpDir, 'src', 'module.ts');
        await fs.writeFile(srcFile, 'export function module() {}');

        const testFile = path.join(tmpDir, 'tests', 'unit', 'module.spec.ts');
        await fs.writeFile(testFile, 'import { module } from "@/src/module";');

        const testFileMap = await identifyTestFiles([srcFile], path.join(tmpDir, 'tests'));

        expect(testFileMap.has(srcFile)).toBe(true);
        expect(testFileMap.get(srcFile)).toContain(testFile);
      });

      it('should find test files in multiple test directories', async () => {
        const srcFile = path.join(tmpDir, 'src', 'service.ts');
        await fs.writeFile(srcFile, 'export class Service {}');

        const unitTest = path.join(tmpDir, 'tests', 'unit', 'service.test.ts');
        const integrationTest = path.join(tmpDir, 'tests', 'integration', 'service.test.ts');
        const propertyTest = path.join(tmpDir, 'tests', 'properties', 'service.test.ts');

        await fs.writeFile(unitTest, 'test unit');
        await fs.writeFile(integrationTest, 'test integration');
        await fs.writeFile(propertyTest, 'test property');

        const testFileMap = await identifyTestFiles([srcFile], path.join(tmpDir, 'tests'));

        expect(testFileMap.has(srcFile)).toBe(true);
        const testFiles = testFileMap.get(srcFile) || [];
        expect(testFiles).toContain(unitTest);
        expect(testFiles).toContain(integrationTest);
        expect(testFiles).toContain(propertyTest);
      });

      it('should find test files co-located with source files', async () => {
        const srcFile = path.join(tmpDir, 'src', 'component.tsx');
        await fs.writeFile(srcFile, 'export function Component() {}');

        const testFile = path.join(tmpDir, 'src', 'component.test.tsx');
        await fs.writeFile(testFile, 'import { Component } from "./component";');

        const testFileMap = await identifyTestFiles([srcFile], path.join(tmpDir, 'tests'));

        expect(testFileMap.has(srcFile)).toBe(true);
        expect(testFileMap.get(srcFile)).toContain(testFile);
      });

      it('should handle multiple code files', async () => {
        const srcFile1 = path.join(tmpDir, 'src', 'file1.ts');
        const srcFile2 = path.join(tmpDir, 'src', 'file2.ts');
        await fs.writeFile(srcFile1, 'export function file1() {}');
        await fs.writeFile(srcFile2, 'export function file2() {}');

        const testFile1 = path.join(tmpDir, 'tests', 'unit', 'file1.test.ts');
        const testFile2 = path.join(tmpDir, 'tests', 'unit', 'file2.test.ts');
        await fs.writeFile(testFile1, 'test file1');
        await fs.writeFile(testFile2, 'test file2');

        const testFileMap = await identifyTestFiles(
          [srcFile1, srcFile2],
          path.join(tmpDir, 'tests')
        );

        expect(testFileMap.size).toBe(2);
        expect(testFileMap.has(srcFile1)).toBe(true);
        expect(testFileMap.has(srcFile2)).toBe(true);
      });

      it('should return empty map when no test files exist', async () => {
        const srcFile = path.join(tmpDir, 'src', 'notest.ts');
        await fs.writeFile(srcFile, 'export function notest() {}');

        const testFileMap = await identifyTestFiles([srcFile], path.join(tmpDir, 'tests'));

        expect(testFileMap.size).toBe(0);
      });

      it('should skip non-code files', async () => {
        const txtFile = path.join(tmpDir, 'src', 'readme.txt');
        await fs.writeFile(txtFile, 'This is a text file');

        const testFileMap = await identifyTestFiles([txtFile], path.join(tmpDir, 'tests'));

        expect(testFileMap.size).toBe(0);
      });

      it('should remove duplicate test files', async () => {
        const srcFile = path.join(tmpDir, 'src', 'duplicate.ts');
        await fs.writeFile(srcFile, 'export function duplicate() {}');

        // Create the same test file in multiple locations (edge case)
        const testFile = path.join(tmpDir, 'tests', 'unit', 'duplicate.test.ts');
        await fs.writeFile(testFile, 'test duplicate');

        const testFileMap = await identifyTestFiles([srcFile], path.join(tmpDir, 'tests'));

        expect(testFileMap.has(srcFile)).toBe(true);
        const testFiles = testFileMap.get(srcFile) || [];
        // Should only have unique entries
        expect(testFiles.length).toBe(new Set(testFiles).size);
      });
    });

    describe('identifyAffectedTests', () => {
      it('should return all affected test files for changed code files', async () => {
        const srcFile1 = path.join(tmpDir, 'src', 'changed1.ts');
        const srcFile2 = path.join(tmpDir, 'src', 'changed2.ts');
        await fs.writeFile(srcFile1, 'export function changed1() {}');
        await fs.writeFile(srcFile2, 'export function changed2() {}');

        const testFile1 = path.join(tmpDir, 'tests', 'unit', 'changed1.test.ts');
        const testFile2 = path.join(tmpDir, 'tests', 'unit', 'changed2.test.ts');
        await fs.writeFile(testFile1, 'test changed1');
        await fs.writeFile(testFile2, 'test changed2');

        const affectedTests = await identifyAffectedTests(
          [srcFile1, srcFile2],
          path.join(tmpDir, 'tests')
        );

        expect(affectedTests).toContain(testFile1);
        expect(affectedTests).toContain(testFile2);
        expect(affectedTests.length).toBe(2);
      });

      it('should return unique test files when multiple code files map to same test', async () => {
        const srcFile1 = path.join(tmpDir, 'src', 'shared1.ts');
        const srcFile2 = path.join(tmpDir, 'src', 'shared2.ts');
        await fs.writeFile(srcFile1, 'export function shared1() {}');
        await fs.writeFile(srcFile2, 'export function shared2() {}');

        // Both map to the same test file (simulated by naming)
        const testFile = path.join(tmpDir, 'tests', 'unit', 'shared1.test.ts');
        await fs.writeFile(testFile, 'test shared');

        const affectedTests = await identifyAffectedTests([srcFile1], path.join(tmpDir, 'tests'));

        // Should only return unique test files
        expect(affectedTests.length).toBe(new Set(affectedTests).size);
      });

      it('should return empty array when no tests are affected', async () => {
        const srcFile = path.join(tmpDir, 'src', 'notested.ts');
        await fs.writeFile(srcFile, 'export function notested() {}');

        const affectedTests = await identifyAffectedTests([srcFile], path.join(tmpDir, 'tests'));

        expect(affectedTests).toHaveLength(0);
      });
    });

    describe('findAllTestFiles', () => {
      it('should find all test files recursively', async () => {
        const testFile1 = path.join(tmpDir, 'tests', 'unit', 'test1.test.ts');
        const testFile2 = path.join(tmpDir, 'tests', 'integration', 'test2.test.ts');
        const testFile3 = path.join(tmpDir, 'tests', 'properties', 'test3.test.ts');

        await fs.writeFile(testFile1, 'test 1');
        await fs.writeFile(testFile2, 'test 2');
        await fs.writeFile(testFile3, 'test 3');

        const allTests = await findAllTestFiles(path.join(tmpDir, 'tests'));

        expect(allTests).toContain(testFile1);
        expect(allTests).toContain(testFile2);
        expect(allTests).toContain(testFile3);
        expect(allTests.length).toBe(3);
      });

      it('should find test files with different extensions', async () => {
        const tsTest = path.join(tmpDir, 'tests', 'test.test.ts');
        const tsxTest = path.join(tmpDir, 'tests', 'test.test.tsx');
        const jsTest = path.join(tmpDir, 'tests', 'test.test.js');
        const jsxTest = path.join(tmpDir, 'tests', 'test.test.jsx');

        await fs.writeFile(tsTest, 'test ts');
        await fs.writeFile(tsxTest, 'test tsx');
        await fs.writeFile(jsTest, 'test js');
        await fs.writeFile(jsxTest, 'test jsx');

        const allTests = await findAllTestFiles(path.join(tmpDir, 'tests'));

        expect(allTests).toContain(tsTest);
        expect(allTests).toContain(tsxTest);
        expect(allTests).toContain(jsTest);
        expect(allTests).toContain(jsxTest);
      });

      it('should find test files with .spec extension', async () => {
        const specTest = path.join(tmpDir, 'tests', 'test.spec.ts');
        await fs.writeFile(specTest, 'spec test');

        const allTests = await findAllTestFiles(path.join(tmpDir, 'tests'));

        expect(allTests).toContain(specTest);
      });

      it('should skip non-test files', async () => {
        const testFile = path.join(tmpDir, 'tests', 'real.test.ts');
        const nonTestFile = path.join(tmpDir, 'tests', 'helper.ts');
        const readmeFile = path.join(tmpDir, 'tests', 'README.md');

        await fs.writeFile(testFile, 'test');
        await fs.writeFile(nonTestFile, 'helper');
        await fs.writeFile(readmeFile, 'readme');

        const allTests = await findAllTestFiles(path.join(tmpDir, 'tests'));

        expect(allTests).toContain(testFile);
        expect(allTests).not.toContain(nonTestFile);
        expect(allTests).not.toContain(readmeFile);
      });

      it('should skip TypeScript declaration files', async () => {
        const testFile = path.join(tmpDir, 'tests', 'test.test.ts');
        const declFile = path.join(tmpDir, 'tests', 'types.test.d.ts');

        await fs.writeFile(testFile, 'test');
        await fs.writeFile(declFile, 'declare');

        const allTests = await findAllTestFiles(path.join(tmpDir, 'tests'));

        expect(allTests).toContain(testFile);
        expect(allTests).not.toContain(declFile);
      });

      it('should return empty array when test directory does not exist', async () => {
        const allTests = await findAllTestFiles(path.join(tmpDir, 'nonexistent'));

        expect(allTests).toHaveLength(0);
      });

      it('should handle nested directory structures', async () => {
        await fs.mkdir(path.join(tmpDir, 'tests', 'unit', 'services'), { recursive: true });
        await fs.mkdir(path.join(tmpDir, 'tests', 'unit', 'core'), { recursive: true });

        const test1 = path.join(tmpDir, 'tests', 'unit', 'services', 'service.test.ts');
        const test2 = path.join(tmpDir, 'tests', 'unit', 'core', 'core.test.ts');

        await fs.writeFile(test1, 'test service');
        await fs.writeFile(test2, 'test core');

        const allTests = await findAllTestFiles(path.join(tmpDir, 'tests'));

        expect(allTests).toContain(test1);
        expect(allTests).toContain(test2);
      });
    });
  });
});
