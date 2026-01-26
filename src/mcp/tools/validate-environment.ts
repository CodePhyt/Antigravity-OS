/**
 * Environment Validation Tool
 *
 * Validates dependencies before execution to prevent "command not found" errors.
 * Checks commands in PATH, npm packages, files, and ports.
 *
 * Requirements: 3
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { access, constants } from 'fs/promises';
import { resolve } from 'path';

const execAsync = promisify(exec);

/**
 * Validation request
 */
export interface ValidationRequest {
  commands?: string[]; // e.g., ["docker", "npm", "git"]
  packages?: string[]; // e.g., ["express", "react"]
  files?: string[]; // e.g., ["package.json", ".env"]
  ports?: number[]; // e.g., [3000, 5432]
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  results: {
    commands: Record<string, { exists: boolean; path?: string }>;
    packages: Record<string, { installed: boolean; version?: string }>;
    files: Record<string, { exists: boolean; readable?: boolean }>;
    ports: Record<number, { available: boolean; process?: string }>;
  };
  suggestions: string[]; // Installation commands for missing deps
}

/**
 * Check if a command exists in PATH
 */
async function checkCommand(command: string): Promise<{ exists: boolean; path?: string }> {
  try {
    const isWindows = process.platform === 'win32';
    const whichCommand = isWindows ? 'where' : 'which';
    const { stdout } = await execAsync(`${whichCommand} ${command}`);
    return {
      exists: true,
      path: stdout.trim().split('\n')[0],
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Check if an npm package is installed
 */
async function checkPackage(
  packageName: string
): Promise<{ installed: boolean; version?: string }> {
  try {
    const { stdout } = await execAsync(`npm list ${packageName} --depth=0 --json`);
    const result = JSON.parse(stdout) as { dependencies?: Record<string, { version?: string }> };
    const version = result.dependencies?.[packageName]?.version;
    return {
      installed: !!version,
      version,
    };
  } catch {
    return { installed: false };
  }
}

/**
 * Check if a file exists and is readable
 */
async function checkFile(filePath: string): Promise<{ exists: boolean; readable?: boolean }> {
  try {
    const absolutePath = resolve(filePath);
    await access(absolutePath, constants.F_OK);
    try {
      await access(absolutePath, constants.R_OK);
      return { exists: true, readable: true };
    } catch {
      return { exists: true, readable: false };
    }
  } catch {
    return { exists: false };
  }
}

/**
 * Check if a port is available
 */
async function checkPort(port: number): Promise<{ available: boolean; process?: string }> {
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      return {
        available: false,
        process: stdout.trim() ? 'unknown' : undefined,
      };
    } else {
      const { stdout } = await execAsync(`lsof -i :${port} -t`);
      return {
        available: false,
        process: stdout.trim() || 'unknown',
      };
    }
  } catch {
    // Command failed means port is available
    return { available: true };
  }
}

/**
 * Generate installation suggestions for missing dependencies
 */
function generateSuggestions(
  commands: Record<string, { exists: boolean }>,
  packages: Record<string, { installed: boolean }>
): string[] {
  const suggestions: string[] = [];

  // Command suggestions
  for (const [command, result] of Object.entries(commands)) {
    if (!result.exists) {
      switch (command) {
        case 'docker':
          suggestions.push('Install Docker: https://docs.docker.com/get-docker/');
          break;
        case 'git':
          suggestions.push('Install Git: https://git-scm.com/downloads');
          break;
        case 'node':
          suggestions.push('Install Node.js: https://nodejs.org/');
          break;
        case 'npm':
          suggestions.push('npm is included with Node.js: https://nodejs.org/');
          break;
        default:
          suggestions.push(`Install ${command} (check official documentation)`);
      }
    }
  }

  // Package suggestions
  for (const [packageName, result] of Object.entries(packages)) {
    if (!result.installed) {
      suggestions.push(`Install ${packageName}: npm install ${packageName}`);
    }
  }

  return suggestions;
}

/**
 * Validate environment dependencies
 *
 * Checks commands in PATH, npm packages, files, and ports.
 * Returns validation results and installation suggestions for missing dependencies.
 *
 * @param req - Validation request
 * @returns Validation result with suggestions
 */
export async function validateEnvironment(req: ValidationRequest): Promise<ValidationResult> {
  const results: ValidationResult['results'] = {
    commands: {},
    packages: {},
    files: {},
    ports: {},
  };

  // Check commands
  if (req.commands) {
    await Promise.all(
      req.commands.map(async (command) => {
        results.commands[command] = await checkCommand(command);
      })
    );
  }

  // Check packages
  if (req.packages) {
    await Promise.all(
      req.packages.map(async (packageName) => {
        results.packages[packageName] = await checkPackage(packageName);
      })
    );
  }

  // Check files
  if (req.files) {
    await Promise.all(
      req.files.map(async (filePath) => {
        results.files[filePath] = await checkFile(filePath);
      })
    );
  }

  // Check ports
  if (req.ports) {
    await Promise.all(
      req.ports.map(async (port) => {
        results.ports[port] = await checkPort(port);
      })
    );
  }

  // Determine if all validations passed
  const allCommandsExist = Object.values(results.commands).every((r) => r.exists);
  const allPackagesInstalled = Object.values(results.packages).every((r) => r.installed);
  const allFilesExist = Object.values(results.files).every((r) => r.exists);
  const allPortsAvailable = Object.values(results.ports).every((r) => r.available);

  const valid = allCommandsExist && allPackagesInstalled && allFilesExist && allPortsAvailable;

  // Generate suggestions for missing dependencies
  const suggestions = generateSuggestions(results.commands, results.packages);

  return {
    valid,
    results,
    suggestions,
  };
}
