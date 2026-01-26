/**
 * Unit Tests for useBrainStream Hook
 * 
 * Tests the SSE client hook behavior including:
 * - Initial connection
 * - Event handling
 * - State updates
 * - Cleanup on unmount
 * 
 * Validates: Requirements 1.1, 1.2
 * 
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBrainStream } from '@/hooks/useBrainStream';

// Mock EventSource
class MockEventSource {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  readyState: number = 0;
  private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map();

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  close() {
    this.readyState = 2;
  }

  // Helper method to simulate events
  simulateEvent(type: string, data: string) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const event = new MessageEvent(type, { data });
      listeners.forEach(listener => listener(event));
    }
  }

  // Helper method to simulate error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('useBrainStream - Unit Tests', () => {
  let mockEventSource: MockEventSource;

  beforeEach(() => {
    // Mock global EventSource
    vi.stubGlobal('EventSource', vi.fn((url: string) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource;
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllTimers();
  });

  describe('Initial Connection', () => {
    it('should establish connection to /api/system/brain', async () => {
      const { result } = renderHook(() => useBrainStream());

      // Initially disconnected
      expect(result.current.isConnected).toBe(false);

      // Wait for connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(mockEventSource.url).toBe('/api/system/brain');
    });

    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useBrainStream());

      expect(result.current.activities).toEqual([]);
      expect(result.current.prdStatus).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.reconnectAttempts).toBe(0);
    });
  });

  describe('Event Handling', () => {
    it('should handle activity events', async () => {
      const { result } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const activities = [
        {
          id: '1',
          timestamp: '2026-01-22T10:00:00Z',
          message: 'Test activity',
          level: 'info' as const,
        },
      ];

      mockEventSource.simulateEvent('activity', JSON.stringify(activities));

      await waitFor(() => {
        expect(result.current.activities).toEqual(activities);
      });
    });

    it('should handle prd_update events', async () => {
      const { result } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const prdStatus = {
        totalTasks: 10,
        completedTasks: 5,
        inProgressTasks: 2,
        completionPercentage: 50,
      };

      mockEventSource.simulateEvent('prd_update', JSON.stringify(prdStatus));

      await waitFor(() => {
        expect(result.current.prdStatus).toEqual(prdStatus);
      });
    });

    it('should handle correction events', async () => {
      const { result } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const correction = {
        id: '2',
        timestamp: '2026-01-22T10:05:00Z',
        message: 'Self-correction applied',
        level: 'correction' as const,
      };

      mockEventSource.simulateEvent('correction', JSON.stringify(correction));

      await waitFor(() => {
        expect(result.current.activities).toContainEqual(correction);
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      const { result } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Send invalid JSON
      mockEventSource.simulateEvent('activity', 'invalid json');

      // Should not crash, state should remain unchanged
      expect(result.current.activities).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('State Updates', () => {
    it('should update activities array', async () => {
      const { result } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const activities1 = [
        { id: '1', timestamp: '2026-01-22T10:00:00Z', message: 'Activity 1', level: 'info' as const },
      ];

      mockEventSource.simulateEvent('activity', JSON.stringify(activities1));

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(1);
      });

      const activities2 = [
        { id: '1', timestamp: '2026-01-22T10:00:00Z', message: 'Activity 1', level: 'info' as const },
        { id: '2', timestamp: '2026-01-22T10:01:00Z', message: 'Activity 2', level: 'success' as const },
      ];

      mockEventSource.simulateEvent('activity', JSON.stringify(activities2));

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(2);
      });
    });

    it('should limit activities to 10 most recent', async () => {
      const { result } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Add 15 correction events
      for (let i = 1; i <= 15; i++) {
        const correction = {
          id: String(i),
          timestamp: `2026-01-22T10:${String(i).padStart(2, '0')}:00Z`,
          message: `Correction ${i}`,
          level: 'correction' as const,
        };

        mockEventSource.simulateEvent('correction', JSON.stringify(correction));
      }

      await waitFor(() => {
        expect(result.current.activities.length).toBeLessThanOrEqual(10);
      });
    });

    it('should update PRD status', async () => {
      const { result } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const prdStatus1 = {
        totalTasks: 10,
        completedTasks: 3,
        inProgressTasks: 1,
        completionPercentage: 30,
      };

      mockEventSource.simulateEvent('prd_update', JSON.stringify(prdStatus1));

      await waitFor(() => {
        expect(result.current.prdStatus?.completionPercentage).toBe(30);
      });

      const prdStatus2 = {
        totalTasks: 10,
        completedTasks: 7,
        inProgressTasks: 1,
        completionPercentage: 70,
      };

      mockEventSource.simulateEvent('prd_update', JSON.stringify(prdStatus2));

      await waitFor(() => {
        expect(result.current.prdStatus?.completionPercentage).toBe(70);
      });
    });
  });

  describe('Cleanup on Unmount', () => {
    it('should close EventSource on unmount', async () => {
      const { result, unmount } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const closeSpy = vi.spyOn(mockEventSource, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
      expect(mockEventSource.readyState).toBe(2); // CLOSED
    });

    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      unmount();

      // Try to send event after unmount
      const activities = [
        { id: '1', timestamp: '2026-01-22T10:00:00Z', message: 'Test', level: 'info' as const },
      ];

      mockEventSource.simulateEvent('activity', JSON.stringify(activities));

      // State should not update (no error should be thrown)
      expect(result.current.activities).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const { result } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      mockEventSource.simulateError();

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });

    it('should increment reconnect attempts on error', async () => {
      const { result } = renderHook(() => useBrainStream());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      mockEventSource.simulateError();

      await waitFor(() => {
        expect(result.current.reconnectAttempts).toBe(1);
      }, { timeout: 10000 });
    });
  });
});
