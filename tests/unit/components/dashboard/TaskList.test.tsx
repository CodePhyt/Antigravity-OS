/**
 * Unit Tests: TaskList Component
 * 
 * Tests task interactions, priority visual feedback, dependency display,
 * and blocked task behavior.
 * 
 * Validates Requirements 5.1, 5.2, 5.4, 5.5
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TaskList } from '@/components/dashboard/TaskList';

describe('TaskList Component', () => {
  describe('Rendering', () => {
    it('should render empty state when no tasks provided', () => {
      const { container } = render(<TaskList tasks={[]} />);
      
      expect(container.textContent).toContain('No tasks available');
    });

    it('should render all tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'in_progress' as const, priority: 0, dependencies: [] },
        { id: '3', description: 'Task 3', status: 'completed' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      expect(container.textContent).toContain('Task 1');
      expect(container.textContent).toContain('Task 2');
      expect(container.textContent).toContain('Task 3');
    });

    it('should display correct status icons', () => {
      const tasks = [
        { id: '1', description: 'Not started', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'In progress', status: 'in_progress' as const, priority: 0, dependencies: [] },
        { id: '3', description: 'Completed', status: 'completed' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      // Check for status icons
      expect(container.textContent).toContain('○'); // not_started
      expect(container.textContent).toContain('→'); // in_progress
      expect(container.textContent).toContain('✓'); // completed
    });
  });

  describe('Task Click Handling', () => {
    it('should call onTaskClick when clickable task is clicked', () => {
      const onTaskClick = vi.fn();
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />);
      
      const taskElement = container.querySelector('[role="button"]');
      if (taskElement) {
        fireEvent.click(taskElement);
      }
      
      expect(onTaskClick).toHaveBeenCalledWith('1');
    });

    it('should not call onTaskClick when completed task is clicked', () => {
      const onTaskClick = vi.fn();
      const tasks = [
        { id: '1', description: 'Task 1', status: 'completed' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />);
      
      const taskElement = container.querySelector('[role="button"]');
      if (taskElement) {
        fireEvent.click(taskElement);
      }
      
      expect(onTaskClick).not.toHaveBeenCalled();
    });

    it('should not call onTaskClick when blocked task is clicked', () => {
      const onTaskClick = vi.fn();
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: ['1'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />);
      
      const taskElements = container.querySelectorAll('[role="button"]');
      const blockedTask = taskElements[1];
      
      if (blockedTask) {
        fireEvent.click(blockedTask);
      }
      
      expect(onTaskClick).not.toHaveBeenCalled();
    });
  });

  describe('Priority Visual Feedback', () => {
    it('should show priority badge for prioritized not_started tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 1, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      expect(container.textContent).toContain('PRIORITY');
      expect(container.textContent).toContain('⚡');
    });

    it('should not show priority badge for prioritized in_progress tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'in_progress' as const, priority: 1, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      expect(container.textContent).not.toContain('PRIORITY');
    });

    it('should not show priority badge for prioritized completed tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'completed' as const, priority: 1, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      expect(container.textContent).not.toContain('PRIORITY');
    });

    it('should apply amber styling to prioritized tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 1, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElement = container.querySelector('[role="button"]');
      expect(taskElement?.className).toContain('amber');
    });

    it('should not show priority badge for non-prioritized tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      expect(container.textContent).not.toContain('PRIORITY');
    });
  });

  describe('Dependency Display', () => {
    it('should show dependency badges for tasks with dependencies', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: ['1'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      expect(container.textContent).toContain('Depends on:');
      expect(container.textContent).toContain('1');
    });

    it('should show completed dependencies with emerald styling', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'completed' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: ['1'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElements = container.querySelectorAll('[role="button"]');
      const task2 = taskElements[1];
      
      const depBadges = task2?.querySelectorAll('span');
      const depBadge = Array.from(depBadges || []).find(badge =>
        badge.textContent?.includes('1')
      );
      
      expect(depBadge?.className).toContain('emerald');
      expect(depBadge?.textContent).toContain('✓');
    });

    it('should show incomplete dependencies with rose styling', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: ['1'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElements = container.querySelectorAll('[role="button"]');
      const task2 = taskElements[1];
      
      const depBadges = task2?.querySelectorAll('span');
      const depBadge = Array.from(depBadges || []).find(badge =>
        badge.textContent?.includes('1') && !badge.textContent?.includes('✓')
      );
      
      expect(depBadge?.className).toContain('rose');
    });

    it('should not show dependency section for tasks without dependencies', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      expect(container.textContent).not.toContain('Depends on:');
    });

    it('should show multiple dependency badges', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '3', description: 'Task 3', status: 'not_started' as const, priority: 0, dependencies: ['1', '2'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElements = container.querySelectorAll('[role="button"]');
      const task3 = taskElements[2];
      
      expect(task3?.textContent).toContain('Depends on:');
      expect(task3?.textContent).toContain('1');
      expect(task3?.textContent).toContain('2');
    });
  });

  describe('Blocked Task Behavior', () => {
    it('should show blocked indicator for tasks with incomplete dependencies', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: ['1'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElements = container.querySelectorAll('[role="button"]');
      const task2 = taskElements[1];
      
      expect(task2?.textContent).toContain('Blocked');
      expect(task2?.textContent).toContain('complete dependencies first');
      expect(task2?.textContent).toContain('🔒');
    });

    it('should not show blocked indicator for tasks with completed dependencies', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'completed' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: ['1'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElements = container.querySelectorAll('[role="button"]');
      const task2 = taskElements[1];
      
      expect(task2?.textContent).not.toContain('Blocked');
      expect(task2?.textContent).not.toContain('🔒');
    });

    it('should apply disabled styling to blocked tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: ['1'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElements = container.querySelectorAll('[role="button"]');
      const task2 = taskElements[1];
      
      expect(task2?.className).toContain('opacity-50');
      expect(task2?.className).toContain('cursor-not-allowed');
    });

    it('should set aria-disabled=true for blocked tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: ['1'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElements = container.querySelectorAll('[role="button"]');
      const task2 = taskElements[1];
      
      expect(task2?.getAttribute('aria-disabled')).toBe('true');
    });

    it('should show tooltip with incomplete dependencies for blocked tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'in_progress' as const, priority: 0, dependencies: [] },
        { id: '3', description: 'Task 3', status: 'not_started' as const, priority: 0, dependencies: ['1', '2'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElements = container.querySelectorAll('[role="button"]');
      const task3 = taskElements[2];
      
      const title = task3?.getAttribute('title');
      expect(title).toContain('Blocked by:');
      expect(title).toContain('1');
      expect(title).toContain('2');
    });
  });

  describe('Status Styling', () => {
    it('should apply emerald styling to completed tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'completed' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElement = container.querySelector('[role="button"]');
      expect(taskElement?.className).toContain('emerald');
    });

    it('should apply line-through to completed task descriptions', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'completed' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElement = container.querySelector('[role="button"]');
      expect(taskElement?.innerHTML).toContain('line-through');
    });

    it('should apply hover styling to clickable tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElement = container.querySelector('[role="button"]');
      expect(taskElement?.className).toContain('cursor-pointer');
    });

    it('should not apply hover styling to completed tasks', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'completed' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElement = container.querySelector('[role="button"]');
      expect(taskElement?.className).not.toContain('cursor-pointer');
    });
  });

  describe('Accessibility', () => {
    it('should have role="list" on container', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const listElement = container.querySelector('[role="list"]');
      expect(listElement).toBeTruthy();
    });

    it('should have role="button" on each task', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const listItems = container.querySelectorAll('[role="button"]');
      expect(listItems.length).toBe(2);
    });

    it('should have aria-label on each task', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 0, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const taskElement = container.querySelector('[role="button"]');
      const ariaLabel = taskElement?.getAttribute('aria-label');
      
      expect(ariaLabel).toContain('Task 1');
      expect(ariaLabel).toContain('Task 1');
    });

    it('should have aria-label on priority badge', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'not_started' as const, priority: 1, dependencies: [] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const priorityBadge = Array.from(container.querySelectorAll('[aria-label]')).find(el =>
        el.getAttribute('aria-label') === 'High priority'
      );
      
      expect(priorityBadge).toBeTruthy();
    });

    it('should have aria-label on dependency badges', () => {
      const tasks = [
        { id: '1', description: 'Task 1', status: 'completed' as const, priority: 0, dependencies: [] },
        { id: '2', description: 'Task 2', status: 'not_started' as const, priority: 0, dependencies: ['1'] },
      ];
      
      const { container } = render(<TaskList tasks={tasks} />);
      
      const depBadge = Array.from(container.querySelectorAll('[aria-label]')).find(el =>
        el.getAttribute('aria-label')?.includes('Dependency 1')
      );
      
      expect(depBadge).toBeTruthy();
    });
  });
});

