/**
 * Unit Tests for ThinkingStream Component
 * 
 * Tests specific examples and edge cases for the terminal-style
 * activity stream display component.
 * 
 * **Validates: Requirements 3.1, 3.2**
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThinkingStream } from '@/components/dashboard/ThinkingStream';
import type { ActivityEntry } from '@/hooks/useBrainStream';

describe('ThinkingStream Component', () => {
  beforeEach(() => {
    // Mock scrollTo for testing
    Element.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering with empty activities', () => {
    it('should render without errors when activities array is empty', () => {
      const { container } = render(<ThinkingStream activities={[]} />);
      
      expect(container).toBeTruthy();
      expect(screen.getByText('Thinking Stream')).toBeTruthy();
    });

    it('should display "Waiting for activity..." message when no activities', () => {
      render(<ThinkingStream activities={[]} />);
      
      expect(screen.getByText('Waiting for activity...')).toBeTruthy();
    });

    it('should show "0 entries" count when activities array is empty', () => {
      render(<ThinkingStream activities={[]} />);
      
      expect(screen.getByText('0 entries')).toBeTruthy();
    });
  });

  describe('Rendering with 10 activities', () => {
    const mockActivities: ActivityEntry[] = Array.from({ length: 10 }, (_, i) => ({
      id: `activity-${i}`,
      timestamp: new Date(2026, 0, 24, 10, i, 0).toISOString(),
      message: `Activity ${i + 1}`,
      level: 'info' as const,
    }));

    it('should render all 10 activities', () => {
      render(<ThinkingStream activities={mockActivities} />);
      
      mockActivities.forEach((activity) => {
        expect(screen.getByText(activity.message)).toBeTruthy();
      });
    });

    it('should display "10 entries" count', () => {
      render(<ThinkingStream activities={mockActivities} />);
      
      expect(screen.getByText('10 entries')).toBeTruthy();
    });

    it('should display singular "entry" for single activity', () => {
      render(<ThinkingStream activities={[mockActivities[0]!]} />);
      
      expect(screen.getByText('1 entry')).toBeTruthy();
    });

    it('should render timestamps in HH:MM:SS format', () => {
      render(<ThinkingStream activities={[mockActivities[0]!]} />);
      
      // Timestamp should be formatted as HH:MM:SS
      expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeTruthy();
    });
  });

  describe('Scroll behavior', () => {
    it('should call scrollTo when new activities are added', () => {
      const initialActivities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: 'Initial activity',
        level: 'info',
      }];

      const { rerender } = render(<ThinkingStream activities={initialActivities} />);
      
      // Clear initial scroll calls
      vi.clearAllMocks();

      // Add new activity
      const updatedActivities: ActivityEntry[] = [
        ...initialActivities,
        {
          id: 'activity-2',
          timestamp: new Date().toISOString(),
          message: 'New activity',
          level: 'success',
        },
      ];

      rerender(<ThinkingStream activities={updatedActivities} />);

      // Verify scrollTo was called
      expect(Element.prototype.scrollTo).toHaveBeenCalled();
    });

    it('should not call scrollTo when activities array is replaced with same length', () => {
      const activities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: 'Activity 1',
        level: 'info',
      }];

      const { rerender } = render(<ThinkingStream activities={activities} />);
      
      // Clear initial scroll calls
      vi.clearAllMocks();

      // Replace with different activity but same length
      const replacedActivities: ActivityEntry[] = [{
        id: 'activity-2',
        timestamp: new Date().toISOString(),
        message: 'Activity 2',
        level: 'info',
      }];

      rerender(<ThinkingStream activities={replacedActivities} />);

      // Should not scroll (length didn't increase)
      expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
    });

    it('should use smooth scroll behavior', () => {
      const initialActivities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: 'Initial',
        level: 'info',
      }];

      const { rerender } = render(<ThinkingStream activities={initialActivities} />);
      
      vi.clearAllMocks();

      const updatedActivities: ActivityEntry[] = [
        ...initialActivities,
        {
          id: 'activity-2',
          timestamp: new Date().toISOString(),
          message: 'New',
          level: 'info',
        },
      ];

      rerender(<ThinkingStream activities={updatedActivities} />);

      const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
      const lastCall = scrollToMock.mock.calls[scrollToMock.mock.calls.length - 1];
      
      expect(lastCall).toBeDefined();
      if (lastCall && lastCall[0]) {
        const scrollOptions = lastCall[0] as ScrollToOptions;
        expect(scrollOptions.behavior).toBe('smooth');
      }
    });
  });

  describe('Color coding by level', () => {
    it('should apply cyan color for info level', () => {
      const activities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: 'Info message',
        level: 'info',
      }];

      const { container } = render(<ThinkingStream activities={activities} />);
      
      const activityElement = container.querySelector('.text-cyan-400');
      expect(activityElement).toBeTruthy();
    });

    it('should apply emerald color for success level', () => {
      const activities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: 'Success message',
        level: 'success',
      }];

      const { container } = render(<ThinkingStream activities={activities} />);
      
      const activityElement = container.querySelector('.text-emerald-400');
      expect(activityElement).toBeTruthy();
    });

    it('should apply rose color for error level', () => {
      const activities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: 'Error message',
        level: 'error',
      }];

      const { container } = render(<ThinkingStream activities={activities} />);
      
      const activityElement = container.querySelector('.text-rose-400');
      expect(activityElement).toBeTruthy();
    });

    it('should apply amber color for correction level', () => {
      const activities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: 'Correction message',
        level: 'correction',
      }];

      const { container } = render(<ThinkingStream activities={activities} />);
      
      const activityElement = container.querySelector('.text-amber-400');
      expect(activityElement).toBeTruthy();
    });

    it('should display correct icon for each level', () => {
      const activities: ActivityEntry[] = [
        {
          id: 'info',
          timestamp: new Date().toISOString(),
          message: 'Info',
          level: 'info',
        },
        {
          id: 'success',
          timestamp: new Date().toISOString(),
          message: 'Success',
          level: 'success',
        },
        {
          id: 'error',
          timestamp: new Date().toISOString(),
          message: 'Error',
          level: 'error',
        },
        {
          id: 'correction',
          timestamp: new Date().toISOString(),
          message: 'Correction',
          level: 'correction',
        },
      ];

      const { container } = render(<ThinkingStream activities={activities} />);
      
      // Check for icons (→, ✓, ✗, ⚡)
      expect(container.textContent).toContain('→'); // info
      expect(container.textContent).toContain('✓'); // success
      expect(container.textContent).toContain('✗'); // error
      expect(container.textContent).toContain('⚡'); // correction
    });
  });

  describe('Accessibility', () => {
    it('should have role="log" for screen readers', () => {
      render(<ThinkingStream activities={[]} />);
      
      const logElement = screen.getByRole('log');
      expect(logElement).toBeTruthy();
    });

    it('should have aria-live="polite" for live updates', () => {
      render(<ThinkingStream activities={[]} />);
      
      const logElement = screen.getByRole('log');
      expect(logElement.getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-label for context', () => {
      render(<ThinkingStream activities={[]} />);
      
      const logElement = screen.getByRole('log');
      expect(logElement.getAttribute('aria-label')).toBe('Activity stream');
    });

    it('should hide decorative icons from screen readers', () => {
      const activities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: 'Test',
        level: 'info',
      }];

      const { container } = render(<ThinkingStream activities={activities} />);
      
      const iconElement = container.querySelector('[aria-hidden="true"]');
      expect(iconElement).toBeTruthy();
    });
  });

  describe('Terminal styling', () => {
    it('should use JetBrains Mono font family', () => {
      const { container } = render(<ThinkingStream activities={[]} />);
      
      const scrollArea = container.querySelector('[role="log"]');
      expect(scrollArea).toBeTruthy();
      // Check inline style contains JetBrains Mono
      expect(scrollArea?.getAttribute('style')).toContain('JetBrains Mono');
    });

    it('should have glassmorphism styling with backdrop blur', () => {
      const { container } = render(<ThinkingStream activities={[]} />);
      
      const scrollArea = container.querySelector('.backdrop-blur-sm');
      expect(scrollArea).toBeTruthy();
    });

    it('should have dark background for terminal aesthetic', () => {
      const { container } = render(<ThinkingStream activities={[]} />);
      
      const scrollArea = container.querySelector('[role="log"]');
      expect(scrollArea?.className).toContain('bg-black/30');
    });
  });

  describe('Edge cases', () => {
    it('should handle activities with special characters in messages', () => {
      const activities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: 'Message with <script>alert("xss")</script> and & symbols',
        level: 'info',
      }];

      render(<ThinkingStream activities={activities} />);
      
      // React automatically escapes HTML, so the message should be safe
      expect(screen.getByText(/Message with.*script.*alert.*xss.*script.*and & symbols/)).toBeTruthy();
    });

    it('should handle very long messages with word wrapping', () => {
      const longMessage = 'A'.repeat(200);
      const activities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: new Date().toISOString(),
        message: longMessage,
        level: 'info',
      }];

      const { container } = render(<ThinkingStream activities={activities} />);
      
      const messageElement = container.querySelector('.break-words');
      expect(messageElement).toBeTruthy();
    });

    it('should handle activities with invalid timestamps gracefully', () => {
      const activities: ActivityEntry[] = [{
        id: 'activity-1',
        timestamp: 'invalid-timestamp',
        message: 'Test message',
        level: 'info',
      }];

      // Should not throw error
      expect(() => render(<ThinkingStream activities={activities} />)).not.toThrow();
    });

    it('should handle rapid re-renders without errors', () => {
      const { rerender } = render(<ThinkingStream activities={[]} />);
      
      // Rapidly update activities
      for (let i = 0; i < 20; i++) {
        const activities: ActivityEntry[] = [{
          id: `activity-${i}`,
          timestamp: new Date().toISOString(),
          message: `Activity ${i}`,
          level: 'info',
        }];
        
        rerender(<ThinkingStream activities={activities} />);
      }

      // Should not throw errors
      expect(screen.getByText('Thinking Stream')).toBeTruthy();
    });
  });
});
