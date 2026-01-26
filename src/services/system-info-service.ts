import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

export interface CPUInfo {
  usage: number; // 0-100
  cores: number;
}

export interface MemoryInfo {
  total: number; // bytes
  used: number;
  available: number;
}

export interface DiskInfo {
  total: number; // bytes
  used: number;
  available: number;
}

/**
 * Get CPU information including usage and core count
 */
export function getCPUInfo(): CPUInfo {
  const cpus = os.cpus();
  const cores = cpus.length;

  // Calculate CPU usage (simplified - average of all cores)
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  const usage = 100 - (100 * totalIdle) / totalTick;

  return {
    usage: Math.round(usage * 100) / 100,
    cores,
  };
}

/**
 * Get memory information
 */
export function getMemoryInfo(): MemoryInfo {
  const total = os.totalmem();
  const available = os.freemem();
  const used = total - available;

  return {
    total,
    used,
    available,
  };
}

/**
 * Get disk information for the current working directory
 */
export async function getDiskInfo(): Promise<DiskInfo> {
  try {
    if (process.platform === 'win32') {
      // Windows: use wmic
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
      const lines = stdout.trim().split('\n').slice(1); // Skip header
      const drive = process.cwd().charAt(0); // Get drive letter (e.g., 'C')

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const firstPart = parts[0];
        if (firstPart && drive && firstPart.startsWith(drive)) {
          const available = parseInt(parts[1] || '0', 10);
          const total = parseInt(parts[2] || '0', 10);
          const used = total - available;

          return { total, used, available };
        }
      }
    } else {
      // Unix-like: use df
      const { stdout } = await execAsync('df -k .');
      const lines = stdout.trim().split('\n');
      if (lines.length > 1 && lines[1]) {
        const parts = lines[1].trim().split(/\s+/);
        const total = parseInt(parts[1] || '0', 10) * 1024; // Convert KB to bytes
        const used = parseInt(parts[2] || '0', 10) * 1024;
        const available = parseInt(parts[3] || '0', 10) * 1024;

        return { total, used, available };
      }
    }

    // Fallback
    return { total: 0, used: 0, available: 0 };
  } catch {
    return { total: 0, used: 0, available: 0 };
  }
}

/**
 * Get Node.js version
 */
export function getNodeVersion(): string {
  return process.version;
}

/**
 * Get npm version
 */
export async function getNpmVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync('npm --version');
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get current Git branch
 */
export async function getCurrentBranch(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD');
    return stdout.trim();
  } catch {
    return null;
  }
}
