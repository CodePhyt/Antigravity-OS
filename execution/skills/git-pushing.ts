/**
 * Skill: Git Pushing
 *
 * @description Stage, commit, and push git changes with conventional commit messages
 * @category Version Control
 * @deterministic true
 * @sandboxed false
 */

import { z } from 'zod';
import { execSync } from 'child_process';

// Input schema (Zod for runtime validation)
const InputSchema = z.object({
  files: z.array(z.string()).optional().default([]),
  message: z.string().min(1),
  type: z.enum(['feat', 'fix', 'docs', 'refactor', 'test', 'chore']).default('feat'),
  scope: z.string().optional(),
  breaking: z.boolean().default(false),
  push: z.boolean().default(true),
  remote: z.string().default('origin'),
  branch: z.string().optional(),
});

// Output schema
const OutputSchema = z.object({
  success: z.boolean(),
  commitHash: z.string().optional(),
  message: z.string(),
  filesStaged: z.number(),
  pushed: z.boolean(),
  metadata: z.object({
    executionTime: z.number(),
    timestamp: z.string(),
  }),
});

// Type inference
type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

/**
 * Execute the git pushing skill
 *
 * @param input - Validated input parameters
 * @returns Skill execution result
 * @throws {GitPushingError} If execution fails
 */
export async function executeSkill(input: Input): Promise<Output> {
  // Validate input
  const validatedInput = InputSchema.parse(input);

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // 1. Stage files
    const filesStaged = await stageFiles(validatedInput.files);

    // 2. Generate conventional commit message
    const commitMessage = generateConventionalCommit(
      validatedInput.type,
      validatedInput.message,
      validatedInput.scope,
      validatedInput.breaking
    );

    // 3. Commit changes
    const commitHash = await commitChanges(commitMessage);

    // 4. Push to remote (if requested)
    let pushed = false;
    if (validatedInput.push) {
      await pushToRemote(validatedInput.remote, validatedInput.branch);
      pushed = true;
    }

    // Return validated output
    return OutputSchema.parse({
      success: true,
      commitHash,
      message: commitMessage,
      filesStaged,
      pushed,
      metadata: {
        executionTime: Date.now() - startTime,
        timestamp,
      },
    });
  } catch (error) {
    // Error handling
    throw new GitPushingError(
      `Git pushing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error, input: validatedInput }
    );
  }
}

/**
 * Stage files for commit
 *
 * @param files - Array of file paths (empty = stage all)
 * @returns Number of files staged
 */
async function stageFiles(files: string[]): Promise<number> {
  try {
    if (files.length === 0) {
      // Stage all changes
      execSync('git add .', { encoding: 'utf-8' });
    } else {
      // Stage specific files
      const filesArg = files.map((f) => `"${f}"`).join(' ');
      execSync(`git add ${filesArg}`, { encoding: 'utf-8' });
    }

    // Get count of staged files
    const status = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return status
      .trim()
      .split('\n')
      .filter((line) => line.length > 0).length;
  } catch (error) {
    throw new Error(
      `Failed to stage files: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate conventional commit message
 *
 * @param type - Commit type (feat, fix, etc.)
 * @param message - Commit message
 * @param scope - Optional scope
 * @param breaking - Whether this is a breaking change
 * @returns Formatted conventional commit message
 */
function generateConventionalCommit(
  type: string,
  message: string,
  scope?: string,
  breaking: boolean = false
): string {
  const breakingPrefix = breaking ? '!' : '';
  const scopeStr = scope ? `(${scope})` : '';

  return `${type}${scopeStr}${breakingPrefix}: ${message}`;
}

/**
 * Commit staged changes
 *
 * @param message - Commit message
 * @returns Commit hash
 */
async function commitChanges(message: string): Promise<string> {
  try {
    // Commit with message
    execSync(`git commit -m "${message}"`, { encoding: 'utf-8' });

    // Get commit hash
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf-8' });
    return hash.trim();
  } catch (error) {
    throw new Error(
      `Failed to commit changes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Push to remote repository
 *
 * @param remote - Remote name (default: origin)
 * @param branch - Branch name (default: current branch)
 */
async function pushToRemote(remote: string, branch?: string): Promise<void> {
  try {
    // Get current branch if not specified
    const targetBranch =
      branch || execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

    // Push to remote
    execSync(`git push ${remote} ${targetBranch}`, { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(
      `Failed to push to remote: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Error class for git pushing failures
 */
class GitPushingError extends Error {
  constructor(
    message: string,
    public context: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GitPushingError';
  }
}

// Export for testing
export { stageFiles, generateConventionalCommit, commitChanges, pushToRemote };
