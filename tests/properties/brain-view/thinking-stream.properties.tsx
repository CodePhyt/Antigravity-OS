/**
 * Property-Based Tests for ThinkingStream Component
 * 
 * **Feature: ralphs-brain-view, Property 7: Auto-Scroll Behavior**
 * 
 * For any sequence of activity entries, when new entries are added to the 
 * thinking stream, the scroll position should automatically move to show 
 * the latest entry.
 * 
 * **Validates: Requirements 3.2**
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { ThinkingStream } from '@/components/dashboard/ThinkingStream';
import type { ActivityEntry } from '@/hooks/useBrainStream';

describe('Property 7: Auto-Scroll Behavior', () => {
  beforeEach(() => {
    // Mock scrollTo for testing
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Generate random activity entries for testing
   */
  const activityArbitrary: fc.Arbitrary<ActivityEntry> = fc.record({
    id: fc.uuid(),
    timestamp: fc.date().map(d => d.toISOString()),
    message: fc.string({ minLength: 5, maxLength: 100 }),
    level: fc.constantFrom('info', 'success', 'error', 'correction') as fc.Arbitrary<ActivityEntry['level']>,
  });

  it('should auto-scroll to bottom when new activities are added', () => {
    /**
     * Property: For any sequence of activities, when new entries are added,
     * scrollTo should be called with smooth behavior to move to bottom
     */
    fc.assert(
      fc.property(
        fc.array(activityArbitrary, { minLength: 1, maxLength: 20 }),
        fc.array(activityArbitrary, { minLength: 1, maxLength: 5 }),
        (initialActivities, newActivities) => {
          // Render with initial activities
          const { rerender } = render(
            <ThinkingStream activities={initialActivities} />
          );

          // Clear any initial scroll calls
          vi.clearAllMocks();

          // Add new activities
          const updatedActivities = [...initialActivities, ...newActivities];
          rerender(<ThinkingStream activities={updatedActivities} />);

          // Verify scrollTo was called (auto-scroll triggered)
          // Note: scrollTo is called on the container div
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          
          // Should have been called at least once for the new activities
          expect(scrollToMock).toHaveBeenCalled();

          // Verify smooth scroll behavior
          const lastCall = scrollToMock.mock.calls[scrollToMock.mock.calls.length - 1];
          if (lastCall && lastCall[0]) {
            const scrollOptions = lastCall[0] as ScrollToOptions;
            expect(scrollOptions.behavior).toBe('smooth');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not scroll when activities array is replaced with same length', () => {
    /**
     * Property: When activities are replaced but length stays the same,
     * auto-scroll should not trigger (no new entries added)
     */
    fc.assert(
      fc.property(
        fc.array(activityArbitrary, { minLength: 3, maxLength: 10 }),
        (activities) => {
          // Render with initial activities
          const { rerender } = render(
            <ThinkingStream activities={activities} />
          );

          // Clear any initial scroll calls
          vi.clearAllMocks();

          // Replace activities with same length (different content)
          const replacedActivities = activities.map((activity, index) => ({
            ...activity,
            id: `replaced-${index}`,
            message: `Replaced: ${activity.message}`,
          }));

          rerender(<ThinkingStream activities={replacedActivities} />);

          // Should not trigger auto-scroll (length didn't increase)
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          expect(scrollToMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should scroll to exact bottom position', () => {
    /**
     * Property: When scrolling, the target position should be scrollHeight
     * (the maximum scroll position, i.e., the bottom)
     */
    fc.assert(
      fc.property(
        fc.array(activityArbitrary, { minLength: 1, maxLength: 10 }),
        fc.array(activityArbitrary, { minLength: 1, maxLength: 3 }),
        (initialActivities, newActivities) => {
          // Mock scrollHeight
          const mockScrollHeight = 1000;
          Object.defineProperty(HTMLDivElement.prototype, 'scrollHeight', {
            configurable: true,
            get: () => mockScrollHeight,
          });

          // Render with initial activities
          const { rerender } = render(
            <ThinkingStream activities={initialActivities} />
          );

          // Clear any initial scroll calls
          vi.clearAllMocks();

          // Add new activities
          const updatedActivities = [...initialActivities, ...newActivities];
          rerender(<ThinkingStream activities={updatedActivities} />);

          // Verify scrollTo was called with scrollHeight as top position
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          
          if (scrollToMock.mock.calls.length > 0) {
            const lastCall = scrollToMock.mock.calls[scrollToMock.mock.calls.length - 1];
            if (lastCall && lastCall[0]) {
              const scrollOptions = lastCall[0] as ScrollToOptions;
              expect(scrollOptions.top).toBe(mockScrollHeight);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle rapid successive additions correctly', () => {
    /**
     * Property: When multiple activities are added in quick succession,
     * auto-scroll should trigger for each batch
     */
    fc.assert(
      fc.property(
        fc.array(activityArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(fc.array(activityArbitrary, { minLength: 1, maxLength: 3 }), {
          minLength: 2,
          maxLength: 5,
        }),
        (initialActivities, batches) => {
          // Render with initial activities
          const { rerender } = render(
            <ThinkingStream activities={initialActivities} />
          );

          // Clear any initial scroll calls
          vi.clearAllMocks();

          let currentActivities = [...initialActivities];

          // Add batches sequentially
          for (const batch of batches) {
            currentActivities = [...currentActivities, ...batch];
            rerender(<ThinkingStream activities={currentActivities} />);
          }

          // Verify scrollTo was called at least once per batch
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          expect(scrollToMock.mock.calls.length).toBeGreaterThanOrEqual(batches.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain scroll behavior consistency across activity levels', () => {
    /**
     * Property: Auto-scroll should work consistently regardless of
     * activity level (info, success, error, correction)
     */
    fc.assert(
      fc.property(
        fc.constantFrom('info', 'success', 'error', 'correction') as fc.Arbitrary<ActivityEntry['level']>,
        fc.array(activityArbitrary, { minLength: 1, maxLength: 5 }),
        (level, activities) => {
          // Create activities with specific level
          const leveledActivities = activities.map(a => ({ ...a, level }));

          // Render with initial empty state
          const { rerender } = render(<ThinkingStream activities={[]} />);

          // Clear any initial scroll calls
          vi.clearAllMocks();

          // Add activities with specific level
          rerender(<ThinkingStream activities={leveledActivities} />);

          // Verify scrollTo was called (level doesn't affect scroll behavior)
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          expect(scrollToMock).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not scroll when activities are removed', () => {
    /**
     * Property: When activities are removed (length decreases),
     * auto-scroll should not trigger
     */
    fc.assert(
      fc.property(
        fc.array(activityArbitrary, { minLength: 5, maxLength: 20 }),
        fc.integer({ min: 1, max: 4 }),
        (activities, removeCount) => {
          // Render with initial activities
          const { rerender } = render(
            <ThinkingStream activities={activities} />
          );

          // Clear any initial scroll calls
          vi.clearAllMocks();

          // Remove some activities
          const reducedActivities = activities.slice(0, -removeCount);
          rerender(<ThinkingStream activities={reducedActivities} />);

          // Should not trigger auto-scroll (length decreased)
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          expect(scrollToMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty to non-empty transition', () => {
    /**
     * Property: When transitioning from empty to non-empty activities,
     * auto-scroll should trigger
     */
    fc.assert(
      fc.property(
        fc.array(activityArbitrary, { minLength: 1, maxLength: 10 }),
        (activities) => {
          // Render with empty activities
          const { rerender } = render(<ThinkingStream activities={[]} />);

          // Clear any initial scroll calls
          vi.clearAllMocks();

          // Add activities
          rerender(<ThinkingStream activities={activities} />);

          // Verify scrollTo was called
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          expect(scrollToMock).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use smooth scroll behavior for all auto-scrolls', () => {
    /**
     * Property: All auto-scroll operations should use smooth behavior
     * for better user experience
     */
    fc.assert(
      fc.property(
        fc.array(activityArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(activityArbitrary, { minLength: 1, maxLength: 3 }),
        (initialActivities, newActivities) => {
          // Render with initial activities
          const { rerender } = render(
            <ThinkingStream activities={initialActivities} />
          );

          // Clear any initial scroll calls
          vi.clearAllMocks();

          // Add new activities
          const updatedActivities = [...initialActivities, ...newActivities];
          rerender(<ThinkingStream activities={updatedActivities} />);

          // Verify all scrollTo calls use smooth behavior
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          
          for (const call of scrollToMock.mock.calls) {
            if (call && call[0]) {
              const scrollOptions = call[0] as ScrollToOptions;
              expect(scrollOptions.behavior).toBe('smooth');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve scroll position when no new activities added', () => {
    /**
     * Property: When component re-renders without new activities,
     * scroll position should not change
     */
    fc.assert(
      fc.property(
        fc.array(activityArbitrary, { minLength: 3, maxLength: 10 }),
        (activities) => {
          // Render with activities
          const { rerender } = render(
            <ThinkingStream activities={activities} />
          );

          // Clear any initial scroll calls
          vi.clearAllMocks();

          // Re-render with same activities (no changes)
          rerender(<ThinkingStream activities={activities} />);

          // Should not trigger scroll (no new activities)
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          expect(scrollToMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle single activity addition', () => {
    /**
     * Property: Adding a single activity should trigger auto-scroll
     */
    fc.assert(
      fc.property(
        fc.array(activityArbitrary, { minLength: 0, maxLength: 10 }),
        activityArbitrary,
        (initialActivities, newActivity) => {
          // Render with initial activities
          const { rerender } = render(
            <ThinkingStream activities={initialActivities} />
          );

          // Clear any initial scroll calls
          vi.clearAllMocks();

          // Add single new activity
          const updatedActivities = [...initialActivities, newActivity];
          rerender(<ThinkingStream activities={updatedActivities} />);

          // Verify scrollTo was called
          const scrollToMock = Element.prototype.scrollTo as ReturnType<typeof vi.fn>;
          expect(scrollToMock).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
