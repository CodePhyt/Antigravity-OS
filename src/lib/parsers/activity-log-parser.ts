/**
 * Activity Log Parser
 * 
 * Parses ACTIVITY_LOG.md to extract structured activity entries.
 * Implements Requirements 1.1, 1.3, 8.1, 8.2, 8.4 from Ralph's Brain View spec.
 */

import { readFile } from 'fs/promises';
import { randomUUID } from 'crypto';

/**
 * Activity entry level indicating the type of activity
 */
export type ActivityLevel = 'info' | 'success' | 'error' | 'correction';

/**
 * Structured activity entry extracted from ACTIVITY_LOG.md
 */
export interface ActivityEntry {
  /** Unique identifier for React keys */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Human-readable activity message */
  message: string;
  /** Activity level for color coding */
  level: ActivityLevel;
}

/**
 * Parse result with error information
 */
export interface ParseResult {
  /** Parsed activity entries */
  entries: ActivityEntry[];
  /** Error information if parsing failed */
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
}

/**
 * ActivityLogParser extracts structured data from ACTIVITY_LOG.md
 * 
 * The parser looks for markdown headers with the format:
 * ### Entry N: Title
 * **Date**: YYYY-MM-DD
 * **Status**: ✅ COMPLETE | 🔄 IN PROGRESS | ❌ FAILED
 * 
 * Memory Bounds: Limits storage to 100 entries maximum (Requirement 7.1)
 */
export class ActivityLogParser {
  /** Maximum number of entries to store in memory (Requirement 7.1) */
  private static readonly MAX_ENTRIES = 100;

  /** Number of entries to return for display (latest N) */
  private static readonly DISPLAY_ENTRIES = 10;

  /**
   * Parse ACTIVITY_LOG.md and return the latest 10 entries
   * 
   * Implements graceful error handling:
   * - Returns empty array for missing files (ENOENT)
   * - Returns empty array for permission errors (EACCES)
   * - Logs errors with context for debugging
   * - Never throws, always returns valid result
   * 
   * Memory Bounds:
   * - Limits parsing to MAX_ENTRIES (100) most recent entries
   * - Returns DISPLAY_ENTRIES (10) for display
   * - Prevents unbounded memory growth (Requirement 7.1)
   * 
   * @param filepath - Path to ACTIVITY_LOG.md
   * @returns Array of activity entries (max 10, most recent)
   */
  static async parse(filepath: string): Promise<ActivityEntry[]> {
    try {
      const content = await readFile(filepath, 'utf-8');
      const entries: ActivityEntry[] = [];

      // Regex to match entry headers: ### Entry N: Title
      const entryRegex = /### Entry (\d+): (.+)/g;
      const matches = Array.from(content.matchAll(entryRegex));

      for (const match of matches) {
        const [fullMatch, entryNumber, title] = match;
        if (!fullMatch || !entryNumber || !title) continue;
        
        const entryIndex = content.indexOf(fullMatch);
        
        // Extract the section content for this entry
        const nextEntryIndex = content.indexOf('### Entry', entryIndex + 1);
        const sectionContent = nextEntryIndex > -1 
          ? content.slice(entryIndex, nextEntryIndex)
          : content.slice(entryIndex);

        // Extract date from **Date**: YYYY-MM-DD format
        const dateMatch = sectionContent.match(/\*\*Date\*\*:\s*(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch?.[1] ?? new Date().toISOString().split('T')[0];

        // Extract status from **Status**: emoji STATUS format
        const statusMatch = sectionContent.match(/\*\*Status\*\*:\s*[✅🔄❌⏸️]\s*(.+)/);
        const status = statusMatch?.[1]?.trim() ?? 'UNKNOWN';

        // Detect activity level based on status and title
        const level = this.detectLevel(title, status);

        // Create ISO 8601 timestamp (use current time for time component)
        const timestamp = new Date(`${date}T00:00:00Z`).toISOString();

        entries.push({
          id: randomUUID(),
          timestamp,
          message: `Entry ${entryNumber}: ${title} - ${status}`,
          level,
        });
      }

      // Sort by timestamp (oldest to newest)
      const sortedEntries = entries.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      
      // Apply memory bounds: limit to MAX_ENTRIES (100) most recent
      const boundedEntries = sortedEntries.slice(-this.MAX_ENTRIES);
      
      // Return DISPLAY_ENTRIES (10) most recent for display
      return boundedEntries.slice(-this.DISPLAY_ENTRIES);
    } catch (error) {
      // Graceful error handling with structured logging
      const errorCode = (error as NodeJS.ErrnoException).code || 'UNKNOWN';
      const errorMessage = (error as Error).message;

      // Log error with context
      console.error('[ActivityLogParser] Parse error:', {
        filepath,
        errorCode,
        errorMessage,
        timestamp: new Date().toISOString(),
      });

      // Return empty array for common errors (file not found, permission denied)
      if (errorCode === 'ENOENT' || errorCode === 'EACCES') {
        return [];
      }

      // For unexpected errors, return empty array but log for debugging
      console.error('[ActivityLogParser] Unexpected error:', error);
      return [];
    }
  }

  /**
   * Parse with detailed error information
   * 
   * @param filepath - Path to ACTIVITY_LOG.md
   * @returns Parse result with entries and optional error info
   */
  static async parseWithError(filepath: string): Promise<ParseResult> {
    try {
      const entries = await this.parse(filepath);
      return { entries };
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code || 'PARSE_ERROR';
      const errorMessage = (error as Error).message;

      return {
        entries: [],
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Detect activity level based on title and status
   * 
   * @param title - Entry title
   * @param status - Entry status
   * @returns Activity level for color coding
   */
  private static detectLevel(title: string, status: string): ActivityLevel {
    const combined = `${title} ${status}`.toLowerCase();

    // Check for self-correction indicators
    if (combined.includes('self-correction') || 
        combined.includes('self-healing') ||
        combined.includes('correction') ||
        combined.includes('b.l.a.s.t')) {
      return 'correction';
    }

    // Check for error indicators
    if (combined.includes('error') || 
        combined.includes('failed') || 
        combined.includes('failure') ||
        status.includes('FAILED')) {
      return 'error';
    }

    // Check for success indicators
    if (combined.includes('complete') || 
        combined.includes('success') || 
        combined.includes('ready') ||
        status.includes('COMPLETE')) {
      return 'success';
    }

    // Default to info
    return 'info';
  }
}
