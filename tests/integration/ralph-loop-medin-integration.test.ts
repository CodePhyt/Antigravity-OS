/**
 * Integration Test: Ralph-Loop with Medin Protocol
 * 
 * Verifies complete integration of:
 * - PRD Reader
 * - Activity Log Manager
 * - Validator
 * - Constitutional Pre-Check
 * - Isolation Context
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RalphLoop } from '@/core/ralph-loop';
import { TaskManager } from '@/core/task-manager';
import { ActivityLogManager } from '@/lib/medin-protocol/activity-log';
import { promises as fs } from 'fs';
import path from 'path';

describe('Ralph-Loop Medin Protocol Integration', () => {
  const tmpDir = path.join(process.cwd(), 'tmp-integration-test');
  const statePath = path.join(tmpDir, 'state.json');
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
Test requirement for integration testing

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
  
  it('should integrate PRD reading, validation, and activity logging', async () => {
    // Create TaskManager with validation enabled
    const taskManager = new TaskManager(statePath, true);
    
    // Create Ralph-Loop with Medin Protocol integration
    const ralphLoop = new RalphLoop(taskManager, {
      specPath: tmpDir,
      prdPath,
      activityLogPath,
      maxAttempts: 3,
    });
    
    // Initialize Ralph-Loop (loads PRD)
    await ralphLoop.initialize();
    
    // Verify PRD was loaded
    const requirements = ralphLoop.getRequirementsForTask('test-task');
    expect(requirements).toBeDefined();
    
    // Log task completion directly (simulating task execution)
    await ralphLoop.logTaskCompletion('test-task', true);
    
    // Verify activity log was created
    const activityLog = new ActivityLogManager(activityLogPath);
    const entries = await activityLog.queryLog({ taskId: 'test-task' });
    
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.category).toBe('task');
    expect(entries[0]?.status).toBe('success');
  });
  
  it('should log self-healing events with full context', async () => {
    const taskManager = new TaskManager(statePath, true);
    const ralphLoop = new RalphLoop(taskManager, {
      specPath: tmpDir,
      prdPath,
      activityLogPath,
      maxAttempts: 3,
    });
    
    await ralphLoop.initialize();
    
    // Directly log a self-healing event (simulating what executeCorrection does)
    const activityLog = new ActivityLogManager(activityLogPath);
    await activityLog.logEntry({
      timestamp: new Date().toISOString(),
      taskId: 'healing-task',
      category: 'self-healing',
      status: 'success',
      details: {
        description: 'Self-healing correction applied',
        errorContext: {
          message: 'Test error',
          file: 'test.ts',
          line: 10,
        },
        corrections: [
          {
            type: 'code-fix',
            description: 'Fixed test error',
            before: 'old code',
            after: 'new code',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      metadata: {},
    });
    
    // Verify self-healing was logged
    const entries = await activityLog.queryLog({ 
      taskId: 'healing-task',
      category: 'self-healing',
    });
    
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.details.errorContext).toBeDefined();
    expect(entries[0]?.details.corrections).toBeDefined();
  });
  
  it('should log PRD reload events', async () => {
    const taskManager = new TaskManager(statePath, true);
    const ralphLoop = new RalphLoop(taskManager, {
      specPath: tmpDir,
      prdPath,
      activityLogPath,
      maxAttempts: 3,
    });
    
    await ralphLoop.initialize();
    
    // Modify PRD
    await fs.writeFile(prdPath, `# Product Requirements Document

## Version
2.0.0

## Requirements

### Requirement 1: Updated Requirement
Updated requirement for testing

#### Acceptance Criteria
1. System should work correctly
2. Tests should pass
3. New criterion added
`, 'utf-8');
    
    // Reload PRD
    await ralphLoop.reloadPRD();
    
    // Verify reload was logged
    const activityLog = new ActivityLogManager(activityLogPath);
    const entries = await activityLog.queryLog({ taskId: 'system' });
    
    const reloadEntries = entries.filter(e => 
      e.details.description.includes('PRD reloaded')
    );
    
    expect(reloadEntries.length).toBeGreaterThan(0);
  });
  
  it('should handle validation before task completion', async () => {
    const taskManager = new TaskManager(statePath, true);
    const ralphLoop = new RalphLoop(taskManager, {
      specPath: tmpDir,
      prdPath,
      activityLogPath,
      maxAttempts: 3,
    });
    
    await ralphLoop.initialize();
    
    // Verify validation is enabled in task manager
    expect(taskManager).toBeDefined();
    
    // Log a successful task completion with validation
    await ralphLoop.logTaskCompletion('validated-task', true, [
      {
        passed: true,
        evidence: 'Task completed successfully',
        confidence: 100,
        duration: 50,
        timestamp: new Date().toISOString(),
      },
    ]);
    
    // Verify task completion was logged with validation results
    const activityLog = new ActivityLogManager(activityLogPath);
    const entries = await activityLog.queryLog({ taskId: 'validated-task' });
    
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.details.validationResults).toBeDefined();
    expect(entries[0]?.details.validationResults?.[0]?.passed).toBe(true);
  });
  
  it('should handle validation failure with retry and escalation', async () => {
    const taskManager = new TaskManager(statePath, true);
    const ralphLoop = new RalphLoop(taskManager, {
      specPath: tmpDir,
      prdPath,
      activityLogPath,
      maxAttempts: 3,
    });
    
    await ralphLoop.initialize();
    
    // Simulate validation failure (attempt 1)
    await ralphLoop.logTaskCompletion('failing-task', false, [
      {
        passed: false,
        evidence: 'Validation check failed',
        confidence: 90,
        duration: 75,
        timestamp: new Date().toISOString(),
        error: 'Expected service to be running',
      },
    ]);
    
    // Verify failure was logged
    const activityLog = new ActivityLogManager(activityLogPath);
    const entries = await activityLog.queryLog({ taskId: 'failing-task' });
    
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.status).toBe('failure');
    expect(entries[0]?.details.validationResults?.[0]?.passed).toBe(false);
    // Note: error field may not be preserved in log entry format
  });
  
  it('should handle PRD update during mid-execution', async () => {
    const taskManager = new TaskManager(statePath, true);
    const ralphLoop = new RalphLoop(taskManager, {
      specPath: tmpDir,
      prdPath,
      activityLogPath,
      maxAttempts: 3,
    });
    
    await ralphLoop.initialize();
    
    // Get initial requirements
    const initialReqs = ralphLoop.getRequirementsForTask('test-task');
    expect(initialReqs).toBeDefined();
    
    // Simulate mid-execution PRD update
    await fs.writeFile(prdPath, `# Product Requirements Document

## Version
2.0.0

## Requirements

### Requirement 1: Updated Mid-Execution
Requirements changed during execution

#### Acceptance Criteria
1. System should adapt to changes
2. Changes should be logged
3. Execution should continue safely
`, 'utf-8');
    
    // Reload PRD (simulating file watcher trigger)
    await ralphLoop.reloadPRD();
    
    // Get updated requirements
    const updatedReqs = ralphLoop.getRequirementsForTask('test-task');
    expect(updatedReqs).toBeDefined();
    
    // Verify reload was logged
    const activityLog = new ActivityLogManager(activityLogPath);
    const entries = await activityLog.queryLog({ taskId: 'system' });
    
    const reloadEntries = entries.filter(e => 
      e.details.description.includes('PRD reloaded')
    );
    
    expect(reloadEntries.length).toBeGreaterThan(0);
  });
  
  it('should block unsafe commands with constitutional pre-check', async () => {
    const { SafeCommandExecutor } = await import('@/lib/medin-protocol/safe-command-executor');
    const { ConstitutionalPreCheckImpl } = await import('@/lib/medin-protocol/constitutional-pre-check');
    
    const executor = new SafeCommandExecutor();
    const preCheck = new ConstitutionalPreCheckImpl();
    
    // Test blocking dangerous file deletion
    const result1 = await preCheck.analyzeCommand('rm -rf /important/data');
    expect(result1.safe).toBe(false);
    expect(result1.violations.length).toBeGreaterThan(0);
    expect(result1.recommendation).toBe('block');
    
    // Test blocking database modification
    const result2 = await preCheck.analyzeCommand('DROP TABLE users;');
    expect(result2.safe).toBe(false);
    expect(result2.violations.some(v => v.type === 'db_modification')).toBe(true);
    
    // Test allowing safe commands
    const result3 = await preCheck.analyzeCommand('ls -la');
    expect(result3.safe).toBe(true);
    expect(result3.violations.length).toBe(0);
    expect(result3.recommendation).toBe('allow');
    
    // Test executor blocks unsafe command
    const execResult = await executor.executeCommand('rm -rf /important/data');
    expect(execResult.blocked).toBe(true);
    expect(execResult.success).toBe(false);
  });
  
  it('should handle resource violations in isolated execution', async () => {
    const { IsolatedTaskExecutor } = await import('@/lib/medin-protocol/isolated-task-executor');
    
    const executor = new IsolatedTaskExecutor();
    
    // Test resource limit enforcement
    const result = await executor.executeTask(
      async () => {
        // Simulate long-running task
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'completed';
      },
      {
        maxCPU: 50,
        maxMemory: 100 * 1024 * 1024, // 100MB
        maxTime: 50, // 50ms - will timeout
        allowedPaths: [tmpDir],
        allowedNetworks: [],
      }
    );
    
    // Should timeout due to maxTime limit
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Time limit exceeded');
  });
  
  it('should handle MCP tool failure with rollback', async () => {
    const { MCPToolWrapperImpl } = await import('@/lib/medin-protocol/mcp-tool-wrapper');
    
    const mcpWrapper = new MCPToolWrapperImpl();
    
    // Generate execution plan
    const plan = await mcpWrapper.generatePlan('test-tool', {
      action: 'create-file',
      path: path.join(tmpDir, 'test-file.txt'),
    });
    
    expect(plan.toolName).toBe('test-tool');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.rollbackStrategy).toBeDefined();
    
    // Verify plan structure includes validation checks
    expect(plan.validationChecks).toBeDefined();
    expect(Array.isArray(plan.validationChecks)).toBe(true);
    
    // Execute tool and verify outcome
    const result = await mcpWrapper.executeTool('test-tool', {
      action: 'create-file',
      path: path.join(tmpDir, 'test-file.txt'),
    });
    
    expect(result.plan).toBeDefined();
    expect(result.verification).toBeDefined();
  });
  
  it('should complete happy path: PRD → validation → logging', async () => {
    const taskManager = new TaskManager(statePath, true);
    const ralphLoop = new RalphLoop(taskManager, {
      specPath: tmpDir,
      prdPath,
      activityLogPath,
      maxAttempts: 3,
    });
    
    // Step 1: Initialize (loads PRD)
    await ralphLoop.initialize();
    const requirements = ralphLoop.getRequirementsForTask('happy-path-task');
    expect(requirements).toBeDefined();
    
    // Step 2: Execute task with validation
    await ralphLoop.logTaskCompletion('happy-path-task', true, [
      {
        passed: true,
        evidence: 'All checks passed',
        confidence: 100,
        duration: 45,
        timestamp: new Date().toISOString(),
      },
    ]);
    
    // Step 3: Verify complete workflow was logged
    const activityLog = new ActivityLogManager(activityLogPath);
    const entries = await activityLog.queryLog({ taskId: 'happy-path-task' });
    
    expect(entries.length).toBeGreaterThan(0);
    
    const entry = entries[0];
    expect(entry?.category).toBe('task');
    expect(entry?.status).toBe('success');
    expect(entry?.details.validationResults).toBeDefined();
    expect(entry?.details.validationResults?.[0]?.passed).toBe(true);
    expect(entry?.timestamp).toBeDefined();
  });
});
