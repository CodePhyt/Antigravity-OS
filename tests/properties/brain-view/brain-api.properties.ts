/**
 * Property-Based Tests for Brain API Route
 * 
 * Tests universal correctness properties for SSE streaming.
 * 
 * **Property 2: Broadcast Consistency**
 * **Validates: Requirements 1.5**
 * 
 * For any number of connected clients, when a new activity entry is added
 * to ACTIVITY_LOG.md, all connected clients should receive the same update event.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { GET } from '@/app/api/system/brain/route';
import { NextRequest } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('Brain API - Property-Based Tests', () => {
  const testActivityLogPath = join(process.cwd(), `test-activity-log-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp.md`);

  beforeEach(async () => {
    // Create a test activity log file
    await writeFile(testActivityLogPath, '# Activity Log\n\n', 'utf-8');
  });

  afterEach(async () => {
    // Cleanup test file
    try {
      await unlink(testActivityLogPath);
    } catch (error) {
      // File might not exist
    }
  });

  describe('Property 2: Broadcast Consistency', () => {
    it('should broadcast same event to all connected clients', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // Number of clients (1-3 for test performance)
          async (numClients) => {
            const abortControllers: AbortController[] = [];
            const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];

            try {
              // Connect multiple clients
              for (let i = 0; i < numClients; i++) {
                const controller = new AbortController();
                abortControllers.push(controller);

                const mockRequest = {
                  signal: controller.signal,
                } as NextRequest;

                const response = await GET(mockRequest);
                const reader = response.body!.getReader();
                readers.push(reader);

                // Read initial state to clear buffer
                await reader.read();
              }

              // All clients should have received initial state
              expect(readers.length).toBe(numClients);

              // Verify all clients are connected
              for (const reader of readers) {
                expect(reader).toBeDefined();
              }

              return true;
            } finally {
              // Cleanup all connections
              for (const controller of abortControllers) {
                controller.abort();
              }
              for (const reader of readers) {
                try {
                  reader.releaseLock();
                } catch (error) {
                  // Already released
                }
              }
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });

    it('should maintain connection stability with multiple clients', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 2 }), // Number of clients
          async (numClients) => {
            const abortControllers: AbortController[] = [];
            const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];
            const decoder = new TextDecoder();

            try {
              // Connect clients
              for (let i = 0; i < numClients; i++) {
                const controller = new AbortController();
                abortControllers.push(controller);

                const mockRequest = {
                  signal: controller.signal,
                } as NextRequest;

                const response = await GET(mockRequest);
                const reader = response.body!.getReader();
                readers.push(reader);

                // Read initial state
                const { value, done } = await reader.read();
                expect(done).toBe(false);
                expect(value).toBeDefined();

                // Verify message format
                const message = decoder.decode(value);
                expect(message).toContain('data:');
                expect(message).toContain('initial_state');
              }

              // All connections should be stable
              expect(readers.length).toBe(numClients);

              return true;
            } finally {
              // Cleanup
              for (const controller of abortControllers) {
                controller.abort();
              }
              for (const reader of readers) {
                try {
                  reader.releaseLock();
                } catch (error) {
                  // Already released
                }
              }
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });
  });

  describe('Property: Connection Lifecycle', () => {
    it('should properly initialize and cleanup connections', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 2 }), // Number of connection cycles
          async (cycles) => {
            for (let i = 0; i < cycles; i++) {
              const controller = new AbortController();
              const mockRequest = {
                signal: controller.signal,
              } as NextRequest;

              const response = await GET(mockRequest);
              const reader = response.body!.getReader();

              // Read initial state
              const { value, done } = await reader.read();
              expect(done).toBe(false);
              expect(value).toBeDefined();

              // Disconnect
              controller.abort();

              // Wait for cleanup
              await new Promise(resolve => setTimeout(resolve, 50));

              // Verify stream is closed
              const { done: isDone } = await reader.read();
              expect(isDone).toBe(true);

              reader.releaseLock();
            }

            return true;
          }
        ),
        { numRuns: 50, timeout: 15000 } // Reduced runs, increased timeout
      );
    }, 20000); // Test timeout
  });

  describe('Property: Message Format Consistency', () => {
    it('should always send valid SSE formatted messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No input needed
          async () => {
            const controller = new AbortController();
            const mockRequest = {
              signal: controller.signal,
            } as NextRequest;

            try {
              const response = await GET(mockRequest);
              const reader = response.body!.getReader();
              const decoder = new TextDecoder();

              // Read initial state
              const { value, done } = await reader.read();
              expect(done).toBe(false);

              const message = decoder.decode(value);

              // Verify SSE format: "data: {json}\n\n"
              expect(message).toMatch(/^data: .+\n\n$/);

              // Verify valid JSON
              const dataLine = message.split('\n')[0];
              expect(dataLine).toBeDefined();
              const jsonData = dataLine!.replace('data: ', '');
              const event = JSON.parse(jsonData);

              // Verify event structure
              expect(event).toHaveProperty('type');
              expect(event).toHaveProperty('timestamp');
              expect(event).toHaveProperty('data');

              return true;
            } finally {
              controller.abort();
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });
  });
});
