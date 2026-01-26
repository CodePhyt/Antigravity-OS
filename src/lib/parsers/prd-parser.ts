/**
 * PRD Parser
 * 
 * Parses PRD.md to extract task status and calculate completion percentage.
 * Implements Requirements 2.1, 2.3, 2.4, 2.5, 8.1, 8.2, 8.4 from Ralph's Brain View spec.
 */

import { readFile } from 'fs/promises';

/**
 * Task status indicating current state
 */
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * Structured task entry extracted from PRD.md
 */
export interface Task {
  /** Task identifier (e.g., "1", "2.1") */
  id: string;
  /** Task description */
  description: string;
  /** Current task status */
  status: TaskStatus;
  /** Priority level (0 = normal, 1 = high) */
  priority: number;
  /** Array of task IDs this task depends on */
  dependencies: string[];
}

/**
 * PRD status summary with task metadata
 */
export interface PRDStatus {
  /** Total number of top-level tasks */
  totalTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Number of in-progress tasks */
  inProgressTasks: number;
  /** Completion percentage (0-100) */
  completionPercentage: number;
  /** Array of all tasks */
  tasks: Task[];
  /** Error information if parsing failed */
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
}

/**
 * PRDParser extracts task status and calculates completion from PRD.md
 * 
 * The parser looks for markdown checkbox tasks with the format:
 * - [ ] Task description (not started)
 * - [x] Task description (completed)
 * 
 * Only top-level tasks are counted (not sub-tasks with indentation)
 */
export class PRDParser {
  /**
   * Parse PRD.md and return task status summary
   * 
   * Implements graceful error handling:
   * - Returns empty state for missing files (ENOENT)
   * - Returns empty state for permission errors (EACCES)
   * - Logs errors with context for debugging
   * - Never throws, always returns valid result
   * 
   * @param filepath - Path to PRD.md
   * @returns PRD status with tasks and completion percentage
   */
  static async parse(filepath: string): Promise<PRDStatus> {
    try {
      const content = await readFile(filepath, 'utf-8');
      const tasks: Task[] = [];

      // Regex to match top-level checkbox tasks (no leading spaces/tabs)
      // Format: - [x] or - [ ] at start of line, followed by optional number and description
      // Task ID can be: 1, 2, 10, 1.1, 2.3, etc.
      const taskRegex = /^- \[([ x])\] (?:([\d.]+)\.\s+)?(.+)$/gm;
      const matches = Array.from(content.matchAll(taskRegex));

      for (const match of matches) {
        const [, checked, taskId, description] = match;
        if (!description || !checked) continue;
        
        // Determine status based on checkbox
        const status: TaskStatus = checked === 'x' ? 'completed' : 'not_started';
        
        // Use task number if present, otherwise generate sequential ID
        const id = taskId ?? String(tasks.length + 1);

        // Extract dependencies from description
        const dependencies = this.extractDependencies(description);

        tasks.push({
          id,
          description: description.trim(),
          status,
          priority: 0, // Default priority, can be updated via API
          dependencies,
        });
      }

      // Calculate statistics
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = 0; // Will be detected from ACTIVITY_LOG.md in integration
      const totalTasks = tasks.length;
      const completionPercentage = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        completionPercentage,
        tasks,
      };
    } catch (error) {
      // Graceful error handling with structured logging
      const errorCode = (error as NodeJS.ErrnoException).code || 'UNKNOWN';
      const errorMessage = (error as Error).message;

      // Log error with context
      console.error('[PRDParser] Parse error:', {
        filepath,
        errorCode,
        errorMessage,
        timestamp: new Date().toISOString(),
      });

      // Return empty state for common errors (file not found, permission denied)
      const emptyState: PRDStatus = {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        completionPercentage: 0,
        tasks: [],
      };

      if (errorCode === 'ENOENT' || errorCode === 'EACCES') {
        return emptyState;
      }

      // For unexpected errors, return empty state with error info
      console.error('[PRDParser] Unexpected error:', error);
      return {
        ...emptyState,
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Extract task dependencies from description
   * 
   * Looks for patterns like:
   * - "depends on 2.1"
   * - "requires task 3"
   * - "blocked by 1.2, 1.3"
   * 
   * @param description - Task description text
   * @returns Array of task IDs this task depends on
   */
  private static extractDependencies(description: string): string[] {
    const dependencies: string[] = [];

    // Pattern 1: "depends on X.Y" or "depends on X"
    const dependsOnRegex = /depends on ([\d.]+)/gi;
    const dependsMatches = description.matchAll(dependsOnRegex);
    for (const match of dependsMatches) {
      const dep = match[1];
      if (dep) dependencies.push(dep);
    }

    // Pattern 2: "requires task X.Y" or "requires X"
    const requiresRegex = /requires (?:task )?([\d.]+)/gi;
    const requiresMatches = description.matchAll(requiresRegex);
    for (const match of requiresMatches) {
      const dep = match[1];
      if (dep) dependencies.push(dep);
    }

    // Pattern 3: "blocked by X.Y, X.Z"
    const blockedByRegex = /blocked by ([\d., ]+)/gi;
    const blockedMatches = description.matchAll(blockedByRegex);
    for (const match of blockedMatches) {
      const blockedBy = match[1];
      if (!blockedBy) continue;
      // Split by comma and extract task IDs
      const ids = blockedBy.split(',').map(id => id.trim()).filter(id => /^[\d.]+$/.test(id));
      dependencies.push(...ids);
    }

    // Remove duplicates
    return Array.from(new Set(dependencies));
  }
}
