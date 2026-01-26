/**
 * Antigravity MCP Server
 *
 * Universal MCP server that exposes anti-hallucination tools to AI agents.
 * Built on @modelcontextprotocol/sdk for universal IDE compatibility.
 *
 * Requirements: 1, 9
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import anti-hallucination tools
import { getSystemContext } from './tools/system-context.js';
import { validateEnvironment, type ValidationRequest } from './tools/validate-environment.js';
import { sovereignExecute, type ExecuteRequest } from './tools/sovereign-execute.js';
import { triggerRalphLoop, type RalphLoopRequest } from './tools/ralph-loop-trigger.js';

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  name: string;
  version: string;
}

/**
 * Antigravity MCP Server
 *
 * Exposes 4 anti-hallucination tools:
 * - get_system_context: Real-time system state
 * - validate_environment: Dependency validation
 * - sovereign_execute: Constitutional command wrapper
 * - trigger_ralph_loop: Autonomous self-healing
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 9.1**
 */
export class AntigravityMCPServer {
  private server: Server;
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig) {
    this.config = config;

    // Initialize MCP server with SDK
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register request handlers
    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // Handle tools/list request
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: [
          {
            name: 'get_system_context',
            description:
              'Returns real-time system state including CPU, memory, disk, Docker, ports, and environment. Prevents AI hallucination about system conditions.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'validate_environment',
            description:
              'Validates dependencies before execution. Checks commands in PATH, npm packages, files, and ports. Returns validation status and installation suggestions.',
            inputSchema: {
              type: 'object',
              properties: {
                commands: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Commands to check in PATH',
                },
                packages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'npm packages to verify',
                },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Files to check existence',
                },
                ports: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Ports to check availability',
                },
              },
              required: [],
            },
          },
          {
            name: 'sovereign_execute',
            description:
              'Executes commands through constitutional validation. Enforces 13 Articles, Docker whitelist, and destructive operation protection. Returns stdout, stderr, and exit code.',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'Command to execute',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Command arguments',
                },
                cwd: {
                  type: 'string',
                  description: 'Working directory',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds (default: 30000)',
                },
                confirmDestructive: {
                  type: 'boolean',
                  description: 'Confirm destructive operations',
                },
              },
              required: ['command'],
            },
          },
          {
            name: 'trigger_ralph_loop',
            description:
              'Triggers autonomous self-healing engine. Analyzes errors, generates corrections, and updates specs. Supports analyze, correct, and health-check modes.',
            inputSchema: {
              type: 'object',
              properties: {
                mode: {
                  type: 'string',
                  enum: ['analyze', 'correct', 'health-check'],
                  description: 'Operation mode',
                },
                errorContext: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    stack: { type: 'string' },
                    taskId: { type: 'string' },
                    file: { type: 'string' },
                  },
                  required: ['message'],
                  description: 'Error context for analysis/correction',
                },
              },
              required: ['mode'],
            },
          },
        ],
      };
    });

    // Handle tools/call request
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: unknown;

        switch (name) {
          case 'get_system_context':
            result = await getSystemContext();
            break;

          case 'validate_environment':
            result = await validateEnvironment(args as unknown as ValidationRequest);
            break;

          case 'sovereign_execute':
            result = await sovereignExecute(args as unknown as ExecuteRequest);
            break;

          case 'trigger_ralph_loop':
            result = await triggerRalphLoop(args as unknown as RalphLoopRequest);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: errorMessage,
                  tool: name,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server
   *
   * Initializes stdio transport and begins listening for requests.
   *
   * **Validates: Requirements 1.2, 9.1**
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Log to stderr (stdout is reserved for MCP protocol)
    console.error(`${this.config.name} v${this.config.version} started`);
    console.error('Listening on stdio...');
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    await this.server.close();
    console.error('Server stopped');
  }
}

/**
 * Create and start the Antigravity MCP server
 */
export async function startMCPServer(): Promise<AntigravityMCPServer> {
  const server = new AntigravityMCPServer({
    name: 'antigravity-os',
    version: '0.1.0',
  });

  await server.start();

  return server;
}
