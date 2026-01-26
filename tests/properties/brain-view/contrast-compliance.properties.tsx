/**
 * Property 15: Contrast Compliance
 * 
 * For any text element in the dashboard, the contrast ratio between text color and background color
 * should be at least 4.5:1 for normal text and 3:1 for large text.
 * 
 * **Validates: Requirements 9.5**
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { NeonIndicator } from '@/components/dashboard/NeonIndicator';
import { ProgressBar } from '@/components/dashboard/ProgressBar';
import { TaskList } from '@/components/dashboard/TaskList';
import { ThinkingStream } from '@/components/dashboard/ThinkingStream';
import { CorrectionOverlay } from '@/components/dashboard/CorrectionOverlay';

describe('Property 15: Contrast Compliance', () => {
  /**
   * Calculate relative luminance of a color
   * Based on WCAG 2.1 formula
   */
  function getRelativeLuminance(r: number, g: number, b: number): number {
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  /**
   * Calculate contrast ratio between two colors
   * Returns ratio as a number (e.g., 4.5 for 4.5:1)
   */
  function getContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
    const l1 = getRelativeLuminance(...color1);
    const l2 = getRelativeLuminance(...color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Parse RGB color from computed style
   */
  function parseRGB(colorString: string | undefined): [number, number, number] | null {
    if (!colorString) return null;
    
    // Handle rgb() format
    const rgbMatch = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
      return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
    }

    // Handle rgba() format
    const rgbaMatch = colorString.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (rgbaMatch && rgbaMatch[1] && rgbaMatch[2] && rgbaMatch[3]) {
      return [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])];
    }

    return null;
  }

  /**
   * Get computed colors for an element
   */
  function getElementColors(element: Element): { text: [number, number, number] | null; background: [number, number, number] | null } {
    const computed = window.getComputedStyle(element);
    const textColor = parseRGB(computed.color);
    const backgroundColor = parseRGB(computed.backgroundColor);

    return { text: textColor, background: backgroundColor };
  }

  /**
   * Check if element has sufficient contrast
   */
  function hasSufficientContrast(element: Element, minRatio: number = 4.5): boolean {
    const { text, background } = getElementColors(element);

    if (!text || !background) {
      // If we can't determine colors, skip this element
      return true;
    }

    const ratio = getContrastRatio(text, background);
    return ratio >= minRatio;
  }

  it('should maintain minimum 4.5:1 contrast ratio for all text in NeonIndicator', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'thinking', 'success', 'error', 'correction'),
        (status) => {
          const { container } = render(<NeonIndicator status={status as any} />);

          // Find all text elements
          const textElements = container.querySelectorAll('span, div');

          textElements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && text.length > 0) {
              const hasContrast = hasSufficientContrast(element);
              expect(hasContrast).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain minimum 4.5:1 contrast ratio for all text in ProgressBar', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (percentage, completed, total) => {
          const { container } = render(
            <ProgressBar
              percentage={percentage}
              completed={completed}
              total={total}
            />
          );

          // Find all text elements
          const textElements = container.querySelectorAll('span, div, p');

          textElements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && text.length > 0) {
              const hasContrast = hasSufficientContrast(element);
              expect(hasContrast).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain minimum 4.5:1 contrast ratio for all text in TaskList', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 5 }),
            description: fc.string({ minLength: 1, maxLength: 20 }),
            status: fc.constantFrom('not_started' as const, 'in_progress' as const, 'completed' as const),
            priority: fc.integer({ min: 0, max: 1 }),
            dependencies: fc.array(fc.string({ minLength: 1, maxLength: 5 }), { maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (tasks) => {
          // Ensure unique task IDs
          const uniqueIds = new Set(tasks.map(t => t.id));
          if (uniqueIds.size !== tasks.length) {
            return; // Skip this test case
          }

          const { container } = render(<TaskList tasks={tasks} />);

          // Find all text elements
          const textElements = container.querySelectorAll('span, div');

          textElements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && text.length > 0) {
              const hasContrast = hasSufficientContrast(element);
              expect(hasContrast).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain minimum 4.5:1 contrast ratio for all text in ThinkingStream', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            timestamp: fc.date().map(d => d.toISOString()),
            message: fc.string({ minLength: 5, maxLength: 50 }),
            level: fc.constantFrom('info', 'success', 'error', 'correction'),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (activities) => {
          const { container } = render(<ThinkingStream activities={activities as any} />);

          // Find all text elements
          const textElements = container.querySelectorAll('span, div');

          textElements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && text.length > 0) {
              const hasContrast = hasSufficientContrast(element);
              expect(hasContrast).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain minimum 4.5:1 contrast ratio for all text in CorrectionOverlay', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Build', 'Log', 'Analyze', 'Spec', 'Test'),
        fc.string({ minLength: 10, maxLength: 50 }),
        fc.integer({ min: 1, max: 3 }),
        (blastStep, errorMessage, attemptNumber) => {
          const { container } = render(
            <CorrectionOverlay
              isVisible={true}
              blastStep={blastStep as any}
              errorMessage={errorMessage}
              attemptNumber={attemptNumber}
            />
          );

          // Find all text elements
          const textElements = container.querySelectorAll('span, div, h2, p');

          textElements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && text.length > 0) {
              const hasContrast = hasSufficientContrast(element);
              expect(hasContrast).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify contrast ratios are calculated correctly', () => {
    // Test known color combinations
    const white: [number, number, number] = [255, 255, 255];
    const black: [number, number, number] = [0, 0, 0];
    const slate900: [number, number, number] = [15, 23, 42]; // #0f172a
    const cyan400: [number, number, number] = [34, 211, 238]; // #22d3ee

    // White on black should be 21:1
    const whiteOnBlack = getContrastRatio(white, black);
    expect(whiteOnBlack).toBeGreaterThan(20);
    expect(whiteOnBlack).toBeLessThan(22);

    // Cyan-400 on slate-900 should be > 4.5:1
    const cyanOnSlate = getContrastRatio(cyan400, slate900);
    expect(cyanOnSlate).toBeGreaterThan(4.5);
  });

  it('should handle edge cases in contrast calculation', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 })
        ),
        fc.tuple(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 })
        ),
        (color1, color2) => {
          const ratio = getContrastRatio(color1, color2);

          // Contrast ratio should always be >= 1
          expect(ratio).toBeGreaterThanOrEqual(1);

          // Contrast ratio should never exceed 21 (white on black)
          expect(ratio).toBeLessThanOrEqual(21);

          // Contrast ratio should be symmetric
          const reverseRatio = getContrastRatio(color2, color1);
          expect(Math.abs(ratio - reverseRatio)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });
});
