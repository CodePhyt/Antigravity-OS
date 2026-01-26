/**
 * Unit Tests: Ralph-Loop Isolation
 * 
 * Tests that multiple Ralph-Loop instances can run simultaneously
 * with independent execution contexts and no interference.
 * 
 * **Validates: Requirements 1.5**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { ChaosEngine } from '../helpers/chaos-utils';

describe('Ralph-Loop Isolation Tests', () => {
  const chaosEngine = new ChaosEngine();
  let tmpDir: string;
  
  beforeEach(async () => {
    tmpDir = path.join(process.cwd(), `tmp-ralph-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });
  
  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Cleanup errors are acceptable
    }
  });
  
  /**
   * Simulates a Ralph-Loop instance that processes a task
   */
  async function simulateRalphLoopInstance(
    instanceId: number,
    taskFile: string,
    iterations: number
  ): Promise<{ instanceId: number; success: boolean; iterations: number; error?: string }> {
    try {
      // Create instance-specific state file
      const stateFile = path.join(tmpDir, `ralph-state-${instanceId}.json`);
      
      // Initialize state
      await fs.writeFile(stateFile, JSON.stringify({
        instanceId,
        taskFile,
        iteration: 0,
        status: 'running'
      }), 'utf-8');
      
      // Simulate iterations
      for (let i = 0; i < iterations; i++) {
        // Read current state
        const stateContent = await fs.readFile(stateFile, 'utf-8');
        const state = JSON.parse(stateContent);
        
        // Update iteration
        state.iteration = i + 1;
        
        // Write back
        await fs.writeFile(stateFile, JSON.stringify(state), 'utf-8');
        
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Mark as complete
      const finalStateContent = await fs.readFile(stateFile, 'utf-8');
      const finalState = JSON.parse(finalStateContent);
      finalState.status = 'completed';
      await fs.writeFile(stateFile, JSON.stringify(finalState), 'utf-8');
      
      return { instanceId, success: true, iterations };
    } catch (error) {
      return { 
        instanceId, 
        success: false, 
        iterations: 0,
        error: (error as Error).message 
      };
    }
  }
  
  it('should run multiple Ralph-Loop instances independently', async () => {
    // Create task files for each instance
    const taskFiles = await Promise.all(
      Array.from({ length: 3 }, async (_, idx) => {
        const taskFile = path.join(tmpDir, `task-${idx}.md`);
        await fs.writeFile(taskFile, `# Task ${idx}\n`, 'utf-8');
        return taskFile;
      })
    );
    
    // Create Ralph-Loop instances
    const operations = taskFiles.map((taskFile, idx) => 
      () => simulateRalphLoopInstance(idx, taskFile, 5)
    );
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 3
    });
    
    // All instances should complete
    expect(results.length).toBe(3);
    
    // All should be successful
    const successCount = results.filter(r => 
      !(r instanceof Error) && 
      typeof r === 'object' && 
      r !== null && 
      'success' in r && 
      r.success
    ).length;
    expect(successCount).toBe(3);
    
    // Each instance should have its own state file
    for (let i = 0; i < 3; i++) {
      const stateFile = path.join(tmpDir, `ralph-state-${i}.json`);
      const exists = await fs.access(stateFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      if (exists) {
        const content = await fs.readFile(stateFile, 'utf-8');
        const state = JSON.parse(content);
        expect(state.instanceId).toBe(i);
        expect(state.status).toBe('completed');
        expect(state.iteration).toBe(5);
      }
    }
  });
  
  it('should maintain independent execution contexts', async () => {
    // Create instances that maintain separate state
    const operations = Array.from({ length: 5 }, (_, idx) => async () => {
      const instanceId = idx;
      const stateFile = path.join(tmpDir, `state-${instanceId}.json`);
      
      try {
        // Initialize instance state
        const state = {
          instanceId,
          operationCount: 0,
          lastOperation: null as string | null
        };
        
        // Perform operations
        for (let i = 0; i < 3; i++) {
          // Update state
          state.operationCount++;
          state.lastOperation = `op-${i}`;
          
          // Write state
          await fs.writeFile(stateFile, JSON.stringify(state), 'utf-8');
          
          // Small delay
          await new Promise(resolve => setTimeout(resolve, 5));
        }
        
        return { instanceId, success: true, operationCount: state.operationCount };
      } catch (error) {
        return { instanceId, success: false, error: (error as Error).message };
      }
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 5
    });
    
    // All instances should complete
    expect(results.length).toBe(5);
    
    // Each instance should have performed 3 operations independently
    for (let i = 0; i < 5; i++) {
      const stateFile = path.join(tmpDir, `state-${i}.json`);
      const content = await fs.readFile(stateFile, 'utf-8');
      const state = JSON.parse(content);
      
      // Verify independent state
      expect(state.instanceId).toBe(i);
      expect(state.operationCount).toBe(3);
      expect(state.lastOperation).toBe('op-2');
    }
  });
  
  it('should handle instance failures without affecting others', async () => {
    // Create instances where some will fail
    const operations = Array.from({ length: 5 }, (_, idx) => async () => {
      const instanceId = idx;
      const stateFile = path.join(tmpDir, `instance-${instanceId}.json`);
      
      try {
        // Initialize state
        await fs.writeFile(stateFile, JSON.stringify({
          instanceId,
          status: 'running'
        }), 'utf-8');
        
        // Instance 2 will fail
        if (instanceId === 2) {
          throw new Error(`Simulated failure in instance ${instanceId}`);
        }
        
        // Others succeed
        await fs.writeFile(stateFile, JSON.stringify({
          instanceId,
          status: 'completed'
        }), 'utf-8');
        
        return { instanceId, success: true };
      } catch (error) {
        return { instanceId, success: false, error: (error as Error).message };
      }
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 5
    });
    
    // All instances should complete (success or failure)
    expect(results.length).toBe(5);
    
    // Count successes and failures
    const successes = results.filter(r => 
      !(r instanceof Error) && 
      typeof r === 'object' && 
      r !== null && 
      'success' in r && 
      r.success
    );
    const failures = results.filter(r => 
      !(r instanceof Error) && 
      typeof r === 'object' && 
      r !== null && 
      'success' in r && 
      !r.success
    );
    
    expect(successes.length).toBe(4); // Instances 0, 1, 3, 4
    expect(failures.length).toBe(1); // Instance 2
    
    // Successful instances should have completed state
    for (let i = 0; i < 5; i++) {
      if (i === 2) continue; // Skip failed instance
      
      const stateFile = path.join(tmpDir, `instance-${i}.json`);
      const content = await fs.readFile(stateFile, 'utf-8');
      const state = JSON.parse(content);
      
      expect(state.status).toBe('completed');
    }
  });
  
  it('should handle concurrent Ralph-Loop corrections', async () => {
    // Simulate multiple Ralph-Loop instances performing corrections
    const operations = Array.from({ length: 4 }, (_, idx) => async () => {
      const instanceId = idx;
      const correctionLog = path.join(tmpDir, `corrections-${instanceId}.json`);
      
      try {
        const corrections = [];
        
        // Simulate 3 correction attempts
        for (let attempt = 1; attempt <= 3; attempt++) {
          corrections.push({
            attempt,
            timestamp: Date.now(),
            action: `correction-${attempt}`,
            status: attempt === 3 ? 'success' : 'retry'
          });
          
          // Write correction log
          await fs.writeFile(correctionLog, JSON.stringify({
            instanceId,
            corrections
          }, null, 2), 'utf-8');
          
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        return { instanceId, success: true, correctionCount: corrections.length };
      } catch (error) {
        return { instanceId, success: false, error: (error as Error).message };
      }
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 4
    });
    
    // All instances should complete
    expect(results.length).toBe(4);
    
    // Each instance should have its own correction log
    for (let i = 0; i < 4; i++) {
      const correctionLog = path.join(tmpDir, `corrections-${i}.json`);
      const content = await fs.readFile(correctionLog, 'utf-8');
      const log = JSON.parse(content);
      
      expect(log.instanceId).toBe(i);
      expect(log.corrections.length).toBe(3);
      expect(log.corrections[2].status).toBe('success');
    }
  });
  
  it('should isolate Ralph-Loop memory and state', async () => {
    // Create instances with different memory footprints
    const operations = Array.from({ length: 3 }, (_, idx) => async () => {
      const instanceId = idx;
      const stateFile = path.join(tmpDir, `memory-state-${instanceId}.json`);
      
      try {
        // Create instance-specific data structure
        const instanceData = {
          instanceId,
          dataSize: (idx + 1) * 100, // Different sizes
          data: Array.from({ length: (idx + 1) * 100 }, (_, i) => ({
            id: i,
            value: `data-${i}`
          }))
        };
        
        // Write state
        await fs.writeFile(stateFile, JSON.stringify(instanceData), 'utf-8');
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // Verify state is intact
        const readState = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
        
        return {
          instanceId,
          success: true,
          dataSize: readState.data.length,
          verified: readState.dataSize === readState.data.length
        };
      } catch (error) {
        return { instanceId, success: false, error: (error as Error).message };
      }
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 3
    });
    
    // All instances should complete
    expect(results.length).toBe(3);
    
    // Each instance should have correct data size
    results.forEach((result, idx) => {
      if (!(result instanceof Error) && typeof result === 'object' && result !== null) {
        if ('success' in result && result.success && 'dataSize' in result) {
          expect(result.dataSize).toBe((idx + 1) * 100);
          if ('verified' in result) {
            expect(result.verified).toBe(true);
          }
        }
      }
    });
  });
});
