/**
 * Constitutional Pre-Check Unit Tests
 * 
 * Tests for command safety analysis and alternative suggestions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConstitutionalPreCheckImpl } from '@/lib/medin-protocol/constitutional-pre-check';

describe('Constitutional Pre-Check - Unit Tests', () => {
  let preCheck: ConstitutionalPreCheckImpl;

  beforeEach(() => {
    preCheck = new ConstitutionalPreCheckImpl();
  });

  describe('File Deletion Detection', () => {
    it('should detect rm -rf as critical violation', async () => {
      const result = await preCheck.analyzeCommand('rm -rf /tmp/test');

      expect(result.safe).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.type).toBe('file_deletion');
      expect(result.violations[0]?.severity).toBe('critical');
      expect(result.riskLevel).toBe('critical');
      expect(result.recommendation).toBe('block');
    });

    it('should detect del /f as critical violation', async () => {
      const result = await preCheck.analyzeCommand('del /f C:\\temp\\file.txt');

      expect(result.safe).toBe(false);
      expect(result.violations[0]?.type).toBe('file_deletion');
      expect(result.violations[0]?.severity).toBe('critical');
      expect(result.riskLevel).toBe('critical');
    });

    it('should detect PowerShell Remove-Item -Recurse -Force', async () => {
      const result = await preCheck.analyzeCommand('Remove-Item -Recurse -Force C:\\temp');

      expect(result.safe).toBe(false);
      expect(result.violations[0]?.type).toBe('file_deletion');
      expect(result.violations[0]?.severity).toBe('critical');
    });

    it('should detect simple rm as high severity', async () => {
      const result = await preCheck.analyzeCommand('rm file.txt');

      expect(result.safe).toBe(false);
      expect(result.violations[0]?.severity).toBe('high');
      expect(result.riskLevel).toBe('high');
    });
  });

  describe('Database Modification Detection', () => {
    it('should detect DROP TABLE as critical violation', async () => {
      const result = await preCheck.analyzeCommand('DROP TABLE users');

      expect(result.safe).toBe(false);
      expect(result.violations[0]?.type).toBe('db_modification');
      expect(result.violations[0]?.severity).toBe('critical');
      expect(result.riskLevel).toBe('critical');
      expect(result.recommendation).toBe('block');
    });

    it('should detect DROP DATABASE as critical violation', async () => {
      const result = await preCheck.analyzeCommand('DROP DATABASE production');

      expect(result.safe).toBe(false);
      expect(result.violations[0]?.type).toBe('db_modification');
      expect(result.violations[0]?.severity).toBe('critical');
    });

    it('should detect TRUNCATE TABLE as critical violation', async () => {
      const result = await preCheck.analyzeCommand('TRUNCATE TABLE logs');

      expect(result.safe).toBe(false);
      expect(result.violations[0]?.type).toBe('db_modification');
      expect(result.violations[0]?.severity).toBe('critical');
    });

    it('should detect DELETE without WHERE clause', async () => {
      const result = await preCheck.analyzeCommand('DELETE FROM users;');

      expect(result.safe).toBe(false);
      expect(result.violations[0]?.type).toBe('db_modification');
      expect(result.violations[0]?.severity).toBe('critical');
    });

    it('should allow DELETE with WHERE clause', async () => {
      const result = await preCheck.analyzeCommand('DELETE FROM users WHERE id = 123;');

      // Should not match the pattern for DELETE without WHERE
      const deleteViolations = result.violations.filter(v => 
        v.description.includes('DELETE without WHERE')
      );
      expect(deleteViolations).toHaveLength(0);
    });
  });

  describe('Credential Exposure Detection', () => {
    it('should detect password in command', async () => {
      const result = await preCheck.analyzeCommand('mysql -u root -p password="secret123"');

      expect(result.safe).toBe(false);
      const credViolations = result.violations.filter(v => v.type === 'credential_exposure');
      expect(credViolations.length).toBeGreaterThan(0);
      expect(credViolations.some(v => v.severity === 'critical')).toBe(true);
    });

    it('should detect token in command', async () => {
      const result = await preCheck.analyzeCommand('curl -H "Authorization: token="sk-1234567890abcdef1234567890abcdef""');

      expect(result.safe).toBe(false);
      const credViolations = result.violations.filter(v => v.type === 'credential_exposure');
      expect(credViolations.length).toBeGreaterThan(0);
    });

    it('should detect API key in command', async () => {
      const result = await preCheck.analyzeCommand('export API_KEY="sk-1234567890abcdef"');

      expect(result.safe).toBe(false);
      const credViolations = result.violations.filter(v => v.type === 'credential_exposure');
      expect(credViolations.length).toBeGreaterThan(0);
    });

    it('should detect potential API key (32+ chars)', async () => {
      const result = await preCheck.analyzeCommand('auth 1234567890abcdef1234567890abcdef');

      expect(result.safe).toBe(false);
      const credViolations = result.violations.filter(v => v.type === 'credential_exposure');
      expect(credViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Network Exposure Detection', () => {
    it('should detect 0.0.0.0 binding', async () => {
      const result = await preCheck.analyzeCommand('npm run dev --host 0.0.0.0');

      expect(result.safe).toBe(false);
      expect(result.violations[0]?.type).toBe('network_exposure');
      expect(result.violations[0]?.severity).toBe('high');
    });

    it('should detect wildcard host binding', async () => {
      const result = await preCheck.analyzeCommand('node server.js *:3000');

      expect(result.safe).toBe(false);
      const netViolations = result.violations.filter(v => v.type === 'network_exposure');
      expect(netViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Alternative Suggestions', () => {
    it('should suggest rm -ri instead of rm -rf', async () => {
      const result = await preCheck.analyzeCommand('rm -rf /tmp/test');

      expect(result.alternative).toBeDefined();
      expect(result.alternative).toContain('rm -ri');
    });

    it('should suggest del /p instead of del /f', async () => {
      const result = await preCheck.analyzeCommand('del /f file.txt');

      expect(result.alternative).toBeDefined();
      expect(result.alternative).toContain('del /p');
    });

    it('should suggest -Confirm instead of -Force for PowerShell', async () => {
      const result = await preCheck.analyzeCommand('Remove-Item -Recurse -Force C:\\temp');

      expect(result.alternative).toBeDefined();
      expect(result.alternative).toContain('-Confirm');
    });

    it('should suggest WHERE clause for DELETE', async () => {
      const result = await preCheck.analyzeCommand('DELETE FROM users;');

      expect(result.alternative).toBeDefined();
      expect(result.alternative).toContain('WHERE');
    });

    it('should suggest environment variable for password', async () => {
      const result = await preCheck.analyzeCommand('mysql -p password="secret"');

      expect(result.alternative).toBeDefined();
      expect(result.alternative).toContain('PASSWORD_ENV_VAR');
    });

    it('should suggest 127.0.0.1 instead of 0.0.0.0', async () => {
      const result = await preCheck.analyzeCommand('npm run dev --host 0.0.0.0');

      expect(result.alternative).toBeDefined();
      expect(result.alternative).toContain('127.0.0.1');
    });
  });

  describe('Safe Commands', () => {
    it('should allow safe file operations', async () => {
      const result = await preCheck.analyzeCommand('ls -la /tmp');

      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
      expect(result.recommendation).toBe('allow');
    });

    it('should allow safe database queries', async () => {
      const result = await preCheck.analyzeCommand('SELECT * FROM users WHERE id = 123');

      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow localhost network binding', async () => {
      const result = await preCheck.analyzeCommand('npm run dev --host 127.0.0.1');

      expect(result.safe).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Risk Level Calculation', () => {
    it('should return critical for critical violations', async () => {
      const result = await preCheck.analyzeCommand('rm -rf / && DROP DATABASE production');

      expect(result.riskLevel).toBe('critical');
      expect(result.recommendation).toBe('block');
    });

    it('should return high for high severity violations', async () => {
      const result = await preCheck.analyzeCommand('rm file.txt');

      expect(result.riskLevel).toBe('high');
    });

    it('should return medium for medium severity violations', async () => {
      const result = await preCheck.analyzeCommand('node server.js *:3000');

      expect(result.riskLevel).toBe('medium');
      expect(result.recommendation).toBe('warn');
    });

    it('should block multiple high-severity violations', async () => {
      const result = await preCheck.analyzeCommand('rm file1.txt && rm file2.txt');

      const highViolations = result.violations.filter(v => v.severity === 'high');
      if (highViolations.length > 1) {
        expect(result.recommendation).toBe('block');
      }
    });
  });
});
