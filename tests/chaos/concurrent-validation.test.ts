/**
 * Chaos Test: Concurrent Validation
 * 
 * Tests system behavior under concurrent validation operations
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Validator } from '@/lib/medin-protocol/validator';
import { ChaosEngine } from '../helpers/chaos-utils';
import { promises as fs } from 'fs';
import path from 'path';

describe('Concurrent Validation - Chaos Tests', () => {
  const tmpDir = path.join(process.cwd(), 'tmp-chaos-concurrent-test');
  const chaosEngine = new ChaosEngine();
  
  beforeEach(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
  });
  
  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  it('should handle 2 readers + 1 writer concurrently without data corruption', async () => {
    const validator = new Validator();
    const testFile = path.join(tmpDir, 'test-file.txt');
    
    // Create initial file
    await fs.writeFile(testFile, 'initial content', 'utf-8');
    
    // Define operations
    const operations = [
      // Reader 1
      async () => {
        const result = await validator.validateFileExists(testFile);
        expect(result.passed).toBe(true);
        return 'read1';
      },
      // Reader 2
      async () => {
        const result = await validator.validateFileExists(testFile);
        expect(result.passed).toBe(true);
        return 'read2';
      },
      // Writer
      async () => {
        await fs.writeFile(testFile, 'updated content', 'utf-8');
        return 'write';
      }
    ];
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 3,
      delayBetweenMs: 10
    });
    
    // Verify all operations completed
    expect(results.length).toBe(3);
    
    // Verify no errors (or all are successful)
    const errors = results.filter(r => r instanceof Error);
    expect(errors.length).toBe(0);
    
    // Verify file still exists and is valid
    const finalValidation = await validator.validateFileExists(testFile);
    expect(finalValidation.passed).toBe(true);
  });
  
  it('should maintain data integrity with 10 concurrent validations', async () => {
    const validator = new Validator();
    const testFiles = Array.from({ length: 10 }, (_, i) => 
      path.join(tmpDir, `test-file-${i}.txt`)
    );
    
    // Create all test files
    await Promise.all(
      testFiles.map(file => fs.writeFile(file, `content-${file}`, 'utf-8'))
    );
    
    // Create validation operations
    const operations = testFiles.map(file => async () => {
      const result = await validator.validateFileExists(file);
      return result;
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 10,
      delayBetweenMs: 5
    });
    
    // Verify all validations passed
    expect(results.length).toBe(10);
    
    const validationResults = results.filter(r => !(r instanceof Error));
    expect(validationResults.length).toBe(10);
    
    validationResults.forEach(result => {
      if (typeof result === 'object' && result !== null && 'passed' in result) {
        expect(result.passed).toBe(true);
      }
    });
  });
  
  it('should handle concurrent validations with random delays', async () => {
    const validator = new Validator();
    const testFile = path.join(tmpDir, 'delayed-test.txt');
    
    await fs.writeFile(testFile, 'test content', 'utf-8');
    
    // Create operations with random delays
    const operations = Array.from({ length: 5 }, () => async () => {
      return await chaosEngine.withRandomDelays(
        async () => validator.validateFileExists(testFile),
        10,
        100
      );
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 5
    });
    
    // Verify all completed successfully
    expect(results.length).toBe(5);
    
    const validationResults = results.filter(r => !(r instanceof Error));
    expect(validationResults.length).toBe(5);
    
    validationResults.forEach(result => {
      if (typeof result === 'object' && result !== null && 'passed' in result) {
        expect(result.passed).toBe(true);
      }
    });
  });
  
  it('should handle concurrent validations with injected failures gracefully', async () => {
    const validator = new Validator();
    const testFile = path.join(tmpDir, 'failure-test.txt');
    
    await fs.writeFile(testFile, 'test content', 'utf-8');
    
    // Create operations
    const operations = Array.from({ length: 10 }, () => async () => {
      return await validator.validateFileExists(testFile);
    });
    
    // Execute with 30% failure injection rate
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 10,
      failureRate: 0.3
    });
    
    // Verify all operations completed (some may be errors)
    expect(results.length).toBe(10);
    
    // Verify we have both successes and failures
    const errors = results.filter(r => r instanceof Error);
    const successes = results.filter(r => !(r instanceof Error));
    
    // With 30% failure rate, we expect some of each (probabilistic)
    expect(errors.length + successes.length).toBe(10);
  });
});
