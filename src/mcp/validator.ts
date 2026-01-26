/**
 * Constitutional Validator
 *
 * Enforces the 13 Articles of the Antigravity OS Constitution
 * for all command executions via the sovereign_execute tool.
 *
 * Requirements: 4, 12
 */

export interface ValidationContext {
  command: string;
  args: string[];
  cwd: string;
  user?: string;
}

export interface ConstitutionalViolation {
  article: number;
  rule: string;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  remediation?: string;
}

/**
 * Docker image whitelist prefixes
 */
const DOCKER_WHITELIST = ['antigravity', 'test-', 'dev-'];

/**
 * Sensitive directories that should be protected
 */
const SENSITIVE_DIRECTORIES = [
  '.git',
  'node_modules',
  '.env',
  '.kiro/logs',
  '.ssh',
  '.aws',
  '.config',
];

/**
 * Destructive commands that require explicit confirmation
 */
const DESTRUCTIVE_COMMANDS = [
  'rm',
  'rmdir',
  'del',
  'delete',
  'DROP',
  'TRUNCATE',
  'docker rmi',
  'docker rm',
  'git reset --hard',
  'git clean -fd',
];

/**
 * Constitutional Validator
 *
 * Validates all operations against the 13 Articles of the Constitution
 */
export class ConstitutionalValidator {
  /**
   * Validate a command execution context against all constitutional rules
   *
   * @param context - The execution context to validate
   * @returns Array of violations (empty if valid)
   */
  validate(context: ValidationContext): ConstitutionalViolation[] {
    const violations: ConstitutionalViolation[] = [];

    // Article I: Layer Separation (check for AI decision-making in execution)
    if (this.containsAIDecisionMaking(context.command)) {
      violations.push({
        article: 1,
        rule: 'The Three Sovereign Layers',
        severity: 'error',
        message: 'Command attempts AI decision-making in execution layer',
        remediation: 'Move AI logic to orchestration layer',
      });
    }

    // Article II: Security-First Principles
    if (this.violatesSecurityPrinciples(context)) {
      violations.push({
        article: 2,
        rule: 'Security-First Principles',
        severity: 'critical',
        message: 'Command violates security principles',
        remediation: 'Use sandboxed execution or validate inputs',
      });
    }

    // Article III: Atomic Operations Mandate
    if (this.violatesAtomicOperations(context)) {
      violations.push({
        article: 3,
        rule: 'Atomic Operations Mandate',
        severity: 'error',
        message: 'File modification without atomic protocol',
        remediation: 'Use atomic file writer with backup/validate/commit',
      });
    }

    // Article IV: Memory-First Development
    if (this.skipsMemoryConsultation(context.command)) {
      violations.push({
        article: 4,
        rule: 'Memory-First Development',
        severity: 'warning',
        message: 'Command skips memory graph consultation',
        remediation: 'Read /docs/memory/insight-graph.md before proceeding',
      });
    }

    // Article XII: Destructive operations require confirmation
    if (this.isDestructive(context.command, context.args)) {
      violations.push({
        article: 12,
        rule: 'Destructive Operation Protection',
        severity: 'critical',
        message: 'Destructive operation requires explicit confirmation',
        remediation: 'Set confirmDestructive: true in request',
      });
    }

    // Docker whitelist enforcement
    if (this.violatesDockerWhitelist(context)) {
      violations.push({
        article: 12,
        rule: 'Docker Whitelist Enforcement',
        severity: 'error',
        message: 'Docker image not in whitelist',
        remediation: `Use images with prefixes: ${DOCKER_WHITELIST.join(', ')}`,
      });
    }

    // Sensitive directory protection
    if (this.accessesSensitiveDirectory(context)) {
      violations.push({
        article: 12,
        rule: 'Sensitive Directory Protection',
        severity: 'critical',
        message: 'Attempted access to sensitive directory',
        remediation: 'Avoid operations on .git, node_modules, .env, etc.',
      });
    }

    return violations;
  }

  /**
   * Check if a command is destructive
   *
   * @param command - The command to check
   * @param args - Command arguments
   * @returns True if destructive
   */
  isDestructive(command: string, args: string[]): boolean {
    const normalizedCommand = command.toLowerCase();
    const fullCommand = `${command} ${args.join(' ')}`.toLowerCase();

    // Check if the command itself is destructive (not just in arguments)
    for (const destructiveCmd of DESTRUCTIVE_COMMANDS) {
      const normalizedDestructive = destructiveCmd.toLowerCase();

      // Check if command starts with destructive command (e.g., "rm", "docker rmi")
      if (
        normalizedCommand === normalizedDestructive ||
        normalizedCommand.startsWith(normalizedDestructive + ' ')
      ) {
        return true;
      }

      // For multi-word commands like "docker rmi", check if full command starts with it
      if (normalizedDestructive.includes(' ') && fullCommand.startsWith(normalizedDestructive)) {
        return true;
      }
    }

    // Additional checks for dangerous flags (only if command could be destructive)
    const potentiallyDestructiveCommands = [
      'rm',
      'del',
      'delete',
      'drop',
      'truncate',
      'git',
      'docker',
      'psql',
      'mysql',
      'mongo',
    ];
    const isCommandPotentiallyDestructive = potentiallyDestructiveCommands.some(
      (cmd) => normalizedCommand === cmd || normalizedCommand.startsWith(cmd + ' ')
    );

    if (isCommandPotentiallyDestructive) {
      if (
        fullCommand.includes(' -rf') ||
        fullCommand.includes(' -r -f') ||
        fullCommand.includes(' --force') ||
        fullCommand.includes('drop table') ||
        fullCommand.includes('drop database') ||
        fullCommand.includes('truncate')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a Docker image is whitelisted
   *
   * @param image - The Docker image name
   * @returns True if whitelisted
   */
  isDockerWhitelisted(image: string): boolean {
    return DOCKER_WHITELIST.some((prefix) => image.startsWith(prefix));
  }

  /**
   * Check if a path is a sensitive directory
   *
   * @param path - The path to check
   * @returns True if sensitive
   */
  isSensitiveDirectory(path: string): boolean {
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase();

    return SENSITIVE_DIRECTORIES.some((sensitiveDir) =>
      normalizedPath.includes(sensitiveDir.toLowerCase())
    );
  }

  /**
   * Check if command contains AI decision-making
   */
  private containsAIDecisionMaking(command: string): boolean {
    const aiPatterns = ['--skip-orchestration', '--ai-decide', '--auto-choose'];
    return aiPatterns.some((pattern) => command.includes(pattern));
  }

  /**
   * Check if command violates security principles
   */
  private violatesSecurityPrinciples(context: ValidationContext): boolean {
    const { command, args } = context;
    const fullCommand = `${command} ${args.join(' ')}`;

    // Check for unvalidated external inputs
    if (fullCommand.includes('curl') && !fullCommand.includes('--fail')) {
      return true;
    }

    // Check for credential exposure
    if (fullCommand.match(/password|token|secret|key/i) && !fullCommand.includes('--masked')) {
      return true;
    }

    return false;
  }

  /**
   * Check if command violates atomic operations
   */
  private violatesAtomicOperations(context: ValidationContext): boolean {
    const { command, args } = context;
    const fullCommand = `${command} ${args.join(' ')}`;

    // Check for direct file modifications without backup
    if (
      (command === 'echo' || command === 'write') &&
      fullCommand.includes('>') &&
      !fullCommand.includes('.tmp')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if command skips memory consultation
   */
  private skipsMemoryConsultation(command: string): boolean {
    return command.includes('--skip-memory');
  }

  /**
   * Check if command violates Docker whitelist
   */
  private violatesDockerWhitelist(context: ValidationContext): boolean {
    const { command, args } = context;

    if (command === 'docker' && args.length > 0) {
      const subcommand = args[0];

      if (subcommand === 'run' || subcommand === 'pull') {
        // Find the image name in args
        const imageIndex = args.findIndex((arg) => !arg.startsWith('-') && arg !== subcommand);
        if (imageIndex !== -1) {
          const image = args[imageIndex];
          if (image) {
            return !this.isDockerWhitelisted(image);
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if command accesses sensitive directory
   */
  private accessesSensitiveDirectory(context: ValidationContext): boolean {
    const { args, cwd } = context;

    // Check working directory
    if (this.isSensitiveDirectory(cwd)) {
      return true;
    }

    // Check arguments for paths
    for (const arg of args) {
      if (this.isSensitiveDirectory(arg)) {
        return true;
      }
    }

    return false;
  }
}
