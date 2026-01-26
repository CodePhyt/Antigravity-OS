/**
 * Unit Tests for ProgressBar Component
 * 
 * Tests specific examples and edge cases for the progress bar display.
 * 
 * **Validates: Requirements 3.3, 9.1, 9.3**
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '@/components/dashboard/ProgressBar';

describe('ProgressBar Component', () => {
  describe('Progress bar with various percentages', () => {
    it('should render with 0% progress', () => {
      const { container } = render(
        <ProgressBar percentage={0} completed={0} total={10} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('style')).toContain('width: 0%');
      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('should render with 50% progress', () => {
      const { container } = render(
        <ProgressBar percentage={50} completed={5} total={10} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('style')).toContain('width: 50%');
      expect(screen.getByText('50%')).toBeTruthy();
    });

    it('should render with 100% progress', () => {
      const { container } = render(
        <ProgressBar percentage={100} completed={10} total={10} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('style')).toContain('width: 100%');
      expect(screen.getByText('100%')).toBeTruthy();
    });

    it('should render with partial progress (33%)', () => {
      const { container } = render(
        <ProgressBar percentage={33} completed={1} total={3} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('style')).toContain('width: 33%');
      expect(screen.getByText('33%')).toBeTruthy();
    });
  });

  describe('Task count display', () => {
    it('should display correct task counts', () => {
      render(<ProgressBar percentage={50} completed={5} total={10} />);

      expect(screen.getByText('5 of 10 tasks completed')).toBeTruthy();
    });

    it('should handle zero completed tasks', () => {
      render(<ProgressBar percentage={0} completed={0} total={20} />);

      expect(screen.getByText('0 of 20 tasks completed')).toBeTruthy();
    });

    it('should handle all tasks completed', () => {
      render(<ProgressBar percentage={100} completed={15} total={15} />);

      expect(screen.getByText('15 of 15 tasks completed')).toBeTruthy();
    });

    it('should handle single task', () => {
      render(<ProgressBar percentage={100} completed={1} total={1} />);

      expect(screen.getByText('1 of 1 tasks completed')).toBeTruthy();
    });
  });

  describe('Completion message', () => {
    it('should show completion message when 100% complete', () => {
      render(<ProgressBar percentage={100} completed={10} total={10} />);

      expect(screen.getByText('All tasks complete!')).toBeTruthy();
    });

    it('should not show completion message when less than 100%', () => {
      const { container } = render(
        <ProgressBar percentage={99} completed={99} total={100} />
      );

      expect(container.textContent).not.toContain('All tasks complete!');
    });

    it('should not show completion message at 0%', () => {
      const { container } = render(
        <ProgressBar percentage={0} completed={0} total={10} />
      );

      expect(container.textContent).not.toContain('All tasks complete!');
    });
  });

  describe('Styling and animations', () => {
    it('should have emerald gradient for progress bar', () => {
      const { container } = render(
        <ProgressBar percentage={50} completed={5} total={10} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.className).toContain('bg-gradient-to-r');
      expect(progressBar?.className).toContain('from-emerald-500');
      expect(progressBar?.className).toContain('to-emerald-400');
    });

    it('should have transition animation', () => {
      const { container } = render(
        <ProgressBar percentage={75} completed={3} total={4} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.className).toContain('transition-all');
      expect(progressBar?.className).toContain('duration-500');
    });

    it('should have glassmorphism styling on container', () => {
      const { container } = render(
        <ProgressBar percentage={50} completed={5} total={10} />
      );

      const progressContainer = container.querySelector('.backdrop-blur-sm');
      expect(progressContainer).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have role="progressbar"', () => {
      const { container } = render(
        <ProgressBar percentage={60} completed={6} total={10} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeTruthy();
    });

    it('should have correct aria-valuenow', () => {
      const { container } = render(
        <ProgressBar percentage={75} completed={3} total={4} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('aria-valuenow')).toBe('75');
    });

    it('should have aria-valuemin="0"', () => {
      const { container } = render(
        <ProgressBar percentage={50} completed={5} total={10} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('aria-valuemin')).toBe('0');
    });

    it('should have aria-valuemax="100"', () => {
      const { container } = render(
        <ProgressBar percentage={50} completed={5} total={10} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar?.getAttribute('aria-valuemax')).toBe('100');
    });

    it('should have descriptive aria-label', () => {
      const { container } = render(
        <ProgressBar percentage={80} completed={8} total={10} />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      const ariaLabel = progressBar?.getAttribute('aria-label');
      expect(ariaLabel).toContain('Task completion');
      expect(ariaLabel).toContain('80%');
    });
  });

  describe('Edge cases', () => {
    it('should handle percentage greater than 100', () => {
      const { container } = render(
        <ProgressBar percentage={150} completed={15} total={10} />
      );

      // Should still render, but width will be clamped by CSS
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeTruthy();
      expect(screen.getByText('150%')).toBeTruthy();
    });

    it('should handle negative percentage', () => {
      const { container } = render(
        <ProgressBar percentage={-10} completed={0} total={10} />
      );

      // Should still render
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeTruthy();
    });

    it('should handle zero total tasks', () => {
      render(<ProgressBar percentage={0} completed={0} total={0} />);

      expect(screen.getByText('0 of 0 tasks completed')).toBeTruthy();
    });

    it('should handle large task numbers', () => {
      render(<ProgressBar percentage={50} completed={500} total={1000} />);

      expect(screen.getByText('500 of 1000 tasks completed')).toBeTruthy();
    });
  });
});
