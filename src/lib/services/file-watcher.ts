/**
 * File Watcher Service
 * 
 * Monitors ACTIVITY_LOG.md and PRD.md for changes and emits events.
 * Implements Requirements 1.2 and 2.2 from Ralph's Brain View spec.
 */

import { watch, FSWatcher } from 'fs';
import { EventEmitter } from 'events';
import { ActivityLogParser, ActivityEntry } from '@/lib/parsers/activity-log-parser';
import { PRDParser, PRDStatus } from '@/lib/parsers/prd-parser';
import { join } from 'path';

/**
 * File change event data
 */
export interface FileChangeEvent {
  /** Type of file that changed */
  fileType: 'activity' | 'prd';
  /** Parsed data from the file */
  data: ActivityEntry[] | PRDStatus;
  /** Timestamp of the change */
  timestamp: string;
}

/**
 * FileWatcherService monitors files and emits events on changes
 * 
 * Extends EventEmitter to provide event-driven architecture.
 * Watches ACTIVITY_LOG.md and PRD.md using fs.watch.
 * 
 * Events:
 * - 'activity': Emitted when ACTIVITY_LOG.md changes
 * - 'prd': Emitted when PRD.md changes
 * - 'error': Emitted when an error occurs
 */
export class FileWatcherService extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private activityLogPath: string;
  private prdPath: string;
  private isWatching: boolean = false;

  /**
   * Create a new FileWatcherService
   * 
   * @param activityLogPath - Path to ACTIVITY_LOG.md (default: docs/ACTIVITY_LOG.md)
   * @param prdPath - Path to PRD.md (default: docs/PRD.md)
   */
  constructor(
    activityLogPath: string = join(process.cwd(), 'docs', 'ACTIVITY_LOG.md'),
    prdPath: string = join(process.cwd(), 'docs', 'PRD.md')
  ) {
    super();
    this.activityLogPath = activityLogPath;
    this.prdPath = prdPath;
  }

  /**
   * Start watching files for changes
   * 
   * @throws Error if watchers are already active
   */
  start(): void {
    if (this.isWatching) {
      throw new Error('FileWatcherService is already watching files');
    }

    this.watchFile(this.activityLogPath, 'activity');
    this.watchFile(this.prdPath, 'prd');
    this.isWatching = true;
  }

  /**
   * Watch a specific file for changes
   * 
   * @param filepath - Path to the file to watch
   * @param eventType - Type of event to emit ('activity' or 'prd')
   */
  private watchFile(filepath: string, eventType: 'activity' | 'prd'): void {
    try {
      const watcher = watch(filepath, async (event) => {
        if (event === 'change') {
          try {
            const data = await this.parseFile(filepath, eventType);
            this.emit(eventType, data);
          } catch (error) {
            this.emit('error', {
              message: `Failed to parse ${eventType} file`,
              error,
              filepath,
            });
          }
        }
      });

      // Handle watcher errors
      watcher.on('error', (error) => {
        this.emit('error', {
          message: `File watcher error for ${eventType}`,
          error,
          filepath,
        });
      });

      this.watchers.set(filepath, watcher);
    } catch (error) {
      // Gracefully handle file not found errors
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.emit('error', {
          message: `File not found: ${filepath}`,
          error,
          filepath,
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * Parse a file based on its type
   * 
   * @param filepath - Path to the file
   * @param eventType - Type of file ('activity' or 'prd')
   * @returns Parsed data from the file
   */
  private async parseFile(
    filepath: string,
    eventType: 'activity' | 'prd'
  ): Promise<ActivityEntry[] | PRDStatus> {
    if (eventType === 'activity') {
      return await ActivityLogParser.parse(filepath);
    } else {
      return await PRDParser.parse(filepath);
    }
  }

  /**
   * Stop watching files and clean up resources
   * 
   * Closes all file watchers and releases resources.
   * Safe to call multiple times.
   */
  close(): void {
    this.watchers.forEach((watcher) => {
      try {
        watcher.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    this.watchers.clear();
    this.isWatching = false;
    this.removeAllListeners();
  }

  /**
   * Check if the service is currently watching files
   * 
   * @returns True if watching, false otherwise
   */
  isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Get the number of active watchers
   * 
   * @returns Number of active file watchers
   */
  getWatcherCount(): number {
    return this.watchers.size;
  }
}
