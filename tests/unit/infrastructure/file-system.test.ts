/**
 * Unit tests for File System infrastructure layer
 * Tests atomic file writing, validation, and error handling
 *
 * Feature: spec-orchestrator
 * Requirements: 8.1, 8.2, 8.3, 8.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import {
  atomicWrite,
  safeRead,
  fileExists,
  validateBasicContent,
  validateMarkdown,
  createBackup,
  listBackups,
  restoreFromBackup,
  atomicWriteWithBackup,
  updateTaskStatus,
  type TaskStatus,
} from '../../../src/infrastructure/file-system';

describe('File System - Atomic Write', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a unique test directory for each test
    testDir = join(tmpdir(), `file-system-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('atomicWrite', () => {
    it('should write content to a file successfully', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Hello, World!';

      const result = await atomicWrite(filePath, content);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(filePath);
      expect(result.error).toBeUndefined();

      // Verify file was created with correct content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should not leave temporary file after successful write', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Test content';

      await atomicWrite(filePath, content);

      // Verify temp file was cleaned up
      const tempPath = `${filePath}.tmp`;
      const tempExists = await fileExists(tempPath);
      expect(tempExists).toBe(false);
    });

    it('should replace existing file atomically', async () => {
      const filePath = join(testDir, 'test.txt');
      const originalContent = 'Original content';
      const newContent = 'New content';

      // Write original file
      await fs.writeFile(filePath, originalContent);

      // Atomically replace it
      const result = await atomicWrite(filePath, newContent);

      expect(result.success).toBe(true);

      // Verify file has new content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toBe(newContent);
    });

    it('should validate content before committing write', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Invalid content';

      // Validator that always fails
      const validator = (_c: string): boolean => false;

      const result = await atomicWrite(filePath, content, { validate: validator });

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');

      // Verify file was not created
      const exists = await fileExists(filePath);
      expect(exists).toBe(false);
    });

    it('should clean up temp file when validation fails', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Test content';
      const tempPath = `${filePath}.tmp`;

      // Validator that fails
      const validator = (_c: string): boolean => false;

      await atomicWrite(filePath, content, { validate: validator });

      // Verify temp file was cleaned up
      const tempExists = await fileExists(tempPath);
      expect(tempExists).toBe(false);
    });

    it('should pass content to validator', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Expected content';
      let validatedContent: string | null = null;

      const validator = (c: string): boolean => {
        validatedContent = c;
        return true;
      };

      await atomicWrite(filePath, content, { validate: validator });

      expect(validatedContent).toBe(content);
    });

    it('should create parent directories when createDirs is true', async () => {
      const filePath = join(testDir, 'nested', 'deep', 'test.txt');
      const content = 'Test content';

      const result = await atomicWrite(filePath, content, { createDirs: true });

      expect(result.success).toBe(true);

      // Verify file was created
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should fail gracefully when parent directory does not exist and createDirs is false', async () => {
      const filePath = join(testDir, 'nonexistent', 'test.txt');
      const content = 'Test content';

      const result = await atomicWrite(filePath, content, { createDirs: false });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle write errors gracefully', async () => {
      // Try to write to an invalid path
      const filePath = '/invalid/path/that/does/not/exist/test.txt';
      const content = 'Test content';

      const result = await atomicWrite(filePath, content, { createDirs: false });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Failed to write file');
    });

    it('should clean up temp file on write error', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Test content';
      const tempPath = `${filePath}.tmp`;

      // Create a validator that throws an error
      const validator = (_c: string): boolean => {
        throw new Error('Validation error');
      };

      await atomicWrite(filePath, content, { validate: validator });

      // Verify temp file was cleaned up
      const tempExists = await fileExists(tempPath);
      expect(tempExists).toBe(false);
    });

    it('should support custom encoding', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Test content with special chars: é, ñ, 中文';

      const result = await atomicWrite(filePath, content, { encoding: 'utf-8' });

      expect(result.success).toBe(true);

      // Verify content with correct encoding
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toBe(content);
    });

    it('should leave original file unchanged on failure', async () => {
      const filePath = join(testDir, 'test.txt');
      const originalContent = 'Original content';
      const newContent = 'New content';

      // Write original file
      await fs.writeFile(filePath, originalContent);

      // Try to write with failing validator
      const validator = (_c: string): boolean => false;
      await atomicWrite(filePath, newContent, { validate: validator });

      // Verify original file is unchanged
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toBe(originalContent);
    });
  });

  describe('safeRead', () => {
    it('should read file content successfully', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Test content';

      await fs.writeFile(filePath, content);

      const result = await safeRead(filePath);

      expect(result).toBe(content);
    });

    it('should return null for nonexistent file', async () => {
      const filePath = join(testDir, 'nonexistent.txt');

      const result = await safeRead(filePath);

      expect(result).toBeNull();
    });

    it('should support custom encoding', async () => {
      const filePath = join(testDir, 'test.txt');
      const content = 'Test content with special chars: é, ñ, 中文';

      await fs.writeFile(filePath, content, 'utf-8');

      const result = await safeRead(filePath, 'utf-8');

      expect(result).toBe(content);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      const exists = await fileExists(filePath);

      expect(exists).toBe(true);
    });

    it('should return false for nonexistent file', async () => {
      const filePath = join(testDir, 'nonexistent.txt');

      const exists = await fileExists(filePath);

      expect(exists).toBe(false);
    });

    it('should return true for existing directory', async () => {
      const exists = await fileExists(testDir);

      expect(exists).toBe(true);
    });
  });

  describe('validateBasicContent', () => {
    it('should return true for valid content', () => {
      expect(validateBasicContent('Hello, World!')).toBe(true);
      expect(validateBasicContent('Some content')).toBe(true);
      expect(validateBasicContent('123')).toBe(true);
    });

    it('should return false for empty content', () => {
      expect(validateBasicContent('')).toBe(false);
      expect(validateBasicContent('   ')).toBe(false);
      expect(validateBasicContent('\n\n')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(validateBasicContent(null as unknown as string)).toBe(false);
      expect(validateBasicContent(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateMarkdown', () => {
    it('should return true for valid markdown with headers', () => {
      const markdown = '# Header\n\nSome content';
      expect(validateMarkdown(markdown)).toBe(true);
    });

    it('should return true for valid markdown with lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      expect(validateMarkdown(markdown)).toBe(true);
    });

    it('should return true for valid markdown with emphasis', () => {
      const markdown = 'Some *emphasized* text';
      expect(validateMarkdown(markdown)).toBe(true);
    });

    it('should return true for valid markdown with links', () => {
      const markdown = '[Link text](https://example.com)';
      expect(validateMarkdown(markdown)).toBe(true);
    });

    it('should return true for plain text (minimal markdown)', () => {
      const markdown = 'Just some plain text content';
      expect(validateMarkdown(markdown)).toBe(true);
    });

    it('should return false for empty content', () => {
      expect(validateMarkdown('')).toBe(false);
      expect(validateMarkdown('   ')).toBe(false);
    });
  });

  describe('Backup Manager', () => {
    describe('createBackup', () => {
      it('should create a timestamped backup of a file', async () => {
        const filePath = join(testDir, 'test.md');
        const content = '# Test Document\n\nSome content';
        const backupDir = join(testDir, 'backups');

        // Create original file
        await fs.writeFile(filePath, content);

        // Create backup
        const result = await createBackup(filePath, { backupDir });

        expect(result.success).toBe(true);
        expect(result.backupPath).toBeDefined();
        expect(result.error).toBeUndefined();

        // Verify backup file exists
        if (result.backupPath) {
          const backupExists = await fileExists(result.backupPath);
          expect(backupExists).toBe(true);

          // Verify backup content matches original
          const backupContent = await fs.readFile(result.backupPath, 'utf-8');
          expect(backupContent).toBe(content);
        }
      });

      it('should fail when source file does not exist', async () => {
        const filePath = join(testDir, 'nonexistent.md');
        const backupDir = join(testDir, 'backups');

        const result = await createBackup(filePath, { backupDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain('does not exist');
      });

      it('should create backup directory if it does not exist', async () => {
        const filePath = join(testDir, 'test.md');
        const content = 'Test content';
        const backupDir = join(testDir, 'new-backups');

        await fs.writeFile(filePath, content);

        const result = await createBackup(filePath, { backupDir });

        expect(result.success).toBe(true);

        // Verify backup directory was created
        const dirExists = await fileExists(backupDir);
        expect(dirExists).toBe(true);
      });

      it('should include timestamp in backup filename', async () => {
        const filePath = join(testDir, 'test.md');
        const content = 'Test content';
        const backupDir = join(testDir, 'backups');

        await fs.writeFile(filePath, content);

        const result = await createBackup(filePath, { backupDir });

        expect(result.success).toBe(true);
        expect(result.backupPath).toBeDefined();

        if (result.backupPath) {
          // Verify filename format: test.md.backup.{timestamp}.md
          const fileName = basename(result.backupPath);
          expect(fileName).toMatch(
            /^test\.md\.backup\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.md$/
          );
        }
      });

      it('should clean up old backups keeping only last N', async () => {
        const filePath = join(testDir, 'test.md');
        const content = 'Test content';
        const backupDir = join(testDir, 'backups');
        const maxBackups = 3;

        await fs.writeFile(filePath, content);

        // Create 5 backups
        for (let i = 0; i < 5; i++) {
          await createBackup(filePath, { backupDir, maxBackups });
          // Small delay to ensure different timestamps
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // List backups
        const backups = await listBackups(filePath, backupDir);

        // Should only have maxBackups (3) remaining
        expect(backups.length).toBe(maxBackups);
      });

      it('should keep most recent backups when cleaning up', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'backups');
        const maxBackups = 2;

        await fs.writeFile(filePath, 'Version 1');

        // Create first backup
        const backup1 = await createBackup(filePath, { backupDir, maxBackups });
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Update file and create second backup
        await fs.writeFile(filePath, 'Version 2');
        const backup2 = await createBackup(filePath, { backupDir, maxBackups });
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Update file and create third backup (should delete first)
        await fs.writeFile(filePath, 'Version 3');
        const backup3 = await createBackup(filePath, { backupDir, maxBackups });

        // List remaining backups
        const backups = await listBackups(filePath, backupDir);

        expect(backups.length).toBe(maxBackups);

        // First backup should be deleted
        if (backup1.backupPath) {
          const exists = await fileExists(backup1.backupPath);
          expect(exists).toBe(false);
        }

        // Second and third backups should exist
        if (backup2.backupPath) {
          const exists = await fileExists(backup2.backupPath);
          expect(exists).toBe(true);
        }
        if (backup3.backupPath) {
          const exists = await fileExists(backup3.backupPath);
          expect(exists).toBe(true);
        }
      });

      it('should use default backup directory when not specified', async () => {
        const filePath = join(testDir, 'test.md');
        const content = 'Test content';

        await fs.writeFile(filePath, content);

        const result = await createBackup(filePath);

        expect(result.success).toBe(true);
        expect(result.backupPath).toBeDefined();

        if (result.backupPath) {
          // Should use .kiro/backups as default (normalize path separators)
          const normalizedPath = result.backupPath.replace(/\\/g, '/');
          expect(normalizedPath).toContain('.kiro/backups');
        }
      });

      it('should handle multiple files with different names', async () => {
        const file1 = join(testDir, 'file1.md');
        const file2 = join(testDir, 'file2.md');
        const backupDir = join(testDir, 'backups');

        await fs.writeFile(file1, 'Content 1');
        await fs.writeFile(file2, 'Content 2');

        const result1 = await createBackup(file1, { backupDir });
        const result2 = await createBackup(file2, { backupDir });

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);

        // Verify both backups exist
        const backups1 = await listBackups(file1, backupDir);
        const backups2 = await listBackups(file2, backupDir);

        expect(backups1.length).toBe(1);
        expect(backups2.length).toBe(1);
      });
    });

    describe('listBackups', () => {
      it('should list all backups for a file', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'backups');

        await fs.writeFile(filePath, 'Content');

        // Create multiple backups
        await createBackup(filePath, { backupDir });
        await new Promise((resolve) => setTimeout(resolve, 10));
        await createBackup(filePath, { backupDir });
        await new Promise((resolve) => setTimeout(resolve, 10));
        await createBackup(filePath, { backupDir });

        const backups = await listBackups(filePath, backupDir);

        expect(backups.length).toBe(3);
      });

      it('should return backups sorted by timestamp (newest first)', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'backups');

        await fs.writeFile(filePath, 'Content');

        // Create backups with delays
        await createBackup(filePath, { backupDir });
        await new Promise((resolve) => setTimeout(resolve, 10));
        await createBackup(filePath, { backupDir });
        await new Promise((resolve) => setTimeout(resolve, 10));
        await createBackup(filePath, { backupDir });

        const backups = await listBackups(filePath, backupDir);

        // Verify sorted (newest first means later in alphabet due to timestamp format)
        for (let i = 0; i < backups.length - 1; i++) {
          const current = backups[i];
          const next = backups[i + 1];
          if (current && next) {
            expect(current > next).toBe(true);
          }
        }
      });

      it('should return empty array when no backups exist', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'backups');

        const backups = await listBackups(filePath, backupDir);

        expect(backups).toEqual([]);
      });

      it('should return empty array when backup directory does not exist', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'nonexistent-backups');

        const backups = await listBackups(filePath, backupDir);

        expect(backups).toEqual([]);
      });

      it('should only list backups for the specified file', async () => {
        const file1 = join(testDir, 'file1.md');
        const file2 = join(testDir, 'file2.md');
        const backupDir = join(testDir, 'backups');

        await fs.writeFile(file1, 'Content 1');
        await fs.writeFile(file2, 'Content 2');

        // Create backups for both files
        await createBackup(file1, { backupDir });
        await createBackup(file2, { backupDir });

        // List backups for file1
        const backups1 = await listBackups(file1, backupDir);

        // Should only include file1 backups
        expect(backups1.length).toBe(1);
        expect(backups1[0]).toContain('file1.md.backup');
      });
    });

    describe('restoreFromBackup', () => {
      it('should restore a file from backup', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'backups');
        const originalContent = 'Original content';
        const modifiedContent = 'Modified content';

        // Create original file and backup
        await fs.writeFile(filePath, originalContent);
        const backupResult = await createBackup(filePath, { backupDir });

        // Modify the file
        await fs.writeFile(filePath, modifiedContent);

        // Restore from backup
        if (backupResult.backupPath) {
          const restoreResult = await restoreFromBackup(backupResult.backupPath, filePath);

          expect(restoreResult.success).toBe(true);

          // Verify file content is restored
          const restoredContent = await fs.readFile(filePath, 'utf-8');
          expect(restoredContent).toBe(originalContent);
        }
      });

      it('should fail when backup file does not exist', async () => {
        const backupPath = join(testDir, 'nonexistent-backup.md');
        const targetPath = join(testDir, 'test.md');

        const result = await restoreFromBackup(backupPath, targetPath);

        expect(result.success).toBe(false);
        expect(result.error).toContain('does not exist');
      });

      it('should use atomic write when restoring', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'backups');
        const content = 'Test content';

        await fs.writeFile(filePath, content);
        const backupResult = await createBackup(filePath, { backupDir });

        if (backupResult.backupPath) {
          const result = await restoreFromBackup(backupResult.backupPath, filePath);

          expect(result.success).toBe(true);

          // Verify no temp file left behind
          const tempPath = `${filePath}.tmp`;
          const tempExists = await fileExists(tempPath);
          expect(tempExists).toBe(false);
        }
      });
    });

    describe('atomicWriteWithBackup', () => {
      it('should create backup before writing', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'backups');
        const originalContent = 'Original content';
        const newContent = 'New content';

        // Create original file
        await fs.writeFile(filePath, originalContent);

        // Write with backup
        const result = await atomicWriteWithBackup(filePath, newContent, { backupDir });

        expect(result.success).toBe(true);

        // Verify file has new content
        const fileContent = await fs.readFile(filePath, 'utf-8');
        expect(fileContent).toBe(newContent);

        // Verify backup was created
        const backups = await listBackups(filePath, backupDir);
        expect(backups.length).toBe(1);

        // Verify backup has original content
        const firstBackup = backups[0];
        if (firstBackup) {
          const backupContent = await fs.readFile(firstBackup, 'utf-8');
          expect(backupContent).toBe(originalContent);
        }
      });

      it('should not create backup for new file', async () => {
        const filePath = join(testDir, 'new-file.md');
        const backupDir = join(testDir, 'backups');
        const content = 'New content';

        // Write to new file (does not exist yet)
        const result = await atomicWriteWithBackup(filePath, content, { backupDir });

        expect(result.success).toBe(true);

        // Verify file was created
        const fileContent = await fs.readFile(filePath, 'utf-8');
        expect(fileContent).toBe(content);

        // Verify no backup was created (file didn't exist before)
        const backups = await listBackups(filePath, backupDir);
        expect(backups.length).toBe(0);
      });

      it('should fail if backup fails', async () => {
        const filePath = join(testDir, 'test.md');
        // Use a path that will definitely fail (read-only root on Windows)
        const backupDir = 'C:\\Windows\\System32\\backups';
        const content = 'Test content';

        await fs.writeFile(filePath, 'Original');

        // Try to write with backup to invalid path (should fail due to permissions)
        const result = await atomicWriteWithBackup(filePath, content, { backupDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Backup failed');

        // Verify original file is unchanged
        const fileContent = await fs.readFile(filePath, 'utf-8');
        expect(fileContent).toBe('Original');
      });

      it('should support validation with backup', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'backups');
        const originalContent = 'Original content';
        const newContent = 'Invalid content';

        await fs.writeFile(filePath, originalContent);

        // Validator that fails
        const validator = (): boolean => false;

        const result = await atomicWriteWithBackup(filePath, newContent, {
          backupDir,
          validate: validator,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('validation failed');

        // Verify original file is unchanged
        const fileContent = await fs.readFile(filePath, 'utf-8');
        expect(fileContent).toBe(originalContent);

        // Verify backup was still created (before validation)
        const backups = await listBackups(filePath, backupDir);
        expect(backups.length).toBe(1);
      });

      it('should clean up old backups automatically', async () => {
        const filePath = join(testDir, 'test.md');
        const backupDir = join(testDir, 'backups');
        const maxBackups = 2;

        await fs.writeFile(filePath, 'Version 1');

        // Write multiple times with backup
        await atomicWriteWithBackup(filePath, 'Version 2', { backupDir, maxBackups });
        await new Promise((resolve) => setTimeout(resolve, 10));
        await atomicWriteWithBackup(filePath, 'Version 3', { backupDir, maxBackups });
        await new Promise((resolve) => setTimeout(resolve, 10));
        await atomicWriteWithBackup(filePath, 'Version 4', { backupDir, maxBackups });

        // Should only have maxBackups remaining
        const backups = await listBackups(filePath, backupDir);
        expect(backups.length).toBe(maxBackups);
      });
    });
  });

  describe('Task Status Updater', () => {
    describe('updateTaskStatus', () => {
      it('should update task status from not_started to in_progress', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1. First task
- [ ] 2. Second task
  - [ ] 2.1 Sub-task one
  - [ ] 2.2 Sub-task two
- [ ] 3. Third task
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '2.1', 'in_progress', { backupDir });

        expect(result.success).toBe(true);
        expect(result.taskId).toBe('2.1');
        expect(result.status).toBe('in_progress');

        // Verify file was updated
        const updatedContent = await fs.readFile(tasksFile, 'utf-8');
        expect(updatedContent).toContain('- [>] 2.1 Sub-task one');

        // Verify other tasks unchanged
        expect(updatedContent).toContain('- [ ] 1. First task');
        expect(updatedContent).toContain('- [ ] 2. Second task');
        expect(updatedContent).toContain('- [ ] 2.2 Sub-task two');
      });

      it('should update task status to completed', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [>] 3.1 Task in progress
- [ ] 3.2 Task not started
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '3.1', 'completed', { backupDir });

        expect(result.success).toBe(true);

        const updatedContent = await fs.readFile(tasksFile, 'utf-8');
        expect(updatedContent).toContain('- [x] 3.1 Task in progress');
      });

      it('should update task status to queued', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1.1 First task
- [ ] 1.2 Second task
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '1.2', 'queued', { backupDir });

        expect(result.success).toBe(true);

        const updatedContent = await fs.readFile(tasksFile, 'utf-8');
        expect(updatedContent).toContain('- [~] 1.2 Second task');
      });

      it('should preserve indentation for nested tasks', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1. Parent task
  - [ ] 1.1 Child task
    - [ ] 1.1.1 Grandchild task
  - [ ] 1.2 Another child
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '1.1.1', 'in_progress', { backupDir });

        expect(result.success).toBe(true);

        const updatedContent = await fs.readFile(tasksFile, 'utf-8');
        // Verify indentation is preserved
        expect(updatedContent).toContain('    - [>] 1.1.1 Grandchild task');
      });

      it('should handle optional tasks with asterisk', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1. Regular task
- [ ]* 2. Optional task
- [ ] 3. Another regular task
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '2', 'completed', { backupDir });

        expect(result.success).toBe(true);

        const updatedContent = await fs.readFile(tasksFile, 'utf-8');
        // Verify asterisk is preserved
        expect(updatedContent).toContain('- [x]* 2. Optional task');
      });

      it('should preserve all markdown formatting', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Implementation Plan

## Overview
This is the overview section.

## Tasks

- [ ] 1. First task with **bold** text
  - Description with _italics_
  - [ ] 1.1 Sub-task with [link](https://example.com)
- [ ] 2. Second task
  - _Requirements: 1.2, 3.4_

## Notes
Some notes here.
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '1.1', 'completed', { backupDir });

        expect(result.success).toBe(true);

        const updatedContent = await fs.readFile(tasksFile, 'utf-8');

        // Verify task was updated
        expect(updatedContent).toContain('- [x] 1.1 Sub-task with [link](https://example.com)');

        // Verify all other formatting preserved
        expect(updatedContent).toContain('# Implementation Plan');
        expect(updatedContent).toContain('## Overview');
        expect(updatedContent).toContain('**bold**');
        expect(updatedContent).toContain('_italics_');
        expect(updatedContent).toContain('_Requirements: 1.2, 3.4_');
        expect(updatedContent).toContain('## Notes');
      });

      it('should create backup before updating', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const originalContent = `# Tasks

- [ ] 1. Task one
`;

        await fs.writeFile(tasksFile, originalContent);

        const result = await updateTaskStatus(tasksFile, '1', 'completed', {
          backupDir,
          createBackup: true,
        });

        expect(result.success).toBe(true);

        // Verify backup was created
        const backups = await listBackups(tasksFile, backupDir);
        expect(backups.length).toBe(1);

        // Verify backup has original content
        const backupContent = await fs.readFile(backups[0]!, 'utf-8');
        expect(backupContent).toBe(originalContent);
      });

      it('should skip backup when createBackup is false', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1. Task one
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '1', 'completed', {
          backupDir,
          createBackup: false,
        });

        expect(result.success).toBe(true);

        // Verify no backup was created
        const backups = await listBackups(tasksFile, backupDir);
        expect(backups.length).toBe(0);
      });

      it('should fail when tasks file does not exist', async () => {
        const tasksFile = join(testDir, 'nonexistent-tasks.md');
        const backupDir = join(testDir, 'backups');

        const result = await updateTaskStatus(tasksFile, '1', 'completed', { backupDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain('does not exist');
      });

      it('should fail when task ID is not found', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1. Task one
- [ ] 2. Task two
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '99', 'completed', { backupDir });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });

      it('should handle task IDs with dots correctly', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1.2.3 Task with dots
- [ ] 1.2.4 Another task
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '1.2.3', 'completed', { backupDir });

        expect(result.success).toBe(true);

        const updatedContent = await fs.readFile(tasksFile, 'utf-8');
        expect(updatedContent).toContain('- [x] 1.2.3 Task with dots');
        // Verify other task unchanged
        expect(updatedContent).toContain('- [ ] 1.2.4 Another task');
      });

      it('should only update the first matching task ID', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1. First occurrence
- [ ] 1. Second occurrence (should not be updated)
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '1', 'completed', { backupDir });

        expect(result.success).toBe(true);

        const updatedContent = await fs.readFile(tasksFile, 'utf-8');
        const lines = updatedContent.split('\n');

        // First occurrence should be updated
        expect(lines[2]).toContain('- [x] 1. First occurrence');
        // Second occurrence should remain unchanged
        expect(lines[3]).toContain('- [ ] 1. Second occurrence');
      });

      it('should handle all status transitions', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1. Task one
- [ ] 2. Task two
- [ ] 3. Task three
- [ ] 4. Task four
`;

        await fs.writeFile(tasksFile, content);

        // Test all status transitions
        const statuses: TaskStatus[] = ['not_started', 'queued', 'in_progress', 'completed'];
        const expectedMarkers = ['[ ]', '[~]', '[>]', '[x]'];

        for (let i = 0; i < statuses.length; i++) {
          const taskId = `${i + 1}`;
          const status = statuses[i]!;
          const expectedMarker = expectedMarkers[i]!;

          const result = await updateTaskStatus(tasksFile, taskId, status, { backupDir });
          expect(result.success).toBe(true);

          const updatedContent = await fs.readFile(tasksFile, 'utf-8');
          expect(updatedContent).toContain(`- ${expectedMarker} ${taskId}. Task`);
        }
      });

      it('should use atomic write pattern', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1. Task one
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '1', 'completed', { backupDir });

        expect(result.success).toBe(true);

        // Verify no temp file left behind
        const tempPath = `${tasksFile}.tmp`;
        const tempExists = await fileExists(tempPath);
        expect(tempExists).toBe(false);
      });

      it('should handle complex task descriptions with special characters', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1.1 Task with (parentheses) and [brackets]
- [ ] 2.2 Task with "quotes" and 'apostrophes'
- [ ] 3.3 Task with $pecial ch@racters!
`;

        await fs.writeFile(tasksFile, content);

        const result1 = await updateTaskStatus(tasksFile, '1.1', 'completed', { backupDir });
        expect(result1.success).toBe(true);

        const result2 = await updateTaskStatus(tasksFile, '2.2', 'in_progress', { backupDir });
        expect(result2.success).toBe(true);

        const result3 = await updateTaskStatus(tasksFile, '3.3', 'queued', { backupDir });
        expect(result3.success).toBe(true);

        const updatedContent = await fs.readFile(tasksFile, 'utf-8');
        expect(updatedContent).toContain('- [x] 1.1 Task with (parentheses) and [brackets]');
        expect(updatedContent).toContain('- [>] 2.2 Task with "quotes" and \'apostrophes\'');
        expect(updatedContent).toContain('- [~] 3.3 Task with $pecial ch@racters!');
      });

      it('should respect maxBackups option', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const maxBackups = 2;
        const content = `# Tasks

- [ ] 1. Task one
`;

        await fs.writeFile(tasksFile, content);

        // Create multiple updates to generate backups
        await updateTaskStatus(tasksFile, '1', 'queued', { backupDir, maxBackups });
        await new Promise((resolve) => setTimeout(resolve, 10));
        await updateTaskStatus(tasksFile, '1', 'in_progress', { backupDir, maxBackups });
        await new Promise((resolve) => setTimeout(resolve, 10));
        await updateTaskStatus(tasksFile, '1', 'completed', { backupDir, maxBackups });

        // Should only have maxBackups remaining
        const backups = await listBackups(tasksFile, backupDir);
        expect(backups.length).toBe(maxBackups);
      });

      it('should handle empty lines and whitespace correctly', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks


- [ ] 1. Task one

  - [ ] 1.1 Sub-task with extra spacing

- [ ] 2. Task two


`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '1.1', 'completed', { backupDir });

        expect(result.success).toBe(true);

        const updatedContent = await fs.readFile(tasksFile, 'utf-8');

        // Verify task was updated
        expect(updatedContent).toContain('- [x] 1.1 Sub-task with extra spacing');

        // Verify empty lines preserved
        const lines = updatedContent.split('\n');
        expect(lines[1]).toBe('');
        expect(lines[2]).toBe('');
      });

      it('should validate markdown after update', async () => {
        const tasksFile = join(testDir, 'tasks.md');
        const backupDir = join(testDir, 'backups');
        const content = `# Tasks

- [ ] 1. Task one
`;

        await fs.writeFile(tasksFile, content);

        const result = await updateTaskStatus(tasksFile, '1', 'completed', { backupDir });

        expect(result.success).toBe(true);

        // Verify the updated file is still valid markdown
        const updatedContent = await fs.readFile(tasksFile, 'utf-8');
        expect(validateMarkdown(updatedContent)).toBe(true);
      });
    });
  });
});
