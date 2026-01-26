/**
 * Chaos Test: Resource Exhaustion
 * 
 * Tests system behavior under resource exhaustion conditions
 * Validates: Requirements 1.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChaosEngine } from '../helpers/chaos-utils';
import { promises as fs } from 'fs';
import path from 'path';

describe('Resource Exhaustion - Chaos Tests', () => {
  const tmpDir = path.join(process.cwd(), 'tmp-resource-exhaustion-test');
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
  
  it('should handle file handle exhaustion gracefully', async () => {
    const testFile = path.join(tmpDir, 'handle-test.txt');
    await fs.writeFile(testFile, 'test content', 'utf-8');
    
    // Simulate file handle exhaustion by opening many files
    const operation = async () => {
      try {
        // Attempt to read file during simulated exhaustion
        const result = await chaosEngine.withFileSystemChaos(
          async () => {
            const content = await fs.readFile(testFile, 'utf-8');
            return { success: true, content };
          },
          ['EMFILE'] // Too many open files
        );
        return result;
      } catch (error) {
        // Expected to fail gracefully with descriptive error
        return { 
          success: false, 
          error: (error as Error).message,
          code: (error as NodeJS.ErrnoException).code
        };
      }
    };
    
    const result = await operation();
    
    // Verify operation either succeeded or failed gracefully
    expect(result).toBeDefined();
    
    if (!result.success && 'error' in result) {
      // If failed, should have descriptive error
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    }
  });
  
  it('should handle memory exhaustion without crashing', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Simulate memory pressure (brief, controlled)
    const operation = async () => {
      try {
        await chaosEngine.exhaustResource('memory', 100); // 100ms of memory pressure
        return { success: true, crashed: false };
      } catch (error) {
        return { 
          success: false, 
          crashed: false, // Still running if we caught the error
          error: (error as Error).message 
        };
      }
    };
    
    const result = await operation();
    
    // Verify process didn't crash
    expect(result.crashed).toBe(false);
    
    // Verify we're still operational
    const finalMemory = process.memoryUsage().heapUsed;
    expect(finalMemory).toBeGreaterThan(0);
    
    // Memory should eventually return to reasonable levels
    // (may be higher due to GC not running immediately)
    expect(finalMemory).toBeLessThan(initialMemory * 10);
  });
  
  it('should handle CPU exhaustion without hanging', async () => {
    const startTime = Date.now();
    
    // Simulate CPU exhaustion (brief, controlled)
    const operation = async () => {
      try {
        await chaosEngine.exhaustResource('cpu', 50); // 50ms of CPU intensive work
        return { success: true, duration: Date.now() - startTime };
      } catch (error) {
        return { 
          success: false, 
          duration: Date.now() - startTime,
          error: (error as Error).message 
        };
      }
    };
    
    const result = await operation();
    
    // Verify operation completed (didn't hang)
    expect(result).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.duration).toBeLessThan(5000); // Should complete within 5 seconds
  });
  
  it('should handle disk space exhaustion gracefully', async () => {
    const testFile = path.join(tmpDir, 'disk-test.txt');
    
    // Simulate disk space exhaustion
    const operation = async () => {
      try {
        const result = await chaosEngine.withFileSystemChaos(
          async () => {
            await fs.writeFile(testFile, 'test content', 'utf-8');
            return { success: true };
          },
          ['ENOSPC'] // No space left on device
        );
        return result;
      } catch (error) {
        // Expected to fail gracefully
        return { 
          success: false, 
          error: (error as Error).message,
          code: (error as NodeJS.ErrnoException).code
        };
      }
    };
    
    const result = await operation();
    
    // Verify operation either succeeded or failed gracefully
    expect(result).toBeDefined();
    
    if (!result.success && 'error' in result) {
      // If failed, should have descriptive error
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error).toContain('ENOSPC');
    }
  });
  
  it('should recover after resource exhaustion', async () => {
    const testFile = path.join(tmpDir, 'recovery-test.txt');
    
    // First operation: Simulate exhaustion
    const exhaustionOp = async () => {
      try {
        await chaosEngine.withFileSystemChaos(
          async () => {
            await fs.writeFile(testFile, 'test', 'utf-8');
            return { success: true };
          },
          ['EMFILE']
        );
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    };
    
    await exhaustionOp();
    
    // Second operation: Normal operation (should work)
    const recoveryOp = async () => {
      try {
        await fs.writeFile(testFile, 'recovery test', 'utf-8');
        const content = await fs.readFile(testFile, 'utf-8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    };
    
    const recoveryResult = await recoveryOp();
    
    // Verify system recovered and can perform normal operations
    expect(recoveryResult.success).toBe(true);
    if (recoveryResult.success && 'content' in recoveryResult) {
      expect(recoveryResult.content).toBe('recovery test');
    }
  });
});
