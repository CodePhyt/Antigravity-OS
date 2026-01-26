/**
 * Schema Validator Unit Tests
 * 
 * Tests for JSON schema validation
 */

import { describe, it, expect } from 'vitest';
import {
  validatePRDDocument,
  validateActivityLogEntry,
  validateValidationResultStructure,
  SchemaValidationError,
  formatValidationErrors,
} from '@/lib/medin-protocol/schema-validator';

describe('Schema Validator', () => {
  describe('validatePRDDocument', () => {
    it('should validate a valid PRD document', () => {
      const validPRD = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        requirements: [
          {
            id: 'REQ-1.1',
            title: 'Test Requirement',
            description: 'This is a test requirement',
            acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
            priority: 'high',
          },
        ],
        metadata: {},
      };

      expect(() => validatePRDDocument(validPRD)).not.toThrow();
    });

    it('should reject PRD with missing version', () => {
      const invalidPRD = {
        lastUpdated: new Date().toISOString(),
        requirements: [],
      };

      expect(() => validatePRDDocument(invalidPRD)).toThrow(SchemaValidationError);
    });

    it('should reject PRD with invalid version format', () => {
      const invalidPRD = {
        version: 'invalid',
        lastUpdated: new Date().toISOString(),
        requirements: [],
      };

      expect(() => validatePRDDocument(invalidPRD)).toThrow(SchemaValidationError);
    });

    it('should reject PRD with invalid priority', () => {
      const invalidPRD = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        requirements: [
          {
            id: 'REQ-1.1',
            title: 'Test',
            description: 'Test',
            acceptanceCriteria: ['Test'],
            priority: 'invalid',
          },
        ],
      };

      expect(() => validatePRDDocument(invalidPRD)).toThrow(SchemaValidationError);
    });
  });

  describe('validateActivityLogEntry', () => {
    it('should validate a valid activity log entry', () => {
      const validEntry = {
        timestamp: new Date().toISOString(),
        taskId: 'task-1',
        category: 'task',
        status: 'success',
        details: {
          description: 'Task completed successfully',
        },
        metadata: {},
      };

      expect(() => validateActivityLogEntry(validEntry)).not.toThrow();
    });

    it('should validate entry with validation results', () => {
      const validEntry = {
        timestamp: new Date().toISOString(),
        taskId: 'task-1',
        category: 'validation',
        status: 'success',
        details: {
          description: 'Validation passed',
          validationResults: [
            {
              passed: true,
              evidence: 'File exists',
              confidence: 100,
              duration: 50,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        metadata: {},
      };

      expect(() => validateActivityLogEntry(validEntry)).not.toThrow();
    });

    it('should reject entry with invalid category', () => {
      const invalidEntry = {
        timestamp: new Date().toISOString(),
        taskId: 'task-1',
        category: 'invalid',
        status: 'success',
        details: {
          description: 'Test',
        },
      };

      expect(() => validateActivityLogEntry(invalidEntry)).toThrow(SchemaValidationError);
    });

    it('should reject entry with missing description', () => {
      const invalidEntry = {
        timestamp: new Date().toISOString(),
        taskId: 'task-1',
        category: 'task',
        status: 'success',
        details: {},
      };

      expect(() => validateActivityLogEntry(invalidEntry)).toThrow(SchemaValidationError);
    });
  });

  describe('validateValidationResultStructure', () => {
    it('should validate a valid validation result', () => {
      const validResult = {
        passed: true,
        evidence: 'Test passed',
        confidence: 95,
        duration: 100,
        timestamp: new Date().toISOString(),
      };

      expect(() => validateValidationResultStructure(validResult)).not.toThrow();
    });

    it('should validate result with error', () => {
      const validResult = {
        passed: false,
        evidence: 'Test failed',
        confidence: 80,
        duration: 150,
        timestamp: new Date().toISOString(),
        error: 'Validation error occurred',
      };

      expect(() => validateValidationResultStructure(validResult)).not.toThrow();
    });

    it('should reject result with invalid confidence', () => {
      const invalidResult = {
        passed: true,
        evidence: 'Test',
        confidence: 150, // Out of range
        duration: 100,
        timestamp: new Date().toISOString(),
      };

      expect(() => validateValidationResultStructure(invalidResult)).toThrow(
        SchemaValidationError
      );
    });

    it('should reject result with negative duration', () => {
      const invalidResult = {
        passed: true,
        evidence: 'Test',
        confidence: 95,
        duration: -10,
        timestamp: new Date().toISOString(),
      };

      expect(() => validateValidationResultStructure(invalidResult)).toThrow(
        SchemaValidationError
      );
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors', () => {
      const errors = [
        { instancePath: '/version', message: 'must match pattern' },
        { instancePath: '/requirements', message: 'must be array' },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('/version');
      expect(formatted).toContain('must match pattern');
      expect(formatted).toContain('/requirements');
      expect(formatted).toContain('must be array');
    });

    it('should handle empty errors array', () => {
      const formatted = formatValidationErrors([]);
      expect(formatted).toBe('');
    });

    it('should handle non-array input', () => {
      const formatted = formatValidationErrors('not an array' as any);
      expect(formatted).toBe('Unknown validation error');
    });
  });
});
