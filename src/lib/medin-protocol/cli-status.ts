#!/usr/bin/env node
/**
 * CLI Status Command for Activity Log
 * 
 * Provides command-line interface to query and display activity log entries
 * with filtering, color-coding, and multiple output formats.
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 */

import { ActivityLogManager } from './activity-log.js';
import type { ActivityEntry, LogFilters } from './types.js';

/**
 * CLI status options
 */
export interface StatusOptions {
  taskId?: string;
  failed?: boolean;
  since?: string; // ISO 8601 date
  limit?: number;
  format?: 'table' | 'json' | 'markdown';
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

/**
 * CLI Status Command
 * 
 * Queries activity log and displays results with formatting
 */
export class CLIStatusCommand {
  constructor(private activityLog: ActivityLogManager) {}

  /**
   * Display recent activity
   * 
   * @param options - Display options
   */
  async showStatus(options: StatusOptions = {}): Promise<void> {
    // Build filters from options
    const filters: LogFilters = {
      limit: options.limit || 10,
    };

    if (options.taskId) {
      filters.taskId = options.taskId;
    }

    if (options.failed) {
      filters.status = 'failure';
    }

    if (options.since) {
      filters.since = new Date(options.since);
    }

    // Query activity log
    const entries = await this.activityLog.queryLog(filters);

    // Display based on format
    const format = options.format || 'table';
    switch (format) {
      case 'json':
        this.displayJSON(entries);
        break;
      case 'markdown':
        this.displayMarkdown(entries);
        break;
      case 'table':
      default:
        this.displayTable(entries);
        break;
    }
  }

  /**
   * Display entries as a formatted table
   */
  private displayTable(entries: ActivityEntry[]): void {
    if (entries.length === 0) {
      console.log('No activity log entries found.');
      return;
    }

    // Table header
    console.log('┌─────────────────────┬──────────────────────┬──────────┬─────────────┐');
    console.log('│ Timestamp           │ Task ID              │ Status   │ Category    │');
    console.log('├─────────────────────┼──────────────────────┼──────────┼─────────────┤');

    // Table rows
    for (const entry of entries) {
      const timestamp = this.formatTimestamp(entry.timestamp);
      const taskId = this.truncate(entry.taskId, 20);
      const status = this.colorizeStatus(entry.status);
      const category = this.truncate(entry.category, 11);

      console.log(`│ ${timestamp} │ ${taskId} │ ${status} │ ${category} │`);
    }

    // Table footer
    console.log('└─────────────────────┴──────────────────────┴──────────┴─────────────┘');
    console.log(`\nTotal: ${entries.length} entries`);
  }

  /**
   * Display entries as JSON
   */
  private displayJSON(entries: ActivityEntry[]): void {
    console.log(JSON.stringify(entries, null, 2));
  }

  /**
   * Display entries as markdown
   */
  private displayMarkdown(entries: ActivityEntry[]): void {
    if (entries.length === 0) {
      console.log('No activity log entries found.');
      return;
    }

    console.log('# Activity Log\n');

    for (const entry of entries) {
      console.log(`## [${entry.timestamp}] ${entry.taskId}\n`);
      console.log(`**Category**: ${entry.category}`);
      console.log(`**Status**: ${entry.status}\n`);
      console.log(`### Description\n${entry.details.description}\n`);

      if (entry.details.validationResults && entry.details.validationResults.length > 0) {
        console.log('### Validation Results\n');
        for (const result of entry.details.validationResults) {
          const icon = result.passed ? '✅' : '❌';
          console.log(`- ${icon} ${result.evidence}`);
        }
        console.log('');
      }

      console.log('---\n');
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).padEnd(19);
  }

  /**
   * Colorize status based on value
   * 
   * **Validates: Requirement 8.5** - Color-coded output
   */
  private colorizeStatus(status: string): string {
    let color = colors.reset;
    let icon = '';

    switch (status) {
      case 'success':
        color = colors.green;
        icon = '✅';
        break;
      case 'failure':
        color = colors.red;
        icon = '❌';
        break;
      case 'pending':
        color = colors.yellow;
        icon = '⚠️';
        break;
      case 'skipped':
        color = colors.gray;
        icon = '⏭️';
        break;
    }

    return `${color}${icon} ${status.padEnd(7)}${colors.reset}`;
  }

  /**
   * Truncate string to specified length
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str.padEnd(maxLength);
    }
    return str.substring(0, maxLength - 3) + '...';
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs(): StatusOptions {
  const args = process.argv.slice(2);
  const options: StatusOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--task':
        if (i + 1 < args.length) options.taskId = args[++i];
        break;
      case '--failed':
        options.failed = true;
        break;
      case '--since':
        if (i + 1 < args.length) options.since = args[++i];
        break;
      case '--limit':
        if (i + 1 < args.length) {
          const limitStr = args[i + 1];
          if (limitStr) {
            options.limit = parseInt(limitStr, 10);
            i++;
          }
        }
        break;
      case '--format':
        if (i + 1 < args.length) {
          const format = args[++i];
          if (format === 'table' || format === 'json' || format === 'markdown') {
            options.format = format;
          }
        }
        break;
    }
  }

  return options;
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const options = parseArgs();

  // Create activity log manager
  const activityLog = new ActivityLogManager('ACTIVITY_LOG.md');

  // Create CLI command
  const cli = new CLIStatusCommand(activityLog);

  // Show status
  await cli.showStatus(options);
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
