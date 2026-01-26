import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exec } from 'child_process';
import * as os from 'os';
import {
  getCPUInfo,
  getMemoryInfo,
  getDiskInfo,
  getNodeVersion,
  getNpmVersion,
  getCurrentBranch,
} from '../../../src/services/system-info-service';

// Mock modules
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('os', () => ({
  cpus: vi.fn(),
  totalmem: vi.fn(),
  freemem: vi.fn(),
}));

describe('System Info Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCPUInfo', () => {
    it('should return CPU info with usage and cores', () => {
      vi.mocked(os.cpus).mockReturnValue([
        {
          model: 'Intel Core i7',
          speed: 2400,
          times: { user: 1000, nice: 0, sys: 500, idle: 8500, irq: 0 },
        },
        {
          model: 'Intel Core i7',
          speed: 2400,
          times: { user: 1200, nice: 0, sys: 600, idle: 8200, irq: 0 },
        },
      ] as any);

      const result = getCPUInfo();
      expect(result.cores).toBe(2);
      expect(result.usage).toBeGreaterThanOrEqual(0);
      expect(result.usage).toBeLessThanOrEqual(100);
    });
  });

  describe('getMemoryInfo', () => {
    it('should return memory info', () => {
      vi.mocked(os.totalmem).mockReturnValue(16000000000); // 16GB
      vi.mocked(os.freemem).mockReturnValue(8000000000); // 8GB

      const result = getMemoryInfo();
      expect(result.total).toBe(16000000000);
      expect(result.available).toBe(8000000000);
      expect(result.used).toBe(8000000000);
    });
  });

  describe('getDiskInfo', () => {
    it('should return disk info on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        const mockOutput = `Caption  FreeSpace    Size
C:       50000000000  100000000000`;
        callback(null, { stdout: mockOutput, stderr: '' });
        return {} as any;
      });

      const result = await getDiskInfo();
      expect(result.total).toBeGreaterThan(0);
      expect(result.available).toBeGreaterThan(0);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return zero values on error', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(new Error('Command failed'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await getDiskInfo();
      expect(result).toEqual({ total: 0, used: 0, available: 0 });
    });
  });

  describe('getNodeVersion', () => {
    it('should return Node.js version', () => {
      const result = getNodeVersion();
      expect(result).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('getNpmVersion', () => {
    it('should return npm version', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: '8.19.2\n', stderr: '' });
        return {} as any;
      });

      const result = await getNpmVersion();
      expect(result).toBe('8.19.2');
    });

    it('should return "unknown" when npm is not available', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(new Error('npm not found'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await getNpmVersion();
      expect(result).toBe('unknown');
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current Git branch', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: 'main\n', stderr: '' });
        return {} as any;
      });

      const result = await getCurrentBranch();
      expect(result).toBe('main');
    });

    it('should return null when not in a Git repository', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(new Error('not a git repository'), {
          stdout: '',
          stderr: '',
        });
        return {} as any;
      });

      const result = await getCurrentBranch();
      expect(result).toBeNull();
    });
  });
});
