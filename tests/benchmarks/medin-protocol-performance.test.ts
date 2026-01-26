/**
 * Performance Benchmarks: Medin Protocol
 * 
 * Validates performance requirements:
 * - Requirement 10.1: Validation latency <100ms for 95% of cases
 * - Requirement 10.2: PRD reload time <50ms
 * - Activity log write <10ms
 * - Constitutional pre-check <5ms
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Validator } from '@/lib/medin-protocol/validator';
import { PRDReaderImpl } from '@/lib/medin-protocol/prd-reader';
import { ActivityLogManager } from '@/lib/medin-protocol/activity-log';
import { ConstitutionalPreCheckImpl } from '@/lib/medin-protocol/constitutional-pre-check';
import { promises as fs } from 'fs';
import path from 'path';

describe('Medin Protocol Performance Benchmarks', () => {
  const tmpDir = path.join(process.cwd(), 'tmp-benchmark-test');
  const prdPath = path.join(tmpDir, 'PRD.md');
  const activityLogPath = path.join(tmpDir, 'ACTIVITY_LOG.md');
  
  beforeEach(async () => {
    // Create temp directory
    await fs.mkdir(tmpDir, { recursive: true });
    
    // Create minimal PRD
    await fs.writeFile(prdPath, `# Product Requirements Document

## Version
1.0.0

## Requirements

### Requirement 1: Test Requirement
Test requirement for benchmarking

#### Acceptance Criteria
1. System should work correctly
2. Tests should pass
`, 'utf-8');
  });
  
  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
  
  it('Benchmark: Validation latency <100ms for 95% of cases (Requirement 10.1)', async () => {
    const validator = new Validator();
    const iterations = 100;
    const durations: number[] = [];
    
    // Run 100 validation checks
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Test file validation (fast check)
      await validator.validateFileExists(prdPath);
      
      const duration = Date.now() - startTime;
      durations.push(duration);
    }
    
    // Sort durations
    durations.sort((a, b) => a - b);
    
    // Calculate 95th percentile
    const p95Index = Math.floor(iterations * 0.95);
    const p95Duration = durations[p95Index] || 0;
    
    // Calculate statistics
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    console.log('\n📊 Validation Performance:');
    console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min: ${minDuration}ms`);
    console.log(`  Max: ${maxDuration}ms`);
    console.log(`  95th Percentile: ${p95Duration}ms`);
    console.log(`  Target: <100ms`);
    console.log(`  Status: ${p95Duration < 100 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Verify 95th percentile is under 100ms
    expect(p95Duration).toBeLessThan(100);
  });
  
  it('Benchmark: PRD reload time <50ms (Requirement 10.2)', async () => {
    const prdReader = new PRDReaderImpl(prdPath);
    const iterations = 100;
    const durations: number[] = [];
    
    // Initial load
    await prdReader.loadPRD();
    
    // Run 100 reload operations
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      await prdReader.reloadPRD();
      
      const duration = Date.now() - startTime;
      durations.push(duration);
    }
    
    // Calculate statistics
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    console.log('\n📊 PRD Reload Performance:');
    console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min: ${minDuration}ms`);
    console.log(`  Max: ${maxDuration}ms`);
    console.log(`  Target: <50ms`);
    console.log(`  Status: ${avgDuration < 50 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Verify average reload time is under 50ms
    expect(avgDuration).toBeLessThan(50);
  });
  
  it('Benchmark: Activity log write <10ms', async () => {
    const activityLog = new ActivityLogManager(activityLogPath);
    const iterations = 100;
    const durations: number[] = [];
    
    // Run 100 log write operations
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      await activityLog.logEntry({
        timestamp: new Date().toISOString(),
        taskId: `benchmark-task-${i}`,
        category: 'task',
        status: 'success',
        details: {
          description: 'Benchmark test entry',
        },
        metadata: {},
      });
      
      const duration = Date.now() - startTime;
      durations.push(duration);
    }
    
    // Calculate statistics
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    console.log('\n📊 Activity Log Write Performance:');
    console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min: ${minDuration}ms`);
    console.log(`  Max: ${maxDuration}ms`);
    console.log(`  Target: <10ms`);
    console.log(`  Status: ${avgDuration < 10 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Verify average write time is under 10ms
    expect(avgDuration).toBeLessThan(10);
  });
  
  it('Benchmark: Constitutional pre-check <5ms', async () => {
    const preCheck = new ConstitutionalPreCheckImpl();
    const iterations = 100;
    const durations: number[] = [];
    
    const testCommands = [
      'ls -la',
      'npm test',
      'git status',
      'echo "hello"',
      'cat file.txt',
    ];
    
    // Run 100 pre-check operations
    for (let i = 0; i < iterations; i++) {
      const command = testCommands[i % testCommands.length];
      const startTime = Date.now();
      
      await preCheck.analyzeCommand(command || 'ls');
      
      const duration = Date.now() - startTime;
      durations.push(duration);
    }
    
    // Calculate statistics
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    console.log('\n📊 Constitutional Pre-Check Performance:');
    console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min: ${minDuration}ms`);
    console.log(`  Max: ${maxDuration}ms`);
    console.log(`  Target: <5ms`);
    console.log(`  Status: ${avgDuration < 5 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Verify average pre-check time is under 5ms
    expect(avgDuration).toBeLessThan(5);
  });
  
  it('Benchmark: End-to-end workflow performance', async () => {
    const validator = new Validator();
    const prdReader = new PRDReaderImpl(prdPath);
    const activityLog = new ActivityLogManager(activityLogPath);
    const preCheck = new ConstitutionalPreCheckImpl();
    
    const iterations = 50;
    const durations: number[] = [];
    
    // Run 50 complete workflow iterations
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Step 1: Load PRD
      await prdReader.loadPRD();
      
      // Step 2: Constitutional pre-check
      await preCheck.analyzeCommand('npm test');
      
      // Step 3: Validation
      await validator.validateFileExists(prdPath);
      
      // Step 4: Log activity
      await activityLog.logEntry({
        timestamp: new Date().toISOString(),
        taskId: `workflow-${i}`,
        category: 'task',
        status: 'success',
        details: {
          description: 'End-to-end workflow test',
        },
        metadata: {},
      });
      
      const duration = Date.now() - startTime;
      durations.push(duration);
    }
    
    // Calculate statistics
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / iterations;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    console.log('\n📊 End-to-End Workflow Performance:');
    console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Min: ${minDuration}ms`);
    console.log(`  Max: ${maxDuration}ms`);
    console.log(`  Target: <150ms (combined)`);
    console.log(`  Status: ${avgDuration < 150 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Verify average workflow time is reasonable
    expect(avgDuration).toBeLessThan(150);
  });
});
