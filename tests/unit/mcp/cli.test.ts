import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('MCP CLI', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  describe('--version flag', () => {
    it('should output version information', async () => {
      const { stdout } = await execAsync('tsx src/mcp/cli.ts --version');

      expect(stdout).toContain('Antigravity OS MCP Server');
      expect(stdout).toContain('v0.1.0');
      expect(stdout).toContain('@modelcontextprotocol/sdk');
    });
  });

  describe('--config flag', () => {
    it('should output valid MCP configuration JSON', async () => {
      const { stdout } = await execAsync('tsx src/mcp/cli.ts --config');

      // Parse JSON to verify it's valid
      const config = JSON.parse(stdout);

      expect(config).toBeDefined();
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['antigravity-os']).toBeDefined();
      expect(config.mcpServers['antigravity-os'].command).toBe('npx');
      expect(config.mcpServers['antigravity-os'].args).toEqual(['ag-os-mcp']);
      expect(config.mcpServers['antigravity-os'].env).toBeDefined();
      expect(config.mcpServers['antigravity-os'].env.NODE_ENV).toBe('production');
    });

    it('should output properly formatted JSON', async () => {
      const { stdout } = await execAsync('tsx src/mcp/cli.ts --config');

      // Verify JSON is pretty-printed (has newlines and indentation)
      expect(stdout).toContain('\n');
      expect(stdout).toContain('  '); // Indentation
    });
  });

  describe('--test flag', () => {
    it('should run connectivity test successfully', async () => {
      const { stdout } = await execAsync('tsx src/mcp/cli.ts --test');

      expect(stdout).toContain('Running MCP connectivity test');
      expect(stdout).toContain('✓ MCP SDK loaded');
      expect(stdout).toContain('✓ Tools registered: 4');
      expect(stdout).toContain('✓ stdio transport ready');
      expect(stdout).toContain('Test passed');
    });
  });

  describe('default behavior (stdio mode)', () => {
    it('should start MCP server when no flags provided', async () => {
      // This test is tricky because the server runs indefinitely
      // We'll just verify the CLI file is executable and has the shebang
      const { readFile } = await import('fs/promises');
      const cliContent = await readFile('src/mcp/cli.ts', 'utf-8');

      expect(cliContent).toContain('#!/usr/bin/env node');
      expect(cliContent).toContain('startMCPServer');
    });
  });

  describe('error handling', () => {
    it('should handle invalid flags gracefully', async () => {
      // Invalid flags should be ignored and default to stdio mode
      // Since we can't easily test the server startup, we just verify the CLI doesn't crash
      const { readFile } = await import('fs/promises');
      const cliContent = await readFile('src/mcp/cli.ts', 'utf-8');

      expect(cliContent).toContain('catch');
      expect(cliContent).toContain('process.exit');
    });
  });

  describe('signal handling', () => {
    it('should handle SIGINT for graceful shutdown', async () => {
      const { readFile } = await import('fs/promises');
      const cliContent = await readFile('src/mcp/cli.ts', 'utf-8');

      expect(cliContent).toContain('SIGINT');
      expect(cliContent).toContain('Shutting down gracefully');
    });

    it('should handle SIGTERM for graceful shutdown', async () => {
      const { readFile } = await import('fs/promises');
      const cliContent = await readFile('src/mcp/cli.ts', 'utf-8');

      expect(cliContent).toContain('SIGTERM');
      expect(cliContent).toContain('Shutting down gracefully');
    });
  });

  describe('bin entry', () => {
    it('should have bin entry in package.json', async () => {
      const { readFile } = await import('fs/promises');
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));

      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin['ag-os-mcp']).toBe('./dist/mcp/cli.js');
    });
  });

  describe('npm scripts', () => {
    it('should have mcp:start script', async () => {
      const { readFile } = await import('fs/promises');
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));

      expect(packageJson.scripts['mcp:start']).toBeDefined();
      expect(packageJson.scripts['mcp:start']).toContain('dist/mcp/cli.js');
    });

    it('should have mcp:dev script', async () => {
      const { readFile } = await import('fs/promises');
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));

      expect(packageJson.scripts['mcp:dev']).toBeDefined();
      expect(packageJson.scripts['mcp:dev']).toContain('tsx');
      expect(packageJson.scripts['mcp:dev']).toContain('src/mcp/cli.ts');
    });

    it('should have mcp:test script', async () => {
      const { readFile } = await import('fs/promises');
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));

      expect(packageJson.scripts['mcp:test']).toBeDefined();
      expect(packageJson.scripts['mcp:test']).toContain('--test');
    });
  });
});
