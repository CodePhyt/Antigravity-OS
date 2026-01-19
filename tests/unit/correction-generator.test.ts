/**
 * Unit tests for Correction Generator
 * Tests correction generation, content updates, and validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CorrectionGenerator } from '@/core/correction-generator';
import type { ErrorContext, ParsedSpec } from '@/types/spec';
import type { ErrorAnalysis } from '@/core/error-analyzer';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CorrectionGenerator', () => {
  let generator: CorrectionGenerator;
  let testSpecPath: string;

  beforeEach(async () => {
    generator = new CorrectionGenerator();

    // Create temporary spec directory for testing
    testSpecPath = join(tmpdir(), `spec-test-${Date.now()}`);
    await mkdir(testSpecPath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testSpecPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('generateCorrection', () => {
    it('should generate correction plan for test failure', async () => {
      // Arrange
      const designContent = `# Design Document

## Correctness Properties

**Property 1: Task parsing completeness**
For any valid tasks.md content, parsing should extract all task identifiers.
**Validates: Requirements 1.2**

## Error Handling

Some error handling notes.
`;

      await writeFile(join(testSpecPath, 'design.md'), designContent);

      const error: ErrorContext = {
        taskId: '2.1',
        errorMessage: 'Property test "Property 1" failed: counterexample found',
        stackTrace: 'at test.ts:10:5',
        failedTest: 'Property 1: Task parsing completeness',
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'test_failure',
        rootCause: 'Property test "Property 1" failed: counterexample found',
        targetFile: 'design.md',
        confidence: 85,
        context: {
          propertyRef: 'Property 1',
          requirementRef: '1.2',
        },
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan).toBeDefined();
      expect(plan.errorType).toBe('test_failure');
      expect(plan.targetFile).toBe('design.md');
      expect(plan.attemptNumber).toBe(1);
      expect(plan.confidence).toBe(85);
      expect(plan.correction).toContain('Property 1');
      expect(plan.updatedContent).toContain('Property 1');
      expect(plan.updatedContent).toContain('Note');
    });

    it('should generate correction plan for compilation error', async () => {
      // Arrange
      const designContent = `# Design Document

## Components and Interfaces

Some interfaces here.
`;

      await writeFile(join(testSpecPath, 'design.md'), designContent);

      const error: ErrorContext = {
        taskId: '3.2',
        errorMessage: 'TypeScript compilation error: Cannot find name "TaskStatus"',
        stackTrace: 'at task-manager.ts:15:10',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'compilation_error',
        rootCause: 'TypeScript compilation error: Cannot find name "TaskStatus"',
        targetFile: 'design.md',
        confidence: 90,
        context: {},
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan).toBeDefined();
      expect(plan.errorType).toBe('compilation_error');
      expect(plan.targetFile).toBe('design.md');
      expect(plan.correction).toContain('type definitions');
      expect(plan.updatedContent).toContain('Cannot find name "TaskStatus"');
    });

    it('should generate correction plan for runtime error', async () => {
      // Arrange
      const tasksContent = `# Implementation Plan

## Tasks

- [ ] 4.1 Create task manager
  - Implement task state management
`;

      await writeFile(join(testSpecPath, 'tasks.md'), tasksContent);

      const error: ErrorContext = {
        taskId: '4.1',
        errorMessage: 'Runtime TypeError: Cannot read property "id" of undefined',
        stackTrace: 'at task-manager.ts:25:15',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'runtime_error',
        rootCause: 'Attempted to access property "id" of undefined',
        targetFile: 'tasks.md',
        confidence: 80,
        context: {},
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan).toBeDefined();
      expect(plan.errorType).toBe('runtime_error');
      expect(plan.targetFile).toBe('tasks.md');
      expect(plan.correction).toContain('null checks');
      expect(plan.updatedContent).toContain('4.1');
      expect(plan.updatedContent).toContain('Note');
    });

    it('should generate correction plan for missing dependency', async () => {
      // Arrange
      const requirementsContent = `# Requirements Document

## Requirements

### Requirement 1: Parse Specification Files

Some requirements here.
`;

      await writeFile(join(testSpecPath, 'requirements.md'), requirementsContent);

      const error: ErrorContext = {
        taskId: '2.1',
        errorMessage: 'Cannot find module "fast-check"',
        stackTrace: 'at test.ts:1:1',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'missing_dependency',
        rootCause: 'Missing module: "fast-check" is not installed or cannot be found',
        targetFile: 'requirements.md',
        confidence: 95,
        context: {},
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan).toBeDefined();
      expect(plan.errorType).toBe('missing_dependency');
      expect(plan.targetFile).toBe('requirements.md');
      expect(plan.correction).toContain('fast-check');
      expect(plan.updatedContent).toContain('Requirement 2');
    });

    it('should throw error if spec file does not exist', async () => {
      // Arrange
      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Some error',
        stackTrace: 'at test.ts:1:1',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'test_failure',
        rootCause: 'Test failed',
        targetFile: 'design.md',
        confidence: 80,
        context: {},
      };

      // Act & Assert
      await expect(
        generator.generateCorrection(error, analysis, {
          specPath: testSpecPath,
          attemptNumber: 1,
        })
      ).rejects.toThrow('Failed to read spec file');
    });

    it('should include attempt number in correction plan', async () => {
      // Arrange
      const designContent = `# Design Document\n\nSome content.`;
      await writeFile(join(testSpecPath, 'design.md'), designContent);

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:1:1',
        failedTest: 'Some test',
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'test_failure',
        rootCause: 'Test failed',
        targetFile: 'design.md',
        confidence: 80,
        context: {},
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 3,
      });

      // Assert
      expect(plan.attemptNumber).toBe(3);
    });
  });

  describe('surgical updates', () => {
    it('should preserve unrelated content when updating design.md', async () => {
      // Arrange
      const designContent = `# Design Document

## Overview

This is the overview section.

## Correctness Properties

**Property 1: Task parsing**
Some property description.
**Validates: Requirements 1.2**

**Property 2: Status transitions**
Another property description.
**Validates: Requirements 2.1**

## Error Handling

Some error handling notes.
`;

      await writeFile(join(testSpecPath, 'design.md'), designContent);

      const error: ErrorContext = {
        taskId: '2.1',
        errorMessage: 'Property 1 failed',
        stackTrace: 'at test.ts:10:5',
        failedTest: 'Property 1',
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'test_failure',
        rootCause: 'Property test failed',
        targetFile: 'design.md',
        confidence: 85,
        context: {
          propertyRef: 'Property 1',
        },
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan.updatedContent).toContain('## Overview');
      expect(plan.updatedContent).toContain('This is the overview section');
      expect(plan.updatedContent).toContain('Property 2');
      expect(plan.updatedContent).toContain('Another property description');
      expect(plan.updatedContent).toContain('## Error Handling');
    });

    it('should preserve unrelated content when updating tasks.md', async () => {
      // Arrange
      const tasksContent = `# Implementation Plan

## Overview

This is the overview.

## Tasks

- [x] 1. First task
  - This is complete

- [ ] 2. Second task
  - This needs work

- [ ] 3. Third task
  - This is unrelated
`;

      await writeFile(join(testSpecPath, 'tasks.md'), tasksContent);

      const error: ErrorContext = {
        taskId: '2',
        errorMessage: 'Runtime error',
        stackTrace: 'at test.ts:10:5',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'runtime_error',
        rootCause: 'Runtime error occurred',
        targetFile: 'tasks.md',
        confidence: 80,
        context: {},
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan.updatedContent).toContain('## Overview');
      expect(plan.updatedContent).toContain('1. First task');
      expect(plan.updatedContent).toContain('This is complete');
      expect(plan.updatedContent).toContain('3. Third task');
      expect(plan.updatedContent).toContain('This is unrelated');
    });

    it('should preserve unrelated content when updating requirements.md', async () => {
      // Arrange
      const requirementsContent = `# Requirements Document

## Introduction

This is the introduction.

## Glossary

- **Term1**: Definition 1
- **Term2**: Definition 2

## Requirements

### Requirement 1: First requirement

**User Story:** As a user, I want feature 1.

#### Acceptance Criteria

1. Criterion 1
2. Criterion 2

### Requirement 2: Second requirement

**User Story:** As a user, I want feature 2.

#### Acceptance Criteria

1. Criterion A
2. Criterion B
`;

      await writeFile(join(testSpecPath, 'requirements.md'), requirementsContent);

      const error: ErrorContext = {
        taskId: '3.1',
        errorMessage: 'Missing dependency',
        stackTrace: 'at test.ts:1:1',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'missing_dependency',
        rootCause: 'Missing module: "some-module"',
        targetFile: 'requirements.md',
        confidence: 90,
        context: {},
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan.updatedContent).toContain('## Introduction');
      expect(plan.updatedContent).toContain('This is the introduction');
      expect(plan.updatedContent).toContain('## Glossary');
      expect(plan.updatedContent).toContain('Term1');
      expect(plan.updatedContent).toContain('Requirement 1');
      expect(plan.updatedContent).toContain('Requirement 2');
      expect(plan.updatedContent).toContain('Criterion A');
    });
  });

  describe('validation', () => {
    it('should validate that updated content is not empty', async () => {
      // Arrange
      const designContent = `# Design Document\n\nSome content.`;
      await writeFile(join(testSpecPath, 'design.md'), designContent);

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:1:1',
        failedTest: 'Some test',
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'test_failure',
        rootCause: 'Test failed',
        targetFile: 'design.md',
        confidence: 80,
        context: {},
      };

      // Mock the generateUpdatedContent to return empty string
      const originalMethod = generator['generateUpdatedContent'];
      generator['generateUpdatedContent'] = vi.fn().mockResolvedValue('');

      // Act & Assert
      await expect(
        generator.generateCorrection(error, analysis, {
          specPath: testSpecPath,
          attemptNumber: 1,
        })
      ).rejects.toThrow('Updated content is empty');

      // Restore
      generator['generateUpdatedContent'] = originalMethod;
    });

    it('should validate markdown structure for requirements.md', async () => {
      // Arrange
      const requirementsContent = `# Requirements Document

Some content without requirement sections.
`;

      await writeFile(join(testSpecPath, 'requirements.md'), requirementsContent);

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Missing dependency',
        stackTrace: 'at test.ts:1:1',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'missing_dependency',
        rootCause: 'Missing module',
        targetFile: 'requirements.md',
        confidence: 90,
        context: {},
      };

      // Mock generateUpdatedContent to return invalid content
      const originalMethod = generator['generateUpdatedContent'];
      generator['generateUpdatedContent'] = vi
        .fn()
        .mockResolvedValue('# Invalid\n\nNo requirements here.');

      // Act & Assert
      await expect(
        generator.generateCorrection(error, analysis, {
          specPath: testSpecPath,
          attemptNumber: 1,
        })
      ).rejects.toThrow('must contain at least one requirement section');

      // Restore
      generator['generateUpdatedContent'] = originalMethod;
    });

    it('should validate markdown structure for design.md', async () => {
      // Arrange
      const designContent = `# Design Document\n\nSome content.`;
      await writeFile(join(testSpecPath, 'design.md'), designContent);

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:1:1',
        failedTest: 'Some test',
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'test_failure',
        rootCause: 'Test failed',
        targetFile: 'design.md',
        confidence: 80,
        context: {},
      };

      // Mock generateUpdatedContent to return invalid content
      const originalMethod = generator['generateUpdatedContent'];
      generator['generateUpdatedContent'] = vi
        .fn()
        .mockResolvedValue('# Invalid\n\nNo sections here.');

      // Act & Assert
      await expect(
        generator.generateCorrection(error, analysis, {
          specPath: testSpecPath,
          attemptNumber: 1,
        })
      ).rejects.toThrow('must contain at least one major section');

      // Restore
      generator['generateUpdatedContent'] = originalMethod;
    });

    it('should validate markdown structure for tasks.md', async () => {
      // Arrange
      const tasksContent = `# Implementation Plan\n\nSome content.`;
      await writeFile(join(testSpecPath, 'tasks.md'), tasksContent);

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Runtime error',
        stackTrace: 'at test.ts:1:1',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'runtime_error',
        rootCause: 'Runtime error',
        targetFile: 'tasks.md',
        confidence: 80,
        context: {},
      };

      // Mock generateUpdatedContent to return invalid content
      const originalMethod = generator['generateUpdatedContent'];
      generator['generateUpdatedContent'] = vi
        .fn()
        .mockResolvedValue('# Invalid\n\nNo tasks here.');

      // Act & Assert
      await expect(
        generator.generateCorrection(error, analysis, {
          specPath: testSpecPath,
          attemptNumber: 1,
        })
      ).rejects.toThrow('must contain at least one task');

      // Restore
      generator['generateUpdatedContent'] = originalMethod;
    });

    it('should validate requirement references when parsedSpec provided', async () => {
      // Arrange
      const designContent = `# Design Document

## Correctness Properties

**Property 1: Test property**
Some description.
**Validates: Requirements 1.1**
`;

      await writeFile(join(testSpecPath, 'design.md'), designContent);

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Test failed',
        stackTrace: 'at test.ts:1:1',
        failedTest: 'Some test',
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'test_failure',
        rootCause: 'Test failed',
        targetFile: 'design.md',
        confidence: 80,
        context: {},
      };

      const parsedSpec: ParsedSpec = {
        featureName: 'test-feature',
        requirements: [
          {
            id: '1.1',
            userStory: 'As a user...',
            acceptanceCriteria: ['Criterion 1'],
          },
        ],
        properties: [],
        tasks: [],
      };

      // Mock generateUpdatedContent to add invalid reference
      const originalMethod = generator['generateUpdatedContent'];
      generator['generateUpdatedContent'] = vi
        .fn()
        .mockResolvedValue(
          '# Design\n\n## Properties\n\n**Property 1**\nValidates: Requirements 9.9\n'
        );

      // Act & Assert
      await expect(
        generator.generateCorrection(error, analysis, {
          specPath: testSpecPath,
          attemptNumber: 1,
          parsedSpec,
        })
      ).rejects.toThrow('Referenced requirement 9.9 does not exist');

      // Restore
      generator['generateUpdatedContent'] = originalMethod;
    });
  });

  describe('edge cases', () => {
    it('should handle timeout errors', async () => {
      // Arrange
      const tasksContent = `# Implementation Plan\n\n- [ ] 1.1 Some task`;
      await writeFile(join(testSpecPath, 'tasks.md'), tasksContent);

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Operation timed out after 5000ms',
        stackTrace: 'at test.ts:1:1',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'timeout_error',
        rootCause: 'Operation timed out after 5000ms',
        targetFile: 'tasks.md',
        confidence: 85,
        context: {},
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan.correction).toContain('performance optimization');
      expect(plan.correction).toContain('caching');
    });

    it('should handle invalid spec errors', async () => {
      // Arrange
      const designContent = `# Design Document\n\nSome content.`;
      await writeFile(join(testSpecPath, 'design.md'), designContent);

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Invalid specification: malformed markdown',
        stackTrace: 'at parser.ts:1:1',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'invalid_spec',
        rootCause: 'Invalid specification: malformed markdown',
        targetFile: 'design.md',
        confidence: 90,
        context: {},
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan.correction).toContain('specification syntax error');
      expect(plan.correction).toContain('markdown formatting');
    });

    it('should handle unknown error types', async () => {
      // Arrange
      const tasksContent = `# Implementation Plan\n\n- [ ] 1.1 Some task`;
      await writeFile(join(testSpecPath, 'tasks.md'), tasksContent);

      const error: ErrorContext = {
        taskId: '1.1',
        errorMessage: 'Unknown error occurred',
        stackTrace: 'at unknown.ts:1:1',
        failedTest: null,
        timestamp: new Date(),
      };

      const analysis: ErrorAnalysis = {
        errorType: 'unknown_error',
        rootCause: 'Unknown error occurred',
        targetFile: 'tasks.md',
        confidence: 50,
        context: {},
      };

      // Act
      const plan = await generator.generateCorrection(error, analysis, {
        specPath: testSpecPath,
        attemptNumber: 1,
      });

      // Assert
      expect(plan.correction).toContain('clarification');
      expect(plan.errorType).toBe('unknown_error');
    });
  });
});
