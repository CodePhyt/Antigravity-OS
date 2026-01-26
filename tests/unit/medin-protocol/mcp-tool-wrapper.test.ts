/**
 * MCP Tool Wrapper Unit Tests
 * 
 * Tests for Plan-Execute-Verify cycle
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMCPToolWrapper } from '@/lib/medin-protocol/mcp-tool-wrapper';

describe('MCP Tool Wrapper - Unit Tests', () => {
  let wrapper: ReturnType<typeof createMCPToolWrapper>;

  beforeEach(() => {
    wrapper = createMCPToolWrapper();
  });

  describe('Plan Generation', () => {
    it('should generate execution plan for file tool', async () => {
      const plan = await wrapper.generatePlan('file-reader', { path: '/tmp/test.txt' });

      expect(plan.toolName).toBe('file-reader');
      expect(plan.args).toEqual({ path: '/tmp/test.txt' });
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.expectedOutcome).toBeDefined();
      expect(plan.validationChecks.length).toBeGreaterThan(0);
      expect(plan.rollbackStrategy).toBeDefined();
    });

    it('should include file validation for file tools', async () => {
      const plan = await wrapper.generatePlan('file-writer', { path: '/tmp/output.txt' });

      const fileCheck = plan.validationChecks.find(c => c.type === 'file');
      expect(fileCheck).toBeDefined();
    });

    it('should include API validation for API tools', async () => {
      const plan = await wrapper.generatePlan('api-caller', { url: 'http://localhost:3000' });

      const apiCheck = plan.validationChecks.find(c => c.type === 'api');
      expect(apiCheck).toBeDefined();
    });

    it('should include docker validation for container tools', async () => {
      const plan = await wrapper.generatePlan('docker-start', { name: 'test-container' });

      const dockerCheck = plan.validationChecks.find(c => c.type === 'docker');
      expect(dockerCheck).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should execute tool successfully', async () => {
      const result = await wrapper.executeTool('test-tool', { arg1: 'value1' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.verification).toBeDefined();
    });

    it('should include execution plan in result', async () => {
      const result = await wrapper.executeTool('test-tool', { arg1: 'value1' });

      expect(result.plan.toolName).toBe('test-tool');
      expect(result.plan.args).toEqual({ arg1: 'value1' });
    });

    it('should include verification result', async () => {
      const result = await wrapper.executeTool('test-tool', {});

      expect(result.verification.passed).toBeDefined();
      expect(result.verification.evidence).toBeDefined();
      expect(result.verification.confidence).toBeGreaterThanOrEqual(0);
      expect(result.verification.confidence).toBeLessThanOrEqual(100);
      expect(result.verification.timestamp).toBeDefined();
    });
  });

  describe('Outcome Verification', () => {
    it('should verify successful execution', async () => {
      const result = await wrapper.executeTool('test-tool', {});
      
      expect(result.verification.passed).toBe(true);
      expect(result.verification.confidence).toBeGreaterThan(0);
    });

    it('should fail verification for failed execution', async () => {
      const mockResult = {
        success: false,
        output: { error: 'Test error' },
        plan: {
          toolName: 'test-tool',
          args: {},
          steps: [],
          expectedOutcome: 'success',
          validationChecks: [],
          rollbackStrategy: 'revert',
        },
        verification: {
          passed: false,
          evidence: '',
          confidence: 0,
          duration: 0,
          timestamp: new Date().toISOString(),
        },
      };

      const verification = await wrapper.verifyOutcome(mockResult);

      expect(verification.passed).toBe(false);
      expect(verification.error).toBeDefined();
    });
  });

  describe('Plan-Execute-Verify Cycle', () => {
    it('should complete full cycle for successful execution', async () => {
      const result = await wrapper.executeTool('test-tool', { test: true });

      // Plan generated
      expect(result.plan).toBeDefined();
      expect(result.plan.steps.length).toBeGreaterThan(0);

      // Execution completed
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();

      // Verification performed
      expect(result.verification).toBeDefined();
      expect(result.verification.timestamp).toBeDefined();
    });

    it('should handle execution with validation checks', async () => {
      const result = await wrapper.executeTool('file-tool', { path: '/tmp/test.txt' });

      expect(result.plan.validationChecks.length).toBeGreaterThan(0);
      expect(result.verification.evidence).toBeDefined();
    });
  });
});
