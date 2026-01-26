import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import {
  readTelemetry,
  writeTelemetry,
  logEvent,
  type TelemetryData,
  type TelemetryEvent,
} from '../../../src/services/telemetry-service';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

describe('Telemetry Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readTelemetry', () => {
    it('should read and parse telemetry data', async () => {
      const mockData: TelemetryData = {
        metrics: {
          ralphLoopActivations: 5,
          ralphLoopSuccesses: 4,
          ralphLoopFailures: 1,
          autonomousFixes: 3,
          tasksCompleted: 10,
          successRate: 80,
        },
        recentEvents: [],
        generatedAt: '2026-01-21T00:00:00.000Z',
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));

      const result = await readTelemetry();
      expect(result).toEqual(mockData);
    });

    it('should return baseline metrics when file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await readTelemetry();
      expect(result.metrics.ralphLoopActivations).toBe(0);
      expect(result.metrics.successRate).toBe(100);
      expect(result.recentEvents).toEqual([]);
    });

    it('should return baseline metrics when file is corrupted', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json{');

      const result = await readTelemetry();
      expect(result.metrics.ralphLoopActivations).toBe(0);
    });
  });

  describe('writeTelemetry', () => {
    it('should write telemetry data to file', async () => {
      const mockData: TelemetryData = {
        metrics: {
          ralphLoopActivations: 5,
          ralphLoopSuccesses: 4,
          ralphLoopFailures: 1,
          autonomousFixes: 3,
          tasksCompleted: 10,
          successRate: 80,
        },
        recentEvents: [],
        generatedAt: '2026-01-21T00:00:00.000Z',
      };

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await writeTelemetry(mockData);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('telemetry.json'),
        JSON.stringify(mockData, null, 2),
        'utf-8'
      );
    });

    it('should throw error when write fails', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'));

      const mockData: TelemetryData = {
        metrics: {
          ralphLoopActivations: 0,
          ralphLoopSuccesses: 0,
          ralphLoopFailures: 0,
          autonomousFixes: 0,
          tasksCompleted: 0,
          successRate: 100,
        },
        recentEvents: [],
        generatedAt: '2026-01-21T00:00:00.000Z',
      };

      await expect(writeTelemetry(mockData)).rejects.toThrow('Failed to write telemetry');
    });
  });

  describe('logEvent', () => {
    it('should log ralph_loop success event and update metrics', async () => {
      const initialData: TelemetryData = {
        metrics: {
          ralphLoopActivations: 0,
          ralphLoopSuccesses: 0,
          ralphLoopFailures: 0,
          autonomousFixes: 0,
          tasksCompleted: 0,
          successRate: 100,
        },
        recentEvents: [],
        generatedAt: '2026-01-21T00:00:00.000Z',
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(initialData));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const event: TelemetryEvent = {
        timestamp: '2026-01-21T00:00:00.000Z',
        type: 'ralph_loop',
        result: 'success',
        details: 'Fixed type error',
      };

      await logEvent(event);

      expect(fs.writeFile).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall).toBeDefined();
      const writtenData = JSON.parse(writeCall![1] as string);
      expect(writtenData.metrics.ralphLoopActivations).toBe(1);
      expect(writtenData.metrics.ralphLoopSuccesses).toBe(1);
      expect(writtenData.recentEvents).toHaveLength(1);
      expect(writtenData.recentEvents[0]).toEqual(event);
    });

    it('should log ralph_loop failure event', async () => {
      const initialData: TelemetryData = {
        metrics: {
          ralphLoopActivations: 1,
          ralphLoopSuccesses: 1,
          ralphLoopFailures: 0,
          autonomousFixes: 0,
          tasksCompleted: 0,
          successRate: 100,
        },
        recentEvents: [],
        generatedAt: '2026-01-21T00:00:00.000Z',
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(initialData));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const event: TelemetryEvent = {
        timestamp: '2026-01-21T00:00:00.000Z',
        type: 'ralph_loop',
        result: 'failure',
        details: 'Max attempts exceeded',
      };

      await logEvent(event);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall).toBeDefined();
      const writtenData = JSON.parse(writeCall![1] as string);
      expect(writtenData.metrics.ralphLoopActivations).toBe(2);
      expect(writtenData.metrics.ralphLoopFailures).toBe(1);
      expect(writtenData.metrics.successRate).toBe(50); // 1 success out of 2 total
    });

    it('should keep only last 50 events', async () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        timestamp: '2026-01-21T00:00:00.000Z',
        type: 'test',
        result: 'success' as const,
        details: `Event ${i}`,
      }));

      const initialData: TelemetryData = {
        metrics: {
          ralphLoopActivations: 0,
          ralphLoopSuccesses: 0,
          ralphLoopFailures: 0,
          autonomousFixes: 0,
          tasksCompleted: 0,
          successRate: 100,
        },
        recentEvents: events,
        generatedAt: '2026-01-21T00:00:00.000Z',
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(initialData));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const newEvent: TelemetryEvent = {
        timestamp: '2026-01-21T00:00:00.000Z',
        type: 'test',
        result: 'success',
        details: 'New event',
      };

      await logEvent(newEvent);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall).toBeDefined();
      const writtenData = JSON.parse(writeCall![1] as string);
      expect(writtenData.recentEvents).toHaveLength(50);
      expect(writtenData.recentEvents[0]).toEqual(newEvent);
    });

    it('should not throw when telemetry write fails', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read failed'));

      const event: TelemetryEvent = {
        timestamp: '2026-01-21T00:00:00.000Z',
        type: 'test',
        result: 'success',
        details: 'Test event',
      };

      // Should not throw
      await expect(logEvent(event)).resolves.toBeUndefined();
    });
  });
});
