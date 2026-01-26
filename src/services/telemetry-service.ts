import * as fs from 'fs/promises';
import * as path from 'path';

export interface TelemetryData {
  metrics: {
    ralphLoopActivations: number;
    ralphLoopSuccesses: number;
    ralphLoopFailures: number;
    autonomousFixes: number;
    tasksCompleted: number;
    successRate: number;
  };
  recentEvents: TelemetryEvent[];
  generatedAt: string;
}

export interface TelemetryEvent {
  timestamp: string;
  type: string;
  tool?: string;
  result: 'success' | 'failure';
  details: string;
}

const TELEMETRY_PATH = path.join(process.cwd(), 'docs', 'telemetry.json');

/**
 * Read telemetry data from file
 */
export async function readTelemetry(): Promise<TelemetryData> {
  try {
    const content = await fs.readFile(TELEMETRY_PATH, 'utf-8');
    return JSON.parse(content) as TelemetryData;
  } catch (error) {
    // Return baseline metrics if file doesn't exist or is corrupted
    return {
      metrics: {
        ralphLoopActivations: 0,
        ralphLoopSuccesses: 0,
        ralphLoopFailures: 0,
        autonomousFixes: 0,
        tasksCompleted: 0,
        successRate: 100,
      },
      recentEvents: [],
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Write telemetry data to file
 */
export async function writeTelemetry(data: TelemetryData): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(TELEMETRY_PATH), { recursive: true });

    // Write with pretty formatting
    await fs.writeFile(TELEMETRY_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write telemetry: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Log an event to telemetry
 */
export async function logEvent(event: TelemetryEvent): Promise<void> {
  try {
    const data = await readTelemetry();

    // Add event to recent events (keep last 50)
    data.recentEvents.unshift(event);
    if (data.recentEvents.length > 50) {
      data.recentEvents = data.recentEvents.slice(0, 50);
    }

    // Update metrics based on event type
    if (event.type === 'ralph_loop') {
      data.metrics.ralphLoopActivations++;
      if (event.result === 'success') {
        data.metrics.ralphLoopSuccesses++;
      } else {
        data.metrics.ralphLoopFailures++;
      }
    }

    if (event.type === 'autonomous_fix') {
      data.metrics.autonomousFixes++;
    }

    if (event.type === 'task_completed') {
      data.metrics.tasksCompleted++;
    }

    // Recalculate success rate
    const total = data.metrics.ralphLoopActivations;
    if (total > 0) {
      data.metrics.successRate = Math.round((data.metrics.ralphLoopSuccesses / total) * 100);
    }

    data.generatedAt = new Date().toISOString();

    await writeTelemetry(data);
  } catch (error) {
    // Log error but don't throw - telemetry failures shouldn't break operations
    console.error('Failed to log telemetry event:', error);
  }
}
