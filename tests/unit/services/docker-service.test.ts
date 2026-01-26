import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exec } from 'child_process';
import {
  isDockerAvailable,
  listContainers,
  listImages,
  removeContainer,
  removeImage,
} from '../../../src/services/docker-service';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

describe('Docker Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isDockerAvailable', () => {
    it('should return true when Docker is available', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: 'Docker version 20.10.0', stderr: '' });
        return {} as any;
      });

      const result = await isDockerAvailable();
      expect(result).toBe(true);
    });

    it('should return false when Docker is not available', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(new Error('command not found'), { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await isDockerAvailable();
      expect(result).toBe(false);
    });
  });

  describe('listContainers', () => {
    it('should return empty array when no containers exist', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await listContainers();
      expect(result).toEqual([]);
    });

    it('should parse container list correctly', async () => {
      const mockOutput =
        'abc123|nginx:latest|Up 2 hours|80/tcp, 443/tcp\ndef456|redis:alpine|Exited (0)|6379/tcp';

      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: mockOutput, stderr: '' });
        return {} as any;
      });

      const result = await listContainers();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'abc123',
        image: 'nginx:latest',
        status: 'Up 2 hours',
        ports: ['80/tcp', '443/tcp'],
      });
      expect(result[1]).toEqual({
        id: 'def456',
        image: 'redis:alpine',
        status: 'Exited (0)',
        ports: ['6379/tcp'],
      });
    });

    it('should throw error when Docker command fails', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(new Error('Docker daemon not running'), {
          stdout: '',
          stderr: '',
        });
        return {} as any;
      });

      await expect(listContainers()).rejects.toThrow('Failed to list containers');
    });
  });

  describe('listImages', () => {
    it('should return empty array when no images exist', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      const result = await listImages();
      expect(result).toEqual([]);
    });

    it('should parse image list correctly', async () => {
      const mockOutput = 'nginx:latest|abc123def|150MB\nredis:alpine|def456abc|50MB';

      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: mockOutput, stderr: '' });
        return {} as any;
      });

      const result = await listImages();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'nginx:latest',
        id: 'abc123def',
        size: '150MB',
      });
      expect(result[1]).toEqual({
        name: 'redis:alpine',
        id: 'def456abc',
        size: '50MB',
      });
    });
  });

  describe('removeContainer', () => {
    it('should remove container successfully', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        expect(cmd).toContain('docker rm -f abc123');
        callback(null, { stdout: 'abc123', stderr: '' });
        return {} as any;
      });

      await expect(removeContainer('abc123')).resolves.toBeUndefined();
    });

    it('should throw error when removal fails', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(new Error('No such container'), { stdout: '', stderr: '' });
        return {} as any;
      });

      await expect(removeContainer('invalid')).rejects.toThrow('Failed to remove container');
    });
  });

  describe('removeImage', () => {
    it('should remove image successfully', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        expect(cmd).toContain('docker rmi -f abc123');
        callback(null, { stdout: 'Untagged: nginx:latest', stderr: '' });
        return {} as any;
      });

      await expect(removeImage('abc123')).resolves.toBeUndefined();
    });

    it('should throw error when removal fails', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(new Error('No such image'), { stdout: '', stderr: '' });
        return {} as any;
      });

      await expect(removeImage('invalid')).rejects.toThrow('Failed to remove image');
    });
  });
});
