/**
 * Requirements Parser
 * Parses requirements.md markdown into structured Requirement objects
 */

import type { Requirement } from '@/types/spec';
import { SpecParseError } from './spec-parser';

/**
 * Regex patterns for parsing requirements
 */
const REQUIREMENT_HEADER_PATTERN = /^###\s+Requirement\s+(\d+(?:\.\d+)?)/i;
const USER_STORY_PATTERN = /^\*\*User Story:\*\*\s+(.+)$/i;
const ACCEPTANCE_CRITERIA_HEADER = /^####\s+Acceptance Criteria/i;
const CRITERIA_PATTERN = /^\d+\.\s+(.+)$/;

/**
 * Parses requirements.md content into Requirement objects
 * @param content - Raw markdown content
 * @returns Array of requirements
 * @throws SpecParseError if parsing fails
 */
export function parseRequirements(content: string): Requirement[] {
  const lines = content.split('\n');
  const requirements: Requirement[] = [];

  let currentRequirement: Partial<Requirement> | null = null;
  let inAcceptanceCriteria = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      // Empty line - don't finalize yet, just reset acceptance criteria flag if needed
      if (
        inAcceptanceCriteria &&
        currentRequirement &&
        currentRequirement.acceptanceCriteria &&
        currentRequirement.acceptanceCriteria.length > 0
      ) {
        // We've collected some criteria, next empty line might signal end
        // But don't finalize yet - wait for next requirement header
      }
      continue;
    }

    const lineNumber = i + 1;

    // Check for requirement header
    const reqMatch = line.match(REQUIREMENT_HEADER_PATTERN);
    if (reqMatch) {
      // Save previous requirement if exists
      if (currentRequirement && currentRequirement.id) {
        requirements.push(finalizeRequirement(currentRequirement, lineNumber));
      }

      // Start new requirement
      const id = reqMatch[1];
      if (!id) continue;

      currentRequirement = {
        id,
        userStory: '',
        acceptanceCriteria: [],
      };
      inAcceptanceCriteria = false;
      continue;
    }

    if (!currentRequirement) {
      continue;
    }

    // Check for user story
    const userStoryMatch = line.match(USER_STORY_PATTERN);
    if (userStoryMatch) {
      const story = userStoryMatch[1];
      if (story) {
        currentRequirement.userStory = story;
      }
      continue;
    }

    // Check for acceptance criteria header
    if (line.match(ACCEPTANCE_CRITERIA_HEADER)) {
      inAcceptanceCriteria = true;
      continue;
    }

    // Parse acceptance criteria
    if (inAcceptanceCriteria) {
      const criteriaMatch = line.match(CRITERIA_PATTERN);
      if (criteriaMatch) {
        const criterion = criteriaMatch[1];
        if (criterion && currentRequirement.acceptanceCriteria) {
          currentRequirement.acceptanceCriteria.push(criterion);
        }
      }
    }
  }

  // Save last requirement
  if (currentRequirement && currentRequirement.id) {
    requirements.push(finalizeRequirement(currentRequirement, lines.length));
  }

  return requirements;
}

/**
 * Finalizes a requirement object and validates it
 * @param req - Partial requirement
 * @param lineNumber - Line number for error reporting
 * @returns Complete requirement
 * @throws SpecParseError if requirement is invalid
 */
function finalizeRequirement(req: Partial<Requirement>, lineNumber: number): Requirement {
  if (!req.id) {
    throw new SpecParseError('Requirement missing ID', 'requirements.md', lineNumber);
  }

  // Allow empty user story for now - some requirements might not have it yet
  const userStory = req.userStory || '';

  // Allow empty acceptance criteria for now
  const acceptanceCriteria = req.acceptanceCriteria || [];

  return {
    id: req.id,
    userStory,
    acceptanceCriteria,
  };
}

/**
 * Validates that all requirement IDs are unique
 * @param requirements - Array of requirements
 * @throws SpecParseError if duplicate IDs found
 */
export function validateRequirementIds(requirements: Requirement[]): void {
  const ids = new Set<string>();

  for (const req of requirements) {
    if (ids.has(req.id)) {
      throw new SpecParseError(
        `Duplicate requirement ID: ${req.id}`,
        'requirements.md',
        null,
        `Requirement ID ${req.id} appears multiple times`
      );
    }
    ids.add(req.id);
  }
}
