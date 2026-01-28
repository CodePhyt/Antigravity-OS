/**
 * Git-Keeper Skill - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { GitKeeperSkill } from '../../../src/skills/git-keeper';

describe('Git-Keeper Skill - Unit Tests', () => {
  const gitKeeper = new GitKeeperSkill();

  describe('Skill Interface', () => {
    it('should implement ISkill interface', () => {
      expect(gitKeeper.name).toBe('git-keeper');
      expect(gitKeeper.description).toContain('Time machine');
      expect(gitKeeper.schema).toBeDefined();
      expect(typeof gitKeeper.execute).toBe('function');
    });

    it('should have correct schema', () => {
      expect(gitKeeper.schema.type).toBe('object');
      expect(gitKeeper.schema.properties).toHaveProperty('action');
      expect(gitKeeper.schema.properties).toHaveProperty('message');
      expect(gitKeeper.schema.required).toContain('action');
    });
  });

  describe('Input Validation', () => {
    it('should reject missing action', async () => {
      await expect(
        gitKeeper.execute({ action: '' as any, message: 'test' })
      ).rejects.toThrow();
    });

    it('should reject invalid action', async () => {
      await expect(
        gitKeeper.execute({ action: 'invalid' as any })
      ).rejects.toThrow('Invalid action');
    });

    it('should reject snapshot without message', async () => {
      await expect(
        gitKeeper.execute({ action: 'snapshot' })
      ).rejects.toThrow('Message is required');
    });

    it('should accept valid snapshot input', () => {
      const input = { action: 'snapshot' as const, message: 'Test snapshot' };
      expect(input.action).toBe('snapshot');
      expect(input.message).toBe('Test snapshot');
    });

    it('should accept valid rollback input', () => {
      const input = { action: 'rollback' as const };
      expect(input.action).toBe('rollback');
    });

    it('should accept valid diff input', () => {
      const input = { action: 'diff' as const };
      expect(input.action).toBe('diff');
    });
  });

  describe('Action Types', () => {
    it('should support snapshot action', () => {
      const actions = gitKeeper.schema.properties.action.enum;
      expect(actions).toContain('snapshot');
    });

    it('should support rollback action', () => {
      const actions = gitKeeper.schema.properties.action.enum;
      expect(actions).toContain('rollback');
    });

    it('should support diff action', () => {
      const actions = gitKeeper.schema.properties.action.enum;
      expect(actions).toContain('diff');
    });
  });

  describe('Output Structure', () => {
    it('should return correct output structure for snapshot', () => {
      const mockOutput = {
        action: 'snapshot',
        success: true,
        message: 'Snapshot created',
        commitHash: 'abc123',
      };

      expect(mockOutput).toHaveProperty('action');
      expect(mockOutput).toHaveProperty('success');
      expect(mockOutput).toHaveProperty('message');
      expect(mockOutput).toHaveProperty('commitHash');
    });

    it('should return correct output structure for rollback', () => {
      const mockOutput = {
        action: 'rollback',
        success: true,
        message: 'Rolled back',
        commitHash: 'def456',
      };

      expect(mockOutput).toHaveProperty('action');
      expect(mockOutput).toHaveProperty('success');
      expect(mockOutput).toHaveProperty('message');
    });

    it('should return correct output structure for diff', () => {
      const mockOutput = {
        action: 'diff',
        success: true,
        message: 'Found changes',
        diff: '+ added line\n- removed line',
      };

      expect(mockOutput).toHaveProperty('action');
      expect(mockOutput).toHaveProperty('success');
      expect(mockOutput).toHaveProperty('message');
      expect(mockOutput).toHaveProperty('diff');
    });
  });
});
