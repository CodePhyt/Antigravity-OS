/**
 * Property-Based Tests: Accessible Indicators
 * 
 * Tests Property 13: Accessible Indicators
 * 
 * Property: For any color-coded indicator, there should be an accompanying text label,
 * icon, or ARIA attribute that conveys the same information without relying on color alone.
 * 
 * **Validates: Requirements 9.1, 9.3**
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { NeonIndicator } from '@/components/dashboard/NeonIndicator';
import { TaskList } from '@/components/dashboard/TaskList';
import { ThinkingStream } from '@/components/dashboard/ThinkingStream';

describe('Accessible Indicators - Property-Based Tests', () => {
  /**
   * Property 13.1: NeonIndicator has text label for every color state
   * 
   * For any status value, the NeonIndicator should display both a colored dot
   * and a text label that conveys the same information.
   */
  it('Property 13.1: NeonIndicator provides text labels for all color states', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'thinking', 'success', 'error', 'correction'),
        (status) => {
          const { container } = render(<NeonIndicator status={status as any} />);
          
          // Verify colored indicator exists
          const indicator = container.querySelector('[role="status"]');
          expect(indicator).not.toBeNull();
          
          // Verify text label exists (not just color)
          const textContent = container.textContent || '';
          expect(textContent.length).toBeGreaterThan(0);
          
          // Verify aria-label is present on the indicator
          const ariaLabel = indicator?.getAttribute('aria-label');
          expect(ariaLabel).not.toBeNull();
          expect(ariaLabel).toContain('Status:');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.2: NeonIndicator has icon for every color state
   * 
   * For any status value, the NeonIndicator should display an icon that
   * provides visual information beyond just color.
   */
  it('Property 13.2: NeonIndicator provides icons for all color states', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'thinking', 'success', 'error', 'correction'),
        (status) => {
          const { container } = render(<NeonIndicator status={status as any} />);
          
          // Verify icon exists (marked with aria-hidden since it's decorative)
          const icon = container.querySelector('[aria-hidden="true"]');
          expect(icon).not.toBeNull();
          
          // Verify icon has content
          const iconText = icon?.textContent || '';
          expect(iconText.length).toBeGreaterThan(0);
          
          // Verify different statuses have different icons
          const expectedIcons: Record<string, string> = {
            'idle': '○',
            'thinking': '◉',
            'success': '✓',
            'error': '✗',
            'correction': '⚡',
          };
          
          expect(iconText).toBe(expectedIcons[status]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.3: TaskList status indicators have icons
   * 
   * For any task status, the TaskList should display an icon that conveys
   * the status without relying on color alone.
   */
  it('Property 13.3: TaskList provides status icons for all tasks', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (tasks) => {
          const { container } = render(<TaskList tasks={tasks} />);
          
          // Get all status icons (marked with aria-hidden)
          const icons = container.querySelectorAll('[aria-hidden="true"]');
          
          // Should have at least one icon per task (status icon)
          expect(icons.length).toBeGreaterThanOrEqual(tasks.length);
          
          // Verify each task has a status icon with content
          tasks.forEach((task) => {
            const expectedIcons: Record<string, string> = {
              'not_started': '○',
              'in_progress': '→',
              'completed': '✓',
            };
            
            const expectedIcon = expectedIcons[task.status];
            const hasIcon = Array.from(icons).some(icon => 
              icon.textContent === expectedIcon
            );
            
            expect(hasIcon).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.4: TaskList has ARIA labels for all interactive elements
   * 
   * For any task, the TaskList should provide aria-label attributes that
   * describe the task state without relying on visual cues.
   */
  it('Property 13.4: TaskList provides ARIA labels for all tasks', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (tasks) => {
          const { container } = render(<TaskList tasks={tasks} />);
          
          // Get all task buttons
          const buttons = container.querySelectorAll('[role="button"]');
          
          // Verify each button has an aria-label
          buttons.forEach(button => {
            const ariaLabel = button.getAttribute('aria-label');
            expect(ariaLabel).not.toBeNull();
            expect(ariaLabel).toContain('Task');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.5: ThinkingStream activity levels have icons
   * 
   * For any activity level, the ThinkingStream should display an icon that
   * conveys the level without relying on color alone.
   */
  it('Property 13.5: ThinkingStream provides level icons for all activities', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            timestamp: fc.date().map(d => d.toISOString()),
            message: fc.string({ minLength: 10, maxLength: 100 }),
            level: fc.constantFrom('info' as const, 'success' as const, 'error' as const, 'correction' as const),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (activities) => {
          const { container } = render(<ThinkingStream activities={activities} />);
          
          // Get all activity icons (marked with aria-hidden)
          const icons = container.querySelectorAll('[aria-hidden="true"]');
          
          // Should have at least one icon per activity
          expect(icons.length).toBeGreaterThanOrEqual(activities.length);
          
          // Verify each activity level has a corresponding icon
          activities.forEach((activity) => {
            const expectedIcons: Record<string, string> = {
              'info': '→',
              'success': '✓',
              'error': '✗',
              'correction': '⚡',
            };
            
            const expectedIcon = expectedIcons[activity.level];
            const hasIcon = Array.from(icons).some(icon => 
              icon.textContent === expectedIcon
            );
            
            expect(hasIcon).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.6: Dependency badges have text labels
   * 
   * For any task with dependencies, the dependency badges should include
   * text labels (not just color) to indicate completion status.
   */
  it('Property 13.6: Dependency badges include text labels for status', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (_numDeps) => {
          // Create tasks with dependencies
          const tasks = [
            {
              id: '1',
              description: 'Task 1',
              status: 'completed' as const,
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
          
          const { container } = render(<TaskList tasks={tasks} />);
          
          // Find dependency badges
          const depBadges = container.querySelectorAll('[aria-label*="Dependency"]');
          
          // Should have dependency badges
          expect(depBadges.length).toBeGreaterThan(0);
          
          // Verify each badge has aria-label with status
          depBadges.forEach(badge => {
            const ariaLabel = badge.getAttribute('aria-label');
            expect(ariaLabel).not.toBeNull();
            expect(ariaLabel).toMatch(/completed|incomplete/);
            
            // Verify completed dependencies have checkmark icon
            if (ariaLabel?.includes('completed')) {
              expect(badge.textContent).toContain('✓');
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.7: Priority badges have text labels
   * 
   * For any prioritized task, the priority badge should include text
   * (not just color) to indicate high priority status.
   */
  it('Property 13.7: Priority badges include text labels', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          description: fc.string({ minLength: 5, maxLength: 50 }),
          status: fc.constant('not_started' as const),
          priority: fc.constant(1), // High priority
          dependencies: fc.constant([]),
        }),
        (task) => {
          const { container } = render(<TaskList tasks={[task]} />);
          
          // Find priority badge
          const priorityBadge = container.querySelector('[aria-label="High priority"]');
          
          // Should have priority badge
          expect(priorityBadge).not.toBeNull();
          
          // Verify badge has text content (not just color)
          const badgeText = priorityBadge?.textContent || '';
          expect(badgeText).toContain('PRIORITY');
          
          // Verify badge has icon
          expect(badgeText).toContain('⚡');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.8: Blocked task indicators have text labels
   * 
   * For any blocked task, the blocked indicator should include text
   * (not just color) to convey the blocked status.
   */
  it('Property 13.8: Blocked task indicators include text labels', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (_numTasks) => {
          // Create tasks where task 2 is blocked by task 1
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
          
          const { container } = render(<TaskList tasks={tasks} />);
          
          // Find blocked indicator
          const blockedIndicator = Array.from(container.querySelectorAll('div')).find(
            div => div.textContent?.includes('Blocked')
          );
          
          // Should have blocked indicator
          expect(blockedIndicator).not.toBeNull();
          
          // Verify indicator has text content
          const indicatorText = blockedIndicator?.textContent || '';
          expect(indicatorText).toContain('Blocked');
          expect(indicatorText).toContain('complete dependencies first');
          
          // Verify indicator has icon
          expect(indicatorText).toContain('🔒');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.9: All color-coded elements have non-color alternatives
   * 
   * For any component with color-coded information, there should be at least
   * one non-color method of conveying the same information (text, icon, or ARIA).
   */
  it('Property 13.9: All color-coded elements have non-color alternatives', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'thinking', 'success', 'error', 'correction'),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        (indicatorStatus, tasks) => {
          // Test NeonIndicator
          const { container: indicatorContainer } = render(
            <NeonIndicator status={indicatorStatus as any} />
          );
          
          // Verify NeonIndicator has text label
          const indicatorText = indicatorContainer.textContent || '';
          expect(indicatorText.length).toBeGreaterThan(0);
          
          // Verify NeonIndicator has aria-label
          const indicator = indicatorContainer.querySelector('[role="status"]');
          expect(indicator?.getAttribute('aria-label')).not.toBeNull();
          
          // Test TaskList
          const { container: taskContainer } = render(<TaskList tasks={tasks} />);
          
          // Verify all tasks have aria-labels
          const buttons = taskContainer.querySelectorAll('[role="button"]');
          buttons.forEach(button => {
            expect(button.getAttribute('aria-label')).not.toBeNull();
          });
          
          // Verify all tasks have status icons
          const icons = taskContainer.querySelectorAll('[aria-hidden="true"]');
          expect(icons.length).toBeGreaterThanOrEqual(tasks.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13.10: ARIA attributes are present and meaningful
   * 
   * For any interactive or informational element, ARIA attributes should be
   * present and provide meaningful information about the element's state.
   */
  it('Property 13.10: ARIA attributes provide meaningful information', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            description: fc.string({ minLength: 5, maxLength: 50 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.constant([]),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (tasks) => {
          const { container } = render(<TaskList tasks={tasks} />);
          
          // Get all elements with aria-label
          const elementsWithAria = container.querySelectorAll('[aria-label]');
          
          // Verify each aria-label is meaningful (not empty, contains relevant info)
          elementsWithAria.forEach(element => {
            const ariaLabel = element.getAttribute('aria-label') || '';
            
            // Should not be empty
            expect(ariaLabel.length).toBeGreaterThan(0);
            
            // Should contain relevant keywords
            const hasRelevantInfo = 
              ariaLabel.includes('Task') ||
              ariaLabel.includes('Status') ||
              ariaLabel.includes('priority') ||
              ariaLabel.includes('Dependency') ||
              ariaLabel.includes('Blocked');
            
            expect(hasRelevantInfo).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
