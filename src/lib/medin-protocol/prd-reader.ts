/**
 * PRD Reader
 * 
 * Loads and parses master requirements from PRD.md
 * Implements Requirement 1: Sovereign Memory Integration
 */

import fs from 'fs/promises';
import { watch, type FSWatcher } from 'fs';
import { PRDDocument, Requirement, PRDDiff, PRDNotFoundError, PRDInvalidError } from './types';
import { validatePRDDocument } from './schema-validator';

/**
 * PRD Reader interface
 */
export interface PRDReader {
  loadPRD(): Promise<PRDDocument>;
  getRequirementsForTask(taskId: string): Requirement[];
  watchPRD(callback: (changes: PRDDiff) => void): void;
  reloadPRD(): Promise<PRDDocument>;
  stopWatching(): void;
  enableFreezeMode(): void;
  disableFreezeMode(): void;
  isFrozen(): boolean;
}

/**
 * PRD Reader implementation
 */
export class PRDReaderImpl implements PRDReader {
  private prdPath: string;
  private cachedPRD: PRDDocument | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds
  private watcher: FSWatcher | null = null;
  private watchCallback: ((changes: PRDDiff) => void) | null = null;
  private freezeMode: boolean = false; // Requirement 12.5: PRD freeze mode

  constructor(prdPath: string = 'docs/PRD.md') {
    this.prdPath = prdPath;
  }

  /**
   * Load PRD.md and extract requirements
   * @throws PRDNotFoundError if PRD.md doesn't exist
   * @throws PRDInvalidError if PRD.md is malformed
   */
  async loadPRD(): Promise<PRDDocument> {
    // Check cache
    const now = Date.now();
    if (this.cachedPRD && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedPRD;
    }

    // Read file
    let content: string;
    try {
      content = await fs.readFile(this.prdPath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new PRDNotFoundError(this.prdPath);
      }
      throw error;
    }

    // Parse PRD
    const prd = this.parsePRD(content);

    // Validate against schema
    try {
      validatePRDDocument(prd);
    } catch (error) {
      throw new PRDInvalidError(`Schema validation failed: ${error}`);
    }

    // Cache result
    this.cachedPRD = prd;
    this.cacheTimestamp = now;

    return prd;
  }

  /**
   * Extract requirements relevant to a specific task
   * @param taskId - Task identifier
   * @returns Filtered requirements
   */
  getRequirementsForTask(taskId: string): Requirement[] {
    if (!this.cachedPRD) {
      throw new PRDInvalidError('PRD not loaded. Call loadPRD() first.');
    }

    // Extract task context keywords from task ID
    const taskKeywords = this.extractKeywords(taskId);

    // If no keywords, return all requirements
    if (taskKeywords.length === 0) {
      return this.cachedPRD.requirements;
    }

    // Filter requirements by relevance
    const relevantRequirements = this.cachedPRD.requirements.filter((req) => {
      const reqKeywords = this.extractKeywords(
        `${req.id} ${req.title} ${req.description}`
      );

      // Check for keyword overlap
      return taskKeywords.some((keyword) => reqKeywords.includes(keyword));
    });

    // If no matches found, return all requirements (better to have too much context than too little)
    return relevantRequirements.length > 0 ? relevantRequirements : this.cachedPRD.requirements;
  }

  /**
   * Monitor PRD.md for changes
   * @param callback - Function to call when PRD changes
   */
  watchPRD(callback: (changes: PRDDiff) => void): void {
    if (this.watcher) {
      this.stopWatching();
    }

    this.watchCallback = callback;

    this.watcher = watch(this.prdPath, async (eventType) => {
      if (eventType === 'change') {
        await this.handlePRDChange();
      }
    });
  }

  /**
   * Reload PRD.md from disk
   */
  async reloadPRD(): Promise<PRDDocument> {
    // Clear cache to force reload
    this.cachedPRD = null;
    this.cacheTimestamp = 0;

    return this.loadPRD();
  }

  /**
   * Stop watching PRD.md
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.watchCallback = null;
    }
  }

  /**
   * Parse PRD markdown content
   */
  private parsePRD(content: string): PRDDocument {
    const lines = content.split('\n');
    const requirements: Requirement[] = [];

    // Extract version from frontmatter or first heading
    const version = this.extractVersion(content);
    const lastUpdated = new Date();

    // Parse requirements sections
    let currentRequirement: Partial<Requirement> | null = null;
    let inAcceptanceCriteria = false;
    let acceptanceCriteria: string[] = [];

    for (const line of lines) {
      // Detect requirement heading (e.g., "### Requirement 1: Title")
      const reqMatch = line.match(/^###\s+Requirement\s+(\d+(?:\.\d+)?):?\s*(.+)/i);
      if (reqMatch && reqMatch[2]) {
        // Save previous requirement
        if (currentRequirement && currentRequirement.id) {
          // Trim description
          if (currentRequirement.description) {
            currentRequirement.description = currentRequirement.description.trim();
            if (!currentRequirement.description) {
              currentRequirement.description = 'No description provided';
            }
          }
          // Only add if we have at least one acceptance criterion
          if (acceptanceCriteria.length > 0) {
            requirements.push({
              ...currentRequirement,
              acceptanceCriteria,
            } as Requirement);
          }
        }

        // Start new requirement - validate title is not just whitespace
        const title = reqMatch[2].trim();
        if (title.length === 0) {
          currentRequirement = null;
          acceptanceCriteria = [];
          inAcceptanceCriteria = false;
          continue;
        }

        currentRequirement = {
          id: `REQ-${reqMatch[1]}`,
          title,
          description: 'No description provided',
          priority: 'medium',
        };
        acceptanceCriteria = [];
        inAcceptanceCriteria = false;
        continue;
      }

      // Skip if no current requirement
      if (!currentRequirement) {
        continue;
      }

      // Detect acceptance criteria section
      if (line.match(/^####\s+Acceptance\s+Criteria/i)) {
        inAcceptanceCriteria = true;
        continue;
      }

      // Detect priority
      const priorityMatch = line.match(/\*\*Priority\*\*:\s*(critical|high|medium|low)/i);
      if (priorityMatch && priorityMatch[1] && currentRequirement) {
        currentRequirement.priority = priorityMatch[1].toLowerCase() as Requirement['priority'];
        continue;
      }

      // Collect acceptance criteria
      if (inAcceptanceCriteria && line.match(/^\d+\.\s+/)) {
        const criterion = line.replace(/^\d+\.\s+/, '').trim();
        if (criterion) {
          acceptanceCriteria.push(criterion);
        }
        continue;
      }

      // Collect description
      if (currentRequirement && !inAcceptanceCriteria && line.trim() && !line.startsWith('#')) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('**')) {
          currentRequirement.description = (currentRequirement.description === 'No description provided' ? '' : currentRequirement.description) + trimmedLine + ' ';
        }
      }
    }

    // Save last requirement
    if (currentRequirement && currentRequirement.id) {
      // Trim description
      if (currentRequirement.description) {
        currentRequirement.description = currentRequirement.description.trim();
        if (!currentRequirement.description) {
          currentRequirement.description = 'No description provided';
        }
      }
      // Only add if we have at least one acceptance criterion
      if (acceptanceCriteria.length > 0) {
        requirements.push({
          ...currentRequirement,
          acceptanceCriteria,
        } as Requirement);
      }
    }

    // Validate that we have at least one requirement
    if (requirements.length === 0) {
      throw new PRDInvalidError('No valid requirements found in PRD');
    }

    return {
      version,
      lastUpdated: lastUpdated.toISOString(),
      requirements,
      metadata: {},
    };
  }

  /**
   * Extract version from PRD content
   */
  private extractVersion(content: string): string {
    // Try to find version in frontmatter
    const frontmatterMatch = content.match(/^---\s*\nversion:\s*['"]?([0-9.]+)['"]?\s*\n/m);
    if (frontmatterMatch && frontmatterMatch[1]) {
      return frontmatterMatch[1];
    }

    // Try to find version in heading
    const headingMatch = content.match(/version\s+([0-9.]+)/i);
    if (headingMatch && headingMatch[1]) {
      return headingMatch[1];
    }

    // Default version
    return '1.0.0';
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Convert to lowercase and split by non-alphanumeric characters
    const words = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2); // Filter out short words

    // Remove common stop words
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'that',
      'this',
      'from',
      'have',
      'has',
      'will',
      'shall',
      'must',
      'should',
      'can',
      'may',
    ]);

    return words.filter((word) => !stopWords.has(word));
  }

  /**
   * Handle PRD file change
   */
  private async handlePRDChange(): Promise<void> {
    if (!this.watchCallback) {
      return;
    }

    // Requirement 12.5: Ignore changes when frozen
    if (this.freezeMode) {
      console.log('[PRD Reader] PRD change detected but ignored (freeze mode active)');
      return;
    }

    const oldPRD = this.cachedPRD;
    const newPRD = await this.reloadPRD();

    if (!oldPRD) {
      return;
    }

    // Calculate diff
    const diff = this.calculateDiff(oldPRD, newPRD);

    // Notify callback
    this.watchCallback(diff);
  }

  /**
   * Enable freeze mode - ignore PRD changes
   * Requirement 12.5: PRD freeze mode
   */
  enableFreezeMode(): void {
    const wasEnabled = this.freezeMode;
    this.freezeMode = true;
    
    if (!wasEnabled) {
      console.log('[PRD Reader] Freeze mode ENABLED - PRD changes will be ignored');
    }
  }

  /**
   * Disable freeze mode - resume monitoring PRD changes
   * Requirement 12.5: PRD freeze mode
   */
  disableFreezeMode(): void {
    const wasEnabled = this.freezeMode;
    this.freezeMode = false;
    
    if (wasEnabled) {
      console.log('[PRD Reader] Freeze mode DISABLED - PRD changes will be monitored');
    }
  }

  /**
   * Check if freeze mode is active
   * Requirement 12.5: PRD freeze mode
   */
  isFrozen(): boolean {
    return this.freezeMode;
  }

  /**
   * Calculate diff between two PRD documents
   */
  private calculateDiff(oldPRD: PRDDocument, newPRD: PRDDocument): PRDDiff {
    const oldReqMap = new Map(oldPRD.requirements.map((r) => [r.id, r]));
    const newReqMap = new Map(newPRD.requirements.map((r) => [r.id, r]));

    const added: Requirement[] = [];
    const removed: Requirement[] = [];
    const modified: Requirement[] = [];

    // Find added and modified
    for (const [id, newReq] of newReqMap) {
      const oldReq = oldReqMap.get(id);
      if (!oldReq) {
        added.push(newReq);
      } else if (JSON.stringify(oldReq) !== JSON.stringify(newReq)) {
        modified.push(newReq);
      }
    }

    // Find removed
    for (const [id, oldReq] of oldReqMap) {
      if (!newReqMap.has(id)) {
        removed.push(oldReq);
      }
    }

    return {
      added,
      removed,
      modified,
      timestamp: new Date(),
    };
  }
}

/**
 * Create a new PRD Reader instance
 */
export function createPRDReader(prdPath?: string): PRDReader {
  return new PRDReaderImpl(prdPath);
}
