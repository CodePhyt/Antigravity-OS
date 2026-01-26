/**
 * PRD Reader Unit Tests
 * 
 * Tests for PRD loading, parsing, and monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import { PRDReaderImpl } from '@/lib/medin-protocol/prd-reader';
import { PRDNotFoundError, PRDInvalidError } from '@/lib/medin-protocol/types';

describe('PRD Reader', () => {
  const testPRDPath = `test-prd-${Date.now()}-${Math.random().toString(36).substring(7)}.tmp.md`;
  let reader: PRDReaderImpl;

  beforeEach(() => {
    reader = new PRDReaderImpl(testPRDPath);
  });

  afterEach(async () => {
    reader.stopWatching();
    try {
      await fs.unlink(testPRDPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('loadPRD', () => {
    it('should load and parse a valid PRD', async () => {
      const prdContent = `---
version: 1.0.0
---

# Product Requirements Document

### Requirement 1: User Authentication

**Priority**: high

Users must be able to authenticate securely.

#### Acceptance Criteria

1. Users can log in with email and password
2. Passwords are hashed using bcrypt
3. Session tokens expire after 24 hours

### Requirement 2: Data Validation

**Priority**: medium

All input data must be validated.

#### Acceptance Criteria

1. Email addresses are validated
2. Phone numbers match E.164 format
`;

      await fs.writeFile(testPRDPath, prdContent);

      const prd = await reader.loadPRD();

      expect(prd.version).toBe('1.0.0');
      expect(prd.requirements).toHaveLength(2);
      
      // Use optional chaining for type safety
      const req0 = prd.requirements[0];
      const req1 = prd.requirements[1];
      
      expect(req0).toBeDefined();
      expect(req1).toBeDefined();
      
      if (req0) {
        expect(req0.id).toBe('REQ-1');
        expect(req0.title).toBe('User Authentication');
        expect(req0.priority).toBe('high');
        expect(req0.acceptanceCriteria).toHaveLength(3);
      }
      
      if (req1) {
        expect(req1.id).toBe('REQ-2');
        expect(req1.priority).toBe('medium');
      }
    });

    it('should throw PRDNotFoundError if file does not exist', async () => {
      await expect(reader.loadPRD()).rejects.toThrow(PRDNotFoundError);
    });

    it('should cache PRD for 5 seconds', async () => {
      const prdContent = `### Requirement 1: Test\n\n**Priority**: low\n\n#### Acceptance Criteria\n\n1. Test criterion`;
      await fs.writeFile(testPRDPath, prdContent);

      const prd1 = await reader.loadPRD();
      const prd2 = await reader.loadPRD();

      expect(prd1).toBe(prd2); // Same object reference (cached)
    });

    it('should parse requirements without version', async () => {
      const prdContent = `### Requirement 1.1: Test Requirement

**Priority**: critical

Test description.

#### Acceptance Criteria

1. Criterion one
2. Criterion two
`;

      await fs.writeFile(testPRDPath, prdContent);

      const prd = await reader.loadPRD();

      expect(prd.version).toBe('1.0.0'); // Default version
      expect(prd.requirements).toHaveLength(1);
      
      const req0 = prd.requirements[0];
      expect(req0).toBeDefined();
      
      if (req0) {
        expect(req0.id).toBe('REQ-1.1');
        expect(req0.priority).toBe('critical');
      }
    });
  });

  describe('getRequirementsForTask', () => {
    beforeEach(async () => {
      const prdContent = `### Requirement 1: User Authentication

**Priority**: high

Implement secure user authentication.

#### Acceptance Criteria

1. Users can log in

### Requirement 2: Data Validation

**Priority**: medium

Validate all input data.

#### Acceptance Criteria

1. Validate emails

### Requirement 3: API Integration

**Priority**: low

Integrate with external APIs.

#### Acceptance Criteria

1. Connect to API
`;

      await fs.writeFile(testPRDPath, prdContent);
      await reader.loadPRD();
    });

    it('should filter requirements by task keywords', () => {
      const requirements = reader.getRequirementsForTask('auth-login-task');

      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements.some((r) => r.id === 'REQ-1')).toBe(true);
    });

    it('should return multiple relevant requirements', () => {
      const requirements = reader.getRequirementsForTask('validation-api-task');

      expect(requirements.length).toBeGreaterThan(0);
    });

    it('should throw error if PRD not loaded', () => {
      const newReader = new PRDReaderImpl(testPRDPath);

      expect(() => newReader.getRequirementsForTask('test')).toThrow(PRDInvalidError);
    });
  });

  describe('reloadPRD', () => {
    it('should reload PRD from disk', async () => {
      const prdContent1 = `### Requirement 1: Test\n\n**Priority**: low\n\n#### Acceptance Criteria\n\n1. Test`;
      await fs.writeFile(testPRDPath, prdContent1);

      const prd1 = await reader.loadPRD();
      expect(prd1.requirements).toHaveLength(1);

      // Update file
      const prdContent2 = `### Requirement 1: Test\n\n**Priority**: low\n\n#### Acceptance Criteria\n\n1. Test\n\n### Requirement 2: New\n\n**Priority**: high\n\n#### Acceptance Criteria\n\n1. New criterion`;
      await fs.writeFile(testPRDPath, prdContent2);

      const prd2 = await reader.reloadPRD();
      expect(prd2.requirements).toHaveLength(2);
    });
  });

  describe('watchPRD', () => {
    it('should detect PRD changes', async () => {
      const prdContent1 = `### Requirement 1: Test\n\n**Priority**: low\n\n#### Acceptance Criteria\n\n1. Test`;
      await fs.writeFile(testPRDPath, prdContent1);
      await reader.loadPRD();

      const changePromise = new Promise((resolve) => {
        reader.watchPRD((diff) => {
          resolve(diff);
        });
      });

      // Wait a bit for watcher to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update file
      const prdContent2 = `### Requirement 1: Test\n\n**Priority**: high\n\n#### Acceptance Criteria\n\n1. Test\n\n### Requirement 2: New\n\n**Priority**: medium\n\n#### Acceptance Criteria\n\n1. New`;
      await fs.writeFile(testPRDPath, prdContent2);

      const diff = await Promise.race([
        changePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
      ]);

      expect(diff).toBeDefined();
    });

    it('should stop watching when stopWatching is called', async () => {
      const prdContent = `### Requirement 1: Test\n\n**Priority**: low\n\n#### Acceptance Criteria\n\n1. Test`;
      await fs.writeFile(testPRDPath, prdContent);
      await reader.loadPRD();

      const callback = vi.fn();
      reader.watchPRD(callback);
      reader.stopWatching();

      // Update file
      await fs.writeFile(testPRDPath, prdContent + '\n\n### Requirement 2: New\n\n**Priority**: high\n\n#### Acceptance Criteria\n\n1. New');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
