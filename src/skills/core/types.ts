/**
 * Core Skills Architecture - Type Definitions
 * 
 * Implements ClawdHub-style modular skill interface for extensible capabilities.
 * All skills (Browser, Git, File, etc.) must implement ISkill<TInput, TOutput>.
 * 
 * @module skills/core/types
 */

/**
 * Standard interface for all autonomous skills.
 * 
 * @template TInput - Input parameter type (validated against schema)
 * @template TOutput - Output result type
 * 
 * @example
 * ```typescript
 * class BrowserSkill implements ISkill<BrowserInput, BrowserOutput> {
 *   name = 'browser';
 *   description = 'Navigate and interact with web pages';
 *   schema = BrowserInputSchema;
 *   
 *   async execute(input: BrowserInput): Promise<BrowserOutput> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface ISkill<TInput = unknown, TOutput = unknown> {
  /**
   * Unique skill identifier (kebab-case)
   * @example 'browser', 'git-commit', 'file-encrypt'
   */
  name: string;

  /**
   * Human-readable description of skill capabilities
   */
  description: string;

  /**
   * JSON Schema or Zod schema for input validation
   * Used to validate input before execution
   */
  schema: object;

  /**
   * Execute the skill with validated input
   * 
   * @param input - Validated input matching schema
   * @returns Promise resolving to skill output
   * @throws {SkillExecutionError} If execution fails
   */
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Skill execution error with context
 */
export class SkillExecutionError extends Error {
  constructor(
    message: string,
    public readonly skillName: string,
    public readonly input: unknown,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SkillExecutionError';
  }
}

/**
 * Skill registry for dynamic skill loading
 */
export interface ISkillRegistry {
  /**
   * Register a skill for execution
   */
  register<TInput, TOutput>(skill: ISkill<TInput, TOutput>): void;

  /**
   * Get skill by name
   */
  get<TInput, TOutput>(name: string): ISkill<TInput, TOutput> | undefined;

  /**
   * List all registered skills
   */
  list(): string[];
}

/**
 * Skill execution result with metadata
 */
export interface SkillResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: string;
  duration: number; // milliseconds
  timestamp: string; // ISO 8601
}
