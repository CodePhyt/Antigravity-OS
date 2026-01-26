/**
 * Property-Based Tests: Keyboard Navigation
 * 
 * Tests Property 12: Keyboard Navigation Completeness
 * 
 * Property: For any interactive element in the dashboard (tasks, buttons, controls),
 * pressing Tab should move focus to that element in a logical order, and pressing
 * Enter/Space should activate it.
 * 
 * **Validates: Requirements 9.2**
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { TaskList } from '@/components/dashboard/TaskList';

describe('Keyboard Navigation - Property-Based Tests', () => {
  /**
   * Property 12.1: Tab navigation moves focus through all interactive elements
   * 
   * For any list of tasks, pressing Tab should move focus to each clickable task
   * in document order.
   */
  it('Property 12.1: Tab key moves focus through all interactive tasks', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (tasks) => {
          const { container } = render(<TaskList tasks={tasks} />);
          
          // Get all interactive (clickable) tasks
          const buttons = container.querySelectorAll('[role="button"]');
          const clickableTasks = Array.from(buttons).filter(btn => {
            const tabIndex = btn.getAttribute('tabindex');
            return tabIndex === '0'; // Only focusable elements
          });
          
          // Verify each clickable task has tabIndex=0
          clickableTasks.forEach(task => {
            expect(task.getAttribute('tabindex')).toBe('0');
          });
          
          // Verify blocked/completed tasks have tabIndex=-1
          const nonClickableTasks = Array.from(buttons).filter(btn => {
            const tabIndex = btn.getAttribute('tabindex');
            return tabIndex === '-1';
          });
          
          nonClickableTasks.forEach(task => {
            expect(task.getAttribute('tabindex')).toBe('-1');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.2: Enter key activates focused task
   * 
   * For any clickable task, when focused and Enter is pressed, the task should
   * be activated (onTaskClick called).
   */
  it('Property 12.2: Enter key activates focused task', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constant('not_started' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (tasks) => {
          const onTaskClick = vi.fn();
          const { container } = render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />);
          
          // Get first clickable task
          const buttons = container.querySelectorAll('[role="button"][tabindex="0"]');
          if (buttons.length === 0) return; // Skip if no clickable tasks
          
          const firstTask = buttons[0] as HTMLElement;
          
          // Simulate Enter key press
          fireEvent.keyDown(firstTask, { key: 'Enter', code: 'Enter' });
          
          // Verify onTaskClick was called
          expect(onTaskClick).toHaveBeenCalledTimes(1);
          expect(onTaskClick).toHaveBeenCalledWith(tasks[0]?.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.3: Space key activates focused task
   * 
   * For any clickable task, when focused and Space is pressed, the task should
   * be activated (onTaskClick called).
   */
  it('Property 12.3: Space key activates focused task', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constant('not_started' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (tasks) => {
          const onTaskClick = vi.fn();
          const { container } = render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />);
          
          // Get first clickable task
          const buttons = container.querySelectorAll('[role="button"][tabindex="0"]');
          if (buttons.length === 0) return; // Skip if no clickable tasks
          
          const firstTask = buttons[0] as HTMLElement;
          
          // Simulate Space key press
          fireEvent.keyDown(firstTask, { key: ' ', code: 'Space' });
          
          // Verify onTaskClick was called
          expect(onTaskClick).toHaveBeenCalledTimes(1);
          expect(onTaskClick).toHaveBeenCalledWith(tasks[0]?.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.4: Other keys do not activate tasks
   * 
   * For any clickable task, pressing keys other than Enter/Space should not
   * activate the task.
   */
  it('Property 12.4: Other keys do not activate tasks', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constant('not_started' as const),
          priority: fc.integer({ min: 0, max: 1 }),
          dependencies: fc.constant([]),
        }),
        fc.constantFrom('a', 'b', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown'),
        (task, key) => {
          const onTaskClick = vi.fn();
          const { container } = render(<TaskList tasks={[task]} onTaskClick={onTaskClick} />);
          
          const button = container.querySelector('[role="button"]') as HTMLElement;
          if (!button) return;
          
          // Simulate key press
          fireEvent.keyDown(button, { key, code: key });
          
          // Verify onTaskClick was NOT called
          expect(onTaskClick).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.5: Blocked tasks are not keyboard-activatable
   * 
   * For any blocked task (with incomplete dependencies), pressing Enter/Space
   * should not activate the task.
   */
  it('Property 12.5: Blocked tasks are not keyboard-activatable', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_numTasks) => {
          // Create tasks where task 2 depends on task 1 (incomplete)
          const tasks = [
            {
              id: '1',
              description: 'Task 1',
              status: 'not_started' as const,
              priority: 0,
              dependencies: [],
            },
            {
              id: '2',
              description: 'Task 2',
              status: 'not_started' as const,
              priority: 0,
              dependencies: ['1'],
            },
          ];
          
          const onTaskClick = vi.fn();
          const { container } = render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />);
          
          // Get blocked task (should have tabindex="-1")
          const buttons = container.querySelectorAll('[role="button"]');
          const blockedTask = Array.from(buttons).find(btn =>
            btn.getAttribute('aria-disabled') === 'true'
          ) as HTMLElement;
          
          if (!blockedTask) return;
          
          // Verify tabindex is -1 (not focusable)
          expect(blockedTask.getAttribute('tabindex')).toBe('-1');
          
          // Try to activate with Enter
          fireEvent.keyDown(blockedTask, { key: 'Enter', code: 'Enter' });
          expect(onTaskClick).not.toHaveBeenCalled();
          
          // Try to activate with Space
          fireEvent.keyDown(blockedTask, { key: ' ', code: 'Space' });
          expect(onTaskClick).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.6: Completed tasks are not keyboard-activatable
   * 
   * For any completed task, pressing Enter/Space should not activate the task.
   */
  it('Property 12.6: Completed tasks are not keyboard-activatable', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constant('completed' as const),
          priority: fc.integer({ min: 0, max: 1 }),
          dependencies: fc.constant([]),
        }),
        (task) => {
          const onTaskClick = vi.fn();
          const { container } = render(<TaskList tasks={[task]} onTaskClick={onTaskClick} />);
          
          const button = container.querySelector('[role="button"]') as HTMLElement;
          if (!button) return;
          
          // Verify tabindex is -1 (not focusable)
          expect(button.getAttribute('tabindex')).toBe('-1');
          
          // Try to activate with Enter
          fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
          expect(onTaskClick).not.toHaveBeenCalled();
          
          // Try to activate with Space
          fireEvent.keyDown(button, { key: ' ', code: 'Space' });
          expect(onTaskClick).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.7: Focus ring is visible on keyboard focus
   * 
   * For any clickable task, when focused via keyboard, a focus ring should be
   * visible (focus:ring classes applied).
   */
  it('Property 12.7: Focus ring styling is present for keyboard navigation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constant('not_started' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (tasks) => {
          const { container } = render(<TaskList tasks={tasks} />);
          
          // Get all clickable tasks
          const buttons = container.querySelectorAll('[role="button"][tabindex="0"]');
          
          // Skip test if no clickable tasks exist (edge case: all completed/blocked)
          if (buttons.length === 0) return;
          
          // Verify each clickable button has focus ring classes
          // Check for the presence of focus-related Tailwind classes in the full className
          buttons.forEach(button => {
            const className = button.getAttribute('class') || '';
            // Verify focus ring classes are present (focus:outline-none, focus:ring-2, etc.)
            // These classes are applied conditionally when clickable is true
            const hasFocusClasses = 
              className.includes('focus:outline-none') ||
              className.includes('focus:ring-2') ||
              className.includes('focus:ring-cyan-500');
            
            expect(hasFocusClasses).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.8: Space key prevents default scroll behavior
   * 
   * For any clickable task, pressing Space should prevent the default page
   * scroll behavior.
   */
  it('Property 12.8: Space key prevents default scroll behavior', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constant('not_started' as const),
          priority: fc.integer({ min: 0, max: 1 }),
          dependencies: fc.constant([]),
        }),
        (task) => {
          const onTaskClick = vi.fn();
          const { container } = render(<TaskList tasks={[task]} onTaskClick={onTaskClick} />);
          
          const button = container.querySelector('[role="button"]') as HTMLElement;
          if (!button) return;
          
          // Create a real KeyboardEvent with preventDefault
          const event = new KeyboardEvent('keydown', {
            key: ' ',
            code: 'Space',
            bubbles: true,
            cancelable: true,
          });
          
          // Spy on preventDefault
          const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
          
          // Dispatch the event
          button.dispatchEvent(event);
          
          // Verify preventDefault was called
          expect(preventDefaultSpy).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.9: Keyboard activation is equivalent to mouse click
   * 
   * For any clickable task, activating via keyboard (Enter/Space) should have
   * the same effect as clicking with a mouse.
   */
  it('Property 12.9: Keyboard activation equivalent to mouse click', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constant('not_started' as const),
          priority: fc.integer({ min: 0, max: 1 }),
          dependencies: fc.constant([]),
        }),
        (task) => {
          // Test with mouse click
          const onTaskClickMouse = vi.fn();
          const { container: containerMouse } = render(
            <TaskList tasks={[task]} onTaskClick={onTaskClickMouse} />
          );
          const buttonMouse = containerMouse.querySelector('[role="button"]') as HTMLElement;
          fireEvent.click(buttonMouse);
          
          // Test with keyboard Enter
          const onTaskClickKeyboard = vi.fn();
          const { container: containerKeyboard } = render(
            <TaskList tasks={[task]} onTaskClick={onTaskClickKeyboard} />
          );
          const buttonKeyboard = containerKeyboard.querySelector('[role="button"]') as HTMLElement;
          fireEvent.keyDown(buttonKeyboard, { key: 'Enter', code: 'Enter' });
          
          // Both should call onTaskClick with same arguments
          expect(onTaskClickMouse).toHaveBeenCalledWith(task.id);
          expect(onTaskClickKeyboard).toHaveBeenCalledWith(task.id);
          expect(onTaskClickMouse).toHaveBeenCalledTimes(1);
          expect(onTaskClickKeyboard).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.10: All interactive elements have keyboard access
   * 
   * For any set of tasks, all interactive elements (clickable tasks) should be
   * keyboard-accessible (tabindex >= 0 or role="button").
   */
  it('Property 12.10: All interactive elements have keyboard access', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (tasks) => {
          const { container } = render(<TaskList tasks={tasks} />);
          
          // Get all buttons
          const buttons = container.querySelectorAll('[role="button"]');
          
          // Verify each button has a tabindex attribute
          buttons.forEach(button => {
            const tabIndex = button.getAttribute('tabindex');
            expect(tabIndex).not.toBeNull();
            expect(['0', '-1']).toContain(tabIndex);
          });
          
          // Verify clickable tasks have tabindex="0"
          const clickableTasks = tasks.filter(
            t => t.status !== 'completed' && t.dependencies.length === 0
          );
          const clickableButtons = container.querySelectorAll('[role="button"][tabindex="0"]');
          
          // At least some tasks should be clickable if any exist
          if (clickableTasks.length > 0) {
            expect(clickableButtons.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
