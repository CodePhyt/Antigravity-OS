/**
 * Medin Protocol Type Definitions
 * 
 * Core types for Ralph-Loop 2.0 components
 */

// ============================================================================
// PRD Reader Types
// ============================================================================

export interface PRDDocument {
  version: string;
  lastUpdated: string; // ISO 8601 timestamp
  requirements: Requirement[];
  metadata: Record<string, unknown>;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface PRDDiff {
  added: Requirement[];
  removed: Requirement[];
  modified: Requirement[];
  timestamp: Date;
}

// ============================================================================
// Activity Log Types
// ============================================================================

export interface ActivityEntry {
  timestamp: string; // ISO 8601
  taskId: string;
  category: 'task' | 'error' | 'validation' | 'self-healing';
  status: 'success' | 'failure' | 'pending' | 'skipped';
  details: {
    description: string;
    validationResults?: ValidationResult[];
    errorContext?: ErrorContext;
    corrections?: Correction[];
  };
  metadata: Record<string, unknown>;
}

export interface LogFilters {
  taskId?: string;
  category?: ActivityEntry['category'];
  status?: ActivityEntry['status'];
  since?: Date;
  until?: Date;
  limit?: number;
}

export interface ErrorContext {
  message: string;
  stack?: string;
  code?: string;
  file?: string;
  line?: number;
}

export interface Correction {
  type: 'spec-update' | 'code-fix' | 'config-change';
  description: string;
  before: string;
  after: string;
  timestamp: string;
}

// ============================================================================
// Validator Types
// ============================================================================

export interface ValidationResult {
  passed: boolean;
  evidence: string;
  confidence: number; // 0-100
  duration: number; // milliseconds
  timestamp: string; // ISO 8601
  error?: string;
}

export type ValidationType = 'docker' | 'network' | 'api' | 'file' | 'custom';

export interface ValidationCheck {
  type: ValidationType;
  config: Record<string, unknown>;
}

// ============================================================================
// Constitutional Pre-Check Types
// ============================================================================

export interface SafetyAnalysis {
  safe: boolean;
  violations: SafetyViolation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: 'allow' | 'warn' | 'block';
  alternative?: string;
}

export interface SafetyViolation {
  type: 'file_deletion' | 'db_modification' | 'credential_exposure' | 'network_exposure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  pattern: string; // Regex pattern that matched
}

// ============================================================================
// Isolation Context Types
// ============================================================================

export interface IsolationConfig {
  maxCPU: number; // Percentage (0-100)
  maxMemory: number; // Bytes
  maxTime: number; // Milliseconds
  allowedPaths: string[]; // File system access
  allowedNetworks: string[]; // Network access
}

export interface ExecutionResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  stdout: string;
  stderr: string;
  exitCode: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    time: number;
  };
}

export type ContextHandle = string; // Unique identifier

// ============================================================================
// MCP Tool Wrapper Types
// ============================================================================

export interface ExecutionPlan {
  toolName: string;
  args: Record<string, unknown>;
  steps: string[];
  expectedOutcome: string;
  validationChecks: ValidationCheck[];
  rollbackStrategy: string;
}

export interface MCPToolResult {
  success: boolean;
  output: unknown;
  plan: ExecutionPlan;
  verification: ValidationResult;
}

// ============================================================================
// CLI Types
// ============================================================================
// Note: StatusOptions is defined in cli-status.ts to avoid duplication

// ============================================================================
// Error Types
// ============================================================================

export class PRDNotFoundError extends Error {
  constructor(path: string) {
    super(`PRD not found at path: ${path}`);
    this.name = 'PRDNotFoundError';
  }
}

export class PRDInvalidError extends Error {
  constructor(message: string) {
    super(`Invalid PRD: ${message}`);
    this.name = 'PRDInvalidError';
  }
}

export class ValidationTimeoutError extends Error {
  constructor(duration: number) {
    super(`Validation timeout after ${duration}ms`);
    this.name = 'ValidationTimeoutError';
  }
}

export class UnsafeCommandError extends Error {
  constructor(command: string, violations: SafetyViolation[]) {
    super(`Unsafe command blocked: ${command}\nViolations: ${violations.map(v => v.description).join(', ')}`);
    this.name = 'UnsafeCommandError';
  }
}
