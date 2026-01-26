/**
 * Unit Tests: CorrectionOverlay Component
 * 
 * Tests overlay appearance, B.L.A.S.T. step display, auto-dismiss behavior,
 * and escalation indicators.
 * 
 * Validates Requirements 4.1, 4.2, 4.3, 4.4
 * 
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CorrectionOverlay } from '@/components/dashboard/CorrectionOverlay';

describe('CorrectionOverlay Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isVisible is false', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={false}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      expect(container.querySelector('[role="alert"]')).toBeFalsy();
    });

    it('should render when isVisible is true', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      expect(container.querySelector('[role="alert"]')).toBeTruthy();
    });

    it('should display "CRITICAL CORRECTION" header', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      expect(container.textContent).toContain('CRITICAL CORRECTION');
    });

    it('should display error message', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error message"
          attemptNumber={1}
        />
      );

      expect(container.textContent).toContain('Test error message');
    });

    it('should display fallback message when error message is empty', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage=""
          attemptNumber={1}
        />
      );

      expect(container.textContent).toContain('Analyzing error...');
    });
  });

  describe('B.L.A.S.T. Step Display', () => {
    it('should display all B.L.A.S.T. steps', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Analyze"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      expect(container.textContent).toContain('Build');
      expect(container.textContent).toContain('Log');
      expect(container.textContent).toContain('Analyze');
      expect(container.textContent).toContain('Spec');
      expect(container.textContent).toContain('Test');
    });

    it('should highlight current B.L.A.S.T. step', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Analyze"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const steps = container.querySelectorAll('[aria-current="step"]');
      expect(steps.length).toBe(1);
      expect(steps[0]?.textContent).toBe('Analyze');
    });

    it('should apply pulsing animation to active step', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const buildStep = Array.from(container.querySelectorAll('div')).find(
        el => el.textContent === 'Build' && el.getAttribute('aria-current') === 'step'
      );

      expect(buildStep?.className).toContain('animate-pulse');
    });

    it('should show B.L.A.S.T. protocol active label', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Log"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      expect(container.textContent).toContain('B.L.A.S.T. PROTOCOL ACTIVE');
    });

    it('should not show B.L.A.S.T. steps when blastStep is null', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep={null}
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      expect(container.textContent).not.toContain('B.L.A.S.T. PROTOCOL ACTIVE');
    });
  });

  describe('Attempt Number Display', () => {
    it('should display attempt 1 of 3', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      expect(container.textContent).toContain('ATTEMPT 1/3');
    });

    it('should display attempt 2 of 3', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={2}
        />
      );

      expect(container.textContent).toContain('ATTEMPT 2/3');
    });

    it('should display attempt 3 of 3', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={3}
        />
      );

      expect(container.textContent).toContain('ATTEMPT 3/3');
    });
  });

  describe('Escalation Indicator', () => {
    it('should show escalation warning on attempt 3', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={3}
        />
      );

      expect(container.textContent).toContain('ESCALATION REQUIRED');
      expect(container.textContent).toContain('Maximum attempts reached');
    });

    it('should not show escalation warning on attempt 1', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      expect(container.textContent).not.toContain('ESCALATION REQUIRED');
    });

    it('should not show escalation warning on attempt 2', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={2}
        />
      );

      expect(container.textContent).not.toContain('ESCALATION REQUIRED');
    });

    it('should apply rose styling on escalation', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={3}
        />
      );

      const overlay = container.querySelector('[role="alert"]');
      expect(overlay?.innerHTML).toContain('rose');
    });

    it('should apply amber styling on non-escalation', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const overlay = container.querySelector('[role="alert"]');
      expect(overlay?.innerHTML).toContain('amber');
    });

    it('should show warning emoji on escalation', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={3}
        />
      );

      expect(container.textContent).toContain('⚠️');
    });
  });

  describe('Auto-Dismiss Behavior', () => {
    it('should call onDismiss after 5 seconds', async () => {
      const onDismiss = vi.fn();
      
      render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
          onDismiss={onDismiss}
        />
      );

      expect(onDismiss).not.toHaveBeenCalled();

      // Fast-forward 5 seconds
      await vi.advanceTimersByTimeAsync(5000);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not call onDismiss before 5 seconds', () => {
      const onDismiss = vi.fn();
      
      render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
          onDismiss={onDismiss}
        />
      );

      // Fast-forward 4 seconds
      vi.advanceTimersByTime(4000);

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('should show auto-dismiss message', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      expect(container.textContent).toContain('Auto-dismissing in 5 seconds');
    });

    it('should clean up timer on unmount', () => {
      const onDismiss = vi.fn();
      
      const { unmount } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
          onDismiss={onDismiss}
        />
      );

      unmount();

      // Fast-forward 5 seconds after unmount
      vi.advanceTimersByTime(5000);

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert"', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeTruthy();
    });

    it('should have aria-live="assertive"', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const alert = container.querySelector('[aria-live="assertive"]');
      expect(alert).toBeTruthy();
    });

    it('should have aria-label on overlay', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const overlay = container.querySelector('[role="alert"]');
      expect(overlay?.getAttribute('aria-label')).toContain('Critical correction');
    });

    it('should have aria-label on attempt indicator', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={2}
        />
      );

      const attemptIndicator = Array.from(container.querySelectorAll('[aria-label]')).find(
        el => el.getAttribute('aria-label')?.includes('Attempt 2 of 3')
      );

      expect(attemptIndicator).toBeTruthy();
    });

    it('should have aria-current on active B.L.A.S.T. step', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Spec"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const activeStep = container.querySelector('[aria-current="step"]');
      expect(activeStep?.textContent).toBe('Spec');
    });

    it('should have role="status" on error message', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const errorStatus = container.querySelector('[role="status"]');
      expect(errorStatus?.textContent).toContain('Test error');
    });
  });

  describe('Animations', () => {
    it('should apply pulsing animation to outer ring', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const pulsingRing = Array.from(container.querySelectorAll('div')).find(
        el => el.className.includes('animate-ping')
      );

      expect(pulsingRing).toBeTruthy();
    });

    it('should apply fade-in animation to overlay', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const overlay = container.querySelector('[role="alert"]');
      expect(overlay?.className).toContain('fade-in');
    });

    it('should apply zoom-in animation to content', () => {
      const { container } = render(
        <CorrectionOverlay
          isVisible={true}
          blastStep="Build"
          errorMessage="Test error"
          attemptNumber={1}
        />
      );

      const content = container.querySelector('.zoom-in-95');
      expect(content).toBeTruthy();
    });
  });
});
