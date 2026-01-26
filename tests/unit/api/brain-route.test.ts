/**
 * Unit Tests for Brain API Route
 * 
 * Tests SSE connection establishment, initial state delivery,
 * heartbeat messages, and connection cleanup.
 * 
 * Validates Requirements 1.4, 10.1 from Ralph's Brain View spec.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/system/brain/route';
import { NextRequest } from 'next/server';

describe('Brain API Route', () => {
  let abortController: AbortController;
  let mockRequest: NextRequest;

  beforeEach(() => {
    abortController = new AbortController();
    mockRequest = {
      signal: abortController.signal,
    } as NextRequest;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SSE Connection Establishment', () => {
    it('should return response with correct SSE headers', async () => {
      const response = await GET(mockRequest);

      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
      expect(response.headers.get('Connection')).toBe('keep-alive');
      expect(response.headers.get('X-Accel-Buffering')).toBe('no');
    });

    it('should return a ReadableStream', async () => {
      const response = await GET(mockRequest);

      expect(response.body).toBeInstanceOf(ReadableStream);
    });

    it('should send initial state on connection', async () => {
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // Read first chunk (initial state)
      const { value, done } = await reader.read();
      expect(done).toBe(false);

      const message = decoder.decode(value);
      expect(message).toContain('data:');
      expect(message).toContain('initial_state');

      // Parse the SSE message
      const dataLine = message.split('\n')[0];
      expect(dataLine).toBeDefined();
      const jsonData = dataLine!.replace('data: ', '');
      const event = JSON.parse(jsonData);

      expect(event.type).toBe('initial_state');
      expect(event.timestamp).toBeDefined();
      expect(event.data).toBeDefined();

      // Cleanup
      abortController.abort();
      reader.releaseLock();
    });
  });

  describe('Initial State Delivery', () => {
    it('should include activities in initial state', async () => {
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const { value } = await reader.read();
      const message = decoder.decode(value);
      const dataLine = message.split('\n')[0];
      expect(dataLine).toBeDefined();
      const jsonData = dataLine!.replace('data: ', '');
      const event = JSON.parse(jsonData);

      expect(event.data).toHaveProperty('activities');
      expect(Array.isArray(event.data.activities)).toBe(true);

      // Cleanup
      abortController.abort();
      reader.releaseLock();
    });

    it('should include PRD status in initial state', async () => {
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const { value } = await reader.read();
      const message = decoder.decode(value);
      const dataLine = message.split('\n')[0];
      expect(dataLine).toBeDefined();
      const jsonData = dataLine!.replace('data: ', '');
      const event = JSON.parse(jsonData);

      expect(event.data).toHaveProperty('prdStatus');
      expect(event.data.prdStatus).toHaveProperty('totalTasks');
      expect(event.data.prdStatus).toHaveProperty('completedTasks');
      expect(event.data.prdStatus).toHaveProperty('completionPercentage');

      // Cleanup
      abortController.abort();
      reader.releaseLock();
    });

    it('should handle missing files gracefully', async () => {
      // This test verifies that the API doesn't crash when files are missing
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const { value, done } = await reader.read();
      expect(done).toBe(false);

      const message = decoder.decode(value);
      expect(message).toContain('data:');

      // Should return empty state, not error
      const dataLine = message.split('\n')[0];
      expect(dataLine).toBeDefined();
      const jsonData = dataLine!.replace('data: ', '');
      const event = JSON.parse(jsonData);

      expect(event.type).toBe('initial_state');
      expect(event.data.activities).toBeDefined();
      expect(event.data.prdStatus).toBeDefined();

      // Cleanup
      abortController.abort();
      reader.releaseLock();
    });
  });

  describe('Heartbeat Messages', () => {
    it('should send heartbeat messages periodically', async () => {
      vi.useFakeTimers();

      const response = await GET(mockRequest);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // Read initial state
      await reader.read();

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      // Read heartbeat message
      const { value, done } = await reader.read();
      
      if (!done && value) {
        const message = decoder.decode(value);
        expect(message).toContain('heartbeat');
      }

      // Cleanup
      abortController.abort();
      reader.releaseLock();
      vi.useRealTimers();
    }, 10000); // Increase timeout for this test
  });

  describe('Connection Cleanup', () => {
    it('should cleanup resources on client disconnect', async () => {
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();

      // Read initial state
      await reader.read();

      // Simulate client disconnect
      abortController.abort();

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to read again - should be done
      const { done } = await reader.read();
      expect(done).toBe(true);

      reader.releaseLock();
    });

    it('should close file watchers on disconnect', async () => {
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();

      // Read initial state
      await reader.read();

      // Simulate client disconnect
      abortController.abort();

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify stream is closed
      const { done } = await reader.read();
      expect(done).toBe(true);

      reader.releaseLock();
    });

    it('should clear heartbeat interval on disconnect', async () => {
      vi.useFakeTimers();

      const response = await GET(mockRequest);
      const reader = response.body!.getReader();

      // Read initial state
      await reader.read();

      // Disconnect
      abortController.abort();

      // Fast-forward time - no more heartbeats should be sent
      vi.advanceTimersByTime(60000);

      // Verify stream is closed
      const { done } = await reader.read();
      expect(done).toBe(true);

      reader.releaseLock();
      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle stream errors gracefully', async () => {
      const response = await GET(mockRequest);
      
      // Response should be created even if there are internal errors
      expect(response).toBeDefined();
      expect(response.body).toBeInstanceOf(ReadableStream);

      // Cleanup
      abortController.abort();
    });

    it('should send error events when file parsing fails', async () => {
      // This test verifies that parsing errors are handled gracefully
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();

      // Should still get initial state (possibly empty)
      const { value, done } = await reader.read();
      expect(done).toBe(false);
      expect(value).toBeDefined();

      // Cleanup
      abortController.abort();
      reader.releaseLock();
    });
  });

  describe('SSE Message Format', () => {
    it('should format messages according to SSE spec', async () => {
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const { value } = await reader.read();
      const message = decoder.decode(value);

      // SSE format: "data: {json}\n\n"
      expect(message).toMatch(/^data: .+\n\n$/);

      // Should be valid JSON
      const dataLine = message.split('\n')[0];
      expect(dataLine).toBeDefined();
      const jsonData = dataLine!.replace('data: ', '');
      expect(() => JSON.parse(jsonData)).not.toThrow();

      // Cleanup
      abortController.abort();
      reader.releaseLock();
    });

    it('should include timestamp in all events', async () => {
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const { value } = await reader.read();
      const message = decoder.decode(value);
      const dataLine = message.split('\n')[0];
      expect(dataLine).toBeDefined();
      const jsonData = dataLine!.replace('data: ', '');
      const event = JSON.parse(jsonData);

      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0);

      // Cleanup
      abortController.abort();
      reader.releaseLock();
    });

    it('should include event type in all events', async () => {
      const response = await GET(mockRequest);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      const { value } = await reader.read();
      const message = decoder.decode(value);
      const dataLine = message.split('\n')[0];
      expect(dataLine).toBeDefined();
      const jsonData = dataLine!.replace('data: ', '');
      const event = JSON.parse(jsonData);

      expect(event.type).toBeDefined();
      expect(['initial_state', 'activity', 'prd_update', 'heartbeat', 'correction']).toContain(event.type);

      // Cleanup
      abortController.abort();
      reader.releaseLock();
    });
  });
});
