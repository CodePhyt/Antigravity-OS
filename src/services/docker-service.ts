import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DockerContainer {
  id: string;
  image: string;
  status: string;
  ports: string[];
}

export interface DockerImage {
  name: string;
  id: string;
  size: string;
}

/**
 * Check if Docker is available on the system
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * List all Docker containers (running and stopped)
 */
export async function listContainers(): Promise<DockerContainer[]> {
  try {
    const { stdout } = await execAsync(
      'docker ps -a --format "{{.ID}}|{{.Image}}|{{.Status}}|{{.Ports}}"'
    );

    if (!stdout.trim()) {
      return [];
    }

    return stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [id, image, status, ports] = line.split('|');
        return {
          id: id || '',
          image: image || '',
          status: status || '',
          ports: ports ? ports.split(',').map((p) => p.trim()) : [],
        };
      });
  } catch (error) {
    throw new Error(
      `Failed to list containers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List all Docker images
 */
export async function listImages(): Promise<DockerImage[]> {
  try {
    const { stdout } = await execAsync(
      'docker images --format "{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}"'
    );

    if (!stdout.trim()) {
      return [];
    }

    return stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [name, id, size] = line.split('|');
        return {
          name: name || '',
          id: id || '',
          size: size || '',
        };
      });
  } catch (error) {
    throw new Error(
      `Failed to list images: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Remove a Docker container by ID
 */
export async function removeContainer(id: string): Promise<void> {
  try {
    await execAsync(`docker rm -f ${id}`);
  } catch (error) {
    throw new Error(
      `Failed to remove container ${id}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Remove a Docker image by ID
 */
export async function removeImage(id: string): Promise<void> {
  try {
    await execAsync(`docker rmi -f ${id}`);
  } catch (error) {
    throw new Error(
      `Failed to remove image ${id}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
