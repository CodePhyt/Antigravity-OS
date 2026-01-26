/**
 * MCP Configuration Generator
 *
 * Generates IDE-specific MCP configuration for Cursor, Windsurf, Claude Desktop, and generic clients.
 *
 * Requirements: 8, 14
 */

/**
 * Supported IDE types
 */
export type IDEType = 'cursor' | 'windsurf' | 'claude-desktop' | 'generic';

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Complete MCP Configuration
 */
export interface MCPConfig {
  mcpServers: {
    'antigravity-os': MCPServerConfig;
  };
}

/**
 * Generate MCP configuration for a specific IDE
 *
 * @param ide - The IDE type to generate configuration for
 * @returns MCP configuration object
 */
export function generateConfig(ide: IDEType): MCPConfig {
  const baseConfig: MCPServerConfig = {
    command: 'npx',
    args: ['ag-os-mcp'],
    env: {
      NODE_ENV: 'production',
    },
  };

  switch (ide) {
    case 'cursor':
      return {
        mcpServers: {
          'antigravity-os': {
            ...baseConfig,
            env: {
              ...baseConfig.env,
              MCP_CLIENT: 'cursor',
            },
          },
        },
      };

    case 'windsurf':
      return {
        mcpServers: {
          'antigravity-os': {
            ...baseConfig,
            env: {
              ...baseConfig.env,
              MCP_CLIENT: 'windsurf',
            },
          },
        },
      };

    case 'claude-desktop':
      return {
        mcpServers: {
          'antigravity-os': {
            ...baseConfig,
            env: {
              ...baseConfig.env,
              MCP_CLIENT: 'claude-desktop',
            },
          },
        },
      };

    case 'generic':
    default:
      return {
        mcpServers: {
          'antigravity-os': baseConfig,
        },
      };
  }
}

/**
 * Generate configuration for all supported IDEs
 *
 * @returns Map of IDE type to configuration
 */
export function generateAllConfigs(): Record<IDEType, MCPConfig> {
  return {
    cursor: generateConfig('cursor'),
    windsurf: generateConfig('windsurf'),
    'claude-desktop': generateConfig('claude-desktop'),
    generic: generateConfig('generic'),
  };
}

/**
 * Format configuration as JSON string
 *
 * @param config - MCP configuration object
 * @param pretty - Whether to pretty-print the JSON (default: true)
 * @returns JSON string
 */
export function formatConfig(config: MCPConfig, pretty = true): string {
  return JSON.stringify(config, null, pretty ? 2 : 0);
}

/**
 * Get installation instructions for a specific IDE
 *
 * @param ide - The IDE type
 * @returns Installation instructions
 */
export function getInstallationInstructions(ide: IDEType): string {
  const config = generateConfig(ide);
  const configJson = formatConfig(config);

  switch (ide) {
    case 'cursor':
      return `
# Cursor IDE Setup

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Navigate to "MCP Servers" section
3. Add the following configuration:

\`\`\`json
${configJson}
\`\`\`

4. Restart Cursor
5. Verify connection in the MCP panel
`;

    case 'windsurf':
      return `
# Windsurf IDE Setup

1. Open Windsurf Settings
2. Navigate to "Extensions" → "MCP"
3. Add the following configuration:

\`\`\`json
${configJson}
\`\`\`

4. Restart Windsurf
5. Check the MCP status indicator
`;

    case 'claude-desktop':
      return `
# Claude Desktop Setup

1. Locate your Claude Desktop config file:
   - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
   - Windows: %APPDATA%\\Claude\\claude_desktop_config.json
   - Linux: ~/.config/Claude/claude_desktop_config.json

2. Add the following to your config file:

\`\`\`json
${configJson}
\`\`\`

3. Restart Claude Desktop
4. Look for "Antigravity OS" in the available tools
`;

    case 'generic':
    default:
      return `
# Generic MCP Client Setup

1. Add the following configuration to your MCP client:

\`\`\`json
${configJson}
\`\`\`

2. Ensure your client supports stdio communication
3. The server will communicate via stdin/stdout
`;
  }
}
