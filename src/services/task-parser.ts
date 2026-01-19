/**
 * Task Parser
 * Parses tasks.md markdown into structured Task objects
 */

import type { Task } from '@/types/spec';
import { checkboxToStatus } from './spec-parser';
import { SpecParseError } from './spec-parser';

/**
 * Regex patterns for parsing tasks
 */
const TASK_PATTERN = /^(\s*)- \[([^\]]*)\](\*)?\s+(.+)$/;
const REQUIREMENT_REF_PATTERN = /_Requirements?:\s*([\d.,\s]+)_/i;
const PROPERTY_REF_PATTERN = /\*\*Property\s+(\d+):/gi;

/**
 * Parses tasks.md content into Task objects
 * @param content - Raw markdown content
 * @returns Array of top-level tasks with children
 * @throws SpecParseError if parsing fails
 */
export function parseTasks(content: string): Task[] {
  const lines = content.split('\n');
  const tasks: Task[] = [];
  const taskStack: Array<{ task: Task; indent: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    // Remove trailing whitespace (including \r) but preserve leading whitespace
    const line = rawLine.trimEnd();
    if (!line) continue;

    const lineNumber = i + 1;

    // Skip headers
    if (line.trim().startsWith('#')) {
      continue;
    }

    // Try to match task pattern
    const match = line.match(TASK_PATTERN);
    if (!match) {
      // Not a task line, skip
      continue;
    }

    const [, indentStr, checkbox, optionalMarker, description] = match;
    if (!description) continue;
    const indent = indentStr?.length ?? 0;
    const isOptional = optionalMarker === '*';

    // Parse task ID and description
    const { id, cleanDescription } = parseTaskDescription(description, lineNumber);

    // Parse status from checkbox
    const status = checkboxToStatus(checkbox?.trim() ?? ' ');

    // Extract requirement and property references
    const requirementRefs = extractRequirementRefs(cleanDescription);
    const propertyRefs = extractPropertyRefs(cleanDescription);

    // Create task object
    const task: Task = {
      id,
      description: cleanDescription,
      status,
      isOptional,
      parentId: null,
      children: [],
      requirementRefs,
      propertyRefs,
    };

    // Determine parent based on indentation
    while (taskStack.length > 0 && taskStack[taskStack.length - 1]!.indent >= indent) {
      taskStack.pop();
    }

    if (taskStack.length === 0) {
      // Top-level task
      tasks.push(task);
    } else {
      // Child task
      const parent = taskStack[taskStack.length - 1]!.task;
      task.parentId = parent.id;
      parent.children.push(task);
    }

    // Add to stack for potential children
    taskStack.push({ task, indent });
  }

  return tasks;
}

/**
 * Parses task description to extract ID and clean description
 * @param description - Raw task description
 * @param lineNumber - Line number for error reporting
 * @returns Task ID and cleaned description
 */
function parseTaskDescription(
  description: string,
  lineNumber: number
): { id: string; cleanDescription: string } {
  // Match pattern: "1.2 Description text" or "1. Description text"
  const idMatch = description.match(/^([\d.]+)\s+(.+)$/);

  if (!idMatch) {
    throw new SpecParseError(
      `Task must start with numeric ID (e.g., "1.2 Task description")`,
      'tasks.md',
      lineNumber,
      description
    );
  }

  const [, id, cleanDescription] = idMatch;

  return {
    id: id!,
    cleanDescription: cleanDescription!,
  };
}

/**
 * Extracts requirement references from task description
 * @param description - Task description
 * @returns Array of requirement IDs
 */
function extractRequirementRefs(description: string): string[] {
  const match = description.match(REQUIREMENT_REF_PATTERN);
  if (!match) {
    return [];
  }

  const refsString = match[1];
  if (!refsString) {
    return [];
  }

  // Split by comma and clean up
  return refsString
    .split(',')
    .map((ref) => ref.trim())
    .filter((ref) => ref.length > 0);
}

/**
 * Extracts property references from task description
 * @param description - Task description
 * @returns Array of property references
 */
function extractPropertyRefs(description: string): string[] {
  const refs: string[] = [];
  let match;

  // Reset regex state
  PROPERTY_REF_PATTERN.lastIndex = 0;

  while ((match = PROPERTY_REF_PATTERN.exec(description)) !== null) {
    const propertyNum = match[1];
    if (propertyNum) {
      refs.push(`Property ${propertyNum}`);
    }
  }

  return refs;
}

/**
 * Validates task structure for circular dependencies
 * @param tasks - Array of tasks to validate
 * @throws SpecParseError if circular dependency detected
 */
export function validateTaskStructure(tasks: Task[]): void {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function visit(task: Task): void {
    if (recursionStack.has(task.id)) {
      throw new SpecParseError(
        `Circular dependency detected in task hierarchy: ${task.id}`,
        'tasks.md',
        null,
        `Task ${task.id} references itself through its children`
      );
    }

    if (visited.has(task.id)) {
      return;
    }

    visited.add(task.id);
    recursionStack.add(task.id);

    for (const child of task.children) {
      visit(child);
    }

    recursionStack.delete(task.id);
  }

  for (const task of tasks) {
    visit(task);
  }
}
