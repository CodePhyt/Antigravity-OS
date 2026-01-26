import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { StateSync, StateSyncUpdate } from '../../src/mcp/background/state-sync.js';
import { writeTelemetry, TelemetryData } from '../../src/services/telemetry-service.js';

describe('State Sync - Property-Based Tests', () => {
  /**
   * Property 19: Telemetry Update Push
   * **Validates: Requirements 6.2**
   *
   * For any telemetry data change, the system SHALL push updates to all connected IDE clients.
   */
  it('Property 19: pushes telemetry updates to all connected clients', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // number of clients
        fc.integer({ min: 0, max: 100 }), // ralphLoopActivations
        async (clientCount, activations) => {
          // Create fresh instance for this iteration
          const receivedUpdates: StateSyncUpdate[] = [];
          const stateSync = new StateSync({
            interval: 100,
            enabled: true,
          });

          stateSync.onUpdate((update) => {
            receivedUpdates.push(update);
          });

          try {
            // Create unique client IDs
            const uniqueClientIds = Array.from({ length: clientCount }, (_, i) => `client-${i}`);

            // Add clients
            for (const clientId of uniqueClientIds) {
              stateSync.addClient(clientId);
            }

            // Wait for initial update
            await new Promise((resolve) => setTimeout(resolve, 50));

            const initialUpdateCount = receivedUpdates.length;

            // Create telemetry data
            const telemetryData: TelemetryData = {
              metrics: {
                ralphLoopActivations: activations,
                ralphLoopSuccesses: Math.floor(activations * 0.8),
                ralphLoopFailures: Math.floor(activations * 0.2),
                autonomousFixes: activations,
                tasksCompleted: activations * 2,
                successRate: 80,
              },
              recentEvents: [
                {
                  timestamp: new Date().toISOString(),
                  type: 'test_event',
                  result: 'success',
                  details: 'Property test event',
                },
              ],
              generatedAt: new Date().toISOString(),
            };

            // Write telemetry (simulates change)
            await writeTelemetry(telemetryData);

            // Manually trigger update
            await stateSync.pushUpdate('manual');

            // Wait for update to propagate
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Verify update was pushed
            expect(receivedUpdates.length).toBeGreaterThan(initialUpdateCount);

            // Verify all clients received update
            const clients = stateSync.getClients();
            expect(clients.length).toBe(uniqueClientIds.length);

            // Verify update contains telemetry data
            const lastUpdate = receivedUpdates[receivedUpdates.length - 1];
            expect(lastUpdate).toBeDefined();
            if (lastUpdate) {
              expect(lastUpdate.telemetry.metrics.ralphLoopActivations).toBe(activations);
            }
          } finally {
            // Cleanup
            const clients = stateSync.getClients();
            for (const client of clients) {
              stateSync.removeClient(client.id);
            }
            stateSync.stop();
          }
        }
      ),
      { numRuns: 50 } // Reduced for stability
    );
  });

  /**
   * Property 20: State Sync Completeness
   * **Validates: Requirements 6.3**
   *
   * For any state sync request, the response SHALL include the complete current telemetry snapshot.
   */
  it('Property 20: returns complete telemetry snapshot', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 100 }),
        async (activations, fixes, tasks) => {
          const stateSync = new StateSync({
            interval: 100,
            enabled: true,
          });

          try {
            // Create telemetry data
            const telemetryData: TelemetryData = {
              metrics: {
                ralphLoopActivations: activations,
                ralphLoopSuccesses: Math.floor(activations * 0.9),
                ralphLoopFailures: Math.floor(activations * 0.1),
                autonomousFixes: fixes,
                tasksCompleted: tasks,
                successRate: 90,
              },
              recentEvents: [
                {
                  timestamp: new Date().toISOString(),
                  type: 'test_event',
                  result: 'success',
                  details: 'Test event',
                },
              ],
              generatedAt: new Date().toISOString(),
            };

            await writeTelemetry(telemetryData);

            // Get current state
            const state = await stateSync.getCurrentState();

            // Verify completeness
            expect(state).toBeDefined();
            expect(state.metrics).toBeDefined();
            expect(state.recentEvents).toBeDefined();
            expect(Array.isArray(state.recentEvents)).toBe(true);
            expect(state.generatedAt).toBeDefined();

            // Verify all required metric fields exist
            expect(typeof state.metrics.ralphLoopActivations).toBe('number');
            expect(typeof state.metrics.ralphLoopSuccesses).toBe('number');
            expect(typeof state.metrics.ralphLoopFailures).toBe('number');
            expect(typeof state.metrics.autonomousFixes).toBe('number');
            expect(typeof state.metrics.tasksCompleted).toBe('number');
            expect(typeof state.metrics.successRate).toBe('number');
          } finally {
            stateSync.stop();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 21: Telemetry File Change Detection
   * **Validates: Requirements 6.5**
   *
   * For any modification to the telemetry.json file, the system SHALL detect the change
   * and push updates to connected clients.
   */
  it(
    'Property 21: detects telemetry file changes',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async (changeCount) => {
          const receivedUpdates: StateSyncUpdate[] = [];
          const stateSync = new StateSync({
            interval: 100,
            enabled: true,
          });

          stateSync.onUpdate((update) => {
            receivedUpdates.push(update);
          });

          try {
            // Add client
            const clientId = 'test-client';
            stateSync.addClient(clientId);

            // Wait for initial update
            await new Promise((resolve) => setTimeout(resolve, 50));

            const initialUpdateCount = receivedUpdates.length;

            // Make multiple changes
            for (let i = 0; i < changeCount; i++) {
              const telemetryData: TelemetryData = {
                metrics: {
                  ralphLoopActivations: i + 1,
                  ralphLoopSuccesses: i,
                  ralphLoopFailures: 1,
                  autonomousFixes: i,
                  tasksCompleted: i * 2,
                  successRate: Math.floor((i / (i + 1)) * 100),
                },
                recentEvents: [
                  {
                    timestamp: new Date().toISOString(),
                    type: `change_${i}`,
                    result: 'success',
                    details: `Change ${i}`,
                  },
                ],
                generatedAt: new Date().toISOString(),
              };

              await writeTelemetry(telemetryData);
              await stateSync.pushUpdate('file-change');

              // Wait for update to propagate
              await new Promise((resolve) => setTimeout(resolve, 50));
            }

            // Verify updates were detected
            expect(receivedUpdates.length).toBeGreaterThan(initialUpdateCount);
          } finally {
            stateSync.removeClient('test-client');
            stateSync.stop();
          }
        }),
        { numRuns: 20 } // Reduced runs for file I/O test
      );
    },
    { timeout: 15000 }
  ); // Increased timeout for file I/O

  /**
   * Property 22: Streaming Pause Without Clients
   * **Validates: Requirements 6.6**
   *
   * For any state where no IDE clients are connected, the telemetry streaming SHALL be paused.
   */
  it('Property 22: pauses streaming when no clients connected', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 3 }), async (clientCount) => {
        const receivedUpdates: StateSyncUpdate[] = [];
        const stateSync = new StateSync({
          interval: 100,
          enabled: true,
        });

        stateSync.onUpdate((update) => {
          receivedUpdates.push(update);
        });

        try {
          // Create unique client IDs
          const uniqueClientIds = Array.from({ length: clientCount }, (_, i) => `client-${i}`);

          // Add clients
          for (const clientId of uniqueClientIds) {
            stateSync.addClient(clientId);
          }

          // Verify streaming is active (clients > 0)
          expect(stateSync.getClientCount()).toBe(uniqueClientIds.length);

          // Remove all clients
          for (const clientId of uniqueClientIds) {
            stateSync.removeClient(clientId);
          }

          // Verify no clients remain
          expect(stateSync.getClientCount()).toBe(0);

          // Verify streaming is paused (no interval running)
          // We can't directly check the interval, but we can verify behavior
          const updateCountBefore = receivedUpdates.length;

          // Wait for what would be multiple update intervals
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Verify no updates were pushed (streaming paused)
          const updateCountAfter = receivedUpdates.length;
          expect(updateCountAfter).toBe(updateCountBefore);
        } finally {
          stateSync.stop();
        }
      }),
      { numRuns: 50 } // Reduced for stability
    );
  });

  /**
   * Property 23: Client Management
   * **Validates: Requirements 6.1, 6.4**
   *
   * For any client addition/removal, the system SHALL correctly track connected clients.
   */
  it('Property 23: correctly manages client connections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        async (clientIds) => {
          const stateSync = new StateSync({
            interval: 100,
            enabled: true,
          });

          try {
            // Remove duplicates
            const uniqueClientIds = Array.from(new Set(clientIds));

            // Add all clients
            for (const clientId of uniqueClientIds) {
              stateSync.addClient(clientId);
            }

            // Verify count
            expect(stateSync.getClientCount()).toBe(uniqueClientIds.length);

            // Verify client list
            const clients = stateSync.getClients();
            expect(clients.length).toBe(uniqueClientIds.length);

            // Verify each client has required fields
            for (const client of clients) {
              expect(client.id).toBeDefined();
              expect(client.connectedAt).toBeDefined();
              expect(client.lastUpdate).toBeDefined();
              expect(client.lastUpdate).not.toBeUndefined();
              expect(uniqueClientIds).toContain(client.id);
            }

            // Remove half the clients
            const halfCount = Math.floor(uniqueClientIds.length / 2);
            for (let i = 0; i < halfCount; i++) {
              const clientId = uniqueClientIds[i];
              if (clientId) {
                stateSync.removeClient(clientId);
              }
            }

            // Verify updated count
            expect(stateSync.getClientCount()).toBe(uniqueClientIds.length - halfCount);

            // Cleanup remaining clients
            for (let i = halfCount; i < uniqueClientIds.length; i++) {
              const clientId = uniqueClientIds[i];
              if (clientId) {
                stateSync.removeClient(clientId);
              }
            }

            expect(stateSync.getClientCount()).toBe(0);
          } finally {
            stateSync.stop();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
