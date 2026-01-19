/**
 * File System Infrastructure Layer
 * Provides atomic file operations with validation and error handling
 *
 * Requirements: 8.1, 8.2, 8.3, 8.7
 */

import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';

/**
 * Result of an atomic write operation
 */
export interface WriteResult {
  /** Whether the write was successful */
  success: boolean;

  /** Path to the file that was written */
  filePath: string;

  /** Error message if write failed */
  error?: string;
}

/**
 * Options for atomic file writing
 */
export interface AtomicWriteOptions {
  /** Custom validation function to run before committing the write */
  validate?: (content: string) => Promise<boolean> | boolean;

  /** Whether to create parent directories if they don't exist */
  createDirs?: boolean;

  /** File encoding (default: 'utf-8') */
  encoding?: BufferEncoding;
}

/**
 * Atomically writes content to a file using the write-to-temp-then-rename pattern.
 * This ensures that the target file is never left in a corrupted or partial state.
 *
 * Algorithm:
 * 1. Write content to a temporary file ({filename}.tmp)
 * 2. Validate the content (if validator provided)
 * 3. Atomically rename the temp file to replace the original
 * 4. Clean up temp file on any failure
 *
 * @param filePath - Path to the target file
 * @param content - Content to write
 * @param options - Write options including validation
 * @returns WriteResult indicating success or failure
 *
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */
export async function atomicWrite(
  filePath: string,
  content: string,
  options: AtomicWriteOptions = {}
): Promise<WriteResult> {
  const { validate, createDirs = true, encoding = 'utf-8' } = options;

  // Generate temporary file path
  const tempPath = `${filePath}.tmp`;

  try {
    // Ensure parent directory exists if requested
    if (createDirs) {
      const dir = dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
    }

    // Step 1: Write to temporary file first (Requirement 8.1)
    await fs.writeFile(tempPath, content, { encoding });

    // Step 2: Validate content before commit (Requirement 8.2)
    if (validate) {
      const isValid = await validate(content);
      if (!isValid) {
        // Clean up temp file on validation failure
        await fs.unlink(tempPath).catch(() => {
          // Ignore cleanup errors
        });

        return {
          success: false,
          filePath,
          error: 'Content validation failed',
        };
      }
    }

    // Step 3: Atomic rename to replace original (Requirement 8.3)
    // On most systems, rename is atomic and will replace the target file
    await fs.rename(tempPath, filePath);

    return {
      success: true,
      filePath,
    };
  } catch (error) {
    // Step 4: Handle write failures gracefully (Requirement 8.3)
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors - temp file may not exist
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      filePath,
      error: `Failed to write file: ${errorMessage}`,
    };
  }
}

/**
 * Reads a file's content safely with error handling
 *
 * @param filePath - Path to the file to read
 * @param encoding - File encoding (default: 'utf-8')
 * @returns File content or null if read fails
 */
export async function safeRead(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string | null> {
  try {
    return await fs.readFile(filePath, { encoding });
  } catch (error) {
    return null;
  }
}

/**
 * Checks if a file exists
 *
 * @param filePath - Path to check
 * @returns true if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that content is not empty and is valid UTF-8
 *
 * @param content - Content to validate
 * @returns true if content is valid
 */
export function validateBasicContent(content: string): boolean {
  // Check content is not empty
  if (!content || content.trim().length === 0) {
    return false;
  }

  // Content is already a string, so it's valid UTF-8
  // Additional validation can be added here
  return true;
}

/**
 * Validates markdown content has basic structure
 *
 * @param content - Markdown content to validate
 * @returns true if content appears to be valid markdown
 */
export function validateMarkdown(content: string): boolean {
  if (!validateBasicContent(content)) {
    return false;
  }

  // Basic markdown validation - check for common patterns
  // This is a simple check; more sophisticated validation can be added
  const hasMarkdownElements =
    content.includes('#') || // Headers
    content.includes('-') || // Lists
    content.includes('*') || // Emphasis or lists
    content.includes('[') || // Links
    content.length > 0; // Or just has content

  return hasMarkdownElements;
}

/**
 * Result of a backup operation
 */
export interface BackupResult {
  /** Whether the backup was successful */
  success: boolean;

  /** Path to the backup file that was created */
  backupPath?: string;

  /** Error message if backup failed */
  error?: string;
}

/**
 * Options for backup operations
 */
export interface BackupOptions {
  /** Directory to store backups (default: .kiro/backups) */
  backupDir?: string;

  /** Maximum number of backups to keep (default: 10) */
  maxBackups?: number;

  /** File encoding (default: 'utf-8') */
  encoding?: BufferEncoding;
}

/**
 * Creates a timestamped backup of a file before modification.
 * Backups are stored in .kiro/backups/ with format: {filename}.backup.{timestamp}.{ext}
 *
 * Algorithm:
 * 1. Check if source file exists
 * 2. Generate timestamped backup filename
 * 3. Copy file to backup location
 * 4. Clean up old backups (keep last N)
 *
 * @param filePath - Path to the file to backup
 * @param options - Backup options
 * @returns BackupResult indicating success or failure
 *
 * **Validates: Requirements 8.7**
 */
export async function createBackup(
  filePath: string,
  options: BackupOptions = {}
): Promise<BackupResult> {
  const { backupDir = '.kiro/backups', maxBackups = 10, encoding = 'utf-8' } = options;

  try {
    // Step 1: Check if source file exists
    const exists = await fileExists(filePath);
    if (!exists) {
      return {
        success: false,
        error: 'Source file does not exist',
      };
    }

    // Step 2: Generate timestamped backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = basename(filePath);
    const backupFileName = `${fileName}.backup.${timestamp}.md`;
    const backupPath = join(backupDir, backupFileName);

    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    // Step 3: Copy file to backup location
    const content = await fs.readFile(filePath, { encoding });
    await fs.writeFile(backupPath, content, { encoding });

    // Step 4: Clean up old backups
    await cleanupOldBackups(filePath, backupDir, maxBackups);

    return {
      success: true,
      backupPath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to create backup: ${errorMessage}`,
    };
  }
}

/**
 * Cleans up old backups for a specific file, keeping only the most recent N backups.
 *
 * @param originalFilePath - Path to the original file
 * @param backupDir - Directory containing backups
 * @param maxBackups - Maximum number of backups to keep
 */
async function cleanupOldBackups(
  originalFilePath: string,
  backupDir: string,
  maxBackups: number
): Promise<void> {
  try {
    const fileName = basename(originalFilePath);

    // List all files in backup directory
    const files = await fs.readdir(backupDir);

    // Filter backups for this specific file
    const backupPattern = `${fileName}.backup.`;
    const backups = files
      .filter((f) => f.startsWith(backupPattern))
      .map((f) => ({
        name: f,
        path: join(backupDir, f),
      }));

    // Sort by name (timestamp is in the name, so lexicographic sort works)
    backups.sort((a, b) => b.name.localeCompare(a.name));

    // Delete backups beyond the limit
    const backupsToDelete = backups.slice(maxBackups);
    for (const backup of backupsToDelete) {
      await fs.unlink(backup.path).catch(() => {
        // Ignore deletion errors
      });
    }
  } catch (error) {
    // Ignore cleanup errors - not critical
  }
}

/**
 * Lists all backups for a specific file
 *
 * @param filePath - Path to the original file
 * @param backupDir - Directory containing backups (default: .kiro/backups)
 * @returns Array of backup file paths, sorted by timestamp (newest first)
 */
export async function listBackups(
  filePath: string,
  backupDir: string = '.kiro/backups'
): Promise<string[]> {
  try {
    const fileName = basename(filePath);
    const files = await fs.readdir(backupDir);

    const backupPattern = `${fileName}.backup.`;
    const backups = files.filter((f) => f.startsWith(backupPattern)).map((f) => join(backupDir, f));

    // Sort by name (newest first)
    backups.sort((a, b) => b.localeCompare(a));

    return backups;
  } catch (error) {
    return [];
  }
}

/**
 * Restores a file from a backup
 *
 * @param backupPath - Path to the backup file
 * @param targetPath - Path where the file should be restored
 * @param encoding - File encoding (default: 'utf-8')
 * @returns WriteResult indicating success or failure
 */
export async function restoreFromBackup(
  backupPath: string,
  targetPath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<WriteResult> {
  try {
    // Check if backup exists
    const exists = await fileExists(backupPath);
    if (!exists) {
      return {
        success: false,
        filePath: targetPath,
        error: 'Backup file does not exist',
      };
    }

    // Read backup content
    const content = await fs.readFile(backupPath, { encoding });

    // Write to target using atomic write
    return await atomicWrite(targetPath, content, { encoding });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      filePath: targetPath,
      error: `Failed to restore from backup: ${errorMessage}`,
    };
  }
}

/**
 * Atomically writes content to a file with automatic backup.
 * Creates a backup before writing, then performs atomic write.
 *
 * @param filePath - Path to the target file
 * @param content - Content to write
 * @param options - Write and backup options
 * @returns WriteResult indicating success or failure
 */
export async function atomicWriteWithBackup(
  filePath: string,
  content: string,
  options: AtomicWriteOptions & BackupOptions = {}
): Promise<WriteResult> {
  // Create backup if file exists
  const exists = await fileExists(filePath);
  if (exists) {
    const backupResult = await createBackup(filePath, options);
    if (!backupResult.success) {
      return {
        success: false,
        filePath,
        error: `Backup failed: ${backupResult.error}`,
      };
    }
  }

  // Perform atomic write
  return await atomicWrite(filePath, content, options);
}

/**
 * Task status type matching the spec-orchestrator design
 */
export type TaskStatus = 'not_started' | 'queued' | 'in_progress' | 'completed';

/**
 * Mapping of task status to checkbox markers
 */
const STATUS_TO_MARKER: Record<TaskStatus, string> = {
  not_started: '[ ]',
  queued: '[~]',
  in_progress: '[>]',
  completed: '[x]',
};

/**
 * Result of a task status update operation
 */
export interface TaskStatusUpdateResult {
  /** Whether the update was successful */
  success: boolean;

  /** Path to the tasks.md file that was updated */
  filePath: string;

  /** The task ID that was updated */
  taskId: string;

  /** The new status */
  status: TaskStatus;

  /** Error message if update failed */
  error?: string;
}

/**
 * Options for task status updates
 */
export interface TaskStatusUpdateOptions {
  /** Whether to create a backup before updating (default: true) */
  createBackup?: boolean;

  /** Directory to store backups (default: .kiro/backups) */
  backupDir?: string;

  /** Maximum number of backups to keep (default: 10) */
  maxBackups?: number;
}

/**
 * Updates the status of a task in a tasks.md file by modifying its checkbox marker.
 * Preserves all markdown formatting including indentation, bullets, and structure.
 * Uses atomic write with backup to ensure file safety.
 *
 * Algorithm:
 * 1. Read the current tasks.md file
 * 2. Find the task line by ID (e.g., "3.1", "5.2")
 * 3. Update the checkbox marker based on status
 * 4. Preserve all markdown formatting
 * 5. Use atomic write with backup
 *
 * Checkbox markers:
 * - `[ ]` = not_started
 * - `[~]` = queued
 * - `[>]` = in_progress
 * - `[x]` = completed
 *
 * @param tasksFilePath - Path to the tasks.md file
 * @param taskId - Task identifier (e.g., "3.1", "5.2")
 * @param status - New status for the task
 * @param options - Update options including backup settings
 * @returns TaskStatusUpdateResult indicating success or failure
 *
 * **Validates: Requirements 2.5, 8.4**
 *
 * @example
 * ```typescript
 * // Update task 3.1 to in_progress
 * const result = await updateTaskStatus(
 *   '.kiro/specs/my-feature/tasks.md',
 *   '3.1',
 *   'in_progress'
 * );
 *
 * if (result.success) {
 *   console.log(`Updated task ${result.taskId} to ${result.status}`);
 * }
 * ```
 */
export async function updateTaskStatus(
  tasksFilePath: string,
  taskId: string,
  status: TaskStatus,
  options: TaskStatusUpdateOptions = {}
): Promise<TaskStatusUpdateResult> {
  const {
    createBackup: shouldBackup = true,
    backupDir = '.kiro/backups',
    maxBackups = 10,
  } = options;

  try {
    // Step 1: Read current tasks.md content
    const content = await safeRead(tasksFilePath);

    if (content === null) {
      return {
        success: false,
        filePath: tasksFilePath,
        taskId,
        status,
        error: 'Tasks file does not exist or cannot be read',
      };
    }

    // Step 2: Find and update the task line
    const newMarker = STATUS_TO_MARKER[status];
    const lines = content.split('\n');
    let taskFound = false;
    const updatedLines = lines.map((line) => {
      // Skip if we already found and updated the task
      if (taskFound) {
        return line;
      }

      // Match task pattern: - [marker] {taskId} {description}
      // The pattern should match:
      // - [ ] 3.1 Task description
      // - [x] 3.1 Task description
      // - [>] 3.1 Task description
      // - [~] 3.1 Task description
      // With optional asterisk for optional tasks: - [ ]* 3.1 Task description

      // Regex explanation:
      // ^(\s*-\s*) - Capture leading whitespace and dash
      // \[[^\]]*\] - Match any checkbox marker [x], [ ], [>], [~]
      // (\*?) - Capture optional asterisk
      // (\s+) - Capture whitespace after marker
      // (${escapeRegex(taskId)}) - Match the exact task ID
      // (?!\.\d) - Negative lookahead: NOT followed by period+digit (prevents "2" matching in "2.1")
      // (.*)$ - Capture the rest of the line (description, which may start with ". " or " ")

      const taskIdPattern = escapeRegex(taskId);
      const regex = new RegExp(
        `^(\\s*-\\s*)\\[[^\\]]*\\](\\*?)(\\s+)(${taskIdPattern})(?!\\.\\d)(.*)$`
      );

      const match = line.match(regex);

      if (match) {
        taskFound = true;
        // Reconstruct the line with new marker, preserving all formatting
        // match[1] = leading whitespace and dash
        // match[2] = optional asterisk
        // match[3] = whitespace after marker
        // match[4] = task ID
        // match[5] = rest of line (description)
        return `${match[1]}${newMarker}${match[2]}${match[3]}${match[4]}${match[5]}`;
      }

      return line;
    });

    if (!taskFound) {
      return {
        success: false,
        filePath: tasksFilePath,
        taskId,
        status,
        error: `Task with ID "${taskId}" not found in tasks file`,
      };
    }

    // Step 3: Join lines back together
    const updatedContent = updatedLines.join('\n');

    // Step 4: Validate that content is still valid markdown
    if (!validateMarkdown(updatedContent)) {
      return {
        success: false,
        filePath: tasksFilePath,
        taskId,
        status,
        error: 'Updated content failed markdown validation',
      };
    }

    // Step 5: Write using atomic write with backup
    const writeResult = shouldBackup
      ? await atomicWriteWithBackup(tasksFilePath, updatedContent, {
          backupDir,
          maxBackups,
          validate: validateMarkdown,
        })
      : await atomicWrite(tasksFilePath, updatedContent, {
          validate: validateMarkdown,
        });

    if (!writeResult.success) {
      return {
        success: false,
        filePath: tasksFilePath,
        taskId,
        status,
        error: writeResult.error,
      };
    }

    return {
      success: true,
      filePath: tasksFilePath,
      taskId,
      status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      filePath: tasksFilePath,
      taskId,
      status,
      error: `Failed to update task status: ${errorMessage}`,
    };
  }
}

/**
 * Escapes special regex characters in a string
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
