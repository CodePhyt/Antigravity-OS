/**
 * Property-Based Tests for PRD Parser
 * 
 * Feature: ralphs-brain-view
 * Property 4: PRD Parsing Correctness
 * 
 * Validates: Requirements 2.1, 2.4, 2.5
 * 
 * For any valid PRD.md file, parsing should extract all top-level tasks
 * with correct task ID, description, status, and dependencies, and calculate
 * completion percentage as (completed_tasks / total_tasks) * 100.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PRDParser } from '@/lib/parsers/prd-parser';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('PRDParser - Property Tests', () => {
  // Generate unique file path for each test
  const getTestFilePath = () => join(process.cwd(), `test-prd-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp.md`);

  /**
   * Generate a random task entry
   */
  const taskArbitrary = fc.record({
    id: fc.oneof(
      fc.integer({ min: 1, max: 20 }).map(n => String(n)),
      fc.tuple(fc.integer({ min: 1, max: 10 }), fc.integer({ min: 1, max: 10 }))
        .map(([major, minor]) => `${major}.${minor}`)
    ),
    description: fc.string({ minLength: 10, maxLength: 100 }),
    completed: fc.boolean(),
    hasDependency: fc.boolean(),
  });

  /**
   * Generate a complete PRD markdown file
   */
  function generatePRD(tasks: Array<{
    id: string;
    description: string;
    completed: boolean;
    hasDependency: boolean;
  }>): string {
    const header = `# Antigravity OS - Product Requirements Document (PRD)

**Version**: 2.0.0
**Last Updated**: 2026-01-22
**Status**: 🟢 ACTIVE

---

## Master Feature Checklist

### Core Features
`;

    const taskContent = tasks.map(task => {
      const checkbox = task.completed ? '[x]' : '[ ]';
      const dependency = task.hasDependency ? ' (depends on 1)' : '';
      return `- ${checkbox} ${task.id}. ${task.description}${dependency}`;
    }).join('\n');

    return header + taskContent + '\n';
  }

  it('**Property 4: PRD Parsing Correctness** - should extract all top-level tasks correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(taskArbitrary, { minLength: 0, maxLength: 30 }),
        async (tasks) => {
          const testFilePath = getTestFilePath();
          
          // Generate PRD content
          const prdContent = generatePRD(tasks);
          
          // Write to temporary file
          await writeFile(testFilePath, prdContent, 'utf-8');

          try {
            // Parse the PRD
            const result = await PRDParser.parse(testFilePath);

            // Property: returned tasks count = input tasks count
            expect(result.tasks.length).toBe(tasks.length);
            expect(result.totalTasks).toBe(tasks.length);

            // Property: completed tasks count matches
            const expectedCompleted = tasks.filter(t => t.completed).length;
            expect(result.completedTasks).toBe(expectedCompleted);

            // Property: completion percentage calculation is correct
            const expectedPercentage = tasks.length > 0
              ? Math.round((expectedCompleted / tasks.length) * 100)
              : 0;
            expect(result.completionPercentage).toBe(expectedPercentage);

            // Property: all returned tasks have required fields
            result.tasks.forEach(task => {
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

            // Property: status matches checkbox state
            result.tasks.forEach((task, index) => {
              const inputTask = tasks[index];
              if (inputTask) {
                const expectedStatus = inputTask.completed ? 'completed' : 'not_started';
                expect(task.status).toBe(expectedStatus);
              }
            });
          } finally {
            // Cleanup
            try {
              await unlink(testFilePath);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('**Property 4 (Edge Case)**: should return empty state for empty PRD file', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const testFilePath = getTestFilePath();
          
          // Create empty PRD file
          await writeFile(testFilePath, '# Empty PRD\n\n', 'utf-8');

          try {
            const result = await PRDParser.parse(testFilePath);
            expect(result.totalTasks).toBe(0);
            expect(result.completedTasks).toBe(0);
            expect(result.completionPercentage).toBe(0);
            expect(result.tasks).toEqual([]);
          } finally {
            await unlink(testFilePath);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('**Property 4 (Edge Case)**: should return empty state for non-existent file', async () => {
    const nonExistentPath = join(process.cwd(), 'non-existent-prd-' + Date.now() + '.md');
    const result = await PRDParser.parse(nonExistentPath);
    
    expect(result.totalTasks).toBe(0);
    expect(result.completedTasks).toBe(0);
    expect(result.completionPercentage).toBe(0);
    expect(result.tasks).toEqual([]);
  });

  it('**Property 4 (Correctness)**: should only count top-level tasks, not sub-tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (topLevelCount) => {
          const testFilePath = getTestFilePath();
          
          // Generate PRD with top-level and sub-tasks
          let content = '# PRD\n\n## Tasks\n\n';
          
          for (let i = 1; i <= topLevelCount; i++) {
            content += `- [x] ${i}. Top-level task ${i}\n`;
            // Add 2 sub-tasks (indented)
            content += `  - [ ] ${i}.1 Sub-task 1\n`;
            content += `  - [ ] ${i}.2 Sub-task 2\n`;
          }

          await writeFile(testFilePath, content, 'utf-8');

          try {
            const result = await PRDParser.parse(testFilePath);
            
            // Property: only top-level tasks are counted
            expect(result.totalTasks).toBe(topLevelCount);
            expect(result.tasks.length).toBe(topLevelCount);
            
            // Property: all counted tasks are completed (top-level have [x])
            expect(result.completedTasks).toBe(topLevelCount);
            expect(result.completionPercentage).toBe(100);
          } finally {
            await unlink(testFilePath);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('**Property 4 (Dependency Extraction)**: should extract dependencies correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'depends on 1.2',
          'requires task 3',
          'blocked by 2.1, 2.2',
          'depends on 1 and requires 2',
          'no dependencies here'
        ),
        async (descriptionPattern) => {
          const testFilePath = getTestFilePath();
          
          const content = `# PRD\n\n## Tasks\n\n- [ ] 1. Task ${descriptionPattern}\n`;
          await writeFile(testFilePath, content, 'utf-8');

          try {
            const result = await PRDParser.parse(testFilePath);
            expect(result.tasks.length).toBe(1);

            const task = result.tasks[0];
            expect(task).toBeDefined();
            if (!task) return;
            
            // Verify dependency extraction based on pattern
            if (descriptionPattern.includes('depends on 1.2')) {
              expect(task.dependencies).toContain('1.2');
            } else if (descriptionPattern.includes('requires task 3')) {
              expect(task.dependencies).toContain('3');
            } else if (descriptionPattern.includes('blocked by 2.1, 2.2')) {
              expect(task.dependencies).toContain('2.1');
              expect(task.dependencies).toContain('2.2');
            } else if (descriptionPattern.includes('depends on 1 and requires 2')) {
              expect(task.dependencies).toContain('1');
              expect(task.dependencies).toContain('2');
            } else {
              expect(task.dependencies).toEqual([]);
            }
          } finally {
            await unlink(testFilePath);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('**Property 4 (Percentage Calculation)**: should calculate percentage correctly for all ratios', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        async (total, completed) => {
          // Ensure completed <= total
          const actualCompleted = Math.min(completed, total);
          const testFilePath = getTestFilePath();
          
          let content = '# PRD\n\n## Tasks\n\n';
          
          // Add completed tasks
          for (let i = 1; i <= actualCompleted; i++) {
            content += `- [x] ${i}. Completed task ${i}\n`;
          }
          
          // Add not started tasks
          for (let i = actualCompleted + 1; i <= total; i++) {
            content += `- [ ] ${i}. Not started task ${i}\n`;
          }

          await writeFile(testFilePath, content, 'utf-8');

          try {
            const result = await PRDParser.parse(testFilePath);
            
            const expectedPercentage = Math.round((actualCompleted / total) * 100);
            expect(result.completionPercentage).toBe(expectedPercentage);
            expect(result.totalTasks).toBe(total);
            expect(result.completedTasks).toBe(actualCompleted);
          } finally {
            await unlink(testFilePath);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
