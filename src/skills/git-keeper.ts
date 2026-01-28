/**
 * Git-Keeper Skill - Time Machine for Autonomous Agents
 * 
 * Enables autonomous agents to snapshot, rollback, and inspect code changes
 * without human intervention. Critical for self-healing and experimentation.
 * 
 * @module skills/git-keeper
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ISkill, SkillExecutionError } from './core/types.js';

const execAsync = promisify(exec);

/**
 * Git-Keeper input schema
 */
export interface GitKeeperInput {
  action: 'snapshot' | 'rollback' | 'diff';
  message?: string; // Required for snapshot
}

/**
 * Git-Keeper output
 */
export interface GitKeeperOutput {
  action: string;
  success: boolean;
  message: string;
  diff?: string;
  commitHash?: string;
}

/**
 * Git-Keeper Skill - Autonomous Git Operations
 * 
 * Capabilities:
 * - snapshot(message): Create WIP commit for current state
 * - rollback(): Hard reset to last snapshot
 * - diff(): Get current changes as string
 * 
 * @example
 * ```typescript
 * const gitKeeper = new GitKeeperSkill();
 * 
 * // Snapshot current state
 * await gitKeeper.execute({ action: 'snapshot', message: 'Before refactor' });
 * 
 * // Make changes...
 * 
 * // Rollback if needed
 * await gitKeeper.execute({ action: 'rollback' });
 * ```
 */
export class GitKeeperSkill implements ISkill<GitKeeperInput, GitKeeperOutput> {
  name = 'git-keeper';
  description = 'Time machine for autonomous agents - snapshot, rollback, and inspect code changes';

  schema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['snapshot', 'rollback', 'diff'],
        description: 'Git operation to perform',
      },
      message: {
        type: 'string',
        description: 'Commit message (required for snapshot)',
      },
    },
    required: ['action'],
  };

  /**
   * Execute Git-Keeper operation
   */
  async execute(input: GitKeeperInput): Promise<GitKeeperOutput> {
    try {
      // Validate input
      this.validateInput(input);

      // Execute action
      let result: GitKeeperOutput;
      switch (input.action) {
        case 'snapshot':
          result = await this.snapshot(input.message!);
          break;
        case 'rollback':
          result = await this.rollback();
          break;
        case 'diff':
          result = await this.diff();
          break;
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }

      return result;
    } catch (error) {
      throw new SkillExecutionError(
        `Git-Keeper execution failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        input,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate input against schema
   */
  private validateInput(input: GitKeeperInput): void {
    if (!input.action) {
      throw new Error('Action is required');
    }

    if (input.action === 'snapshot' && !input.message) {
      throw new Error('Message is required for snapshot action');
    }

    const validActions = ['snapshot', 'rollback', 'diff'];
    if (!validActions.includes(input.action)) {
      throw new Error(`Invalid action: ${input.action}. Must be one of: ${validActions.join(', ')}`);
    }
  }

  /**
   * Create WIP commit (snapshot)
   */
  private async snapshot(message: string): Promise<GitKeeperOutput> {
    try {
      // Stage all changes
      await execAsync('git add -A');

      // Create WIP commit
      await execAsync(`git commit -m "WIP: ${message}"`);

      // Get commit hash
      const { stdout: hash } = await execAsync('git rev-parse HEAD');
      const commitHash = hash.trim();

      return {
        action: 'snapshot',
        success: true,
        message: `Snapshot created: ${message}`,
        commitHash,
      };
    } catch (error) {
      // Check if there are no changes to commit
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('nothing to commit')) {
        return {
          action: 'snapshot',
          success: true,
          message: 'No changes to snapshot',
        };
      }

      throw error;
    }
  }

  /**
   * Rollback to last snapshot (hard reset)
   */
  private async rollback(): Promise<GitKeeperOutput> {
    try {
      // Get current commit hash before rollback
      const { stdout: beforeHash } = await execAsync('git rev-parse HEAD');

      // Hard reset to HEAD~1 (last commit)
      await execAsync('git reset --hard HEAD~1');

      // Get new commit hash
      const { stdout: afterHash } = await execAsync('git rev-parse HEAD');

      return {
        action: 'rollback',
        success: true,
        message: `Rolled back from ${beforeHash.trim().substring(0, 7)} to ${afterHash.trim().substring(0, 7)}`,
        commitHash: afterHash.trim(),
      };
    } catch (error) {
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current changes as diff string
   */
  private async diff(): Promise<GitKeeperOutput> {
    try {
      // Get staged and unstaged changes
      const { stdout: stagedDiff } = await execAsync('git diff --cached').catch(() => ({ stdout: '' }));
      const { stdout: unstagedDiff } = await execAsync('git diff').catch(() => ({ stdout: '' }));

      const fullDiff = [
        stagedDiff ? '=== Staged Changes ===\n' + stagedDiff : '',
        unstagedDiff ? '=== Unstaged Changes ===\n' + unstagedDiff : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      if (!fullDiff) {
        return {
          action: 'diff',
          success: true,
          message: 'No changes detected',
          diff: '',
        };
      }

      return {
        action: 'diff',
        success: true,
        message: `Found ${fullDiff.split('\n').length} lines of changes`,
        diff: fullDiff,
      };
    } catch (error) {
      throw new Error(`Diff failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Singleton instance
 */
export const gitKeeper = new GitKeeperSkill();
