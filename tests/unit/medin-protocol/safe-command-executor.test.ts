/**
 * Unit Tests for Safe Command Executor
 * 
 * Tests command execution with Constitutional Pre-Check integration
 */

import { describe, it, expect } from 'vitest';
import { SafeCommandExecutor } from '@/lib/medin-protocol/safe-command-executor';

describe('Safe Command Executor - Unit Tests', () => {
  describe('executeCommand', () => {
    it('should execute safe commands without blocking', async () => {
      const executor = new SafeCommandExecutor();
      
      // Safe command: echo
      const result = await executor.executeCommand('echo "Hello World"');
      
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.approvalRequested).toBe(false);
      expect(result.safetyAnalysis.safe).toBe(true);
      expect(result.safetyAnalysis.recommendation).toBe('allow');
    });

    it('should block dangerous commands without approval callback', async () => {
      const executor = new SafeCommandExecutor();
      
      // Dangerous command: rm -rf
      const result = await executor.executeCommand('rm -rf /important/data');
      
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.approvalRequested).toBe(false);
      expect(result.safetyAnalysis.safe).toBe(false);
      expect(result.safetyAnalysis.recommendation).toBe('block');
      expect(result.safetyAnalysis.violations.length).toBeGreaterThan(0);
      expect(result.error).toContain('blocked');
    });

    it('should request approval for blocked commands when callback provided', async () => {
      const executor = new SafeCommandExecutor();
      let approvalRequested = false;
      
      // Approval callback that denies
      const approvalCallback = async () => {
        approvalRequested = true;
        return false;
      };
      
      const result = await executor.executeCommand('rm -rf /data', { approvalCallback });
      
      expect(approvalRequested).toBe(true);
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.approvalRequested).toBe(true);
    });

    it('should execute blocked commands when approved', async () => {
      const executor = new SafeCommandExecutor();
      
      // Approval callback that approves
      const approvalCallback = async () => true;
      
      // Use a safe command that looks dangerous for testing
      const result = await executor.executeCommand('echo "rm -rf test"', { approvalCallback });
      
      // Command should execute (even though it triggered pre-check)
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('should warn for medium-risk commands', async () => {
      const executor = new SafeCommandExecutor();
      
      // Medium-risk command: binding to wildcard (use echo to simulate)
      const result = await executor.executeCommand('echo "server running on *:3000"');
      
      // Should execute with warning
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.safetyAnalysis.recommendation).toBe('warn');
      expect(result.safetyAnalysis.riskLevel).toBe('medium');
    });

    it('should skip pre-check when explicitly requested', async () => {
      const executor = new SafeCommandExecutor();
      
      // Dangerous command with skipPreCheck
      const result = await executor.executeCommand('echo "dangerous"', { skipPreCheck: true });
      
      expect(result.success).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.safetyAnalysis.safe).toBe(true); // No analysis performed
    });

    it('should handle command execution errors', async () => {
      const executor = new SafeCommandExecutor();
      
      // Command that will fail
      const result = await executor.executeCommand('nonexistent-command-xyz');
      
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.error).toBeDefined();
    });

    it('should pass through execution options', async () => {
      const executor = new SafeCommandExecutor();
      
      // Command with custom options
      const result = await executor.executeCommand('echo "test"', {
        timeout: 5000,
        env: { TEST_VAR: 'value' },
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('safety analysis integration', () => {
    it('should include safety analysis in result', async () => {
      const executor = new SafeCommandExecutor();
      
      const result = await executor.executeCommand('echo "safe"');
      
      expect(result.safetyAnalysis).toBeDefined();
      expect(result.safetyAnalysis.safe).toBeDefined();
      expect(result.safetyAnalysis.violations).toBeDefined();
      expect(result.safetyAnalysis.riskLevel).toBeDefined();
      expect(result.safetyAnalysis.recommendation).toBeDefined();
    });

    it('should detect multiple violations', async () => {
      const executor = new SafeCommandExecutor();
      
      // Command with multiple violations
      const result = await executor.executeCommand('rm -rf /data && DROP TABLE users;');
      
      expect(result.safetyAnalysis.violations.length).toBeGreaterThan(1);
      expect(result.blocked).toBe(true);
    });

    it('should provide alternative suggestions for blocked commands', async () => {
      const executor = new SafeCommandExecutor();
      
      const result = await executor.executeCommand('rm -rf /data');
      
      expect(result.safetyAnalysis.alternative).toBeDefined();
      expect(result.error).toContain('alternative');
    });
  });
});
