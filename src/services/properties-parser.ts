/**
 * Properties Parser
 * Parses design.md markdown to extract correctness properties
 */

import type { Property } from '@/types/spec';
import { SpecParseError } from './spec-parser';

/**
 * Regex patterns for parsing properties
 */
const PROPERTY_HEADER_PATTERN = /^\*\*Property\s+(\d+):\s*(.+)\*\*$/i;
const PROPERTY_STATEMENT_PATTERN = /^\*For any\*\s+(.+)$/i;
const VALIDATES_PATTERN = /^\*\*Validates:\s*Requirements?\s+([\d.,\s]+)\*\*$/i;

/**
 * Parses design.md content to extract Property objects
 * @param content - Raw markdown content
 * @returns Array of properties
 * @throws SpecParseError if parsing fails
 */
export function parseProperties(content: string): Property[] {
  const lines = content.split('\n');
  const properties: Property[] = [];

  let currentProperty: Partial<Property> | null = null;
  let collectingStatement = false;
  let statementLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) {
      // Empty line might end statement collection
      if (collectingStatement && statementLines.length > 0) {
        if (currentProperty) {
          currentProperty.statement = statementLines.join(' ').trim();
        }
        collectingStatement = false;
        statementLines = [];
      }
      continue;
    }

    // Remove trailing whitespace (including \r) but preserve content
    const line = rawLine.trimEnd();
    if (!line) {
      // Empty line after trimming
      if (collectingStatement && statementLines.length > 0) {
        if (currentProperty) {
          currentProperty.statement = statementLines.join(' ').trim();
        }
        collectingStatement = false;
        statementLines = [];
      }
      continue;
    }

    const lineNumber = i + 1;

    // Check for property header
    const propMatch = line.match(PROPERTY_HEADER_PATTERN);
    if (propMatch) {
      // Save previous property if exists
      if (currentProperty && currentProperty.number !== undefined) {
        properties.push(finalizeProperty(currentProperty, lineNumber));
      }

      // Start new property
      const numStr = propMatch[1];
      const title = propMatch[2];

      if (!numStr || !title) continue;

      const number = parseInt(numStr, 10);
      if (isNaN(number)) {
        throw new SpecParseError(`Invalid property number: ${numStr}`, 'design.md', lineNumber);
      }

      currentProperty = {
        number,
        title,
        statement: '',
        requirementRefs: [],
      };
      collectingStatement = false;
      statementLines = [];
      continue;
    }

    if (!currentProperty) {
      continue;
    }

    // Check for property statement start
    const statementMatch = line.match(PROPERTY_STATEMENT_PATTERN);
    if (statementMatch) {
      collectingStatement = true;
      const statement = statementMatch[1];
      if (statement) {
        statementLines.push(statement);
      }
      continue;
    }

    // Continue collecting statement lines
    if (collectingStatement && !line.startsWith('**')) {
      statementLines.push(line.trim());
      continue;
    }

    // Check for validates annotation
    const validatesMatch = line.match(VALIDATES_PATTERN);
    if (validatesMatch) {
      // Finalize statement if collecting
      if (collectingStatement && statementLines.length > 0) {
        currentProperty.statement = statementLines.join(' ').trim();
        collectingStatement = false;
        statementLines = [];
      }

      const refsString = validatesMatch[1];
      if (refsString) {
        currentProperty.requirementRefs = refsString
          .split(',')
          .map((ref) => ref.trim())
          .filter((ref) => ref.length > 0);
      }
      continue;
    }
  }

  // Save last property
  if (currentProperty && currentProperty.number !== undefined) {
    // Finalize statement if still collecting
    if (collectingStatement && statementLines.length > 0) {
      currentProperty.statement = statementLines.join(' ').trim();
    }
    properties.push(finalizeProperty(currentProperty, lines.length));
  }

  return properties;
}

/**
 * Finalizes a property object and validates it
 * @param prop - Partial property
 * @param lineNumber - Line number for error reporting
 * @returns Complete property
 * @throws SpecParseError if property is invalid
 */
function finalizeProperty(prop: Partial<Property>, lineNumber: number): Property {
  if (prop.number === undefined) {
    throw new SpecParseError('Property missing number', 'design.md', lineNumber);
  }

  if (!prop.title) {
    throw new SpecParseError(`Property ${prop.number} missing title`, 'design.md', lineNumber);
  }

  if (!prop.statement) {
    throw new SpecParseError(
      `Property ${prop.number} missing statement`,
      'design.md',
      lineNumber,
      `Property ${prop.number} must have a "For any" statement`
    );
  }

  if (!prop.requirementRefs || prop.requirementRefs.length === 0) {
    throw new SpecParseError(
      `Property ${prop.number} missing requirement references`,
      'design.md',
      lineNumber,
      `Property ${prop.number} must validate at least one requirement`
    );
  }

  return {
    number: prop.number,
    title: prop.title,
    statement: prop.statement,
    requirementRefs: prop.requirementRefs,
  };
}

/**
 * Validates that all property numbers are unique
 * @param properties - Array of properties
 * @throws SpecParseError if duplicate numbers found
 */
export function validatePropertyNumbers(properties: Property[]): void {
  const numbers = new Set<number>();

  for (const prop of properties) {
    if (numbers.has(prop.number)) {
      throw new SpecParseError(
        `Duplicate property number: ${prop.number}`,
        'design.md',
        null,
        `Property ${prop.number} appears multiple times`
      );
    }
    numbers.add(prop.number);
  }
}
