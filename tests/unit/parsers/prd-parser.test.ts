/**
 * Unit Tests for PRD Parser
 * 
 * Tests error handling and edge cases for PRDParser
 * Validates: Requirements 2.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PRDParser } from '@/lib/parsers/prd-parser';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('PRDParser - Unit Tests', () => {
  let testFilePath: string;

  beforeEach(() => {
    testFilePath = join(process.cwd(), `test-prd-unit-${Date.now()}.tmp.md`);
  });

  afterEach(async () => {
    try {
      await unlink(testFilePath);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Error Handling', () => {
    it('should handle invalid checkbox syntax gracefully', async () => {
      const content = `# PRD

## Tasks

- [x] 1. Valid completed task
- [ ] 2. Valid not started task
- [?] 3. Invalid checkbox (should be ignored)
- 4. No checkbox at all
- [] 5. Empty checkbox
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      // Should only parse valid checkboxes
      expect(result.tasks.length).toBe(2);
      expect(result.tasks[0]?.description).toContain('Valid completed task');
      expect(result.tasks[1]?.description).toContain('Valid not started task');
    });

    it('should handle missing task sections', async () => {
      const content = `# PRD

**Version**: 1.0.0

This PRD has no tasks section.
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.completionPercentage).toBe(0);
      expect(result.tasks).toEqual([]);
    });

    it('should exclude nested sub-tasks (indented)', async () => {
      const content = `# PRD

## Tasks

- [x] 1. Top-level task 1
  - [ ] 1.1 Sub-task (should be excluded)
  - [ ] 1.2 Another sub-task (should be excluded)
- [ ] 2. Top-level task 2
  - [x] 2.1 Completed sub-task (should be excluded)
- [x] 3. Top-level task 3
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      // Should only count top-level tasks (no indentation)
      expect(result.totalTasks).toBe(3);
      expect(result.completedTasks).toBe(2); // Tasks 1 and 3
      expect(result.completionPercentage).toBe(67); // 2/3 = 66.67 rounded to 67
    });

    it('should extract dependencies from various formats', async () => {
      const content = `# PRD

## Tasks

- [ ] 1. Task depends on 2.1
- [ ] 2. Task requires task 3
- [ ] 3. Task blocked by 1, 2
- [ ] 4. Task depends on 1.2 and requires 2.3
- [ ] 5. Task with no dependencies
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.tasks.length).toBe(5);
      
      // Task 1: depends on 2.1
      expect(result.tasks[0]?.dependencies).toContain('2.1');
      
      // Task 2: requires task 3
      expect(result.tasks[1]?.dependencies).toContain('3');
      
      // Task 3: blocked by 1, 2
      expect(result.tasks[2]?.dependencies).toContain('1');
      expect(result.tasks[2]?.dependencies).toContain('2');
      
      // Task 4: depends on 1.2 and requires 2.3
      expect(result.tasks[3]?.dependencies).toContain('1.2');
      expect(result.tasks[3]?.dependencies).toContain('2.3');
      
      // Task 5: no dependencies
      expect(result.tasks[4]?.dependencies).toEqual([]);
    });

    it('should return empty state for non-existent file', async () => {
      const nonExistentPath = join(process.cwd(), 'non-existent-' + Date.now() + '.md');
      const result = await PRDParser.parse(nonExistentPath);
      
      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.completionPercentage).toBe(0);
      expect(result.tasks).toEqual([]);
    });
  });

  describe('Task Status Detection', () => {
    it('should detect completed tasks with [x]', async () => {
      const content = `# PRD

## Tasks

- [x] 1. Completed task
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.status).toBe('completed');
    });

    it('should detect not started tasks with [ ]', async () => {
      const content = `# PRD

## Tasks

- [ ] 1. Not started task
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.status).toBe('not_started');
    });
  });

  describe('Task Structure', () => {
    it('should include all required fields', async () => {
      const content = `# PRD

## Tasks

- [x] 1. Test task
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.tasks.length).toBe(1);
      const task = result.tasks[0];
      expect(task).toBeDefined();
      if (!task) return;
      
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('dependencies');
      
      expect(typeof task.id).toBe('string');
      expect(typeof task.description).toBe('string');
      expect(['not_started', 'in_progress', 'completed']).toContain(task.status);
      expect(typeof task.priority).toBe('number');
      expect(Array.isArray(task.dependencies)).toBe(true);
    });

    it('should handle tasks without explicit IDs', async () => {
      const content = `# PRD

## Tasks

- [x] First task without ID
- [ ] Second task without ID
- [x] Third task without ID
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.tasks.length).toBe(3);
      
      // Should generate sequential IDs
      expect(result.tasks[0]?.id).toBe('1');
      expect(result.tasks[1]?.id).toBe('2');
      expect(result.tasks[2]?.id).toBe('3');
    });

    it('should preserve explicit task IDs', async () => {
      const content = `# PRD

## Tasks

- [x] 5. Task with ID 5
- [ ] 10. Task with ID 10
- [x] 2.3. Task with nested ID
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.tasks.length).toBe(3);
      expect(result.tasks[0]?.id).toBe('5');
      expect(result.tasks[1]?.id).toBe('10');
      expect(result.tasks[2]?.id).toBe('2.3');
    });
  });

  describe('Completion Percentage Calculation', () => {
    it('should calculate 0% for no completed tasks', async () => {
      const content = `# PRD

## Tasks

- [ ] 1. Task 1
- [ ] 2. Task 2
- [ ] 3. Task 3
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.completionPercentage).toBe(0);
    });

    it('should calculate 100% for all completed tasks', async () => {
      const content = `# PRD

## Tasks

- [x] 1. Task 1
- [x] 2. Task 2
- [x] 3. Task 3
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.completionPercentage).toBe(100);
    });

    it('should calculate 50% for half completed tasks', async () => {
      const content = `# PRD

## Tasks

- [x] 1. Task 1
- [x] 2. Task 2
- [ ] 3. Task 3
- [ ] 4. Task 4
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.completionPercentage).toBe(50);
    });

    it('should round percentage to nearest integer', async () => {
      const content = `# PRD

## Tasks

- [x] 1. Task 1
- [ ] 2. Task 2
- [ ] 3. Task 3
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      // 1/3 = 33.33... should round to 33
      expect(result.completionPercentage).toBe(33);
    });

    it('should return 0% for empty PRD', async () => {
      const content = `# PRD\n\n## Tasks\n\n(No tasks yet)`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.completionPercentage).toBe(0);
      expect(result.totalTasks).toBe(0);
    });
  });

  describe('Dependency Extraction Edge Cases', () => {
    it('should handle multiple dependencies in one description', async () => {
      const content = `# PRD

## Tasks

- [ ] 1. Task depends on 2.1, requires 3, and blocked by 4.5
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.tasks.length).toBe(1);
      const deps = result.tasks[0]?.dependencies;
      expect(deps).toBeDefined();
      if (!deps) return;
      
      expect(deps).toContain('2.1');
      expect(deps).toContain('3');
      expect(deps).toContain('4.5');
    });

    it('should remove duplicate dependencies', async () => {
      const content = `# PRD

## Tasks

- [ ] 1. Task depends on 2 and requires task 2
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.tasks.length).toBe(1);
      const deps = result.tasks[0]?.dependencies;
      expect(deps).toBeDefined();
      if (!deps) return;
      
      // Should only have one instance of "2"
      expect(deps.filter(d => d === '2').length).toBe(1);
    });

    it('should ignore non-numeric dependency references', async () => {
      const content = `# PRD

## Tasks

- [ ] 1. Task depends on something vague
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.tasks.length).toBe(1);
      expect(result.tasks[0]?.dependencies).toEqual([]);
    });
  });

  describe('Error Scenarios (Task 7.3)', () => {
    it('should return empty state for missing PRD.md', async () => {
      const missingPath = join(process.cwd(), 'missing-prd-' + Date.now() + '.md');
      const result = await PRDParser.parse(missingPath);
      
      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.completionPercentage).toBe(0);
      expect(result.tasks).toEqual([]);
    });

    it('should handle corrupted file content gracefully', async () => {
      // Write binary/corrupted content
      const buffer = Buffer.from([0xFF, 0xFE, 0xFD, 0xFC, 0x00, 0x01, 0x02]);
      await writeFile(testFilePath, buffer);
      
      const result = await PRDParser.parse(testFilePath);
      
      // Should return empty state
      expect(result.totalTasks).toBe(0);
      expect(result.tasks).toEqual([]);
    });

    it('should handle file with only markdown, no tasks', async () => {
      const content = `# Product Requirements Document

**Version**: 1.0.0
**Author**: Test
**Date**: 2026-01-22

## Overview

This is a PRD with lots of content but no actual tasks.

## Background

More content here.

## Goals

- Goal 1
- Goal 2
- Goal 3

But no checkbox tasks!
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.completionPercentage).toBe(0);
      expect(result.tasks).toEqual([]);
    });

    it('should handle parsing failures with malformed checkboxes', async () => {
      const content = `# PRD

## Tasks

- [x] 1. Valid task
-[x] 2. Missing space after dash
- [x]3. Missing space after checkbox
-[x]4. Missing both spaces
- [ ] 5. Another valid task
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      // Should only parse valid tasks (1 and 5)
      expect(result.tasks.length).toBe(2);
      expect(result.tasks[0]?.description).toContain('Valid task');
      expect(result.tasks[1]?.description).toContain('Another valid task');
    });

    it('should handle extremely large PRD files without crashing', async () => {
      // Generate 500 tasks
      let content = `# PRD\n\n## Tasks\n\n`;
      
      for (let i = 1; i <= 500; i++) {
        const status = i % 2 === 0 ? 'x' : ' ';
        content += `- [${status}] ${i}. Task ${i}\n`;
      }
      
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.totalTasks).toBe(500);
      expect(result.completedTasks).toBe(250); // Every other task
      expect(result.completionPercentage).toBe(50);
    });

    it('should handle file with special characters and unicode', async () => {
      const content = `# PRD

## Tasks

- [x] 1. Task with émojis 🚀 and ünïcödé
- [ ] 2. Task with <HTML> & special chars: @#$%^&*()
- [x] 3. Task with "quotes" and 'apostrophes'
- [ ] 4. Task with newlines
and continuation
- [x] 5. Task with tabs	and	spaces
`;
      await writeFile(testFilePath, content, 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      // Should parse all valid tasks
      expect(result.tasks.length).toBeGreaterThanOrEqual(3);
      expect(result.tasks[0]?.description).toContain('émojis');
      expect(result.tasks[1]?.description).toContain('<HTML>');
      expect(result.tasks[2]?.description).toContain('"quotes"');
    });

    it('should handle empty file', async () => {
      await writeFile(testFilePath, '', 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.completionPercentage).toBe(0);
      expect(result.tasks).toEqual([]);
    });

    it('should handle file with only whitespace', async () => {
      await writeFile(testFilePath, '   \n\n\t\t\n   ', 'utf-8');
      const result = await PRDParser.parse(testFilePath);
      
      expect(result.totalTasks).toBe(0);
      expect(result.tasks).toEqual([]);
    });
  });
});
