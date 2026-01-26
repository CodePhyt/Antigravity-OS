/**
 * Property-Based Tests for System Context Tool
 *
 * Tests universal correctness properties for the get_system_context tool
 * using fast-check for property-based testing.
 *
 * Requirements: 2
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getSystemContext } from '../../src/mcp/tools/system-context';

describe('System Context Tool - Property Tests', () => {
  /**
   * Property 6: System Context Completeness
   *
   * For any get_system_context invocation, the response SHALL include
   * all required fields: cpu, memory, disk, docker, ports, and environment.
   *
   * **Feature: mcp-server-transformation, Property 6: System Context Completeness**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
   */
  it('Property 6: System Context Completeness', async () => {
    // Run the property test multiple times to ensure consistency
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const context = await getSystemContext();

        // Verify all top-level fields exist
        expect(context).toHaveProperty('cpu');
        expect(context).toHaveProperty('memory');
        expect(context).toHaveProperty('disk');
        expect(context).toHaveProperty('docker');
        expect(context).toHaveProperty('ports');
        expect(context).toHaveProperty('environment');

        // Verify CPU fields
        expect(context.cpu).toHaveProperty('usage');
        expect(context.cpu).toHaveProperty('cores');
        expect(typeof context.cpu.usage).toBe('number');
        expect(typeof context.cpu.cores).toBe('number');
        expect(context.cpu.usage).toBeGreaterThanOrEqual(0);
        expect(context.cpu.usage).toBeLessThanOrEqual(100);
        expect(context.cpu.cores).toBeGreaterThan(0);

        // Verify Memory fields
        expect(context.memory).toHaveProperty('total');
        expect(context.memory).toHaveProperty('used');
        expect(context.memory).toHaveProperty('available');
        expect(typeof context.memory.total).toBe('number');
        expect(typeof context.memory.used).toBe('number');
        expect(typeof context.memory.available).toBe('number');
        expect(context.memory.total).toBeGreaterThan(0);
        expect(context.memory.used).toBeGreaterThanOrEqual(0);
        expect(context.memory.available).toBeGreaterThanOrEqual(0);

        // Verify Disk fields
        expect(context.disk).toHaveProperty('total');
        expect(context.disk).toHaveProperty('used');
        expect(context.disk).toHaveProperty('available');
        expect(typeof context.disk.total).toBe('number');
        expect(typeof context.disk.used).toBe('number');
        expect(typeof context.disk.available).toBe('number');
        expect(context.disk.total).toBeGreaterThan(0);

        // Verify Docker fields
        expect(context.docker).toHaveProperty('available');
        expect(context.docker).toHaveProperty('containers');
        expect(context.docker).toHaveProperty('images');
        expect(typeof context.docker.available).toBe('boolean');
        expect(Array.isArray(context.docker.containers)).toBe(true);
        expect(Array.isArray(context.docker.images)).toBe(true);

        // Verify Ports fields
        expect(context.ports).toHaveProperty('active');
        expect(Array.isArray(context.ports.active)).toBe(true);

        // Verify Environment fields
        expect(context.environment).toHaveProperty('nodeVersion');
        expect(context.environment).toHaveProperty('npmVersion');
        expect(context.environment).toHaveProperty('cwd');
        expect(context.environment).toHaveProperty('gitBranch');
        expect(typeof context.environment.nodeVersion).toBe('string');
        expect(typeof context.environment.npmVersion).toBe('string');
        expect(typeof context.environment.cwd).toBe('string');
        expect(context.environment.nodeVersion.length).toBeGreaterThan(0);
        expect(context.environment.npmVersion.length).toBeGreaterThan(0);
        expect(context.environment.cwd.length).toBeGreaterThan(0);
      }),
      { numRuns: 10 } // Run 10 times (system context is expensive to fetch)
    );
  }, 30000); // 30s timeout for expensive system calls

  /**
   * Additional Property: Docker Graceful Degradation
   *
   * For any system where Docker is unavailable, the system context
   * SHALL still return complete information with docker.available = false.
   */
  it('Docker unavailable is handled gracefully', async () => {
    const context = await getSystemContext();

    // If Docker is unavailable, containers and images should be empty arrays
    if (!context.docker.available) {
      expect(context.docker.containers).toEqual([]);
      expect(context.docker.images).toEqual([]);
    }

    // All other fields should still be present
    expect(context.cpu).toBeDefined();
    expect(context.memory).toBeDefined();
    expect(context.disk).toBeDefined();
    expect(context.environment).toBeDefined();
  });

  /**
   * Additional Property: Consistent Field Types
   *
   * For any invocation, all numeric fields SHALL be numbers,
   * all string fields SHALL be strings, and all array fields SHALL be arrays.
   */
  it('Field types are consistent across invocations', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const context = await getSystemContext();

        // Numeric fields
        expect(typeof context.cpu.usage).toBe('number');
        expect(typeof context.cpu.cores).toBe('number');
        expect(typeof context.memory.total).toBe('number');
        expect(typeof context.memory.used).toBe('number');
        expect(typeof context.memory.available).toBe('number');
        expect(typeof context.disk.total).toBe('number');
        expect(typeof context.disk.used).toBe('number');
        expect(typeof context.disk.available).toBe('number');

        // Boolean fields
        expect(typeof context.docker.available).toBe('boolean');

        // Array fields
        expect(Array.isArray(context.docker.containers)).toBe(true);
        expect(Array.isArray(context.docker.images)).toBe(true);
        expect(Array.isArray(context.ports.active)).toBe(true);

        // String fields
        expect(typeof context.environment.nodeVersion).toBe('string');
        expect(typeof context.environment.npmVersion).toBe('string');
        expect(typeof context.environment.cwd).toBe('string');
        // gitBranch can be null if not in a git repo
        if (context.environment.gitBranch !== null) {
          expect(typeof context.environment.gitBranch).toBe('string');
        }
      }),
      { numRuns: 10 }
    );
  }, 30000); // 30s timeout for expensive system calls

  /**
   * Additional Property: Reasonable Value Ranges
   *
   * For any invocation, numeric values SHALL be within reasonable ranges
   * (e.g., CPU usage 0-100, memory/disk values positive).
   */
  it('Numeric values are within reasonable ranges', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const context = await getSystemContext();

        // CPU usage should be 0-100
        expect(context.cpu.usage).toBeGreaterThanOrEqual(0);
        expect(context.cpu.usage).toBeLessThanOrEqual(100);

        // CPU cores should be positive
        expect(context.cpu.cores).toBeGreaterThan(0);

        // Memory values should be non-negative
        expect(context.memory.total).toBeGreaterThan(0);
        expect(context.memory.used).toBeGreaterThanOrEqual(0);
        expect(context.memory.available).toBeGreaterThanOrEqual(0);

        // Disk values should be non-negative
        expect(context.disk.total).toBeGreaterThan(0);
        expect(context.disk.used).toBeGreaterThanOrEqual(0);
        expect(context.disk.available).toBeGreaterThanOrEqual(0);

        // Memory used + available should not exceed total (with some tolerance)
        const memorySum = context.memory.used + context.memory.available;
        expect(memorySum).toBeLessThanOrEqual(context.memory.total * 1.1); // 10% tolerance
      }),
      { numRuns: 10 }
    );
  }, 30000); // 30s timeout for expensive system calls
});
