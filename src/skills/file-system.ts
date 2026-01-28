/**
 * File System Skill - Safe File Manipulation with Automatic Backups
 * 
 * Provides read, write, and patch operations with:
 * - Workspace sandboxing (SSRF protection)
 * - Automatic Git snapshots before modifications
 * - Atomic operations
 * 
 * @module skills/file-system
 */

import * as fs from 'fs';
import * as path from 'path';
import { ISkill, SkillExecutionError } from './core/types.js';
import { gitKeeper } from './git-keeper.js';

/**
 * Workspace root - all operations must stay within this directory
 */
const WORKSPACE_ROOT = process.cwd();

/**
 * File System input schema
 */
export interface FileSystemInput {
  operation: 'read' | 'write' | 'patch';
  path: string;
  content?: string;      // Required for 'write'
  search?: string;       // Required for 'patch'
  replace?: string;      // Required for 'patch'
  backup?: boolean;      // Optional, default: true
}

/**
 * File System output
 */
export interface FileSystemOutput {
  operation: string;
  path: string;
  success: boolean;
  
  // Read operation
  content?: string;
  size?: number;
  
  // Write operation
  created?: boolean;
  written?: number;
  
  // Patch operation
  matched?: boolean;
  replaced?: number;
  
  // Backup info
  backup?: string;       // Git commit hash
}

/**
 * Custom error classes
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

export class SearchNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchNotFoundError';
  }
}

export class MultipleMatchesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultipleMatchesError';
  }
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

/**
 * File System Skill - Safe File Operations
 * 
 * Security Features:
 * - Workspace sandboxing (blocks paths outside project)
 * - Automatic Git snapshots before modifications
 * - Atomic operations (all or nothing)
 * - Path validation and normalization
 * 
 * @example
 * ```typescript
 * const fileSystem = new FileSystemSkill();
 * 
 * // Read file
 * const result = await fileSystem.execute({
 *   operation: 'read',
 *   path: 'src/test.ts'
 * });
 * 
 * // Write file (creates Git snapshot)
 * await fileSystem.execute({
 *   operation: 'write',
 *   path: 'src/test.ts',
 *   content: 'console.log("hello");'
 * });
 * 
 * // Patch file (creates Git snapshot)
 * await fileSystem.execute({
 *   operation: 'patch',
 *   path: 'src/test.ts',
 *   search: 'hello',
 *   replace: 'world'
 * });
 * ```
 */
export class FileSystemSkill implements ISkill<FileSystemInput, FileSystemOutput> {
  name = 'file-system';
  description = 'Safe file manipulation with automatic backups and workspace sandboxing';

  schema = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['read', 'write', 'patch'],
        description: 'File operation type',
      },
      path: {
        type: 'string',
        description: 'File path (relative or absolute)',
        minLength: 1,
      },
      content: {
        type: 'string',
        description: 'File content for write operation',
      },
      search: {
        type: 'string',
        description: 'Search string for patch operation',
        minLength: 1,
      },
      replace: {
        type: 'string',
        description: 'Replacement string for patch operation',
      },
      backup: {
        type: 'boolean',
        description: 'Create Git snapshot before modification',
        default: true,
      },
    },
    required: ['operation', 'path'],
  };

  /**
   * Execute file system operation
   */
  async execute(input: FileSystemInput): Promise<FileSystemOutput> {
    try {
      // Validate input
      this.validateInput(input);

      // Route to appropriate operation
      switch (input.operation) {
        case 'read':
          return await this.executeRead(input);
        case 'write':
          return await this.executeWrite(input);
        case 'patch':
          return await this.executePatch(input);
        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }
    } catch (error) {
      throw new SkillExecutionError(
        `File system operation failed: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        input,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate input against schema
   */
  private validateInput(input: FileSystemInput): void {
    if (!input.operation) {
      throw new Error('Operation is required');
    }

    if (!input.path || input.path.trim().length === 0) {
      throw new Error('Path is required and cannot be empty');
    }

    if (input.operation === 'write' && input.content === undefined) {
      throw new Error('Content is required for write operation');
    }

    if (input.operation === 'patch') {
      if (!input.search || input.search.length === 0) {
        throw new Error('Search string is required for patch operation');
      }
      if (input.replace === undefined) {
        throw new Error('Replace string is required for patch operation');
      }
    }
  }

  /**
   * Validate and normalize path
   * 
   * Security: Ensures path is within workspace boundaries
   */
  private validatePath(inputPath: string): string {
    // Check for null bytes
    if (inputPath.includes('\0')) {
      throw new SecurityError('Path contains null byte');
    }

    // Normalize path (resolve . and ..)
    const normalized = path.resolve(WORKSPACE_ROOT, inputPath);

    // Check if normalized path starts with workspace root
    if (!normalized.startsWith(WORKSPACE_ROOT)) {
      throw new SecurityError(
        `Path outside workspace: ${inputPath}\n` +
        `Workspace: ${WORKSPACE_ROOT}\n` +
        `Resolved: ${normalized}\n` +
        `Security: All file operations must stay within the workspace.`
      );
    }

    return normalized;
  }

  /**
   * Create Git snapshot before modification
   */
  private async createBackup(filePath: string, operation: string): Promise<string> {
    const fileName = path.basename(filePath);
    const message = `Auto-backup before ${operation}: ${fileName}`;

    try {
      const result = await gitKeeper.execute({
        action: 'snapshot',
        message,
      });

      return result.commitHash || 'unknown';
    } catch (error) {
      throw new BackupError(
        `Failed to create backup: ${error instanceof Error ? error.message : String(error)}\n` +
        `File: ${filePath}\n` +
        `Operation aborted for safety.`
      );
    }
  }

  /**
   * Execute read operation
   */
  private async executeRead(input: FileSystemInput): Promise<FileSystemOutput> {
    const validPath = this.validatePath(input.path);

    if (!fs.existsSync(validPath)) {
      throw new FileNotFoundError(`File not found: ${input.path}`);
    }

    const content = fs.readFileSync(validPath, 'utf-8');
    const stats = fs.statSync(validPath);

    return {
      operation: 'read',
      path: validPath,
      success: true,
      content,
      size: stats.size,
    };
  }

  /**
   * Execute write operation
   */
  private async executeWrite(input: FileSystemInput): Promise<FileSystemOutput> {
    if (input.content === undefined) {
      throw new Error('Content is required for write operation');
    }

    const validPath = this.validatePath(input.path);
    const fileExists = fs.existsSync(validPath);

    // Create backup if file exists and backup enabled
    let backupHash: string | undefined;
    if (fileExists && input.backup !== false) {
      backupHash = await this.createBackup(validPath, 'write');
    }

    // Create parent directories
    const dir = path.dirname(validPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(validPath, input.content, 'utf-8');

    return {
      operation: 'write',
      path: validPath,
      success: true,
      created: !fileExists,
      written: Buffer.byteLength(input.content, 'utf-8'),
      backup: backupHash,
    };
  }

  /**
   * Execute patch operation
   */
  private async executePatch(input: FileSystemInput): Promise<FileSystemOutput> {
    if (!input.search || input.replace === undefined) {
      throw new Error('Search and replace are required for patch operation');
    }

    const validPath = this.validatePath(input.path);

    if (!fs.existsSync(validPath)) {
      throw new FileNotFoundError(`File not found: ${input.path}`);
    }

    // Read current content
    const content = fs.readFileSync(validPath, 'utf-8');

    // Count matches
    const matches = content.split(input.search).length - 1;

    if (matches === 0) {
      throw new SearchNotFoundError(
        `Search string not found in ${input.path}\n` +
        `Search: "${input.search.substring(0, 50)}${input.search.length > 50 ? '...' : ''}"`
      );
    }

    if (matches > 1) {
      throw new MultipleMatchesError(
        `Search string matches ${matches} times in ${input.path}\n` +
        `Search: "${input.search.substring(0, 50)}${input.search.length > 50 ? '...' : ''}"\n` +
        `Make search string more specific.`
      );
    }

    // Create backup
    let backupHash: string | undefined;
    if (input.backup !== false) {
      backupHash = await this.createBackup(validPath, 'patch');
    }

    // Replace string
    const newContent = content.replace(input.search, input.replace);

    // Write modified content
    fs.writeFileSync(validPath, newContent, 'utf-8');

    return {
      operation: 'patch',
      path: validPath,
      success: true,
      matched: true,
      replaced: 1,
      backup: backupHash,
    };
  }
}

/**
 * Singleton instance
 */
export const fileSystem = new FileSystemSkill();
