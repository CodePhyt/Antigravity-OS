/**
 * Activity Log Manager
 * 
 * Maintains long-term memory of all operations with consistent markdown formatting.
 * Provides querying, filtering, and archival capabilities.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.2, 8.3, 8.4, 11.4, 11.5
 */

import fs from 'fs/promises';
import path from 'path';
import { ActivityEntry, LogFilters } from './types';

const DEFAULT_LOG_PATH = 'ACTIVITY_LOG.md';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

export class ActivityLogManager {
  private logPath: string;

  constructor(logPath: string = DEFAULT_LOG_PATH) {
    this.logPath = logPath;
  }

  /**
   * Append entry to activity log
   * @param entry - Log entry to append
   */
  async logEntry(entry: ActivityEntry): Promise<void> {
    // Check if log needs archival
    await this.checkAndArchive();

    // Format entry as markdown
    const markdown = this.formatEntryAsMarkdown(entry);

    // Check if file exists and has content
    let needsNewline = false;
    try {
      const stats = await fs.stat(this.logPath);
      if (stats.size > 0) {
        needsNewline = true;
      }
    } catch {
      // File doesn't exist, no newline needed
    }

    // Append to log file
    const content = needsNewline ? '\n' + markdown : markdown;
    await fs.appendFile(this.logPath, content, 'utf-8');
  }

  /**
   * Query activity log with filters
   * @param filters - Query filters
   * @returns Matching log entries
   */
  async queryLog(filters: LogFilters = {}): Promise<ActivityEntry[]> {
    // Read log file
    const content = await this.readLogFile();

    // Parse entries
    const entries = this.parseLogEntries(content);

    // Apply filters
    return this.applyFilters(entries, filters);
  }

  /**
   * Export activity log as JSON
   * @param filters - Optional filters
   * @returns JSON representation
   */
  async exportJSON(filters?: LogFilters): Promise<string> {
    const entries = await this.queryLog(filters);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Archive old log entries
   * @param beforeDate - Archive entries before this date
   */
  async archiveOldEntries(beforeDate: Date): Promise<void> {
    const entries = await this.queryLog();
    
    // Split entries into archive and keep
    const toArchive = entries.filter(e => new Date(e.timestamp) < beforeDate);
    const toKeep = entries.filter(e => new Date(e.timestamp) >= beforeDate);

    if (toArchive.length === 0) {
      return;
    }

    // Create archive file
    const archivePath = this.getArchivePath(beforeDate);
    const archiveContent = toArchive.map(e => this.formatEntryAsMarkdown(e)).join('\n\n');
    await fs.writeFile(archivePath, archiveContent, 'utf-8');

    // Rewrite log with kept entries
    const newContent = toKeep.map(e => this.formatEntryAsMarkdown(e)).join('\n\n');
    await fs.writeFile(this.logPath, newContent, 'utf-8');
  }

  /**
   * Check if log exceeds size limit and archive if needed
   */
  private async checkAndArchive(): Promise<void> {
    try {
      const stats = await fs.stat(this.logPath);
      if (stats.size >= MAX_LOG_SIZE) {
        // Archive entries older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        await this.archiveOldEntries(thirtyDaysAgo);
      }
    } catch (error) {
      // Log file doesn't exist yet, that's okay
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Format entry as markdown with YAML frontmatter
   */
  private formatEntryAsMarkdown(entry: ActivityEntry): string {
    const lines: string[] = [];

    // Header with timestamp and task ID
    lines.push(`## [${entry.timestamp}] Task: ${entry.taskId}`);
    lines.push('');

    // Metadata section
    lines.push(`**Category**: ${entry.category}  `);
    lines.push(`**Status**: ${this.formatStatus(entry.status)}  `);
    lines.push(`**Task ID**: ${entry.taskId}`);
    lines.push('');

    // Description
    lines.push('### Description');
    lines.push(entry.details.description);
    lines.push('');

    // Validation results (if present)
    if (entry.details.validationResults && entry.details.validationResults.length > 0) {
      lines.push('### Validation Results');
      for (const result of entry.details.validationResults) {
        const icon = result.passed ? '✅' : '❌';
        lines.push(`- ${icon} ${result.evidence} (${result.confidence}% confidence, ${result.duration}ms)`);
      }
      lines.push('');
    }

    // Error context (if present)
    if (entry.details.errorContext) {
      lines.push('### Error Context');
      lines.push(`**Message**: ${entry.details.errorContext.message}`);
      if (entry.details.errorContext.file) {
        lines.push(`**File**: ${entry.details.errorContext.file}:${entry.details.errorContext.line || '?'}`);
      }
      if (entry.details.errorContext.stack) {
        lines.push('```');
        lines.push(entry.details.errorContext.stack);
        lines.push('```');
      }
      lines.push('');
    }

    // Corrections (if present)
    if (entry.details.corrections && entry.details.corrections.length > 0) {
      lines.push('### Corrections Applied');
      for (const correction of entry.details.corrections) {
        lines.push(`- **${correction.type}**: ${correction.description}`);
        lines.push(`  - Before: ${correction.before}`);
        lines.push(`  - After: ${correction.after}`);
      }
      lines.push('');
    }

    // Metadata
    if (Object.keys(entry.metadata).length > 0) {
      lines.push('### Metadata');
      for (const [key, value] of Object.entries(entry.metadata)) {
        lines.push(`- **${key}**: ${JSON.stringify(value)}`);
      }
      lines.push('');
    }

    lines.push('---'); // Entry delimiter
    return lines.join('\n');
  }

  /**
   * Format status with emoji
   */
  private formatStatus(status: ActivityEntry['status']): string {
    const statusMap = {
      success: '✅ Success',
      failure: '❌ Failure',
      pending: '⏳ Pending',
      skipped: '⏭️ Skipped',
    };
    return statusMap[status];
  }

  /**
   * Read log file content
   */
  private async readLogFile(): Promise<string> {
    try {
      return await fs.readFile(this.logPath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return '';
      }
      throw error;
    }
  }

  /**
   * Parse log entries from markdown content
   */
  private parseLogEntries(content: string): ActivityEntry[] {
    if (!content.trim()) {
      return [];
    }

    const entries: ActivityEntry[] = [];
    
    // Split by entry delimiter (---)
    const entryBlocks = content.split(/\n---\n/).filter(block => block.trim());

    for (const block of entryBlocks) {
      // Extract timestamp and task ID from header
      const headerMatch = block.match(/^## \[([^\]]+)\] Task: (.+)$/m);
      if (!headerMatch || !headerMatch[1] || !headerMatch[2]) {
        continue;
      }

      const timestamp = headerMatch[1];
      const taskId = headerMatch[2];

      // Parse entry content
      const entry = this.parseEntryContent(timestamp, taskId, block);
      entries.push(entry);
    }

    return entries;
  }

  /**
   * Parse individual entry content
   */
  private parseEntryContent(timestamp: string, taskId: string, content: string): ActivityEntry {
    // Extract category - match word characters and hyphens
    const categoryMatch = content.match(/\*\*Category\*\*:\s*([\w-]+)/);
    const category = (categoryMatch?.[1] as ActivityEntry['category']) || 'task';

    // Extract status - match the emoji + status word pattern
    const statusMatch = content.match(/\*\*Status\*\*:\s*[^\s]+\s+(\w+)/);
    const statusStr = statusMatch?.[1]?.toLowerCase();
    // Map status words back to status enum values
    const statusMap: Record<string, ActivityEntry['status']> = {
      'success': 'success',
      'failure': 'failure',
      'pending': 'pending',
      'skipped': 'skipped',
    };
    const status = (statusStr && statusMap[statusStr]) || 'pending';

    // Extract description - match until next section (###), delimiter (---), or end
    // Use non-greedy match and trim only trailing newlines (not spaces)
    const descMatch = content.match(/### Description\n([\s\S]*?)(?=\n###|\n\n---|$)/);
    const description = descMatch?.[1]?.replace(/\n+$/, '') || '';

    // Extract validation results
    const validationResults = this.parseValidationResults(content);

    // Extract error context
    const errorContext = this.parseErrorContext(content);

    // Extract corrections
    const corrections = this.parseCorrections(content);

    // Extract metadata
    const metadata = this.parseMetadata(content);

    return {
      timestamp,
      taskId,
      category,
      status,
      details: {
        description,
        validationResults,
        errorContext,
        corrections,
      },
      metadata,
    };
  }

  /**
   * Parse validation results from content
   */
  private parseValidationResults(content: string): ActivityEntry['details']['validationResults'] {
    const resultsSection = content.match(/### Validation Results\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (!resultsSection || !resultsSection[1]) {
      return undefined;
    }

    const results: ActivityEntry['details']['validationResults'] = [];
    const lines = resultsSection[1].split('\n');

    for (const line of lines) {
      const match = line.match(/- ([✅❌]) (.+) \((\d+)% confidence, (\d+)ms\)/);
      if (match && match[1] && match[2] && match[3] && match[4]) {
        results.push({
          passed: match[1] === '✅',
          evidence: match[2],
          confidence: parseInt(match[3]),
          duration: parseInt(match[4]),
          timestamp: new Date().toISOString(), // Approximate
        });
      }
    }

    return results.length > 0 ? results : undefined;
  }

  /**
   * Parse error context from content
   */
  private parseErrorContext(content: string): ActivityEntry['details']['errorContext'] {
    const errorSection = content.match(/### Error Context\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (!errorSection || !errorSection[1]) {
      return undefined;
    }

    const messageMatch = errorSection[1].match(/\*\*Message\*\*:\s*(.+)/);
    const fileMatch = errorSection[1].match(/\*\*File\*\*:\s*([^:]+):(\d+|\?)/);
    const stackMatch = errorSection[1].match(/```\n([\s\S]*?)\n```/);

    return {
      message: messageMatch?.[1] || '',
      file: fileMatch?.[1],
      line: fileMatch && fileMatch[2] && fileMatch[2] !== '?' ? parseInt(fileMatch[2]) : undefined,
      stack: stackMatch?.[1],
    };
  }

  /**
   * Parse corrections from content
   */
  private parseCorrections(content: string): ActivityEntry['details']['corrections'] {
    const correctionsSection = content.match(/### Corrections Applied\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (!correctionsSection || !correctionsSection[1]) {
      return undefined;
    }

    const corrections: NonNullable<ActivityEntry['details']['corrections']> = [];
    const lines = correctionsSection[1].split('\n');

    let currentCorrection: Partial<NonNullable<ActivityEntry['details']['corrections']>[0]> | null = null;

    for (const line of lines) {
      const typeMatch = line.match(/- \*\*([^*]+)\*\*:\s*(.+)/);
      if (typeMatch && typeMatch[1] && typeMatch[2]) {
        if (currentCorrection && currentCorrection.type && currentCorrection.description) {
          corrections.push(currentCorrection as NonNullable<ActivityEntry['details']['corrections']>[0]);
        }
        currentCorrection = {
          type: typeMatch[1] as 'spec-update' | 'code-fix' | 'config-change',
          description: typeMatch[2],
          before: '',
          after: '',
          timestamp: new Date().toISOString(),
        };
      } else if (currentCorrection) {
        const beforeMatch = line.match(/- Before:\s*(.+)/);
        const afterMatch = line.match(/- After:\s*(.+)/);
        if (beforeMatch && beforeMatch[1]) currentCorrection.before = beforeMatch[1];
        if (afterMatch && afterMatch[1]) currentCorrection.after = afterMatch[1];
      }
    }

    if (currentCorrection && currentCorrection.type && currentCorrection.description) {
      corrections.push(currentCorrection as NonNullable<ActivityEntry['details']['corrections']>[0]);
    }

    return corrections.length > 0 ? corrections : undefined;
  }

  /**
   * Parse metadata from content
   */
  private parseMetadata(content: string): Record<string, unknown> {
    const metadataSection = content.match(/### Metadata\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (!metadataSection || !metadataSection[1]) {
      return {};
    }

    const metadata: Record<string, unknown> = {};
    const lines = metadataSection[1].split('\n');

    for (const line of lines) {
      const match = line.match(/- \*\*([^*]+)\*\*:\s*(.+)/);
      if (match && match[1] && match[2]) {
        try {
          metadata[match[1]] = JSON.parse(match[2]);
        } catch {
          metadata[match[1]] = match[2];
        }
      }
    }

    return metadata;
  }

  /**
   * Apply filters to entries
   */
  private applyFilters(entries: ActivityEntry[], filters: LogFilters): ActivityEntry[] {
    let filtered = entries;

    if (filters.taskId) {
      filtered = filtered.filter(e => e.taskId === filters.taskId);
    }

    if (filters.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.status) {
      filtered = filtered.filter(e => e.status === filters.status);
    }

    if (filters.since) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= filters.since!);
    }

    if (filters.until) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= filters.until!);
    }

    if (filters.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered;
  }

  /**
   * Get archive file path for a given date
   */
  private getArchivePath(date: Date): string {
    const dir = path.dirname(this.logPath);
    const basename = path.basename(this.logPath, '.md');
    const dateStr = date.toISOString().split('T')[0];
    return path.join(dir, `${basename}_archive_${dateStr}.md`);
  }
}
