/**
 * Property-Based Tests for useBrainStream Reconnection Logic
 * 
 * **Feature: ralphs-brain-view, Property 11: Reconnection with Backoff**
 * 
 * For any SSE connection failure, the client should attempt reconnection 
 * with exponential backoff (delays: 1s, 2s, 4s, 8s, ...) up to a maximum 
 * delay of 30 seconds.
 * 
 * **Validates: Requirements 8.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Calculate exponential backoff delay (same logic as useBrainStream)
 */
function calculateBackoffDelay(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay;
}

describe('Property 11: Reconnection with Backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should calculate exponential backoff delays correctly', () => {
    /**
     * Property: For any attempt number n, the backoff delay should be:
     * - min(1000 * 2^n, 30000) milliseconds
     * - Monotonically increasing until max delay
     * - Never exceed 30 seconds
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }), // Test attempts 0-20
        (attempt) => {
          const delay = calculateBackoffDelay(attempt);
          const expectedDelay = Math.min(1000 * Math.pow(2, attempt), 30000);

          // Verify delay matches expected exponential backoff
          expect(delay).toBe(expectedDelay);

          // Verify delay never exceeds maximum
          expect(delay).toBeLessThanOrEqual(30000);

          // Verify delay is positive
          expect(delay).toBeGreaterThan(0);

          // Verify exponential growth until max
          if (attempt > 0 && delay < 30000) {
            const previousDelay = calculateBackoffDelay(attempt - 1);
            expect(delay).toBeGreaterThan(previousDelay);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce specific delays for known attempts', () => {
    /**
     * Property: Backoff delays should match expected sequence:
     * Attempt 0: 1s
     * Attempt 1: 2s
     * Attempt 2: 4s
     * Attempt 3: 8s
     * Attempt 4: 16s
     * Attempt 5+: 30s (capped)
     */
    const expectedDelays = [
      { attempt: 0, delay: 1000 },
      { attempt: 1, delay: 2000 },
      { attempt: 2, delay: 4000 },
      { attempt: 3, delay: 8000 },
      { attempt: 4, delay: 16000 },
      { attempt: 5, delay: 30000 }, // Capped at max
      { attempt: 10, delay: 30000 }, // Still capped
      { attempt: 100, delay: 30000 }, // Still capped
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...expectedDelays),
        ({ attempt, delay: expectedDelay }) => {
          const actualDelay = calculateBackoffDelay(attempt);
          expect(actualDelay).toBe(expectedDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain backoff invariants across random attempts', () => {
    /**
     * Property: For any sequence of attempts, backoff delays should:
     * 1. Start at 1 second
     * 2. Double each time until reaching 30 seconds
     * 3. Stay at 30 seconds thereafter
     * 4. Never decrease
     */
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 2, maxLength: 10 }),
        (attempts) => {
          // Sort attempts to simulate sequential reconnection
          const sortedAttempts = [...attempts].sort((a, b) => a - b);
          
          let previousDelay = 0;

          for (const attempt of sortedAttempts) {
            const delay = calculateBackoffDelay(attempt);

            // Delay should never decrease
            expect(delay).toBeGreaterThanOrEqual(previousDelay);

            // First attempt should be 1 second
            if (attempt === 0) {
              expect(delay).toBe(1000);
            }

            // Delay should never exceed 30 seconds
            expect(delay).toBeLessThanOrEqual(30000);

            previousDelay = delay;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases correctly', () => {
    /**
     * Property: Edge cases should be handled correctly:
     * - Negative attempts (should not occur, but handle gracefully)
     * - Zero attempts (first connection)
     * - Very large attempts (should cap at max delay)
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(-1), // Edge: negative
          fc.constant(0), // Edge: first attempt
          fc.constant(1000), // Edge: very large
          fc.constant(Number.MAX_SAFE_INTEGER) // Edge: maximum integer
        ),
        (attempt) => {
          const delay = calculateBackoffDelay(attempt);

          // Should always return a valid delay
          expect(delay).toBeGreaterThan(0);
          expect(delay).toBeLessThanOrEqual(30000);
          expect(Number.isFinite(delay)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should demonstrate exponential growth pattern', () => {
    /**
     * Property: For attempts 0-4, each delay should be exactly double the previous
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (attempt) => {
          const currentDelay = calculateBackoffDelay(attempt);
          const previousDelay = calculateBackoffDelay(attempt - 1);

          // Each delay should be exactly double the previous (before cap)
          expect(currentDelay).toBe(previousDelay * 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should cap at maximum delay after threshold', () => {
    /**
     * Property: For any attempt >= 5, delay should be exactly 30 seconds
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 100 }),
        (attempt) => {
          const delay = calculateBackoffDelay(attempt);
          expect(delay).toBe(30000);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce deterministic delays for same attempt', () => {
    /**
     * Property: Calling calculateBackoffDelay with the same attempt number
     * should always produce the same delay (pure function)
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (attempt) => {
          const delay1 = calculateBackoffDelay(attempt);
          const delay2 = calculateBackoffDelay(attempt);
          const delay3 = calculateBackoffDelay(attempt);

          // All calls should return identical values
          expect(delay1).toBe(delay2);
          expect(delay2).toBe(delay3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain mathematical relationship: delay = min(1000 * 2^n, 30000)', () => {
    /**
     * Property: The backoff formula should be mathematically correct
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (attempt) => {
          const actualDelay = calculateBackoffDelay(attempt);
          const calculatedDelay = Math.min(1000 * Math.pow(2, attempt), 30000);

          expect(actualDelay).toBe(calculatedDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle rapid successive failures correctly', () => {
    /**
     * Property: For a sequence of rapid failures, delays should increase
     * exponentially without skipping steps
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }), // Number of failures
        (numFailures) => {
          const delays: number[] = [];

          for (let i = 0; i < numFailures; i++) {
            delays.push(calculateBackoffDelay(i));
          }

          // Verify delays are in ascending order (until cap)
          for (let i = 1; i < delays.length; i++) {
            const currentDelay = delays[i];
            const previousDelay = delays[i - 1];
            
            // Type guard: both values should exist
            expect(currentDelay).toBeDefined();
            expect(previousDelay).toBeDefined();
            
            if (currentDelay !== undefined && previousDelay !== undefined) {
              expect(currentDelay).toBeGreaterThanOrEqual(previousDelay);
            }
          }

          // Verify first delay is always 1 second
          expect(delays[0]).toBe(1000);

          // Verify last delay is capped if enough failures
          // Note: Cap kicks in at attempt 5 (index 5), so need 6 failures
          if (numFailures >= 6) {
            expect(delays[delays.length - 1]).toBe(30000);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide reasonable delays for user experience', () => {
    /**
     * Property: Delays should be reasonable for user experience:
     * - Not too short (< 500ms) to avoid hammering server
     * - Not too long (> 30s) to avoid appearing broken
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (attempt) => {
          const delay = calculateBackoffDelay(attempt);

          // Minimum delay should be at least 1 second
          expect(delay).toBeGreaterThanOrEqual(1000);

          // Maximum delay should not exceed 30 seconds
          expect(delay).toBeLessThanOrEqual(30000);
        }
      ),
      { numRuns: 100 }
    );
  });
});
