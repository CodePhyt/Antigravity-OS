/**
 * Vitest setup file
 * Runs before all tests
 */

import * as fc from 'fast-check';

// Configure fast-check globally
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations per property test
  verbose: true,
  seed: Date.now(),
});

// Global test utilities can be added here
