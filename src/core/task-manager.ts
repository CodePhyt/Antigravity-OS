/**
 * Task Manager Core Component
 * Manages task state, execution status, and persistence
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 3.1, 3.3, 3.6, 9.1, 9.2, 9.3, 9.5
 */

import type { Task, ParsedSpec, TaskStatus, ErrorContext } from '@/types/spec';
import { atomicWrite, fileExists, safeRead, updateTaskStatus } from '@/infrastructure/file-system';
import { DefaultSpecParser } from '@/services/spec-parser';

/**
 * Dependency graph node representing task dependencies
 */
export interface DependencyNode {
  /** Task ID */
  taskId: string;

  /** IDs of tasks that must be completed before this task */
  prerequisites: string[];

  /** IDs of tasks that depend on this task */
  dependents: string[];
}

/**
 * Orchestrator state persisted to disk for crash recovery
 */
export interface OrchestratorState {
  /** Feature name (spec directory name) */
  currentSpec: string | null;

  /** Current task ID being executed */
  currentTask: string | null;

  /** When execution started */
  executionStartTime: Date | null;

  /** Ralph-Loop attempt count per task ID */
  ralphLoopAttempts: Record<string, number>;

  /** IDs of completed tasks */
  completedTasks: string[];

  /** IDs of skipped optional tasks */
  skippedTasks: string[];
}

/**
 * Current execution status
 */
export interface ExecutionStatus {
  /** Current task being executed */
  currentTask: Task | null;

  /** Number of completed tasks */
  completedCount: number;

  /** Total number of tasks */
  totalCount: number;

  /** Whether execution is running */
  isRunning: boolean;

  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Result of loading a spec
 */
export interface LoadSpecResult {
  /** Whether loading was successful */
  success: boolean;

  /** Error message if loading failed */
  error?: string;

  /** Loaded spec if successful */
  spec?: ParsedSpec;
}

/**
 * Status transition event
 */
export interface StatusTransitionEvent {
  /** Task ID */
  taskId: string;

  /** Previous status */
  previousStatus: TaskStatus;

  /** New status */
  newStatus: TaskStatus;

  /** Timestamp of transition */
  timestamp: Date;
}

/**
 * Event listener for status transitions
 */
export type StatusTransitionListener = (event: StatusTransitionEvent) => void | Promise<void>;

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  not_started: ['queued'],
  queued: ['in_progress'],
  in_progress: ['completed', 'not_started'], // not_started for Ralph-Loop reset
  completed: [], // No transitions from completed
};

/**
 * Task Manager manages task state and execution flow
 *
 * Responsibilities:
 * - Load and parse spec files
 * - Initialize task states
 * - Track current task and execution status
 * - Persist state to disk for crash recovery
 * - Load state on startup
 * - Manage task status transitions with validation
 * - Emit events on status changes
 * - Build and maintain dependency graph
 * - Enforce prerequisite completion
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 9.1, 9.5**
 */
export class TaskManager {
  private spec: ParsedSpec | null = null;
  private state: OrchestratorState;
  private statePath: string;
  private specParser: DefaultSpecParser;
  private specPath: string | null = null;
  private statusListeners: StatusTransitionListener[] = [];
  private dependencyGraph: Map<string, DependencyNode> = new Map();

  /**
   * Creates a new TaskManager instance
   *
   * @param statePath - Path to state file (default: .kiro/state/orchestrator-state.json)
   */
  constructor(statePath: string = '.kiro/state/orchestrator-state.json') {
    this.statePath = statePath;
    this.specParser = new DefaultSpecParser();

    // Initialize empty state
    this.state = {
      currentSpec: null,
      currentTask: null,
      executionStartTime: null,
      ralphLoopAttempts: {},
      completedTasks: [],
      skippedTasks: [],
    };
  }

  /**
   * Loads a spec from the specified path and initializes task states
   *
   * Algorithm:
   * 1. Parse spec files using SpecParser
   * 2. Initialize all tasks as not_started (Requirement 2.1)
   * 3. Validate requirement and property references (Requirements 9.2, 9.3)
   * 4. Build dependency graph from document order (Requirement 9.1)
   * 5. Persist initial state to disk (Requirement 2.7)
   *
   * @param specPath - Path to spec directory (e.g., ".kiro/specs/feature-name")
   * @returns LoadSpecResult indicating success or failure
   *
   * **Validates: Requirements 2.1, 2.7, 9.1, 9.2, 9.3**
   */
  async loadSpec(specPath: string): Promise<LoadSpecResult> {
    try {
      // Parse spec files
      const spec = await this.specParser.parseSpec(specPath);

      // Validate requirement references (Requirement 9.2)
      const validationError = this.validateReferences(spec);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      // Build dependency graph from document order (Requirement 9.1)
      this.buildDependencyGraph(spec.tasks);

      // Store spec and path
      this.spec = spec;
      this.specPath = specPath;

      // Initialize state
      this.state = {
        currentSpec: spec.featureName,
        currentTask: null,
        executionStartTime: null,
        ralphLoopAttempts: {},
        completedTasks: [],
        skippedTasks: [],
      };

      // Persist initial state (Requirement 2.7)
      await this.persistState();

      return {
        success: true,
        spec,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to load spec: ${errorMessage}`,
      };
    }
  }

  /**
   * Validates that all task references to requirements and properties exist
   *
   * @param spec - Parsed spec to validate
   * @returns Error message if validation fails, null if valid
   *
   * **Validates: Requirements 9.2, 9.3**
   */
  private validateReferences(spec: ParsedSpec): string | null {
    const requirementIds = new Set(spec.requirements.map((r) => r.id));
    const propertyNumbers = new Set(spec.properties.map((p) => p.number.toString()));

    // Validate all tasks
    const allTasks = this.flattenTasks(spec.tasks);

    for (const task of allTasks) {
      // Validate requirement references (Requirement 9.2)
      for (const reqRef of task.requirementRefs) {
        if (!requirementIds.has(reqRef)) {
          return `Task ${task.id} references non-existent requirement: ${reqRef}`;
        }
      }

      // Validate property references (Requirement 9.3)
      for (const propRef of task.propertyRefs) {
        // Extract property number from reference like "Property 5"
        const match = propRef.match(/Property\s+(\d+)/i);
        if (match && match[1]) {
          const propNum = match[1];
          if (!propertyNumbers.has(propNum)) {
            return `Task ${task.id} references non-existent property: ${propRef}`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Builds a dependency graph from task document order.
   *
   * Algorithm:
   * 1. Flatten task tree to get all tasks in document order
   * 2. For each task, identify prerequisites based on:
   *    - Parent-child relationships (children must complete before parent)
   *    - Document order (earlier tasks are implicit prerequisites)
   * 3. Build bidirectional dependency graph (prerequisites and dependents)
   *
   * Document order creates implicit dependencies: tasks appearing earlier
   * in the document are prerequisites for tasks appearing later.
   *
   * @param tasks - Root task list from spec
   *
   * **Validates: Requirement 9.1**
   */
  private buildDependencyGraph(tasks: Task[]): void {
    this.dependencyGraph.clear();

    // Get all tasks in document order (depth-first traversal)
    const allTasks = this.flattenTasks(tasks);

    // Initialize nodes for all tasks
    for (const task of allTasks) {
      this.dependencyGraph.set(task.id, {
        taskId: task.id,
        prerequisites: [],
        dependents: [],
      });
    }

    // Build dependencies based on document order and parent-child relationships
    for (let i = 0; i < allTasks.length; i++) {
      const task = allTasks[i];
      if (!task) continue;

      const node = this.dependencyGraph.get(task.id)!;

      // Add parent-child dependencies
      if (task.parentId) {
        // Child depends on all previous siblings being completed
        const parent = allTasks.find((t) => t.id === task.parentId);
        if (parent) {
          const siblings = parent.children;
          const taskIndex = siblings.findIndex((s) => s.id === task.id);

          // Add previous non-optional siblings as prerequisites
          for (let j = 0; j < taskIndex; j++) {
            const sibling = siblings[j];
            if (sibling && !sibling.isOptional) {
              node.prerequisites.push(sibling.id);

              // Add bidirectional link
              const siblingNode = this.dependencyGraph.get(sibling.id);
              if (siblingNode) {
                siblingNode.dependents.push(task.id);
              }
            }
          }
        }
      }

      // Add document order dependencies (implicit prerequisites)
      // Tasks appearing earlier in document order are prerequisites
      // Only add direct predecessor to avoid redundant dependencies
      if (i > 0) {
        const previousTask = allTasks[i - 1];

        // Only add as prerequisite if:
        // 1. Previous task is not optional
        // 2. Previous task is not a parent of current task (already handled)
        // 3. Previous task is not a sibling (already handled above)
        if (
          previousTask &&
          !previousTask.isOptional &&
          previousTask.id !== task.parentId &&
          previousTask.parentId !== task.parentId
        ) {
          // Check if this is a parent-child relationship
          const isParentChild =
            task.parentId === previousTask.id || previousTask.parentId === task.id;

          if (!isParentChild && !node.prerequisites.includes(previousTask.id)) {
            node.prerequisites.push(previousTask.id);

            // Add bidirectional link
            const prevNode = this.dependencyGraph.get(previousTask.id);
            if (prevNode && !prevNode.dependents.includes(task.id)) {
              prevNode.dependents.push(task.id);
            }
          }
        }
      }
    }
  }

  /**
   * Gets the dependency graph node for a task.
   *
   * @param taskId - Task ID
   * @returns Dependency node or null if not found
   */
  getDependencyNode(taskId: string): DependencyNode | null {
    return this.dependencyGraph.get(taskId) || null;
  }

  /**
   * Gets all prerequisite task IDs for a given task.
   *
   * @param taskId - Task ID
   * @returns Array of prerequisite task IDs
   *
   * **Validates: Requirement 9.1**
   */
  getPrerequisites(taskId: string): string[] {
    const node = this.dependencyGraph.get(taskId);
    return node ? [...node.prerequisites] : [];
  }

  /**
   * Gets all dependent task IDs for a given task.
   *
   * @param taskId - Task ID
   * @returns Array of dependent task IDs
   */
  getDependents(taskId: string): string[] {
    const node = this.dependencyGraph.get(taskId);
    return node ? [...node.dependents] : [];
  }

  /**
   * Checks if all prerequisites for a task are completed.
   *
   * Algorithm:
   * 1. Get all prerequisite task IDs from dependency graph
   * 2. Check if each prerequisite is in completed status
   * 3. Return true only if all prerequisites are completed
   *
   * @param taskId - Task ID to check
   * @returns true if all prerequisites are completed, false otherwise
   *
   * **Validates: Requirement 9.5**
   */
  arePrerequisitesCompleted(taskId: string): boolean {
    const prerequisites = this.getPrerequisites(taskId);

    // If no prerequisites, task is ready
    if (prerequisites.length === 0) {
      return true;
    }

    // Check if all prerequisites are completed
    for (const prereqId of prerequisites) {
      const prereqStatus = this.getTaskStatus(prereqId);
      if (prereqStatus !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates that a task can be started based on prerequisite completion.
   *
   * This enforces Requirement 9.5: tasks cannot execute until all
   * prerequisites are completed.
   *
   * @param taskId - Task ID to validate
   * @returns true if task can be started, false if prerequisites not met
   * @throws Error with details about incomplete prerequisites
   *
   * **Validates: Requirement 9.5**
   */
  validatePrerequisites(taskId: string): boolean {
    if (!this.arePrerequisitesCompleted(taskId)) {
      const prerequisites = this.getPrerequisites(taskId);
      const incomplete = prerequisites.filter(
        (prereqId) => this.getTaskStatus(prereqId) !== 'completed'
      );

      throw new Error(
        `Cannot start task ${taskId}: incomplete prerequisites: ${incomplete.join(', ')}`
      );
    }

    return true;
  }

  /**
   * Flattens a task tree into a flat array
   *
   * @param tasks - Task tree
   * @returns Flat array of all tasks
   */
  private flattenTasks(tasks: Task[]): Task[] {
    const result: Task[] = [];

    for (const task of tasks) {
      result.push(task);
      if (task.children.length > 0) {
        result.push(...this.flattenTasks(task.children));
      }
    }

    return result;
  }

  /**
   * Gets the current execution status
   *
   * @returns Current execution status
   */
  getStatus(): ExecutionStatus {
    if (!this.spec) {
      return {
        currentTask: null,
        completedCount: 0,
        totalCount: 0,
        isRunning: false,
        progress: 0,
      };
    }

    const allTasks = this.flattenTasks(this.spec.tasks);
    const totalCount = allTasks.length;
    const completedCount = this.state.completedTasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Find current task object
    let currentTask: Task | null = null;
    if (this.state.currentTask) {
      currentTask = this.findTaskById(this.state.currentTask, allTasks);
    }

    return {
      currentTask,
      completedCount,
      totalCount,
      isRunning: this.state.currentTask !== null,
      progress,
    };
  }

  /**
   * Finds a task by ID in a flat task list
   *
   * @param taskId - Task ID to find
   * @param tasks - Flat task list
   * @returns Task if found, null otherwise
   */
  private findTaskById(taskId: string, tasks: Task[]): Task | null {
    return tasks.find((t) => t.id === taskId) || null;
  }

  /**
   * Gets the current orchestrator state
   *
   * @returns Current state
   */
  getState(): OrchestratorState {
    return { ...this.state };
  }

  /**
   * Sets the current task being executed
   *
   * @param taskId - Task ID or null to clear
   */
  async setCurrentTask(taskId: string | null): Promise<void> {
    this.state.currentTask = taskId;
    await this.persistState();
  }

  /**
   * Marks a task as completed
   *
   * @param taskId - Task ID to mark as completed
   */
  async markTaskCompleted(taskId: string): Promise<void> {
    if (!this.state.completedTasks.includes(taskId)) {
      this.state.completedTasks.push(taskId);
    }
    await this.persistState();
  }

  /**
   * Marks a task as skipped (for optional tasks)
   *
   * @param taskId - Task ID to mark as skipped
   */
  async markTaskSkipped(taskId: string): Promise<void> {
    if (!this.state.skippedTasks.includes(taskId)) {
      this.state.skippedTasks.push(taskId);
    }
    await this.persistState();
  }

  /**
   * Increments the Ralph-Loop attempt counter for a task
   *
   * @param taskId - Task ID
   * @returns New attempt count
   */
  async incrementRalphLoopAttempts(taskId: string): Promise<number> {
    const current = this.state.ralphLoopAttempts[taskId] || 0;
    this.state.ralphLoopAttempts[taskId] = current + 1;
    await this.persistState();
    return current + 1;
  }

  /**
   * Gets the Ralph-Loop attempt count for a task
   *
   * @param taskId - Task ID
   * @returns Attempt count (0 if never attempted)
   */
  getRalphLoopAttempts(taskId: string): number {
    return this.state.ralphLoopAttempts[taskId] || 0;
  }

  /**
   * Resets the Ralph-Loop attempt counter for a task
   *
   * @param taskId - Task ID
   */
  async resetRalphLoopAttempts(taskId: string): Promise<void> {
    delete this.state.ralphLoopAttempts[taskId];
    await this.persistState();
  }

  /**
   * Starts execution by setting the start time
   */
  async startExecution(): Promise<void> {
    this.state.executionStartTime = new Date();
    await this.persistState();
  }

  /**
   * Clears execution state (called on successful completion)
   */
  async clearExecution(): Promise<void> {
    this.state = {
      currentSpec: null,
      currentTask: null,
      executionStartTime: null,
      ralphLoopAttempts: {},
      completedTasks: [],
      skippedTasks: [],
    };
    await this.persistState();
  }

  /**
   * Persists the current state to disk atomically
   *
   * Algorithm:
   * 1. Serialize state to JSON
   * 2. Write to temporary file
   * 3. Atomically rename to replace state file
   * 4. Handle write failures gracefully
   *
   * **Validates: Requirement 2.7**
   */
  private async persistState(): Promise<void> {
    try {
      // Serialize state with proper date handling
      const stateJson = JSON.stringify(
        this.state,
        (_key, value: unknown) => {
          // Convert Date objects to ISO strings
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value as string | number | boolean | null | undefined;
        },
        2
      );

      // Validate JSON is not empty
      if (!stateJson || stateJson.trim() === '') {
        throw new Error('State serialization produced empty JSON');
      }

      // Write atomically
      const result = await atomicWrite(this.statePath, stateJson, {
        createDirs: true,
        validate: (content) => {
          try {
            JSON.parse(content);
            return true;
          } catch {
            return false;
          }
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to write state file');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Log error but don't throw - state persistence failure shouldn't crash the system
      console.error(`Failed to persist state: ${errorMessage}`);
    }
  }

  /**
   * Loads state from disk for crash recovery
   *
   * Algorithm:
   * 1. Check if state file exists
   * 2. Read and parse JSON
   * 3. Validate state structure
   * 4. Restore state
   * 5. Handle corrupted state gracefully
   *
   * @returns True if state was loaded, false if no state exists or state is corrupted
   *
   * **Validates: Requirement 2.7**
   */
  async loadState(): Promise<boolean> {
    try {
      // Check if state file exists
      const exists = await fileExists(this.statePath);
      if (!exists) {
        return false;
      }

      // Read state file
      const content = await safeRead(this.statePath);
      if (!content) {
        console.warn('State file exists but could not be read');
        return false;
      }

      // Parse JSON
      const parsed: unknown = JSON.parse(content);

      // Validate structure
      if (!this.isValidState(parsed)) {
        console.warn('State file has invalid structure, starting fresh');
        return false;
      }

      // Restore dates
      if (parsed.executionStartTime) {
        parsed.executionStartTime = new Date(parsed.executionStartTime);
      }

      // Restore state
      this.state = parsed;

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Failed to load state: ${errorMessage}, starting fresh`);
      return false;
    }
  }

  /**
   * Validates that a parsed object has the correct state structure
   *
   * @param obj - Object to validate
   * @returns True if valid state structure
   */
  private isValidState(obj: unknown): obj is OrchestratorState {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    const state = obj as Record<string, unknown>;

    return (
      (state.currentSpec === null || typeof state.currentSpec === 'string') &&
      (state.currentTask === null || typeof state.currentTask === 'string') &&
      (state.executionStartTime === null || typeof state.executionStartTime === 'string') &&
      typeof state.ralphLoopAttempts === 'object' &&
      state.ralphLoopAttempts !== null &&
      Array.isArray(state.completedTasks) &&
      Array.isArray(state.skippedTasks)
    );
  }

  /**
   * Gets the loaded spec
   *
   * @returns Loaded spec or null if no spec loaded
   */
  getSpec(): ParsedSpec | null {
    return this.spec;
  }

  /**
   * Gets the spec path
   *
   * @returns Spec path or null if no spec loaded
   */
  getSpecPath(): string | null {
    return this.specPath;
  }

  /**
   * Registers a listener for status transition events
   *
   * @param listener - Function to call when status changes
   *
   * **Validates: Requirement 2.5**
   */
  onStatusTransition(listener: StatusTransitionListener): void {
    this.statusListeners.push(listener);
  }

  /**
   * Removes a status transition listener
   *
   * @param listener - Listener to remove
   */
  offStatusTransition(listener: StatusTransitionListener): void {
    this.statusListeners = this.statusListeners.filter((l) => l !== listener);
  }

  /**
   * Emits a status transition event to all listeners
   *
   * @param event - Status transition event
   */
  private async emitStatusTransition(event: StatusTransitionEvent): Promise<void> {
    for (const listener of this.statusListeners) {
      try {
        await listener(event);
      } catch (error) {
        // Log error but don't throw - one listener failure shouldn't break others
        console.error('Status transition listener error:', error);
      }
    }
  }

  /**
   * Validates that a status transition is valid
   *
   * @param currentStatus - Current task status
   * @param newStatus - Desired new status
   * @returns true if transition is valid, false otherwise
   *
   * **Validates: Requirement 2.2, 2.3, 2.4**
   */
  private isValidTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
    const validNextStates = VALID_TRANSITIONS[currentStatus];
    return validNextStates.includes(newStatus);
  }

  /**
   * Gets the current status of a task
   *
   * @param taskId - Task ID
   * @returns Current status of the task
   */
  getTaskStatus(taskId: string): TaskStatus {
    if (!this.spec) {
      return 'not_started';
    }

    const allTasks = this.flattenTasks(this.spec.tasks);
    const task = this.findTaskById(taskId, allTasks);

    if (!task) {
      return 'not_started';
    }

    return task.status;
  }

  /**
   * Updates the status of a task with validation and event emission.
   * Validates state transitions, updates tasks.md immediately, and emits events.
   *
   * Valid transitions:
   * - not_started → queued
   * - queued → in_progress
   * - in_progress → completed
   * - in_progress → not_started (for Ralph-Loop reset)
   *
   * Algorithm:
   * 1. Validate the status transition is allowed
   * 2. Update the task status in memory
   * 3. Update tasks.md file immediately (Requirement 2.5)
   * 4. Emit status transition event
   * 5. Persist state to disk
   *
   * @param taskId - Task ID to update
   * @param newStatus - New status to set
   * @returns true if update succeeded, false if validation failed
   * @throws Error if tasks.md update fails
   *
   * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
   */
  async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<boolean> {
    if (!this.spec || !this.specPath) {
      throw new Error('No spec loaded - cannot update task status');
    }

    // Find the task
    const allTasks = this.flattenTasks(this.spec.tasks);
    const task = this.findTaskById(taskId, allTasks);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const currentStatus = task.status;

    // Validate transition (Requirements 2.2, 2.3, 2.4)
    if (!this.isValidTransition(currentStatus, newStatus)) {
      console.warn(`Invalid status transition for task ${taskId}: ${currentStatus} → ${newStatus}`);
      return false;
    }

    // Update task status in memory
    const previousStatus = task.status;
    task.status = newStatus;

    // Update tasks.md immediately (Requirement 2.5)
    const tasksFilePath = `${this.specPath}/tasks.md`;
    const updateResult = await updateTaskStatus(tasksFilePath, taskId, newStatus);

    if (!updateResult.success) {
      // Rollback in-memory change
      task.status = previousStatus;
      throw new Error(`Failed to update tasks.md: ${updateResult.error}`);
    }

    // Emit status transition event
    const event: StatusTransitionEvent = {
      taskId,
      previousStatus,
      newStatus,
      timestamp: new Date(),
    };

    await this.emitStatusTransition(event);

    // Persist state to disk
    await this.persistState();

    return true;
  }

  /**
   * Transitions a task through the standard execution flow: not_started → queued → in_progress
   *
   * @param taskId - Task ID to queue
   * @returns true if queued successfully
   *
   * **Validates: Requirement 2.2**
   */
  async queueTask(taskId: string): Promise<boolean> {
    return await this.updateTaskStatus(taskId, 'queued');
  }

  /**
   * Starts execution of a queued task: queued → in_progress
   *
   * This method validates prerequisites before starting the task.
   *
   * @param taskId - Task ID to start
   * @returns true if started successfully
   * @throws Error if prerequisites are not completed
   *
   * **Validates: Requirements 2.3, 9.5**
   */
  async startTask(taskId: string): Promise<boolean> {
    // Validate prerequisites before starting (Requirement 9.5)
    this.validatePrerequisites(taskId);

    const success = await this.updateTaskStatus(taskId, 'in_progress');

    if (success) {
      // Set as current task when starting
      await this.setCurrentTask(taskId);
    }

    return success;
  }

  /**
   * Completes a task: in_progress → completed
   *
   * @param taskId - Task ID to complete
   * @returns true if completed successfully
   *
   * **Validates: Requirement 2.4**
   */
  async completeTask(taskId: string): Promise<boolean> {
    const success = await this.updateTaskStatus(taskId, 'completed');

    if (success) {
      // Also mark in completed tasks list
      await this.markTaskCompleted(taskId);
    }

    return success;
  }

  /**
   * Resets a task back to not_started (used by Ralph-Loop after spec corrections)
   *
   * @param taskId - Task ID to reset
   * @returns true if reset successfully
   *
   * **Validates: Requirement 5.4**
   */
  async resetTask(taskId: string): Promise<boolean> {
    return await this.updateTaskStatus(taskId, 'not_started');
  }

  /**
   * Selects the next task to execute based on orchestrator rules.
   *
   * Selection Algorithm:
   * 1. Find first not_started task in document order (Requirement 3.1)
   * 2. Skip completed tasks
   * 3. Skip optional tasks (marked with *) unless explicitly requested (Requirement 3.6)
   * 4. Respect parent-child relationships: execute sub-tasks before parent
   * 5. Enforce mutual exclusion: ensure no other task is in_progress (Requirement 3.3)
   *
   * Document order is determined by depth-first traversal of the task tree,
   * which matches the order tasks appear in tasks.md.
   *
   * @param includeOptional - Whether to include optional tasks (default: false)
   * @returns Next task to execute, or null if no tasks available
   *
   * **Validates: Requirements 3.1, 3.3, 3.6**
   */
  selectNextTask(includeOptional: boolean = false): Task | null {
    if (!this.spec) {
      return null;
    }

    // Enforce mutual exclusion: check if any task is currently in_progress (Requirement 3.3)
    const allTasks = this.flattenTasks(this.spec.tasks);
    const inProgressTask = allTasks.find((t) => t.status === 'in_progress');

    if (inProgressTask) {
      // A task is already in progress, cannot select another
      return null;
    }

    // Find first not_started task in document order
    return this.findNextTaskRecursive(this.spec.tasks, includeOptional);
  }

  /**
   * Recursively finds the next task to execute in document order.
   * Uses depth-first traversal to match the order tasks appear in tasks.md.
   *
   * Algorithm:
   * 1. For each task in order:
   *    a. If task has children, check children first (depth-first)
   *    b. If all non-optional children are completed, task is eligible
   *    c. If task is not_started and not optional (or optional allowed), select it
   * 2. Return first eligible task found
   *
   * @param tasks - Task list to search
   * @param includeOptional - Whether to include optional tasks
   * @returns Next task to execute, or null if none found
   */
  private findNextTaskRecursive(tasks: Task[], includeOptional: boolean): Task | null {
    for (const task of tasks) {
      // If task has children, check children first (depth-first)
      if (task.children.length > 0) {
        // First, try to find a task among children
        const childTask = this.findNextTaskRecursive(task.children, includeOptional);
        if (childTask) {
          return childTask;
        }

        // If no child task found, check if parent is eligible
        // Parent is eligible only if all non-optional children are completed
        if (this.areAllNonOptionalChildrenCompleted(task)) {
          // Check if parent itself is eligible
          if (this.isTaskEligible(task, includeOptional)) {
            return task;
          }
        }
      } else {
        // Leaf task - check if eligible
        if (this.isTaskEligible(task, includeOptional)) {
          return task;
        }
      }
    }

    return null;
  }

  /**
   * Checks if a task is eligible for execution.
   *
   * A task is eligible if:
   * - Status is not_started
   * - Not optional, OR optional tasks are included
   * - Not already completed
   * - All prerequisites are completed (Requirement 9.5)
   *
   * @param task - Task to check
   * @param includeOptional - Whether optional tasks are eligible
   * @returns true if task is eligible
   *
   * **Validates: Requirements 3.1, 3.6, 9.5**
   */
  private isTaskEligible(task: Task, includeOptional: boolean): boolean {
    // Must be not_started
    if (task.status !== 'not_started') {
      return false;
    }

    // Skip optional tasks unless explicitly included (Requirement 3.6)
    if (task.isOptional && !includeOptional) {
      return false;
    }

    // Check prerequisites are completed (Requirement 9.5)
    if (!this.arePrerequisitesCompleted(task.id)) {
      return false;
    }

    return true;
  }

  /**
   * Checks if all non-optional children of a task are completed.
   *
   * This is used to determine if a parent task is eligible for execution.
   * A parent can only execute after all its non-optional children are done.
   *
   * @param task - Parent task to check
   * @returns true if all non-optional children are completed
   */
  private areAllNonOptionalChildrenCompleted(task: Task): boolean {
    for (const child of task.children) {
      // Skip optional children
      if (child.isOptional) {
        continue;
      }

      // If any non-optional child is not completed, parent is not eligible
      if (child.status !== 'completed') {
        return false;
      }

      // Recursively check child's children
      if (child.children.length > 0) {
        if (!this.areAllNonOptionalChildrenCompleted(child)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Checks if there is currently a task in progress.
   *
   * @returns true if any task has status in_progress
   *
   * **Validates: Requirement 3.3**
   */
  hasTaskInProgress(): boolean {
    if (!this.spec) {
      return false;
    }

    const allTasks = this.flattenTasks(this.spec.tasks);
    return allTasks.some((t) => t.status === 'in_progress');
  }

  /**
   * Gets all tasks that are currently in progress.
   * Should return at most one task due to mutual exclusion.
   *
   * @returns Array of in-progress tasks (should be 0 or 1)
   */
  getInProgressTasks(): Task[] {
    if (!this.spec) {
      return [];
    }

    const allTasks = this.flattenTasks(this.spec.tasks);
    return allTasks.filter((t) => t.status === 'in_progress');
  }

  /**
   * Executes the task orchestration flow: queue next task automatically after completion.
   *
   * This method implements the core orchestration logic:
   * 1. Complete the current task
   * 2. Clear current task reference
   * 3. Select next task in sequence
   * 4. Queue the next task automatically
   *
   * Algorithm:
   * 1. Mark current task as completed
   * 2. Clear current task reference
   * 3. Find next not_started task using selectNextTask()
   * 4. If next task found, queue it automatically (Requirement 3.4)
   * 5. Return the next task or null if execution is complete
   *
   * @param currentTaskId - ID of the task that just completed
   * @param includeOptional - Whether to include optional tasks in selection
   * @returns Next task that was queued, or null if no more tasks
   *
   * **Validates: Requirements 3.2, 3.4**
   */
  async completeAndQueueNext(
    currentTaskId: string,
    includeOptional: boolean = false
  ): Promise<Task | null> {
    // Complete the current task
    const completed = await this.completeTask(currentTaskId);

    if (!completed) {
      throw new Error(`Failed to complete task: ${currentTaskId}`);
    }

    // Clear current task reference
    await this.setCurrentTask(null);

    // Select next task (respects sub-task precedence and document order)
    const nextTask = this.selectNextTask(includeOptional);

    if (nextTask) {
      // Queue next task automatically (Requirement 3.4)
      const queued = await this.queueTask(nextTask.id);

      if (!queued) {
        throw new Error(`Failed to queue next task: ${nextTask.id}`);
      }

      return nextTask;
    }

    // No more tasks - execution complete
    return null;
  }

  /**
   * Checks if a parent task can be marked as completed.
   *
   * A parent task can only be completed if all non-optional sub-tasks are completed.
   * This enforces the requirement that sub-tasks must execute before parent.
   *
   * Algorithm:
   * 1. Find the task by ID
   * 2. If task has no children, it can be completed
   * 3. If task has children, check all non-optional children are completed
   * 4. Recursively check nested children
   *
   * @param taskId - Task ID to check
   * @returns true if task can be completed, false otherwise
   *
   * **Validates: Requirements 2.6, 3.2**
   */
  canCompleteParentTask(taskId: string): boolean {
    if (!this.spec) {
      return false;
    }

    const allTasks = this.flattenTasks(this.spec.tasks);
    const task = this.findTaskById(taskId, allTasks);

    if (!task) {
      return false;
    }

    // If no children, can be completed
    if (task.children.length === 0) {
      return true;
    }

    // Check all non-optional children are completed (Requirement 2.6)
    return this.areAllNonOptionalChildrenCompleted(task);
  }

  /**
   * Validates that a task can be completed before marking it as complete.
   * Overrides the completeTask method to add parent-child validation.
   *
   * @param taskId - Task ID to complete
   * @returns true if completed successfully
   * @throws Error if parent task cannot be completed due to incomplete children
   *
   * **Validates: Requirements 2.4, 2.6, 3.2**
   */
  async completeTaskWithValidation(taskId: string): Promise<boolean> {
    // Check if parent task can be completed (Requirement 2.6, 3.2)
    if (!this.canCompleteParentTask(taskId)) {
      throw new Error(
        `Cannot complete parent task ${taskId}: not all non-optional sub-tasks are completed`
      );
    }

    // Use the standard completeTask method
    return await this.completeTask(taskId);
  }

  /**
   * Halts execution and captures error context when a task fails.
   *
   * This method is called when a task execution fails. It:
   * 1. Captures complete error context
   * 2. Clears current task reference
   * 3. Persists state for recovery
   * 4. Returns error context for Ralph-Loop processing
   *
   * Algorithm:
   * 1. Create ErrorContext with all failure details
   * 2. Clear current task (halt execution)
   * 3. Persist state to disk
   * 4. Return error context for Ralph-Loop
   *
   * @param taskId - ID of the failed task
   * @param error - Error that occurred
   * @param failedTest - Name of failed test (if applicable)
   * @returns ErrorContext for Ralph-Loop processing
   *
   * **Validates: Requirement 3.5**
   */
  async haltOnFailure(taskId: string, error: Error, failedTest?: string): Promise<ErrorContext> {
    // Create error context with complete information (Requirement 3.5)
    const errorContext: ErrorContext = {
      taskId,
      errorMessage: error.message,
      stackTrace: error.stack || '',
      failedTest: failedTest || null,
      timestamp: new Date(),
    };

    // Clear current task to halt execution
    await this.setCurrentTask(null);

    // Persist state for recovery
    await this.persistState();

    return errorContext;
  }

  /**
   * Checks if all tasks are completed.
   *
   * @returns true if all non-optional tasks are completed
   */
  isExecutionComplete(): boolean {
    if (!this.spec) {
      return false;
    }

    const allTasks = this.flattenTasks(this.spec.tasks);

    // Check if all non-optional tasks are completed
    for (const task of allTasks) {
      if (!task.isOptional && task.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets a summary of execution progress.
   *
   * @returns Object with counts of tasks by status
   */
  getExecutionSummary(): {
    total: number;
    notStarted: number;
    queued: number;
    inProgress: number;
    completed: number;
    optional: number;
  } {
    if (!this.spec) {
      return {
        total: 0,
        notStarted: 0,
        queued: 0,
        inProgress: 0,
        completed: 0,
        optional: 0,
      };
    }

    const allTasks = this.flattenTasks(this.spec.tasks);

    return {
      total: allTasks.length,
      notStarted: allTasks.filter((t) => t.status === 'not_started').length,
      queued: allTasks.filter((t) => t.status === 'queued').length,
      inProgress: allTasks.filter((t) => t.status === 'in_progress').length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
      optional: allTasks.filter((t) => t.isOptional).length,
    };
  }
}
