/**
 * Container Service (Execution Layer)
 * Provides deterministic Docker container management for sandboxed code execution
 * 
 * This is a pure execution script with no AI decision-making.
 * All logic is deterministic and testable.
 */

import { spawn, ChildProcess } from 'child_process';

/**
 * Container configuration
 */
export interface ContainerConfig {
  /** Docker image to use */
  image: string;
  
  /** Container name (optional) */
  name?: string;
  
  /** Environment variables */
  env?: Record<string, string>;
  
  /** Volume mounts (host:container) */
  volumes?: string[];
  
  /** Working directory inside container */
  workdir?: string;
  
  /** Command to execute */
  command?: string[];
  
  /** Memory limit (e.g., "512m") */
  memoryLimit?: string;
  
  /** CPU limit (e.g., "1.0") */
  cpuLimit?: string;
  
  /** Network mode (default: "none" for isolation) */
  network?: string;
  
  /** Auto-remove container after execution */
  autoRemove?: boolean;
}

/**
 * Container execution result
 */
export interface ContainerResult {
  /** Exit code */
  exitCode: number;
  
  /** Standard output */
  stdout: string;
  
  /** Standard error */
  stderr: string;
  
  /** Execution duration in milliseconds */
  duration: number;
  
  /** Container ID */
  containerId: string;
}

/**
 * Container Service
 * Manages Docker containers for sandboxed code execution
 */
export class ContainerService {
  private runningContainers: Map<string, ChildProcess> = new Map();

  /**
   * Check if Docker is available
   */
  async isDockerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('docker', ['--version']);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Run code in a sandboxed Docker container
   * 
   * @param config - Container configuration
   * @returns Execution result
   */
  async runInContainer(config: ContainerConfig): Promise<ContainerResult> {
    const startTime = Date.now();
    
    // Build docker run command
    const args = ['run'];
    
    // Auto-remove by default for temporary containers
    if (config.autoRemove !== false) {
      args.push('--rm');
    }
    
    // Container name
    if (config.name) {
      args.push('--name', config.name);
    }
    
    // Network isolation (default: none)
    args.push('--network', config.network || 'none');
    
    // Resource limits
    if (config.memoryLimit) {
      args.push('--memory', config.memoryLimit);
    }
    
    if (config.cpuLimit) {
      args.push('--cpus', config.cpuLimit);
    }
    
    // Environment variables
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        args.push('-e', `${key}=${value}`);
      }
    }
    
    // Volume mounts
    if (config.volumes) {
      for (const volume of config.volumes) {
        args.push('-v', volume);
      }
    }
    
    // Working directory
    if (config.workdir) {
      args.push('-w', config.workdir);
    }
    
    // Image
    args.push(config.image);
    
    // Command
    if (config.command) {
      args.push(...config.command);
    }
    
    // Execute docker run
    return new Promise((resolve, reject) => {
      const process = spawn('docker', args);
      
      let stdout = '';
      let stderr = '';
      let containerId = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          duration,
          containerId,
        });
      });
      
      process.on('error', (error) => {
        reject(new Error(`Docker execution failed: ${error.message}`));
      });
      
      // Store process for potential cleanup
      if (config.name) {
        this.runningContainers.set(config.name, process);
      }
    });
  }

  /**
   * Stop a running container
   * 
   * @param containerName - Container name or ID
   * @returns Whether stop was successful
   */
  async stopContainer(containerName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('docker', ['stop', containerName]);
      
      process.on('close', (code) => {
        this.runningContainers.delete(containerName);
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Remove a container
   * 
   * @param containerName - Container name or ID
   * @param force - Force removal even if running
   * @returns Whether removal was successful
   */
  async removeContainer(containerName: string, force: boolean = false): Promise<boolean> {
    return new Promise((resolve) => {
      const args = ['rm'];
      if (force) {
        args.push('-f');
      }
      args.push(containerName);
      
      const process = spawn('docker', args);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * List running containers
   * 
   * @returns List of container IDs
   */
  async listContainers(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const process = spawn('docker', ['ps', '-q']);
      
      let stdout = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          const containers = stdout.trim().split('\n').filter(id => id.length > 0);
          resolve(containers);
        } else {
          reject(new Error('Failed to list containers'));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Pull a Docker image
   * 
   * @param image - Image name (e.g., "node:20-alpine")
   * @returns Whether pull was successful
   */
  async pullImage(image: string): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('docker', ['pull', image]);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Cleanup all running containers managed by this service
   */
  async cleanup(): Promise<void> {
    const promises: Promise<boolean>[] = [];
    
    for (const [name] of this.runningContainers) {
      promises.push(this.stopContainer(name));
    }
    
    await Promise.all(promises);
    this.runningContainers.clear();
  }
}

/**
 * Global container service instance
 */
let globalContainerService: ContainerService | null = null;

/**
 * Get or create global container service instance
 */
export function getContainerService(): ContainerService {
  if (!globalContainerService) {
    globalContainerService = new ContainerService();
  }
  return globalContainerService;
}

/**
 * Execute code in a sandboxed Node.js container
 * 
 * @param code - JavaScript/TypeScript code to execute
 * @param timeout - Execution timeout in milliseconds (default: 30000)
 * @returns Execution result
 */
export async function executeCodeSandboxed(
  code: string,
  timeout: number = 30000
): Promise<ContainerResult> {
  const service = getContainerService();
  
  // Check if Docker is available
  const dockerAvailable = await service.isDockerAvailable();
  if (!dockerAvailable) {
    throw new Error('Docker is not available. Please install Docker to use sandboxed execution.');
  }
  
  // Create temporary container config
  const config: ContainerConfig = {
    image: 'node:20-alpine',
    command: ['node', '-e', code],
    memoryLimit: '512m',
    cpuLimit: '1.0',
    network: 'none', // No network access for security
    autoRemove: true,
  };
  
  // Execute with timeout
  const timeoutPromise = new Promise<ContainerResult>((_, reject) => {
    setTimeout(() => reject(new Error('Execution timeout')), timeout);
  });
  
  const executionPromise = service.runInContainer(config);
  
  return Promise.race([executionPromise, timeoutPromise]);
}
