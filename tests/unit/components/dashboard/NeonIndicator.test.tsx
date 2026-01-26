/**
 * Unit Tests for NeonIndicator Component
 * 
 * Tests specific examples and edge cases for the neon status indicator.
 * 
 * **Validates: Requirements 3.4, 9.1, 9.3**
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NeonIndicator } from '@/components/dashboard/NeonIndicator';

describe('NeonIndicator Component', () => {
  describe('Status colors', () => {
    it('should display cyan color for thinking status', () => {
      const { container } = render(<NeonIndicator status="thinking" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toContain('bg-cyan-400');
    });

    it('should display emerald color for success status', () => {
      const { container } = render(<NeonIndicator status="success" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toContain('bg-emerald-400');
    });

    it('should display rose color for error status', () => {
      const { container } = render(<NeonIndicator status="error" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toContain('bg-rose-400');
    });

    it('should display amber color for correction status', () => {
      const { container } = render(<NeonIndicator status="correction" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toContain('bg-amber-400');
    });

    it('should display gray color for idle status', () => {
      const { container } = render(<NeonIndicator status="idle" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toContain('bg-slate-500');
    });
  });

  describe('Status labels', () => {
    it('should display "Thinking" label for thinking status', () => {
      render(<NeonIndicator status="thinking" />);

      expect(screen.getByText('Thinking')).toBeTruthy();
    });

    it('should display "Success" label for success status', () => {
      render(<NeonIndicator status="success" />);

      expect(screen.getByText('Success')).toBeTruthy();
    });

    it('should display "Error" label for error status', () => {
      render(<NeonIndicator status="error" />);

      expect(screen.getByText('Error')).toBeTruthy();
    });

    it('should display "Correcting" label for correction status', () => {
      render(<NeonIndicator status="correction" />);

      expect(screen.getByText('Correcting')).toBeTruthy();
    });

    it('should display "Idle" label for idle status', () => {
      render(<NeonIndicator status="idle" />);

      expect(screen.getByText('Idle')).toBeTruthy();
    });
  });

  describe('Status icons', () => {
    it('should display ◉ icon for thinking status', () => {
      const { container } = render(<NeonIndicator status="thinking" />);

      expect(container.textContent).toContain('◉');
    });

    it('should display ✓ icon for success status', () => {
      const { container } = render(<NeonIndicator status="success" />);

      expect(container.textContent).toContain('✓');
    });

    it('should display ✗ icon for error status', () => {
      const { container } = render(<NeonIndicator status="error" />);

      expect(container.textContent).toContain('✗');
    });

    it('should display ⚡ icon for correction status', () => {
      const { container } = render(<NeonIndicator status="correction" />);

      expect(container.textContent).toContain('⚡');
    });

    it('should display ○ icon for idle status', () => {
      const { container } = render(<NeonIndicator status="idle" />);

      expect(container.textContent).toContain('○');
    });
  });

  describe('Pulsing animations', () => {
    it('should pulse for thinking status', () => {
      const { container } = render(<NeonIndicator status="thinking" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toContain('animate-pulse');
    });

    it('should pulse for correction status', () => {
      const { container } = render(<NeonIndicator status="correction" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).toContain('animate-pulse');
    });

    it('should not pulse for success status', () => {
      const { container } = render(<NeonIndicator status="success" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).not.toContain('animate-pulse');
    });

    it('should not pulse for error status', () => {
      const { container } = render(<NeonIndicator status="error" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).not.toContain('animate-pulse');
    });

    it('should not pulse for idle status', () => {
      const { container } = render(<NeonIndicator status="idle" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator?.className).not.toContain('animate-pulse');
    });
  });

  describe('Glow ring for active states', () => {
    it('should show glow ring for thinking status', () => {
      const { container } = render(<NeonIndicator status="thinking" />);

      const glowRing = container.querySelector('.animate-ping');
      expect(glowRing).toBeTruthy();
    });

    it('should show glow ring for correction status', () => {
      const { container } = render(<NeonIndicator status="correction" />);

      const glowRing = container.querySelector('.animate-ping');
      expect(glowRing).toBeTruthy();
    });

    it('should not show glow ring for success status', () => {
      const { container } = render(<NeonIndicator status="success" />);

      const glowRing = container.querySelector('.animate-ping');
      expect(glowRing).toBeFalsy();
    });

    it('should not show glow ring for error status', () => {
      const { container } = render(<NeonIndicator status="error" />);

      const glowRing = container.querySelector('.animate-ping');
      expect(glowRing).toBeFalsy();
    });

    it('should not show glow ring for idle status', () => {
      const { container } = render(<NeonIndicator status="idle" />);

      const glowRing = container.querySelector('.animate-ping');
      expect(glowRing).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" for screen readers', () => {
      const { container } = render(<NeonIndicator status="thinking" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator).toBeTruthy();
    });

    it('should have descriptive aria-label', () => {
      const { container } = render(<NeonIndicator status="success" />);

      const indicator = container.querySelector('[role="status"]');
      const ariaLabel = indicator?.getAttribute('aria-label');
      expect(ariaLabel).toContain('Status:');
      expect(ariaLabel).toContain('Success');
    });

    it('should hide decorative icon from screen readers', () => {
      const { container } = render(<NeonIndicator status="thinking" />);

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeTruthy();
    });

    it('should have text label in addition to color', () => {
      render(<NeonIndicator status="error" />);

      // Text label provides information beyond just color
      expect(screen.getByText('Error')).toBeTruthy();
    });
  });

  describe('Text color consistency', () => {
    it('should use cyan text for thinking status', () => {
      const { container } = render(<NeonIndicator status="thinking" />);

      const textElement = container.querySelector('.text-cyan-400');
      expect(textElement).toBeTruthy();
    });

    it('should use emerald text for success status', () => {
      const { container } = render(<NeonIndicator status="success" />);

      const textElement = container.querySelector('.text-emerald-400');
      expect(textElement).toBeTruthy();
    });

    it('should use rose text for error status', () => {
      const { container } = render(<NeonIndicator status="error" />);

      const textElement = container.querySelector('.text-rose-400');
      expect(textElement).toBeTruthy();
    });

    it('should use amber text for correction status', () => {
      const { container } = render(<NeonIndicator status="correction" />);

      const textElement = container.querySelector('.text-amber-400');
      expect(textElement).toBeTruthy();
    });
  });

  describe('Component structure', () => {
    it('should render indicator dot and label together', () => {
      const { container } = render(<NeonIndicator status="thinking" />);

      const indicator = container.querySelector('[role="status"]');
      const label = screen.getByText('Thinking');

      expect(indicator).toBeTruthy();
      expect(label).toBeTruthy();
    });

    it('should have proper spacing between elements', () => {
      const { container } = render(<NeonIndicator status="success" />);

      // Check for gap classes
      const wrapper = container.querySelector('.gap-3');
      expect(wrapper).toBeTruthy();
    });

    it('should render without errors', () => {
      expect(() => render(<NeonIndicator status="idle" />)).not.toThrow();
    });
  });
});
