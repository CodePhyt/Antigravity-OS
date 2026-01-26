/**
 * Schema Validator
 * 
 * Validates data structures against JSON schemas
 * Implements Rule 2: Schema-First Data Structures
 */

import Ajv, { type ValidateFunction } from 'ajv';
import prdSchema from '../../../docs/schemas/prd-schema.json';
import activityLogSchema from '../../../docs/schemas/activity-log-schema.json';
import validationResultSchema from '../../../docs/schemas/validation-result-schema.json';

// Initialize AJV with formats support
const ajv = new Ajv({ allErrors: true });

// Add date-time format manually
ajv.addFormat('date-time', {
  validate: (dateTimeString: string) => {
    return !isNaN(Date.parse(dateTimeString));
  },
});

// Compile schemas
const validatePRD = ajv.compile(prdSchema);
const validateActivityLog = ajv.compile(activityLogSchema);
const validateValidationResult = ajv.compile(validationResultSchema);

/**
 * Validation error with detailed information
 */
export class SchemaValidationError extends Error {
  constructor(
    public schemaName: string,
    public errors: unknown[],
    public data: unknown
  ) {
    super(`Schema validation failed for ${schemaName}: ${JSON.stringify(errors, null, 2)}`);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Validate data against a compiled schema
 */
function validate(
  validator: ValidateFunction,
  data: unknown,
  schemaName: string
): void {
  const valid = validator(data);
  if (!valid) {
    throw new SchemaValidationError(schemaName, validator.errors || [], data);
  }
}

/**
 * Validate PRD document structure
 */
export function validatePRDDocument(data: unknown): void {
  validate(validatePRD, data, 'PRD Document');
}

/**
 * Validate activity log entry structure
 */
export function validateActivityLogEntry(data: unknown): void {
  validate(validateActivityLog, data, 'Activity Log Entry');
}

/**
 * Validate validation result structure
 */
export function validateValidationResultStructure(data: unknown): void {
  validate(validateValidationResult, data, 'Validation Result');
}

/**
 * Get human-readable error messages from validation errors
 */
export function formatValidationErrors(errors: unknown[]): string {
  if (!Array.isArray(errors)) {
    return 'Unknown validation error';
  }

  return errors
    .map((err: any) => {
      const path = err.instancePath || 'root';
      const message = err.message || 'validation failed';
      return `${path}: ${message}`;
    })
    .join('\n');
}
