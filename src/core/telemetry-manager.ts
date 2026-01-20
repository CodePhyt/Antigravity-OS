/**
 * Telemetry Manager
 * Tracks system metrics, Ralph-Loop performance, and autonomous fixes
 * 
 * This module provides real-time telemetry for system reliability monitoring.
 */

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Telemetry event types
 */
export type TelemetryEventType =
  | 'ralph_loop_success'
  | 'ralph_loop_failure'
  | 'ralph_loop_exhausted'
  | 'task_completed'
  | 'task_failed'
  | 'spec_updated'
  | 'test_passed'
  | 'test_failed'
  | 'system_started'
  | 'system_stopped';

/**
 * Telemetry event
 */
export interface TelemetryEvent {
  /** Event type */
  type: TelemetryEventType;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Task ID (if applicable) */
  taskId?: string;
  
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Telemetry metrics
 */
export interface TelemetryMetrics {
  /** Total Ralph-Loop activations */
  ralphLoopActivations: number;
  
  /** Successful Ralph-Loop corrections */
  ralphLoopSuccesses: number;
  
  /** Failed Ralph-Loop corrections */
  ralphLoopFailures: number;
  
  /** Ralph-Loop exhaustions (3 attempts failed) */
  ralphLoopExhaustions: number;
  
  /** Total autonomous fixes */
  autonomousFixes: number;
  
  /** Total spec updates */
  specUpdates: number;
  
  /** Total tasks completed */
  tasksCompleted: number;
  
  /** Total tasks failed */
  tasksFailed: number;
  
  /** Total tests passed */
  testsPassed: number;
  
  /** Total tests failed */
  testsFailed: number;
  
  /** System uptime (milliseconds) */
  uptime: number;
  
  /** System start time */
  startTime: Date;
  
  /** Last updated */
  lastUpdated: Date;
  
  /** Success rate (percentage) */
  successRate: number;
  
  /** Ralph-Loop effectiveness (percentage) */
  ralphLoopEffectiveness: number;
}

/**
 * Telemetry Manager
 * Tracks and persists system metrics
 */
export class TelemetryManager {
  private metrics: TelemetryMetrics;
  private events: TelemetryEvent[] = [];
  private telemetryPath: string;
  private maxEvents: number;

  constructor(telemetryPath: string = 'docs/telemetry.json', maxEvents: number = 1000) {
    this.telemetryPath = telemetryPath;
    this.maxEvents = maxEvents;
    
    // Initialize metrics
    this.metrics = {
      ralphLoopActivations: 0,
      ralphLoopSuccesses: 0,
      ralphLoopFailures: 0,
      ralphLoopExhaustions: 0,
      autonomousFixes: 0,
      specUpdates: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      testsPassed: 0,
      testsFailed: 0,
      uptime: 0,
      startTime: new Date(),
      lastUpdated: new Date(),
      successRate: 0,
      ralphLoopEffectiveness: 0,
    };
  }

  /**
   * Record a telemetry event
   */
  async recordEvent(type: TelemetryEventType, taskId?: string, context?: Record<string, unknown>): Promise<void> {
    const event: TelemetryEvent = {
      type,
      timestamp: new Date(),
      taskId,
      context,
    };

    // Add to events list
    this.events.push(event);

    // Trim events if exceeding max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update metrics based on event type
    this.updateMetrics(event);

    // Persist to disk
    await this.persist();
  }

  /**
   * Update metrics based on event
   */
  private updateMetrics(event: TelemetryEvent): void {
    switch (event.type) {
      case 'ralph_loop_success':
        this.metrics.ralphLoopActivations++;
        this.metrics.ralphLoopSuccesses++;
        this.metrics.autonomousFixes++;
        break;

      case 'ralph_loop_failure':
        this.metrics.ralphLoopActivations++;
        this.metrics.ralphLoopFailures++;
        break;

      case 'ralph_loop_exhausted':
        this.metrics.ralphLoopExhaustions++;
        break;

      case 'task_completed':
        this.metrics.tasksCompleted++;
        break;

      case 'task_failed':
        this.metrics.tasksFailed++;
        break;

      case 'spec_updated':
        this.metrics.specUpdates++;
        break;

      case 'test_passed':
        this.metrics.testsPassed++;
        break;

      case 'test_failed':
        this.metrics.testsFailed++;
        break;
    }

    // Calculate derived metrics
    this.metrics.uptime = Date.now() - this.metrics.startTime.getTime();
    this.metrics.lastUpdated = new Date();

    // Calculate success rate
    const totalTasks = this.metrics.tasksCompleted + this.metrics.tasksFailed;
    this.metrics.successRate = totalTasks > 0 
      ? (this.metrics.tasksCompleted / totalTasks) * 100 
      : 0;

    // Calculate Ralph-Loop effectiveness
    const totalRalphLoop = this.metrics.ralphLoopSuccesses + this.metrics.ralphLoopFailures;
    this.metrics.ralphLoopEffectiveness = totalRalphLoop > 0
      ? (this.metrics.ralphLoopSuccesses / totalRalphLoop) * 100
      : 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): TelemetryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): TelemetryEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: TelemetryEventType): TelemetryEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Persist telemetry to disk
   */
  private async persist(): Promise<void> {
    try {
      const data = {
        metrics: this.metrics,
        recentEvents: this.events.slice(-100), // Keep last 100 events
        generatedAt: new Date().toISOString(),
      };

      const json = JSON.stringify(data, null, 2);
      await fs.writeFile(this.telemetryPath, json, 'utf-8');
    } catch (error) {
      // Log error but don't throw - telemetry failure shouldn't crash system
      console.error('Failed to persist telemetry:', error);
    }
  }

  /**
   * Load telemetry from disk
   */
  async load(): Promise<boolean> {
    try {
      const content = await fs.readFile(this.telemetryPath, 'utf-8');
      const data = JSON.parse(content);

      if (data.metrics) {
        // Restore dates
        data.metrics.startTime = new Date(data.metrics.startTime);
        data.metrics.lastUpdated = new Date(data.metrics.lastUpdated);
        
        this.metrics = data.metrics;
      }

      if (data.recentEvents) {
        this.events = data.recentEvents.map((e: TelemetryEvent) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
      }

      return true;
    } catch {
      // File doesn't exist or is corrupted - start fresh
      return false;
    }
  }

  /**
   * Reset all metrics
   */
  async reset(): Promise<void> {
    this.metrics = {
      ralphLoopActivations: 0,
      ralphLoopSuccesses: 0,
      ralphLoopFailures: 0,
      ralphLoopExhaustions: 0,
      autonomousFixes: 0,
      specUpdates: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      testsPassed: 0,
      testsFailed: 0,
      uptime: 0,
      startTime: new Date(),
      lastUpdated: new Date(),
      successRate: 0,
      ralphLoopEffectiveness: 0,
    };

    this.events = [];
    await this.persist();
  }

  /**
   * Generate telemetry report
   */
  generateReport(): string {
    const m = this.metrics;
    
    return `
# Telemetry Report

**Generated**: ${new Date().toISOString()}
**Uptime**: ${Math.floor(m.uptime / 1000 / 60)} minutes

## Performance Metrics

- **Success Rate**: ${m.successRate.toFixed(1)}%
- **Ralph-Loop Effectiveness**: ${m.ralphLoopEffectiveness.toFixed(1)}%
- **Autonomous Fixes**: ${m.autonomousFixes}

## Task Execution

- **Completed**: ${m.tasksCompleted}
- **Failed**: ${m.tasksFailed}
- **Total**: ${m.tasksCompleted + m.tasksFailed}

## Ralph-Loop Statistics

- **Activations**: ${m.ralphLoopActivations}
- **Successes**: ${m.ralphLoopSuccesses}
- **Failures**: ${m.ralphLoopFailures}
- **Exhaustions**: ${m.ralphLoopExhaustions}

## Testing

- **Tests Passed**: ${m.testsPassed}
- **Tests Failed**: ${m.testsFailed}
- **Pass Rate**: ${m.testsPassed + m.testsFailed > 0 ? ((m.testsPassed / (m.testsPassed + m.testsFailed)) * 100).toFixed(1) : 0}%

## System Updates

- **Spec Updates**: ${m.specUpdates}
- **Last Updated**: ${m.lastUpdated.toISOString()}
`.trim();
  }
}

/**
 * Global telemetry instance
 */
let globalTelemetry: TelemetryManager | null = null;

/**
 * Get or create global telemetry instance
 */
export function getTelemetry(): TelemetryManager {
  if (!globalTelemetry) {
    globalTelemetry = new TelemetryManager();
  }
  return globalTelemetry;
}

/**
 * Initialize telemetry
 */
export async function initializeTelemetry(): Promise<TelemetryManager> {
  const telemetry = getTelemetry();
  await telemetry.load();
  await telemetry.recordEvent('system_started');
  return telemetry;
}
