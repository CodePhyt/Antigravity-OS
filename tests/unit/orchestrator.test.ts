/**
 * Orchestrator Tests
 * Tests main orchestrator coordination and execution flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Orchestrator, createOrchestrator } from '@/core/orchestrator';

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  const specPath = '.kiro/specs/spec-orchestrator';

  beforeEach(() => {
    orchestrator = createOrchestrator({ specPath });
  });

  describe('initialization', () => {
    it('should create orchestrator instance', () => {
      expect(orchestrator).toBeInstanceOf(Orchestrator);
    });

    it('should have task manager', () => {
      expect(orchestrator.getTaskManager()).toBeDefined();
    });

    it('should have ralph-loop', () => {
      expect(orchestrator.getRalphLoop()).toBeDefined();
    });
  });

  describe('loadSpec', () => {
    it('should load spec successfully', async () => {
      const result = await orchestrator.loadSpec();
      expect(result).toBe(true);
    });

    it('should return false for invalid spec path', async () => {
      const badOrchestrator = createOrchestrator({ specPath: '/nonexistent/path' });
      const result = await badOrchestrator.loadSpec();
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return execution status', async () => {
      await orchestrator.loadSpec();
      const status = orchestrator.getStatus();

      expect(status).toHaveProperty('currentTask');
      expect(status).toHaveProperty('completedCount');
      expect(status).toHaveProperty('totalCount');
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('progress');
    });

    it('should show correct task counts', async () => {
      await orchestrator.loadSpec();
      const status = orchestrator.getStatus();

      expect(status.totalCount).toBeGreaterThan(0);
      expect(status.completedCount).toBe(0);
      expect(status.progress).toBe(0);
    });
  });

  describe('factory function', () => {
    it('should create orchestrator with default config', () => {
      const instance = createOrchestrator({ specPath });
      expect(instance).toBeInstanceOf(Orchestrator);
    });

    it('should create orchestrator with custom config', () => {
      const instance = createOrchestrator({
        specPath,
        maxRalphLoopAttempts: 5,
        autoRunTests: false,
      });
      expect(instance).toBeInstanceOf(Orchestrator);
    });
  });
});
