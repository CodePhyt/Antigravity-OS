import { describe, it, expect } from 'vitest';
import {
  generateConfig,
  generateAllConfigs,
  formatConfig,
  getInstallationInstructions,
} from '../../../src/mcp/config-generator.js';

describe('MCP Config Generator', () => {
  describe('Cursor config', () => {
    it('should generate valid Cursor configuration', () => {
      const config = generateConfig('cursor');

      expect(config.mcpServers['antigravity-os']).toBeDefined();
      expect(config.mcpServers['antigravity-os'].command).toBe('npx');
      expect(config.mcpServers['antigravity-os'].args).toEqual(['ag-os-mcp']);
      expect(config.mcpServers['antigravity-os'].env?.NODE_ENV).toBe('production');
      expect(config.mcpServers['antigravity-os'].env?.MCP_CLIENT).toBe('cursor');
    });

    it('should include Cursor-specific installation instructions', () => {
      const instructions = getInstallationInstructions('cursor');

      expect(instructions).toContain('Cursor');
      expect(instructions).toContain('Settings');
      expect(instructions).toContain('MCP Servers');
      expect(instructions).toContain('Restart Cursor');
    });
  });

  describe('Windsurf config', () => {
    it('should generate valid Windsurf configuration', () => {
      const config = generateConfig('windsurf');

      expect(config.mcpServers['antigravity-os']).toBeDefined();
      expect(config.mcpServers['antigravity-os'].command).toBe('npx');
      expect(config.mcpServers['antigravity-os'].args).toEqual(['ag-os-mcp']);
      expect(config.mcpServers['antigravity-os'].env?.NODE_ENV).toBe('production');
      expect(config.mcpServers['antigravity-os'].env?.MCP_CLIENT).toBe('windsurf');
    });

    it('should include Windsurf-specific installation instructions', () => {
      const instructions = getInstallationInstructions('windsurf');

      expect(instructions).toContain('Windsurf');
      expect(instructions).toContain('Settings');
      expect(instructions).toContain('Extensions');
      expect(instructions).toContain('Restart Windsurf');
    });
  });

  describe('Claude Desktop config', () => {
    it('should generate valid Claude Desktop configuration', () => {
      const config = generateConfig('claude-desktop');

      expect(config.mcpServers['antigravity-os']).toBeDefined();
      expect(config.mcpServers['antigravity-os'].command).toBe('npx');
      expect(config.mcpServers['antigravity-os'].args).toEqual(['ag-os-mcp']);
      expect(config.mcpServers['antigravity-os'].env?.NODE_ENV).toBe('production');
      expect(config.mcpServers['antigravity-os'].env?.MCP_CLIENT).toBe('claude-desktop');
    });

    it('should include Claude Desktop-specific installation instructions', () => {
      const instructions = getInstallationInstructions('claude-desktop');

      expect(instructions).toContain('Claude Desktop');
      expect(instructions).toContain('claude_desktop_config.json');
      expect(instructions).toContain('macOS');
      expect(instructions).toContain('Windows');
      expect(instructions).toContain('Linux');
      expect(instructions).toContain('Restart Claude Desktop');
    });
  });

  describe('Generic config', () => {
    it('should generate valid generic configuration', () => {
      const config = generateConfig('generic');

      expect(config.mcpServers['antigravity-os']).toBeDefined();
      expect(config.mcpServers['antigravity-os'].command).toBe('npx');
      expect(config.mcpServers['antigravity-os'].args).toEqual(['ag-os-mcp']);
      expect(config.mcpServers['antigravity-os'].env?.NODE_ENV).toBe('production');
      expect(config.mcpServers['antigravity-os'].env?.MCP_CLIENT).toBeUndefined();
    });

    it('should include generic installation instructions', () => {
      const instructions = getInstallationInstructions('generic');

      expect(instructions).toContain('Generic MCP Client');
      expect(instructions).toContain('stdio');
    });
  });

  describe('generateAllConfigs', () => {
    it('should generate configs for all IDE types', () => {
      const allConfigs = generateAllConfigs();

      expect(allConfigs.cursor).toBeDefined();
      expect(allConfigs.windsurf).toBeDefined();
      expect(allConfigs['claude-desktop']).toBeDefined();
      expect(allConfigs.generic).toBeDefined();
    });

    it('should generate unique configs for each IDE', () => {
      const allConfigs = generateAllConfigs();

      // Cursor should have MCP_CLIENT=cursor
      expect(allConfigs.cursor.mcpServers['antigravity-os'].env?.MCP_CLIENT).toBe('cursor');

      // Windsurf should have MCP_CLIENT=windsurf
      expect(allConfigs.windsurf.mcpServers['antigravity-os'].env?.MCP_CLIENT).toBe('windsurf');

      // Claude Desktop should have MCP_CLIENT=claude-desktop
      expect(allConfigs['claude-desktop'].mcpServers['antigravity-os'].env?.MCP_CLIENT).toBe(
        'claude-desktop'
      );

      // Generic should not have MCP_CLIENT
      expect(allConfigs.generic.mcpServers['antigravity-os'].env?.MCP_CLIENT).toBeUndefined();
    });
  });

  describe('formatConfig', () => {
    it('should format config as pretty JSON by default', () => {
      const config = generateConfig('cursor');
      const formatted = formatConfig(config);

      expect(formatted).toContain('\n');
      expect(formatted).toContain('  '); // Indentation
      expect(JSON.parse(formatted)).toEqual(config);
    });

    it('should format config as compact JSON when pretty=false', () => {
      const config = generateConfig('cursor');
      const formatted = formatConfig(config, false);

      expect(formatted).not.toContain('\n');
      expect(JSON.parse(formatted)).toEqual(config);
    });
  });
});
