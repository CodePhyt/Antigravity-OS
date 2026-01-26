import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateConfig,
  generateAllConfigs,
  formatConfig,
  getInstallationInstructions,
  type IDEType,
} from '../../src/mcp/config-generator.js';

describe('MCP Config Generator - Property-Based Tests', () => {
  /**
   * Property 27: IDE Config Generation Completeness
   * **Validates: Requirements 8.4, 8.5**
   *
   * For any IDE type (Cursor, Windsurf, Claude Desktop), the generated configuration
   * SHALL include the correct stdio command and all available tools.
   */
  it('Property 27: generates complete config for all IDE types', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<IDEType>('cursor', 'windsurf', 'claude-desktop', 'generic'),
        (ide) => {
          const config = generateConfig(ide);

          // Verify config structure
          expect(config).toBeDefined();
          expect(config.mcpServers).toBeDefined();
          expect(config.mcpServers['antigravity-os']).toBeDefined();

          const serverConfig = config.mcpServers['antigravity-os'];

          // Verify command is correct
          expect(serverConfig.command).toBe('npx');

          // Verify args include the binary name
          expect(serverConfig.args).toBeDefined();
          expect(Array.isArray(serverConfig.args)).toBe(true);
          expect(serverConfig.args).toContain('ag-os-mcp');

          // Verify env is defined
          expect(serverConfig.env).toBeDefined();
          expect(serverConfig.env?.NODE_ENV).toBe('production');

          // Verify IDE-specific env variable
          if (ide !== 'generic') {
            expect(serverConfig.env?.MCP_CLIENT).toBe(ide);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 28: Config JSON Validity
   * **Validates: Requirements 8.1, 8.2**
   *
   * For any generated configuration, the JSON output SHALL be valid and parseable.
   */
  it('Property 28: generates valid JSON for all IDE types', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<IDEType>('cursor', 'windsurf', 'claude-desktop', 'generic'),
        (ide) => {
          const config = generateConfig(ide);
          const jsonString = formatConfig(config);

          // Verify JSON is valid by parsing it
          const parsed = JSON.parse(jsonString);

          // Verify parsed config matches original
          expect(parsed).toEqual(config);

          // Verify pretty-printing (should have newlines and indentation)
          expect(jsonString).toContain('\n');
          expect(jsonString).toContain('  '); // 2-space indentation
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 29: Installation Instructions Completeness
   * **Validates: Requirements 8.3**
   *
   * For any IDE type, installation instructions SHALL include the configuration JSON
   * and setup steps.
   */
  it('Property 29: generates complete installation instructions', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<IDEType>('cursor', 'windsurf', 'claude-desktop', 'generic'),
        (ide) => {
          const instructions = getInstallationInstructions(ide);

          // Verify instructions are not empty
          expect(instructions).toBeDefined();
          expect(instructions.length).toBeGreaterThan(0);

          // Verify instructions contain the IDE name
          expect(instructions.toLowerCase()).toContain(ide.replace('-', ' '));

          // Verify instructions contain JSON config
          expect(instructions).toContain('```json');
          expect(instructions).toContain('mcpServers');
          expect(instructions).toContain('antigravity-os');

          // Verify instructions contain setup steps
          expect(instructions).toMatch(/\d+\./); // Numbered steps
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 30: All Configs Generation
   * **Validates: Requirements 8.6**
   *
   * The generateAllConfigs function SHALL return configurations for all supported IDE types.
   */
  it('Property 30: generates configs for all supported IDEs', async () => {
    await fc.assert(
      fc.property(fc.constant(null), () => {
        const allConfigs = generateAllConfigs();

        // Verify all IDE types are present
        expect(allConfigs.cursor).toBeDefined();
        expect(allConfigs.windsurf).toBeDefined();
        expect(allConfigs['claude-desktop']).toBeDefined();
        expect(allConfigs.generic).toBeDefined();

        // Verify each config is valid
        for (const [_ide, config] of Object.entries(allConfigs)) {
          expect(config.mcpServers).toBeDefined();
          expect(config.mcpServers['antigravity-os']).toBeDefined();
          expect(config.mcpServers['antigravity-os'].command).toBe('npx');
          expect(config.mcpServers['antigravity-os'].args).toContain('ag-os-mcp');
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 31: Config Consistency
   * **Validates: Requirements 8.7**
   *
   * For any IDE type, generating the config multiple times SHALL produce identical results.
   */
  it('Property 31: generates consistent configs', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<IDEType>('cursor', 'windsurf', 'claude-desktop', 'generic'),
        (ide) => {
          const config1 = generateConfig(ide);
          const config2 = generateConfig(ide);

          // Verify configs are identical
          expect(config1).toEqual(config2);

          // Verify JSON strings are identical
          const json1 = formatConfig(config1);
          const json2 = formatConfig(config2);
          expect(json1).toBe(json2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 32: Compact JSON Format
   * **Validates: Requirements 8.8**
   *
   * When pretty=false, the JSON output SHALL be compact (no extra whitespace).
   */
  it('Property 32: generates compact JSON when requested', async () => {
    await fc.assert(
      fc.property(
        fc.constantFrom<IDEType>('cursor', 'windsurf', 'claude-desktop', 'generic'),
        (ide) => {
          const config = generateConfig(ide);
          const compactJson = formatConfig(config, false);

          // Verify JSON is valid
          const parsed = JSON.parse(compactJson);
          expect(parsed).toEqual(config);

          // Verify JSON is compact (no newlines except possibly in strings)
          const lines = compactJson.split('\n');
          expect(lines.length).toBe(1); // Single line
        }
      ),
      { numRuns: 100 }
    );
  });
});
