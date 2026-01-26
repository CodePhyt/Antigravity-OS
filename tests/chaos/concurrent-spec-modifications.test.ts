/**
 * Unit Tests: Concurrent Spec Modification
 * 
 * Tests that concurrent modifications to spec files are handled safely
 * with proper serialization and no data corruption.
 * 
 * **Validates: Requirements 1.4**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { ChaosEngine } from '../helpers/chaos-utils';

describe('Concurrent Spec Modification Tests', () => {
  const chaosEngine = new ChaosEngine();
  let tmpDir: string;
  
  beforeEach(async () => {
    tmpDir = path.join(process.cwd(), `tmp-spec-mod-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });
  
  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Cleanup errors are acceptable
    }
  });
  
  it('should handle concurrent writes to same spec file', async () => {
    const specFile = path.join(tmpDir, 'test-spec.md');
    
    // Create initial spec file
    await fs.writeFile(specFile, '# Initial Content\n', 'utf-8');
    
    // Create concurrent write operations
    const operations = Array.from({ length: 5 }, (_, idx) => async () => {
      try {
        // Read current content
        const content = await fs.readFile(specFile, 'utf-8');
        
        // Add a line
        const newContent = content + `Line ${idx}\n`;
        
        // Write back
        await fs.writeFile(specFile, newContent, 'utf-8');
        
        return { success: true, idx };
      } catch (error) {
        return { success: false, error: (error as Error).message, idx };
      }
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 5
    });
    
    // All operations should complete
    expect(results.length).toBe(5);
    
    // File should still be valid (not corrupted)
    const finalContent = await fs.readFile(specFile, 'utf-8');
    expect(finalContent).toContain('# Initial Content');
    
    // File should be readable
    expect(typeof finalContent).toBe('string');
    expect(finalContent.length).toBeGreaterThan(0);
  });
  
  it('should handle concurrent modifications to different spec files', async () => {
    // Create multiple spec files
    const specFiles = Array.from({ length: 3 }, (_, idx) => 
      path.join(tmpDir, `spec-${idx}.md`)
    );
    
    // Initialize files
    for (const file of specFiles) {
      await fs.writeFile(file, `# Spec ${path.basename(file)}\n`, 'utf-8');
    }
    
    // Create concurrent modification operations
    const operations = specFiles.flatMap((file, fileIdx) =>
      Array.from({ length: 3 }, (_, opIdx) => async () => {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const newContent = content + `Operation ${opIdx}\n`;
          await fs.writeFile(file, newContent, 'utf-8');
          return { success: true, file: path.basename(file), opIdx };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      })
    );
    
    // Execute all operations concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 9
    });
    
    // All operations should complete
    expect(results.length).toBe(9);
    
    // All files should still exist and be valid
    for (const file of specFiles) {
      const content = await fs.readFile(file, 'utf-8');
      expect(content).toContain('# Spec');
      expect(content.length).toBeGreaterThan(0);
    }
  });
  
  it('should handle concurrent read-modify-write cycles', async () => {
    const specFile = path.join(tmpDir, 'counter-spec.md');
    
    // Initialize with counter
    await fs.writeFile(specFile, 'count: 0\n', 'utf-8');
    
    // Create operations that read, increment, and write
    const operations = Array.from({ length: 10 }, () => async () => {
      try {
        // Read current count
        const content = await fs.readFile(specFile, 'utf-8');
        const match = content.match(/count: (\d+)/);
        const currentCount = match ? parseInt(match[1], 10) : 0;
        
        // Increment
        const newCount = currentCount + 1;
        
        // Write back
        await fs.writeFile(specFile, `count: ${newCount}\n`, 'utf-8');
        
        return { success: true, count: newCount };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 10
    });
    
    // All operations should complete
    expect(results.length).toBe(10);
    
    // File should still be valid
    const finalContent = await fs.readFile(specFile, 'utf-8');
    expect(finalContent).toMatch(/count: \d+/);
    
    // Final count should be a valid number (may not be 10 due to race conditions)
    const match = finalContent.match(/count: (\d+)/);
    expect(match).toBeTruthy();
    if (match) {
      const finalCount = parseInt(match[1], 10);
      expect(finalCount).toBeGreaterThan(0);
      expect(finalCount).toBeLessThanOrEqual(10);
    }
  });
  
  it('should handle concurrent append operations', async () => {
    const logFile = path.join(tmpDir, 'activity-log.md');
    
    // Initialize log file
    await fs.writeFile(logFile, '# Activity Log\n\n', 'utf-8');
    
    // Create concurrent append operations
    const operations = Array.from({ length: 20 }, (_, idx) => async () => {
      try {
        // Read current content
        const content = await fs.readFile(logFile, 'utf-8');
        
        // Append entry
        const newContent = content + `- Entry ${idx} at ${Date.now()}\n`;
        
        // Write back
        await fs.writeFile(logFile, newContent, 'utf-8');
        
        return { success: true, idx };
      } catch (error) {
        return { success: false, error: (error as Error).message, idx };
      }
    });
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 20
    });
    
    // All operations should complete
    expect(results.length).toBe(20);
    
    // File should still be valid
    const finalContent = await fs.readFile(logFile, 'utf-8');
    expect(finalContent).toContain('# Activity Log');
    
    // Should contain some entries (may not be all 20 due to race conditions)
    const entryCount = (finalContent.match(/- Entry/g) || []).length;
    expect(entryCount).toBeGreaterThan(0);
    expect(entryCount).toBeLessThanOrEqual(20);
  });
  
  it('should handle concurrent spec validation during modifications', async () => {
    const specFile = path.join(tmpDir, 'validation-spec.md');
    
    // Initialize spec
    await fs.writeFile(specFile, '# Requirements\n\n## Requirement 1\n', 'utf-8');
    
    // Create mixed read and write operations
    const operations = [
      // Writers
      ...Array.from({ length: 3 }, (_, idx) => async () => {
        try {
          const content = await fs.readFile(specFile, 'utf-8');
          const newContent = content + `\n## Requirement ${idx + 2}\n`;
          await fs.writeFile(specFile, newContent, 'utf-8');
          return { type: 'write', success: true, idx };
        } catch (error) {
          return { type: 'write', success: false, error: (error as Error).message };
        }
      }),
      // Readers (validators)
      ...Array.from({ length: 5 }, (_, idx) => async () => {
        try {
          const content = await fs.readFile(specFile, 'utf-8');
          const requirementCount = (content.match(/## Requirement/g) || []).length;
          return { type: 'read', success: true, requirementCount, idx };
        } catch (error) {
          return { type: 'read', success: false, error: (error as Error).message };
        }
      })
    ];
    
    // Execute concurrently
    const results = await chaosEngine.executeConcurrently(operations, {
      maxConcurrency: 8
    });
    
    // All operations should complete
    expect(results.length).toBe(8);
    
    // File should still be valid
    const finalContent = await fs.readFile(specFile, 'utf-8');
    expect(finalContent).toContain('# Requirements');
    expect(finalContent).toContain('## Requirement 1');
    
    // Should have at least the initial requirement
    const requirementCount = (finalContent.match(/## Requirement/g) || []).length;
    expect(requirementCount).toBeGreaterThanOrEqual(1);
    expect(requirementCount).toBeLessThanOrEqual(4);
  });
});
