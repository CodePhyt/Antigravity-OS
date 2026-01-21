/**
 * Unit Tests for File Encryption Skill
 * 
 * Compliance: Article IX.2 (Testing Requirements)
 * Coverage Target: >80%
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptFile, decryptFile } from '../../../execution/skills/file-encryption';
import { writeFile, unlink, readFile } from 'fs/promises';
import { existsSync } from 'fs';

describe('File Encryption Skill', () => {
  const testDir = './tests/fixtures/encryption';
  const testFile = `${testDir}/test-plaintext.txt`;
  const encryptedFile = `${testDir}/test-encrypted.enc`;
  const decryptedFile = `${testDir}/test-decrypted.txt`;
  const testPassword = 'TestPassword123!';
  const testContent = 'This is a secret message for encryption testing.';

  beforeEach(async () => {
    // Create test file
    await writeFile(testFile, testContent);
  });

  afterEach(async () => {
    // Cleanup test files
    const files = [testFile, encryptedFile, decryptedFile];
    for (const file of files) {
      if (existsSync(file)) {
        await unlink(file);
      }
    }
  });

  describe('encryptFile', () => {
    it('should encrypt a file successfully', async () => {
      const result = await encryptFile({
        inputFile: testFile,
        outputFile: encryptedFile,
        password: testPassword
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('encrypt');
      expect(result.algorithm).toBe('aes-256-gcm');
      expect(existsSync(encryptedFile)).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const result = await encryptFile({
        inputFile: testFile,
        outputFile: encryptedFile,
        password: 'weak'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('WEAK_PASSWORD');
    });

    it('should reject non-existent input files', async () => {
      const result = await encryptFile({
        inputFile: './nonexistent.txt',
        outputFile: encryptedFile,
        password: testPassword
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('FILE_NOT_FOUND');
    });

    it('should reject empty files', async () => {
      await writeFile(testFile, '');

      const result = await encryptFile({
        inputFile: testFile,
        outputFile: encryptedFile,
        password: testPassword
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('EMPTY_FILE');
    });
  });

  describe('decryptFile', () => {
    beforeEach(async () => {
      // Encrypt a file first
      await encryptFile({
        inputFile: testFile,
        outputFile: encryptedFile,
        password: testPassword
      });
    });

    it('should decrypt a file successfully', async () => {
      const result = await decryptFile({
        inputFile: encryptedFile,
        outputFile: decryptedFile,
        password: testPassword
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('decrypt');
      expect(existsSync(decryptedFile)).toBe(true);

      // Verify content matches original
      const decrypted = await readFile(decryptedFile, 'utf-8');
      expect(decrypted).toBe(testContent);
    });

    it('should reject wrong password', async () => {
      const result = await decryptFile({
        inputFile: encryptedFile,
        outputFile: decryptedFile,
        password: 'WrongPassword123!'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_PASSWORD');
    });

    it('should reject weak passwords', async () => {
      const result = await decryptFile({
        inputFile: encryptedFile,
        outputFile: decryptedFile,
        password: 'weak'
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('WEAK_PASSWORD');
    });

    it('should reject non-existent input files', async () => {
      const result = await decryptFile({
        inputFile: './nonexistent.enc',
        outputFile: decryptedFile,
        password: testPassword
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('FILE_NOT_FOUND');
    });

    it('should reject invalid encrypted file format', async () => {
      // Create invalid encrypted file (too small)
      await writeFile(encryptedFile, 'invalid');

      const result = await decryptFile({
        inputFile: encryptedFile,
        outputFile: decryptedFile,
        password: testPassword
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_FORMAT');
    });
  });

  describe('Round-trip encryption/decryption', () => {
    it('should preserve content through encrypt-decrypt cycle', async () => {
      // Encrypt
      const encryptResult = await encryptFile({
        inputFile: testFile,
        outputFile: encryptedFile,
        password: testPassword
      });
      expect(encryptResult.success).toBe(true);

      // Decrypt
      const decryptResult = await decryptFile({
        inputFile: encryptedFile,
        outputFile: decryptedFile,
        password: testPassword
      });
      expect(decryptResult.success).toBe(true);

      // Verify content
      const original = await readFile(testFile, 'utf-8');
      const decrypted = await readFile(decryptedFile, 'utf-8');
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      // Encrypt twice with same password
      await encryptFile({
        inputFile: testFile,
        outputFile: encryptedFile,
        password: testPassword
      });
      const encrypted1 = await readFile(encryptedFile);

      await encryptFile({
        inputFile: testFile,
        outputFile: encryptedFile,
        password: testPassword
      });
      const encrypted2 = await readFile(encryptedFile);

      // Ciphertext should be different (random IV)
      expect(encrypted1.equals(encrypted2)).toBe(false);
    });
  });
});
