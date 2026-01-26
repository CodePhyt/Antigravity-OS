/**
 * Chaos Test: Race Conditions
 * 
 * Tests system behavior when read-write race conditions occur
 * Validates: Requirements 1.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChaosEngine } from '../helpers/chaos-utils';
import { promises as fs } from 'fs';
import path from 'path';

describe('Race Conditions - Chaos Tests', () => {
  const tmpDir = path.join(process.cwd(), 'tmp-race-condition-test');
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
  
  it('should handle read-write race condition without data corruption', async () => {
    const testFile = path.join(tmpDir, 'race-test.txt');
    const initialContent = 'initial-content';
    
    // Create initial file
    await fs.writeFile(testFile, initialContent, 'utf-8');
    
    // Create racing operations
    const operations = [
      // Reader
      async () => {
        await chaosEngine.withRandomDelays(
          async () => {
            const content = await fs.readFile(testFile, 'utf-8');
            return { type: 'read', content };
          },
          5,
          20
        );
      },
      // Writer
      async () => {
        await chaosEngine.withRandomDelays(
          async () => {
            await fs.writeFile(testFile, 'updated-content', 'utf-8');
            return { type: 'write' };
          },
          5,
          20
        );
      }
    ];
    
    // Execute with random delays to expose race condition
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 2
    });
    
    // Verify both operations completed
    expect(results.length).toBe(2);
    
    // Verify file is in valid state (either initial or updated)
    const finalContent = await fs.readFile(testFile, 'utf-8');
    expect(['initial-content', 'updated-content']).toContain(finalContent);
    
    // Verify no corruption (content is one of the expected values)
    expect(finalContent.length).toBeGreaterThan(0);
  });
  
  it('should handle multiple writers racing without corruption', async () => {
    const testFile = path.join(tmpDir, 'multi-writer-race.txt');
    
    // Create initial file
    await fs.writeFile(testFile, 'initial', 'utf-8');
    
    // Create multiple writers
    const writerCount = 5;
    const operations = Array.from({ length: writerCount }, (_, idx) => async () => {
      await chaosEngine.withRandomDelays(
        async () => {
          await fs.writeFile(testFile, `writer-${idx}`, 'utf-8');
          return `writer-${idx}`;
        },
        5,
        30
      );
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: writerCount
    });
    
    // Verify all writers completed
    expect(results.length).toBe(writerCount);
    
    // Verify final content is one of the written values
    const finalContent = await fs.readFile(testFile, 'utf-8');
    const expectedValues = Array.from({ length: writerCount }, (_, idx) => `writer-${idx}`);
    expect(expectedValues).toContain(finalContent);
    
    // Verify no partial writes or corruption
    expect(finalContent).toMatch(/^writer-\d+$/);
  });
  
  it('should handle read-modify-write race condition', async () => {
    const testFile = path.join(tmpDir, 'rmw-race.txt');
    
    // Create initial file with counter
    await fs.writeFile(testFile, '0', 'utf-8');
    
    // Create read-modify-write operations
    const operations = Array.from({ length: 3 }, () => async () => {
      await chaosEngine.withRandomDelays(
        async () => {
          // Read
          const content = await fs.readFile(testFile, 'utf-8');
          const value = parseInt(content, 10);
          
          // Modify
          const newValue = value + 1;
          
          // Write
          await fs.writeFile(testFile, newValue.toString(), 'utf-8');
          
          return newValue;
        },
        5,
        25
      );
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 3
    });
    
    // Verify all operations completed
    expect(results.length).toBe(3);
    
    // Verify final value is a valid number
    const finalContent = await fs.readFile(testFile, 'utf-8');
    const finalValue = parseInt(finalContent, 10);
    
    expect(finalValue).toBeGreaterThanOrEqual(1);
    expect(finalValue).toBeLessThanOrEqual(3);
    expect(Number.isNaN(finalValue)).toBe(false);
  });
  
  it('should handle concurrent append operations', async () => {
    const testFile = path.join(tmpDir, 'append-race.txt');
    
    // Create initial file
    await fs.writeFile(testFile, '', 'utf-8');
    
    // Create append operations
    const appendCount = 5;
    const operations = Array.from({ length: appendCount }, (_, idx) => async () => {
      await chaosEngine.withRandomDelays(
        async () => {
          const current = await fs.readFile(testFile, 'utf-8');
          await fs.writeFile(testFile, current + `line-${idx}\n`, 'utf-8');
          return `line-${idx}`;
        },
        5,
        20
      );
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: appendCount
    });
    
    // Verify all operations completed
    expect(results.length).toBe(appendCount);
    
    // Verify file contains some lines (may not be all due to race condition)
    const finalContent = await fs.readFile(testFile, 'utf-8');
    const lines = finalContent.split('\n').filter(l => l.length > 0);
    
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(appendCount);
    
    // Verify each line has valid format
    lines.forEach(line => {
      expect(line).toMatch(/^line-\d+$/);
    });
  });
});
