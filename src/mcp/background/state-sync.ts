import * as fs from 'fs/promises';
import * as path from 'path';
import { readTelemetry, TelemetryData } from '../../services/telemetry-service.js';

/**
 * Configuration for State Sync
 */
export interface StateSyncConfig {
  interval: number; // milliseconds between updates
  enabled: boolean; // whether streaming is active
  telemetryPath?: string; // path to telemetry file (optional override)
}

/**
 * State Sync Client
 */
export interface StateSyncClient {
  id: string;
  connectedAt: string;
  lastUpdate: string;
}

/**
 * State Sync Update
 */
export interface StateSyncUpdate {
  timestamp: string;
  telemetry: TelemetryData;
  changeType: 'periodic' | 'file-change' | 'manual';
}

/**
 * State Sync class for continuous telemetry streaming
 *
 * Implements Requirement 6: Background Reasoning - State Sync
 * - Streams telemetry updates to connected IDE clients
 * - Detects file changes and pushes updates
 * - Pauses when no clients connected
 */
export class StateSync {
  private interval: NodeJS.Timeout | null = null;
  private clients: Map<string, StateSyncClient> = new Map();
  private config: StateSyncConfig;
  private lastTelemetryHash: string | null = null;
  private telemetryPath: string;
  private updateCallbacks: Array<(update: StateSyncUpdate) => void> = [];

  constructor(config: StateSyncConfig) {
    this.config = config;
    this.telemetryPath = config.telemetryPath || path.join(process.cwd(), 'docs', 'telemetry.json');
  }

  /**
   * Start state sync streaming
   */
  start(config?: Partial<StateSyncConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (!this.config.enabled) {
      return;
    }

    // Only start if we have clients
    if (this.clients.size === 0) {
      return;
    }

    // Clear existing interval if any
    if (this.interval) {
      clearInterval(this.interval);
    }

    // Start periodic updates
    this.interval = setInterval(() => {
      void this.checkAndPushUpdate('periodic');
    }, this.config.interval);

    // Initial update
    void this.checkAndPushUpdate('manual');
  }

  /**
   * Stop state sync streaming
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Add a client to receive updates
   */
  addClient(clientId: string): void {
    const client: StateSyncClient = {
      id: clientId,
      connectedAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    };

    this.clients.set(clientId, client);

    // Start streaming if this is the first client
    if (this.clients.size === 1 && this.config.enabled) {
      this.start();
    }

    // Send initial state to new client
    void this.pushUpdate('manual');
  }

  /**
   * Remove a client from receiving updates
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);

    // Stop streaming if no clients remain
    if (this.clients.size === 0) {
      this.stop();
    }
  }

  /**
   * Get current client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get list of connected clients
   */
  getClients(): StateSyncClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Register a callback for updates
   */
  onUpdate(callback: (update: StateSyncUpdate) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Get current telemetry snapshot
   */
  async getCurrentState(): Promise<TelemetryData> {
    return await readTelemetry();
  }

  /**
   * Check for changes and push update if needed
   */
  private async checkAndPushUpdate(
    changeType: 'periodic' | 'file-change' | 'manual'
  ): Promise<void> {
    try {
      // Read current telemetry
      const telemetry = await readTelemetry();
      const currentHash = this.hashTelemetry(telemetry);

      // Check if data changed
      if (changeType === 'periodic' && currentHash === this.lastTelemetryHash) {
        return; // No changes, skip update
      }

      this.lastTelemetryHash = currentHash;

      // Create update
      const update: StateSyncUpdate = {
        timestamp: new Date().toISOString(),
        telemetry,
        changeType,
      };

      // Notify all callbacks
      for (const callback of this.updateCallbacks) {
        try {
          callback(update);
        } catch (error) {
          console.error('Error in state sync callback:', error);
        }
      }

      // Update client timestamps
      const now = new Date().toISOString();
      for (const client of this.clients.values()) {
        client.lastUpdate = now;
      }
    } catch (error) {
      console.error('Error checking telemetry updates:', error);
    }
  }

  /**
   * Manually trigger an update push
   */
  async pushUpdate(changeType: 'periodic' | 'file-change' | 'manual' = 'manual'): Promise<void> {
    await this.checkAndPushUpdate(changeType);
  }

  /**
   * Watch telemetry file for changes
   */
  async watchTelemetryFile(): Promise<void> {
    try {
      // Check if file exists
      await fs.access(this.telemetryPath);

      // Watch for changes
      const watcher = fs.watch(this.telemetryPath);

      for await (const event of watcher) {
        if (event.eventType === 'change') {
          await this.checkAndPushUpdate('file-change');
        }
      }
    } catch (error) {
      // File doesn't exist or can't be watched
      console.warn('Cannot watch telemetry file:', error);
    }
  }

  /**
   * Hash telemetry data for change detection
   */
  private hashTelemetry(telemetry: TelemetryData): string {
    // Simple hash based on JSON string
    // In production, consider using a proper hash function
    const str = JSON.stringify({
      metrics: telemetry.metrics,
      eventCount: telemetry.recentEvents.length,
      lastEvent: telemetry.recentEvents[0]?.timestamp || null,
    });

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }
}
