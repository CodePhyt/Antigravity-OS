/**
 * Correction Applier Component
 * Applies corrections to spec files using atomic file operations
 * 
 * This component:
 * 1. Applies corrections using atomic file write
 * 2. Preserves unrelated content (surgical updates)
 * 3. Validates spec syntax before commit
 * 
 * Requirements: 5.3, 8.5
 */

import type { CorrectionPlan } from './correction-generator';
import { atomicWriteWithBackup, validateMarkdown } from '@/infrastructure/file-system';
import { join } from 'path';

/**
 * Result of applying a correction
 */
export interface CorrectionApplicationResult {
  /** Whether the correction was successfully applied */
  success: boolean;

  /** Path to the file that was updated */
  filePath: string;

  /** Path to the backup file (if created) */
  backupPath?: string;

  /** Error message if application failed */
  error?: string;

  /** The correction plan that was applied */
  correctionPlan: CorrectionPlan;
}

/**
 * Options for applying corrections
 */
export interface CorrectionApplicationOptions {
  /** Path to the spec directory */
  specPath: string;

  /** Whether to create a backup before applying (default: true) */
  createBackup?: boolean;

  /** Directory to store backups (default: .kiro/backups) */
  backupDir?: string;

  /** Maximum number of backups to keep (default: 10) */
  maxBackups?: number;

  /** Whether to perform strict validation (default: true) */
  strictValidation?: boolean;
}

/**
 * Correction Applier applies corrections to spec files using atomic operations
 * 
 * Responsibilities:
 * - Apply corrections using atomic file write
 * - Preserve unrelated content (surgical updates)
 * - Validate spec syntax before commit
 * - Create backups before modifications
 * - Handle application failures gracefully
 * 
 * **Validates: Requirements 5.3, 8.5**
 */
export class CorrectionApplier {
  /**
   * Applies a correction plan to the appropriate spec file
   * 
   * Algorithm:
   * 1. Validate the correction plan
   * 2. Determine the full file path
   * 3. Validate the updated content
   * 4. Apply using atomic write with backup
   * 5. Return result with success/failure status
   * 
   * @param correctionPlan - The correction plan to apply
   * @param options - Application options
   * @returns CorrectionApplicationResult indicating success or failure
   * 
   * **Validates: Requirements 5.3, 8.5**
   */
  async applyCorrection(
    correctionPlan: CorrectionPlan,
    options: CorrectionApplicationOptions
  ): Promise<CorrectionApplicationResult> {
    const {
      specPath,
      backupDir = '.kiro/backups',
      maxBackups = 10,
      strictValidation = true,
    } = options;

    try {
      // Step 1: Validate the correction plan
      const validationError = this.validateCorrectionPlan(correctionPlan);
      if (validationError) {
        return {
          success: false,
          filePath: join(specPath, correctionPlan.targetFile),
          error: validationError,
          correctionPlan,
        };
      }

      // Step 2: Determine the full file path
      const filePath = join(specPath, correctionPlan.targetFile);

      // Step 3: Validate the updated content (Requirement 8.5)
      const contentValidationError = this.validateUpdatedContent(
        correctionPlan.updatedContent,
        correctionPlan.targetFile,
        strictValidation
      );

      if (contentValidationError) {
        return {
          success: false,
          filePath,
          error: `Content validation failed: ${contentValidationError}`,
          correctionPlan,
        };
      }

      // Step 4: Apply using atomic write with backup (Requirement 5.3)
      const writeResult = await atomicWriteWithBackup(
        filePath,
        correctionPlan.updatedContent,
        {
          validate: (content) => this.validateBeforeCommit(content, correctionPlan.targetFile),
          createDirs: true,
          backupDir,
          maxBackups,
        }
      );

      if (!writeResult.success) {
        return {
          success: false,
          filePath,
          error: writeResult.error,
          correctionPlan,
        };
      }

      // Step 5: Return success result
      return {
        success: true,
        filePath,
        correctionPlan,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        filePath: join(options.specPath, correctionPlan.targetFile),
        error: `Failed to apply correction: ${errorMessage}`,
        correctionPlan,
      };
    }
  }

  /**
   * Validates a correction plan before applying
   * 
   * Checks:
   * - Target file is valid
   * - Updated content is not empty
   * - Correction description is present
   * - Error type is valid
   * 
   * @param plan - Correction plan to validate
   * @returns Error message if invalid, null if valid
   */
  private validateCorrectionPlan(plan: CorrectionPlan): string | null {
    // Check target file is valid
    const validTargetFiles = ['requirements.md', 'design.md', 'tasks.md'];
    if (!validTargetFiles.includes(plan.targetFile)) {
      return `Invalid target file: ${plan.targetFile}. Must be one of: ${validTargetFiles.join(', ')}`;
    }

    // Check updated content is not empty
    if (!plan.updatedContent || plan.updatedContent.trim().length === 0) {
      return 'Updated content is empty';
    }

    // Check correction description is present
    if (!plan.correction || plan.correction.trim().length === 0) {
      return 'Correction description is empty';
    }

    // Check error type is valid
    const validErrorTypes = [
      'test_failure',
      'compilation_error',
      'runtime_error',
      'missing_dependency',
      'invalid_spec',
      'timeout_error',
      'unknown_error',
    ];

    if (!validErrorTypes.includes(plan.errorType)) {
      return `Invalid error type: ${plan.errorType}`;
    }

    // Check attempt number is valid
    if (plan.attemptNumber < 1 || plan.attemptNumber > 3) {
      return `Invalid attempt number: ${plan.attemptNumber}. Must be between 1 and 3`;
    }

    return null;
  }

  /**
   * Validates the updated content before applying
   * 
   * Performs surgical update validation:
   * - Content is not empty
   * - Content is valid markdown
   * - Content structure is appropriate for file type
   * 
   * @param content - Updated content to validate
   * @param targetFile - Which spec file is being updated
   * @param strict - Whether to perform strict validation
   * @returns Error message if invalid, null if valid
   * 
   * **Validates: Requirement 8.5**
   */
  private validateUpdatedContent(
    content: string,
    targetFile: string,
    strict: boolean
  ): string | null {
    // Basic validation: content is not empty
    if (!content || content.trim().length === 0) {
      return 'Content is empty';
    }

    // Validate markdown structure
    if (!validateMarkdown(content)) {
      return 'Content is not valid markdown';
    }

    // Strict validation: check file-specific structure
    if (strict) {
      const structureError = this.validateFileStructure(content, targetFile);
      if (structureError) {
        return structureError;
      }
    }

    return null;
  }

  /**
   * Validates file-specific structure
   * 
   * @param content - Content to validate
   * @param targetFile - Which spec file is being validated
   * @returns Error message if invalid, null if valid
   */
  private validateFileStructure(content: string, targetFile: string): string | null {
    switch (targetFile) {
      case 'requirements.md':
        return this.validateRequirementsStructure(content);

      case 'design.md':
        return this.validateDesignStructure(content);

      case 'tasks.md':
        return this.validateTasksStructure(content);

      default:
        return null;
    }
  }

  /**
   * Validates requirements.md structure
   * 
   * Requirements:
   * - Must have at least one requirement section
   * - Requirements must be numbered
   * - Must have acceptance criteria
   * 
   * @param content - Content to validate
   * @returns Error message if invalid, null if valid
   */
  private validateRequirementsStructure(content: string): string | null {
    // Check for at least one requirement section
    if (!/### Requirement \d+:/i.test(content)) {
      return 'requirements.md must contain at least one requirement section (### Requirement N:)';
    }

    // Check for acceptance criteria sections
    if (!/#### Acceptance Criteria/i.test(content)) {
      return 'requirements.md must contain acceptance criteria sections';
    }

    return null;
  }

  /**
   * Validates design.md structure
   * 
   * Requirements:
   * - Must have at least one major section (## Header)
   * - Should have overview or architecture section
   * 
   * @param content - Content to validate
   * @returns Error message if invalid, null if valid
   */
  private validateDesignStructure(content: string): string | null {
    // Check for at least one major section
    if (!/## \w+/i.test(content)) {
      return 'design.md must contain at least one major section (## Header)';
    }

    // Check for overview or architecture section (recommended but not required)
    const hasOverview = /## Overview/i.test(content);
    const hasArchitecture = /## Architecture/i.test(content);

    if (!hasOverview && !hasArchitecture) {
      // This is a warning, not an error - we'll allow it
      // but log it for future reference
    }

    return null;
  }

  /**
   * Validates tasks.md structure
   * 
   * Requirements:
   * - Must have at least one task
   * - Tasks must have checkbox markers
   * - Tasks must have IDs
   * 
   * @param content - Content to validate
   * @returns Error message if invalid, null if valid
   */
  private validateTasksStructure(content: string): string | null {
    // Check for at least one task with checkbox
    if (!/- \[[^\]]\]\*?\s+[\d.]+\s+/i.test(content)) {
      return 'tasks.md must contain at least one task with checkbox marker (- [ ] N.N Task)';
    }

    return null;
  }

  /**
   * Validates content before committing the atomic write
   * 
   * This is the final validation step before the file is written.
   * It ensures the content is safe to commit.
   * 
   * @param content - Content to validate
   * @param targetFile - Which spec file is being written
   * @returns true if valid, false otherwise
   * 
   * **Validates: Requirement 8.5**
   */
  private validateBeforeCommit(content: string, targetFile: string): boolean {
    // Basic validation
    if (!content || content.trim().length === 0) {
      return false;
    }

    // Markdown validation
    if (!validateMarkdown(content)) {
      return false;
    }

    // File-specific structure validation
    const structureError = this.validateFileStructure(content, targetFile);
    if (structureError) {
      return false;
    }

    return true;
  }

  /**
   * Verifies that a correction was successfully applied
   * 
   * This method can be used after applying a correction to verify
   * that the file was updated correctly.
   * 
   * @param filePath - Path to the file that was updated
   * @param expectedContent - Expected content after correction
   * @returns true if verification succeeds, false otherwise
   */
  async verifyCorrection(filePath: string, expectedContent: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const actualContent = await fs.readFile(filePath, 'utf-8');

      // Compare content (normalize line endings)
      const normalizedExpected = expectedContent.replace(/\r\n/g, '\n');
      const normalizedActual = actualContent.replace(/\r\n/g, '\n');

      return normalizedExpected === normalizedActual;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Creates a correction applier instance
 * 
 * @returns CorrectionApplier instance
 */
export function createCorrectionApplier(): CorrectionApplier {
  return new CorrectionApplier();
}
