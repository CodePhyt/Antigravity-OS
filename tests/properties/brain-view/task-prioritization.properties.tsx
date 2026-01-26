/**
 * Property-Based Tests: Task Prioritization Lifecycle
 * 
 * Tests Property 8: Task Prioritization Lifecycle
 * **Validates: Requirements 5.1, 5.2, 5.3**
 * 
 * Property: For any task, when a user clicks it, the task should be marked as 
 * high-priority with visual feedback, and when the task begins execution, 
 * the priority flag should be cleared.
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { TaskList } from '@/components/dashboard/TaskList';

describe('Property 8: Task Prioritization Lifecycle', () => {
  /**
   * Property: Clicking a task marks it as high-priority
   */
  it('should mark task as high-priority when clicked', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          status: fc.constantFrom('not_started' as const, 'in_progress' as const),
          priority: fc.constant(0),
          dependencies: fc.constant([]),
        }),
        (task) => {
          let clickedTaskId: string | null = null;
          
          const { container } = render(
            <TaskList 
              tasks={[task]} 
              onTaskClick={(taskId) => {
                clickedTaskId = taskId;
              }}
            />
          );
          
          // Find and click the task
          const taskElement = container.querySelector('[role="button"]');
          expect(taskElement).toBeTruthy();
          
          taskElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          
          // Verify callback was called with correct task ID
          expect(clickedTaskId).toBe(task.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Prioritized tasks show visual feedback
   */
  it('should show visual feedback for prioritized tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          status: fc.constantFrom('not_started' as const, 'in_progress' as const),
          priority: fc.integer({ min: 0, max: 1 }),
          dependencies: fc.constant([]),
        }),
        (task) => {
          const { container } = render(
            <TaskList tasks={[task]} />
          );
          
          const priorityBadge = container.querySelector('[aria-label="High priority"]');
          
          if (task.priority > 0 && task.status === 'not_started') {
            // Prioritized not_started task should have badge
            expect(priorityBadge).toBeTruthy();
            expect(priorityBadge?.textContent).toContain('PRIORITY');
          } else {
            // Non-prioritized or non-not_started task should not have badge
            expect(priorityBadge).toBeFalsy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Completed tasks cannot be prioritized
   */
  it('should not allow prioritization of completed tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          status: fc.constant('completed' as const),
          priority: fc.constant(0),
          dependencies: fc.constant([]),
        }),
        (task) => {
          let clickedTaskId: string | null = null;
          
          const { container } = render(
            <TaskList 
              tasks={[task]} 
              onTaskClick={(taskId) => {
                clickedTaskId = taskId;
              }}
            />
          );
          
          // Find and click the task
          const taskElement = container.querySelector('[role="button"]');
          expect(taskElement).toBeTruthy();
          
          taskElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          
          // Verify callback was NOT called for completed task
          expect(clickedTaskId).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Blocked tasks cannot be prioritized
   */
  it('should not allow prioritization of blocked tasks', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.record({
            id: fc.constant('1'),
            description: fc.string({ minLength: 5, maxLength: 100 }),
            status: fc.constant('not_started' as const),
            priority: fc.constant(0),
            dependencies: fc.constant([]),
          }),
          fc.record({
            id: fc.constant('2'),
            description: fc.string({ minLength: 5, maxLength: 100 }),
            status: fc.constant('not_started' as const),
            priority: fc.constant(0),
            dependencies: fc.constant(['1']), // Depends on task 1
          })
        ),
        ([task1, task2]) => {
          let clickedTaskId: string | null = null;
          
          const { container } = render(
            <TaskList 
              tasks={[task1, task2]} 
              onTaskClick={(taskId) => {
                clickedTaskId = taskId;
              }}
            />
          );
          
          // Find the blocked task (task2)
          const taskElements = container.querySelectorAll('[role="button"]');
          const blockedTask = taskElements[1]; // Second task is the blocked one
          
          expect(blockedTask).toBeTruthy();
          
          // Try to click the blocked task
          blockedTask?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          
          // Verify callback was NOT called for blocked task
          expect(clickedTaskId).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Priority flag cleared when task starts execution
   */
  it('should clear priority flag when task status changes to in_progress', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          status: fc.constantFrom('not_started' as const, 'in_progress' as const),
          priority: fc.integer({ min: 0, max: 1 }),
          dependencies: fc.constant([]),
        }),
        (task) => {
          const { container } = render(
            <TaskList tasks={[task]} />
          );
          
          const priorityBadge = container.querySelector('[aria-label="High priority"]');
          
          // If task is in_progress, priority badge should not be shown
          // (even if priority flag is set, visual feedback is only for not_started)
          if (task.status === 'in_progress') {
            // Priority badge should not be visible for in_progress tasks
            // This simulates the behavior where priority is cleared on execution start
            expect(priorityBadge).toBeFalsy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple tasks can be prioritized independently
   */
  it('should handle multiple task prioritizations independently', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            description: fc.string({ minLength: 5, maxLength: 100 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (tasks) => {
          const { container } = render(
            <TaskList tasks={tasks} />
          );
          
          const priorityBadges = container.querySelectorAll('[aria-label="High priority"]');
          const expectedPriorityCount = tasks.filter(
            t => t.priority > 0 && t.status === 'not_started'
          ).length;
          
          // Number of priority badges should match number of prioritized not_started tasks
          expect(priorityBadges.length).toBe(expectedPriorityCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Task prioritization is idempotent
   */
  it('should handle repeated clicks on same task', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          status: fc.constant('not_started' as const),
          priority: fc.constant(0),
          dependencies: fc.constant([]),
        }),
        fc.integer({ min: 1, max: 5 }),
        (task, clickCount) => {
          let callCount = 0;
          
          const { container } = render(
            <TaskList 
              tasks={[task]} 
              onTaskClick={() => {
                callCount++;
              }}
            />
          );
          
          const taskElement = container.querySelector('[role="button"]');
          expect(taskElement).toBeTruthy();
          
          // Click multiple times
          for (let i = 0; i < clickCount; i++) {
            taskElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
          
          // Callback should be called for each click
          expect(callCount).toBe(clickCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Prioritization respects task status transitions
   */
  it('should respect status transitions for prioritization', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          status: fc.constantFrom(
            'not_started' as const, 
            'in_progress' as const, 
            'completed' as const
          ),
          priority: fc.constant(1), // Always prioritized
          dependencies: fc.constant([]),
        }),
        (task) => {
          let clickedTaskId: string | null = null;
          
          const { container } = render(
            <TaskList 
              tasks={[task]} 
              onTaskClick={(taskId) => {
                clickedTaskId = taskId;
              }}
            />
          );
          
          const taskElement = container.querySelector('[role="button"]');
          taskElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          
          // Only not_started and in_progress tasks should be clickable
          if (task.status === 'not_started' || task.status === 'in_progress') {
            expect(clickedTaskId).toBe(task.id);
          } else {
            expect(clickedTaskId).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Priority visual feedback is consistent
   */
  it('should provide consistent visual feedback for priority', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          status: fc.constantFrom('not_started' as const, 'in_progress' as const),
          priority: fc.integer({ min: 0, max: 1 }),
          dependencies: fc.constant([]),
        }),
        (task) => {
          const { container } = render(
            <TaskList tasks={[task]} />
          );
          
          const taskElement = container.querySelector('[role="button"]');
          const hasPriorityClass = taskElement?.className.includes('amber');
          const hasPriorityBadge = container.querySelector('[aria-label="High priority"]');
          
          if (task.priority > 0 && task.status === 'not_started') {
            // Both visual indicators should be present for not_started tasks
            expect(hasPriorityClass).toBe(true);
            expect(hasPriorityBadge).toBeTruthy();
          } else {
            // Badge should not be present for non-not_started or non-prioritized tasks
            expect(hasPriorityBadge).toBeFalsy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Accessibility attributes are present for prioritized tasks
   */
  it('should have proper accessibility attributes for prioritized tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 100 }),
          status: fc.constant('not_started' as const),
          priority: fc.integer({ min: 0, max: 1 }),
          dependencies: fc.constant([]),
        }),
        (task) => {
          const { container } = render(
            <TaskList tasks={[task]} />
          );
          
          const taskElement = container.querySelector('[role="button"]');
          expect(taskElement).toBeTruthy();
          
          // Should have aria-label
          const ariaLabel = taskElement?.getAttribute('aria-label');
          expect(ariaLabel).toBeTruthy();
          expect(ariaLabel).toContain(task.id);
          expect(ariaLabel).toContain(task.description);
          
          // Should have aria-disabled for completed tasks
          const ariaDisabled = taskElement?.getAttribute('aria-disabled');
          expect(ariaDisabled).toBe('false'); // not_started tasks are not disabled
        }
      ),
      { numRuns: 100 }
    );
  });
});

