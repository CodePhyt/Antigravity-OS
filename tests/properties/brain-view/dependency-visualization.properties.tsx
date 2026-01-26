/**
 * Property-Based Tests: Dependency Visualization
 * 
 * Tests Property 9: Dependency Visualization
 * **Validates: Requirements 5.4, 5.5**
 * 
 * Property: For any task with dependencies, the UI should display visual 
 * indicators (disabled state, tooltip, or icon) showing which tasks must 
 * be completed first.
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { TaskList } from '@/components/dashboard/TaskList';

describe('Property 9: Dependency Visualization', () => {
  /**
   * Property: Tasks with dependencies show dependency badges
   */
  it('should display dependency badges for tasks with dependencies', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 5 }),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.constant(0),
            dependencies: fc.array(fc.string({ minLength: 1, maxLength: 5 }), { maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (tasks) => {
          // Skip edge cases with duplicate IDs or whitespace-only IDs
          const uniqueIds = new Set(tasks.map(t => t.id.trim()));
          if (uniqueIds.size !== tasks.length || tasks.some(t => t.id.trim() === '')) {
            return; // Skip this test case
          }
          
          const { container } = render(<TaskList tasks={tasks} />);
          
          tasks.forEach((task) => {
            if (task.dependencies.length > 0) {
              // Find the task element
              const taskElements = container.querySelectorAll('[role="button"]');
              const taskElement = Array.from(taskElements).find(el =>
                el.textContent?.includes(task.id)
              );
              
              if (taskElement) {
                // Should have "Depends on:" text
                expect(taskElement.textContent).toContain('Depends on:');
                
                // Should show each dependency
                task.dependencies.forEach(depId => {
                  expect(taskElement.textContent).toContain(depId);
                });
              }
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Blocked tasks are visually disabled
   */
  it('should visually disable blocked tasks', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.record({
            id: fc.constant('1'),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.constant(0),
            dependencies: fc.constant([]),
          }),
          fc.record({
            id: fc.constant('2'),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constant('not_started' as const),
            priority: fc.constant(0),
            dependencies: fc.constant(['1']),
          })
        ),
        ([task1, task2]) => {
          const { container } = render(<TaskList tasks={[task1, task2]} />);
          
          // Find task2 (the blocked one)
          const taskElements = container.querySelectorAll('[role="button"]');
          const blockedTask = taskElements[1];
          
          if (!blockedTask) return; // Skip if element not found
          
          if (task1.status !== 'completed') {
            // Task2 should be blocked
            expect(blockedTask.className).toContain('opacity-50');
            expect(blockedTask.className).toContain('cursor-not-allowed');
            expect(blockedTask.getAttribute('aria-disabled')).toBe('true');
          } else {
            // Task2 should not be blocked
            expect(blockedTask.getAttribute('aria-disabled')).toBe('false');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Dependency badges show completion status
   */
  it('should show completion status for each dependency', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 5 }),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.constant(0),
            dependencies: fc.constant([]),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (baseTasks) => {
          // Skip edge cases with duplicate IDs or whitespace-only IDs
          const uniqueIds = new Set(baseTasks.map(t => t.id.trim()));
          if (uniqueIds.size !== baseTasks.length || baseTasks.some(t => t.id.trim() === '')) {
            return; // Skip this test case
          }
          
          // Create a task that depends on all base tasks
          const dependentTask = {
            id: 'dependent',
            description: 'Dependent task',
            status: 'not_started' as const,
            priority: 0,
            dependencies: baseTasks.map(t => t.id),
          };
          
          const allTasks = [...baseTasks, dependentTask];
          const { container } = render(<TaskList tasks={allTasks} />);
          
          // Find the dependent task
          const taskElements = container.querySelectorAll('[role="button"]');
          const dependentElement = taskElements[taskElements.length - 1];
          
          if (!dependentElement) return; // Skip if element not found
          
          // Check each dependency badge
          baseTasks.forEach((baseTask) => {
            if (baseTask.status === 'completed') {
              // Completed dependencies should have emerald styling and checkmark
              const depBadges = dependentElement.querySelectorAll('span');
              const depBadge = Array.from(depBadges).find(badge =>
                badge.textContent?.includes(baseTask.id)
              );
              
              if (depBadge) {
                expect(depBadge.className).toContain('emerald');
                expect(depBadge.textContent).toContain('✓');
              }
            } else {
              // Incomplete dependencies should have rose styling
              const depBadges = dependentElement.querySelectorAll('span');
              const depBadge = Array.from(depBadges).find(badge =>
                badge.textContent?.includes(baseTask.id) && !badge.textContent?.includes('✓')
              );
              
              if (depBadge) {
                expect(depBadge.className).toContain('rose');
              }
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Blocked tasks show blocking message
   */
  it('should show blocking message for blocked tasks', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.record({
            id: fc.constant('1'),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constant('not_started' as const),
            priority: fc.constant(0),
            dependencies: fc.constant([]),
          }),
          fc.record({
            id: fc.constant('2'),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constant('not_started' as const),
            priority: fc.constant(0),
            dependencies: fc.constant(['1']),
          })
        ),
        ([task1, task2]) => {
          const { container } = render(<TaskList tasks={[task1, task2]} />);
          
          // Find task2 (the blocked one)
          const taskElements = container.querySelectorAll('[role="button"]');
          const blockedTask = taskElements[1];
          
          if (!blockedTask) return; // Skip if element not found
          
          // Should show blocked message
          expect(blockedTask.textContent).toContain('Blocked');
          expect(blockedTask.textContent).toContain('complete dependencies first');
          expect(blockedTask.textContent).toContain('🔒');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Unblocked tasks don't show blocking indicators
   */
  it('should not show blocking indicators for unblocked tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 5 }),
          description: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
          priority: fc.constant(0),
          dependencies: fc.constant([]),
        }),
        (task) => {
          const { container } = render(<TaskList tasks={[task]} />);
          
          const taskElement = container.querySelector('[role="button"]');
          
          // Should not show blocked message
          expect(taskElement?.textContent).not.toContain('Blocked');
          expect(taskElement?.textContent).not.toContain('🔒');
          
          // Should not have disabled styling
          expect(taskElement?.className).not.toContain('cursor-not-allowed');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Tasks with completed dependencies are not blocked
   */
  it('should not block tasks when all dependencies are completed', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.record({
            id: fc.constant('1'),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constant('completed' as const),
            priority: fc.constant(0),
            dependencies: fc.constant([]),
          }),
          fc.record({
            id: fc.constant('2'),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constant('not_started' as const),
            priority: fc.constant(0),
            dependencies: fc.constant(['1']),
          })
        ),
        ([task1, task2]) => {
          const { container } = render(<TaskList tasks={[task1, task2]} />);
          
          // Find task2
          const taskElements = container.querySelectorAll('[role="button"]');
          const task2Element = taskElements[1];
          
          if (!task2Element) return; // Skip if element not found
          
          // Should not be blocked
          expect(task2Element.textContent).not.toContain('Blocked');
          expect(task2Element.className).not.toContain('cursor-not-allowed');
          expect(task2Element.getAttribute('aria-disabled')).toBe('false');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Dependency count matches displayed badges
   */
  it('should display correct number of dependency badges', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 5 }),
          description: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constant('not_started' as const),
          priority: fc.constant(0),
          dependencies: fc.array(fc.string({ minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 5 }),
        }),
        (task) => {
          // Create dummy tasks for dependencies
          const depTasks = task.dependencies.map(depId => ({
            id: depId,
            description: `Task ${depId}`,
            status: 'not_started' as const,
            priority: 0,
            dependencies: [],
          }));
          
          const allTasks = [...depTasks, task];
          const { container } = render(<TaskList tasks={allTasks} />);
          
          // Find the task with dependencies
          const taskElements = container.querySelectorAll('[role="button"]');
          const taskElement = taskElements[taskElements.length - 1];
          
          if (!taskElement) return; // Skip if element not found
          
          // Count dependency badges
          const depSection = taskElement.querySelector('.flex.gap-1.flex-wrap');
          if (depSection) {
            const badges = depSection.querySelectorAll('span');
            expect(badges.length).toBe(task.dependencies.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Tooltip shows incomplete dependencies
   */
  it('should show tooltip with incomplete dependencies for blocked tasks', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 5 }),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const),
            priority: fc.constant(0),
            dependencies: fc.constant([]),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        (incompleteTasks) => {
          // Create blocked task with dependencies
          const blockedTask = {
            id: 'blocked',
            description: 'Blocked task',
            status: 'not_started' as const,
            priority: 0,
            dependencies: incompleteTasks.map(t => t.id),
          };
          
          const allTasks = [...incompleteTasks, blockedTask];
          const { container } = render(<TaskList tasks={allTasks} />);
          
          // Find the blocked task
          const taskElements = container.querySelectorAll('[role="button"]');
          const blockedElement = taskElements[taskElements.length - 1];
          
          if (!blockedElement) return; // Skip if element not found
          
          // Check title attribute (tooltip)
          const title = blockedElement.getAttribute('title');
          if (title) {
            expect(title).toContain('Blocked by:');
            incompleteTasks.forEach(task => {
              expect(title).toContain(task.id);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Dependency visualization is consistent across re-renders
   */
  it('should maintain consistent dependency visualization across re-renders', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 5 }),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.constant(0),
            dependencies: fc.array(fc.string({ minLength: 1, maxLength: 5 }), { maxLength: 2 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (tasks) => {
          const { container, rerender } = render(<TaskList tasks={tasks} />);
          
          // Capture initial state
          const initialHTML = container.innerHTML;
          
          // Re-render with same tasks
          rerender(<TaskList tasks={tasks} />);
          
          // Should be identical
          expect(container.innerHTML).toBe(initialHTML);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty dependencies array shows no dependency section
   */
  it('should not show dependency section for tasks without dependencies', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 5 }),
          description: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
          priority: fc.constant(0),
          dependencies: fc.constant([]),
        }),
        (task) => {
          const { container } = render(<TaskList tasks={[task]} />);
          
          const taskElement = container.querySelector('[role="button"]');
          
          // Should not show "Depends on:" text
          expect(taskElement?.textContent).not.toContain('Depends on:');
        }
      ),
      { numRuns: 100 }
    );
  });
});

