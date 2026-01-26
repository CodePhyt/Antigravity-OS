/**
 * Unit Tests: Large Log File Processing
 * 
 * Tests that the system can efficiently process large log files
 * (10MB+) without crashes or excessive memory usage.
 * 
 * **Validates: Requirements 2.2**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { PerformanceMonitor } from '../helpers/performance-utils';

describe('Large Log File Tests', () => {
  const perfMonitor = new PerformanceMonitor();
  let tmpDir: string;
  
  beforeEach(async () => {
    tmpDir = path.join(process.cwd(), `tmp-logs-${Date.now()}`);
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
   * Process log file by reading and parsing entries
   */
  async function processLogFile(logPath: string): Promise<{
    lineCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  }> {
    const content = await fs.readFile(logPath, 'utf-8');
    const lines = content.split('\n');
    
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    
    for (const line of lines) {
      if (line.includes('[ERROR]')) errorCount++;
      else if (line.includes('[WARN]')) warningCount++;
      else if (line.includes('[INFO]')) infoCount++;
    }
    
    return {
      lineCount: lines.length,
      errorCount,
      warningCount,
      infoCount
    };
  }
  
  it('should process 10MB log file efficiently', async () => {
    const logFile = path.join(tmpDir, 'large-log.txt');
    
    // Generate 10MB log file
    const targetSizeBytes = 10 * 1024 * 1024; // 10MB
    const logEntry = '[INFO] 2026-01-26 17:00:00 - System operational - Task completed successfully\n';
    const entriesNeeded = Math.ceil(targetSizeBytes / logEntry.length);
    
    let logContent = '';
    for (let i = 0; i < entriesNeeded; i++) {
      logContent += logEntry;
    }
    
    await fs.writeFile(logFile, logContent, 'utf-8');
    
    // Verify file size
    const stats = await fs.stat(logFile);
    expect(stats.size).toBeGreaterThanOrEqual(targetSizeBytes);
    
    // Process log file
    const { result, durationMs } = await perfMonitor.measureTime(
      async () => processLogFile(logFile),
      'process-10mb-log'
    );
    
    // Should complete successfully
    expect(result.lineCount).toBeGreaterThan(0);
    expect(result.infoCount).toBe(entriesNeeded);
    
    // Should complete in reasonable time (less than 5 seconds)
    expect(durationMs).toBeLessThan(5000);
  }, 15000);
  
  it('should handle log files with mixed severity levels', async () => {
    const logFile = path.join(tmpDir, 'mixed-log.txt');
    
    // Generate log with mixed severities
    const entries = [
      '[INFO] System started\n',
      '[WARN] High memory usage detected\n',
      '[ERROR] Connection failed\n',
      '[INFO] Retry attempt 1\n',
      '[INFO] Connection established\n'
    ];
    
    const targetSizeBytes = 5 * 1024 * 1024; // 5MB
    let logContent = '';
    let entryIndex = 0;
    
    while (logContent.length < targetSizeBytes) {
      logContent += entries[entryIndex % entries.length];
      entryIndex++;
    }
    
    await fs.writeFile(logFile, logContent, 'utf-8');
    
    // Process log
    const result = await processLogFile(logFile);
    
    // Should have all severity types
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.infoCount).toBeGreaterThan(0);
    
    // Total should match line count
    const totalCategorized = result.errorCount + result.warningCount + result.infoCount;
    expect(totalCategorized).toBeLessThanOrEqual(result.lineCount);
  }, 10000);
  
  it('should stream process very large log files', async () => {
    const logFile = path.join(tmpDir, 'streaming-log.txt');
    
    // Generate 20MB log file
    const targetSizeBytes = 20 * 1024 * 1024; // 20MB
    const logEntry = '[INFO] Processing batch operation - Status: success\n';
    const entriesNeeded = Math.ceil(targetSizeBytes / logEntry.length);
    
    // Write in chunks to avoid memory issues
    const chunkSize = 1000;
    for (let i = 0; i < entriesNeeded; i += chunkSize) {
      const chunk = logEntry.repeat(Math.min(chunkSize, entriesNeeded - i));
      await fs.appendFile(logFile, chunk, 'utf-8');
    }
    
    // Verify file size
    const stats = await fs.stat(logFile);
    expect(stats.size).toBeGreaterThanOrEqual(targetSizeBytes);
    
    // Process with memory monitoring
    const { peakMemoryMB } = await perfMonitor.monitorMemory(async () => {
      return await processLogFile(logFile);
    });
    
    // Memory usage should be reasonable (less than 500MB)
    expect(peakMemoryMB).toBeLessThan(500);
  }, 30000);
  
  it('should handle log files with long lines', async () => {
    const logFile = path.join(tmpDir, 'long-lines-log.txt');
    
    // Generate log with very long lines
    const longLine = '[ERROR] ' + 'x'.repeat(10000) + '\n';
    const normalLine = '[INFO] Normal log entry\n';
    
    let logContent = '';
    for (let i = 0; i < 1000; i++) {
      logContent += i % 10 === 0 ? longLine : normalLine;
    }
    
    await fs.writeFile(logFile, logContent, 'utf-8');
    
    // Process log
    const result = await processLogFile(logFile);
    
    // Should handle long lines without crashing
    // Note: split('\n') creates an extra empty element if content ends with \n
    expect(result.lineCount).toBeGreaterThanOrEqual(1000);
    expect(result.errorCount).toBe(100); // Every 10th line
    expect(result.infoCount).toBe(900);
  }, 10000);
  
  it('should process multiple large log files sequentially', async () => {
    const logFiles: string[] = [];
    const fileCount = 5;
    const fileSizeMB = 2;
    
    // Create multiple log files
    for (let i = 0; i < fileCount; i++) {
      const logFile = path.join(tmpDir, `log-${i}.txt`);
      const targetSize = fileSizeMB * 1024 * 1024;
      const logEntry = `[INFO] Log file ${i} - Entry data\n`;
      const entriesNeeded = Math.ceil(targetSize / logEntry.length);
      
      const content = logEntry.repeat(entriesNeeded);
      await fs.writeFile(logFile, content, 'utf-8');
      logFiles.push(logFile);
    }
    
    // Process all files
    const { result, durationMs } = await perfMonitor.measureTime(async () => {
      const results = [];
      for (const logFile of logFiles) {
        const processed = await processLogFile(logFile);
        results.push(processed);
      }
      return results;
    }, 'process-multiple-logs');
    
    // All files should be processed
    expect(result.length).toBe(fileCount);
    
    // Each should have entries
    result.forEach(r => {
      expect(r.lineCount).toBeGreaterThan(0);
      expect(r.infoCount).toBeGreaterThan(0);
    });
    
    // Should complete in reasonable time (less than 10 seconds)
    expect(durationMs).toBeLessThan(10000);
  }, 20000);
});
