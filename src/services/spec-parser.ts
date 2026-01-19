/**
 * Spec Parser Service
 * Reads and parses markdown specification files
 */

import type { ParsedSpec, Task, Requirement, Property, ParseError } from '@/types/spec';
import { readSpecFiles, extractFeatureName, directoryExists } from './file-reader';
import { parseTasks, validateTaskStructure } from './task-parser';
import { parseRequirements, validateRequirementIds } from './requirements-parser';
import { parseProperties, validatePropertyNumbers } from './properties-parser';

/**
 * Main interface for the Spec Parser service
 */
export interface SpecParser {
  /**
   * Parse a complete spec directory
   * @param specPath - Path to spec directory (e.g., ".kiro/specs/feature-name")
   * @returns Parsed specification
   * @throws ParseError if parsing fails
   */
  parseSpec(specPath: string): Promise<ParsedSpec>;

  /**
   * Parse tasks from tasks.md content
   * @param content - Raw markdown content
   * @returns Array of parsed tasks
   * @throws ParseError if parsing fails
   */
  parseTasksFile(content: string): Task[];

  /**
   * Extract requirements from requirements.md content
   * @param content - Raw markdown content
   * @returns Array of parsed requirements
   * @throws ParseError if parsing fails
   */
  extractRequirements(content: string): Requirement[];

  /**
   * Extract properties from design.md content
   * @param content - Raw markdown content
   * @returns Array of parsed properties
   * @throws ParseError if parsing fails
   */
  extractProperties(content: string): Property[];
}

/**
 * Default implementation of SpecParser
 */
export class DefaultSpecParser implements SpecParser {
  /**
   * Parse a complete spec directory
   */
  async parseSpec(specPath: string): Promise<ParsedSpec> {
    // Validate directory exists
    const exists = await directoryExists(specPath);
    if (!exists) {
      throw new SpecParseError(`Spec directory does not exist: ${specPath}`, specPath);
    }

    // Extract feature name
    const featureName = extractFeatureName(specPath);

    // Read all spec files
    const files = await readSpecFiles(specPath);

    // Parse each file
    const requirements = this.extractRequirements(files.requirements);
    const properties = this.extractProperties(files.design);
    const tasks = this.parseTasksFile(files.tasks);

    // Validate
    validateRequirementIds(requirements);
    validatePropertyNumbers(properties);
    validateTaskStructure(tasks);

    return {
      featureName,
      requirements,
      properties,
      tasks,
    };
  }

  /**
   * Parse tasks from tasks.md content
   */
  parseTasksFile(content: string): Task[] {
    return parseTasks(content);
  }

  /**
   * Extract requirements from requirements.md content
   */
  extractRequirements(content: string): Requirement[] {
    return parseRequirements(content);
  }

  /**
   * Extract properties from design.md content
   */
  extractProperties(content: string): Property[] {
    return parseProperties(content);
  }
}

/**
 * Custom error class for parse failures
 */
export class SpecParseError extends Error {
  constructor(
    message: string,
    public readonly file: string,
    public readonly lineNumber: number | null = null,
    public readonly context: string | null = null
  ) {
    super(message);
    this.name = 'SpecParseError';
  }

  /**
   * Convert to ParseError interface
   */
  toParseError(): ParseError {
    return {
      message: this.message,
      file: this.file,
      lineNumber: this.lineNumber,
      context: this.context,
    };
  }
}

/**
 * Validates a TaskStatus value
 * @param status - Status string to validate
 * @returns True if valid TaskStatus
 */
export function isValidTaskStatus(
  status: string
): status is 'not_started' | 'queued' | 'in_progress' | 'completed' {
  return ['not_started', 'queued', 'in_progress', 'completed'].includes(status);
}

/**
 * Converts checkbox marker to TaskStatus
 * @param marker - Checkbox marker (e.g., " ", "x", "~", ">")
 * @returns Corresponding TaskStatus
 */
export function checkboxToStatus(
  marker: string
): 'not_started' | 'queued' | 'in_progress' | 'completed' {
  switch (marker) {
    case ' ':
      return 'not_started';
    case '~':
      return 'queued';
    case '>':
    case '-':
      return 'in_progress';
    case 'x':
    case 'X':
      return 'completed';
    default:
      return 'not_started';
  }
}

/**
 * Converts TaskStatus to checkbox marker
 * @param status - Task status
 * @returns Checkbox marker character
 */
export function statusToCheckbox(
  status: 'not_started' | 'queued' | 'in_progress' | 'completed'
): string {
  switch (status) {
    case 'not_started':
      return ' ';
    case 'queued':
      return '~';
    case 'in_progress':
      return '-';
    case 'completed':
      return 'x';
  }
}
