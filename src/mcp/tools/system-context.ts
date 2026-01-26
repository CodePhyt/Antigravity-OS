/**
 * System Context Tool
 *
 * Provides real-time system state to prevent AI hallucination.
 * Returns complete system information including CPU, memory, disk,
 * Docker, ports, and environment details.
 *
 * Requirements: 2
 */

import {
  getCPUInfo,
  getMemoryInfo,
  getDiskInfo,
  getNodeVersion,
  getNpmVersion,
  getCurrentBranch,
} from '../../services/system-info-service';
import {
  isDockerAvailable,
  listContainers,
  listImages,
  type DockerContainer,
  type DockerImage,
} from '../../services/docker-service';

/**
 * Port binding information
 */
export interface PortBinding {
  port: number;
  protocol: 'tcp' | 'udp';
  process?: string;
}

/**
 * Complete system context
 */
export interface SystemContext {
  cpu: {
    usage: number; // 0-100
    cores: number;
  };
  memory: {
    total: number; // bytes
    used: number;
    available: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
  };
  docker: {
    available: boolean;
    containers: DockerContainer[];
    images: DockerImage[];
  };
  ports: {
    active: PortBinding[];
  };
  environment: {
    nodeVersion: string;
    npmVersion: string;
    cwd: string;
    gitBranch: string | null;
  };
}

/**
 * Get complete system context
 *
 * Provides real-time system state including CPU, memory, disk, Docker,
 * ports, and environment information. Handles Docker unavailable gracefully.
 *
 * @returns Complete system context
 */
export async function getSystemContext(): Promise<SystemContext> {
  // Get system info (synchronous calls)
  const cpu = getCPUInfo();
  const memory = getMemoryInfo();
  const nodeVersion = getNodeVersion();

  // Get async system info
  const [disk, npmVersion, gitBranch] = await Promise.all([
    getDiskInfo(),
    getNpmVersion(),
    getCurrentBranch(),
  ]);

  // Get Docker info (may not be available)
  let dockerAvailable = false;
  let containers: DockerContainer[] = [];
  let images: DockerImage[] = [];

  try {
    dockerAvailable = await isDockerAvailable();
    if (dockerAvailable) {
      [containers, images] = await Promise.all([listContainers(), listImages()]);
    }
  } catch (error) {
    // Docker not available - gracefully degrade
    dockerAvailable = false;
  }

  // Get active ports (placeholder - would need platform-specific implementation)
  const activePorts: PortBinding[] = [];

  return {
    cpu,
    memory,
    disk,
    docker: {
      available: dockerAvailable,
      containers,
      images,
    },
    ports: {
      active: activePorts,
    },
    environment: {
      nodeVersion,
      npmVersion,
      cwd: process.cwd(),
      gitBranch,
    },
  };
}
