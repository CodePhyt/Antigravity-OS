/**
 * Gateway Client - Lightweight HTTP client for Gateway communication
 * 
 * Implements transparent Gateway integration with automatic fallback.
 * CLI sends commands to Gateway for fast execution, falls back to direct
 * execution if Gateway unavailable.
 * 
 * @module lib/gateway-client
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

/**
 * Gateway configuration
 */
const GATEWAY_HOST = 'localhost';
const GATEWAY_PORT = 3000;
const GATEWAY_FALLBACK_PORT = 3001;
const GATEWAY_STARTUP_DELAY = 1000; // 1 second
const GATEWAY_HEALTH_TIMEOUT = 2000; // 2 seconds

/**
 * Gateway health response
 */
interface GatewayHealth {
  status: 'active';
  uptime: number;
  port: number;
  version: string;
}

/**
 * Test command response
 */
interface TestCommandResponse {
  success: boolean;
  output: string;
  duration: number;
  exitCode: number;
}

/**
 * Gateway client for command execution
 */
export class GatewayClient {
  private gatewayUrl: string;
  private isGatewayRunning: boolean = false;

  constructor(port: number = GATEWAY_PORT) {
    this.gatewayUrl = `http://${GATEWAY_HOST}:${port}`;
  }

  /**
   * Check if Gateway is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GATEWAY_HEALTH_TIMEOUT);

      const response = await fetch(`${this.gatewayUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const health = (await response.json()) as GatewayHealth;
        this.isGatewayRunning = health.status === 'active';
        return this.isGatewayRunning;
      }

      return false;
    } catch (error) {
      // Gateway not reachable
      this.isGatewayRunning = false;
      return false;
    }
  }

  /**
   * Start Gateway process in detached mode
   */
  async startGateway(): Promise<boolean> {
    try {
      console.log('🚀 Starting Gateway...');

      // Spawn Gateway in detached mode
      const gatewayProcess = spawn('node', ['dist/gateway.js'], {
        detached: true,
        stdio: 'ignore',
      });

      // Unref so parent can exit
      gatewayProcess.unref();

      // Wait for Gateway to start
      await sleep(GATEWAY_STARTUP_DELAY);

      // Verify Gateway is running
      const isHealthy = await this.checkHealth();

      if (isHealthy) {
        console.log('✅ Gateway started successfully');
        return true;
      } else {
        console.warn('⚠️  Gateway started but health check failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to start Gateway:', error);
      return false;
    }
  }

  /**
   * Execute test command via Gateway
   */
  async executeTest(targetFile?: string, mode?: 'quick' | 'full'): Promise<TestCommandResponse> {
    try {
      const response = await fetch(`${this.gatewayUrl}/cmd/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetFile, mode }),
      });

      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}`);
      }

      return (await response.json()) as TestCommandResponse;
    } catch (error) {
      throw new Error(
        `Gateway communication failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute command with automatic Gateway management
   * 
   * Flow:
   * 1. Check if Gateway is running
   * 2. If not, try to start it
   * 3. If started, send command
   * 4. If Gateway fails, return null (caller should fallback)
   */
  async executeWithGateway(
    targetFile?: string,
    mode?: 'quick' | 'full'
  ): Promise<TestCommandResponse | null> {
    // Step 1: Check if Gateway is running
    let isHealthy = await this.checkHealth();

    // Step 2: If not running, try to start it
    if (!isHealthy) {
      const started = await this.startGateway();
      if (!started) {
        console.warn('⚠️  Gateway unavailable, falling back to direct execution');
        return null;
      }
      isHealthy = true;
    }

    // Step 3: Send command to Gateway
    if (isHealthy) {
      try {
        const result = await this.executeTest(targetFile, mode);
        console.log(`⚡ Gateway execution: ${result.duration}ms`);
        return result;
      } catch (error) {
        console.error('❌ Gateway execution failed:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Try fallback port if default fails
   */
  async tryFallbackPort(): Promise<boolean> {
    this.gatewayUrl = `http://${GATEWAY_HOST}:${GATEWAY_FALLBACK_PORT}`;
    return this.checkHealth();
  }
}

/**
 * Singleton Gateway client instance
 */
let gatewayClient: GatewayClient | null = null;

/**
 * Get or create Gateway client
 */
export function getGatewayClient(): GatewayClient {
  if (!gatewayClient) {
    gatewayClient = new GatewayClient();
  }
  return gatewayClient;
}
