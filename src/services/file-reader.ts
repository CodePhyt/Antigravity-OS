/**
 * File Reader Service
 * Handles reading spec files from the file system
 */

import { promises as fs } from 'fs';
import path from 'path';
import { SpecParseError } from './spec-parser';

/**
 * Spec file names
 */
export const SPEC_FILES = {
  REQUIREMENTS: 'requirements.md',
  DESIGN: 'design.md',
  TASKS: 'tasks.md',
} as const;

/**
 * Result of reading spec files
 */
export interface SpecFiles {
  requirements: string;
  design: string;
  tasks: string;
}

/**
 * Reads all three spec files from a directory
 * @param specPath - Path to spec directory
 * @returns Contents of all three spec files
 * @throws SpecParseError if any file is missing or unreadable
 */
export async function readSpecFiles(specPath: string): Promise<SpecFiles> {
  const requirementsPath = path.join(specPath, SPEC_FILES.REQUIREMENTS);
  const designPath = path.join(specPath, SPEC_FILES.DESIGN);
  const tasksPath = path.join(specPath, SPEC_FILES.TASKS);

  try {
    // Read all files in parallel
    const [requirements, design, tasks] = await Promise.all([
      readFile(requirementsPath, SPEC_FILES.REQUIREMENTS),
      readFile(designPath, SPEC_FILES.DESIGN),
      readFile(tasksPath, SPEC_FILES.TASKS),
    ]);

    return {
      requirements,
      design,
      tasks,
    };
  } catch (error) {
    if (error instanceof SpecParseError) {
      throw error;
    }
    throw new SpecParseError(
      `Failed to read spec files from ${specPath}: ${String(error)}`,
      specPath
    );
  }
}

/**
 * Reads a single file with error handling
 * @param filePath - Path to file
 * @param fileName - Name of file (for error messages)
 * @returns File contents
 * @throws SpecParseError if file cannot be read
 */
async function readFile(filePath: string, fileName: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new SpecParseError(`Required spec file is missing: ${fileName}`, fileName);
    }
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new SpecParseError(`Permission denied reading file: ${fileName}`, fileName);
    }
    throw new SpecParseError(`Failed to read ${fileName}: ${String(error)}`, fileName);
  }
}

/**
 * Checks if a directory exists
 * @param dirPath - Path to directory
 * @returns True if directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Extracts feature name from spec path
 * @param specPath - Path to spec directory (e.g., ".kiro/specs/feature-name")
 * @returns Feature name
 */
export function extractFeatureName(specPath: string): string {
  return path.basename(specPath);
}
