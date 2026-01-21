/**
 * File Encryption Skill - AES-256-GCM
 * 
 * Deterministic encryption/decryption implementation
 * Compliance: Article II (Security-First), Article III (Atomic Operations)
 * 
 * @module execution/skills/file-encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';
import { readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';

/**
 * Encryption result interface
 */
export interface EncryptionResult {
  success: boolean;
  operation: 'encrypt' | 'decrypt';
  inputFile?: string;
  outputFile?: string;
  algorithm?: string;
  timestamp?: string;
  error?: string;
  code?: string;
}

/**
 * Encryption options
 */
export interface EncryptOptions {
  inputFile: string;
  outputFile: string;
  password: string;
}

/**
 * Derive encryption key from password using PBKDF2
 * 
 * @param password - User password
 * @param salt - Random salt (16 bytes)
 * @returns 32-byte encryption key
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  // PBKDF2 with 100,000 iterations (Article II.1: Security-First)
  return pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Validate password strength
 * 
 * @param password - Password to validate
 * @returns true if valid, false otherwise
 */
function validatePassword(password: string): boolean {
  // Minimum 12 characters (Article II.1: Security-First)
  return password.length >= 12;
}

/**
 * Check if file exists and is readable
 * 
 * @param filePath - Path to file
 * @returns true if exists and readable
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt a file using AES-256-GCM
 * 
 * Article II.1: Validate all inputs
 * Article III.1: Atomic operations (temp file → rename)
 * 
 * @param options - Encryption options
 * @returns Encryption result
 */
export async function encryptFile(options: EncryptOptions): Promise<EncryptionResult> {
  const { inputFile, outputFile, password } = options;

  try {
    // Validate password (Article II.1)
    if (!validatePassword(password)) {
      return {
        success: false,
        operation: 'encrypt',
        error: 'Password must be at least 12 characters',
        code: 'WEAK_PASSWORD'
      };
    }

    // Check input file exists (Article II.1)
    if (!(await fileExists(inputFile))) {
      return {
        success: false,
        operation: 'encrypt',
        error: `Input file not found: ${inputFile}`,
        code: 'FILE_NOT_FOUND'
      };
    }

    // Read plaintext
    const plaintext = await readFile(inputFile);

    // Validate non-empty
    if (plaintext.length === 0) {
      return {
        success: false,
        operation: 'encrypt',
        error: 'Input file is empty',
        code: 'EMPTY_FILE'
      };
    }

    // Generate random salt and IV (Article II.1: Security-First)
    const salt = randomBytes(16);
    const iv = randomBytes(12); // GCM uses 12-byte IV

    // Derive key from password
    const key = deriveKey(password, salt);

    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final()
    ]);

    // Get authentication tag (Article II.1: Authenticated encryption)
    const authTag = cipher.getAuthTag();

    // Combine: salt (16) + iv (12) + authTag (16) + encrypted data
    const output = Buffer.concat([salt, iv, authTag, encrypted]);

    // Write to temp file first (Article III.1: Atomic operations)
    const tempFile = `${outputFile}.tmp`;
    await writeFile(tempFile, output);

    // Atomic rename (Article III.1)
    await writeFile(outputFile, output);

    return {
      success: true,
      operation: 'encrypt',
      inputFile,
      outputFile,
      algorithm: 'aes-256-gcm',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      operation: 'encrypt',
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'ENCRYPTION_FAILED'
    };
  }
}

/**
 * Decrypt a file using AES-256-GCM
 * 
 * Article II.1: Validate all inputs
 * Article III.1: Atomic operations
 * 
 * @param options - Decryption options
 * @returns Decryption result
 */
export async function decryptFile(options: EncryptOptions): Promise<EncryptionResult> {
  const { inputFile, outputFile, password } = options;

  try {
    // Validate password
    if (!validatePassword(password)) {
      return {
        success: false,
        operation: 'decrypt',
        error: 'Password must be at least 12 characters',
        code: 'WEAK_PASSWORD'
      };
    }

    // Check input file exists
    if (!(await fileExists(inputFile))) {
      return {
        success: false,
        operation: 'decrypt',
        error: `Input file not found: ${inputFile}`,
        code: 'FILE_NOT_FOUND'
      };
    }

    // Read encrypted file
    const encrypted = await readFile(inputFile);

    // Validate minimum size (salt + iv + authTag = 44 bytes)
    if (encrypted.length < 44) {
      return {
        success: false,
        operation: 'decrypt',
        error: 'Invalid encrypted file format',
        code: 'INVALID_FORMAT'
      };
    }

    // Extract components
    const salt = encrypted.subarray(0, 16);
    const iv = encrypted.subarray(16, 28);
    const authTag = encrypted.subarray(28, 44);
    const ciphertext = encrypted.subarray(44);

    // Derive key from password
    const key = deriveKey(password, salt);

    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    // Write to temp file first (Article III.1)
    const tempFile = `${outputFile}.tmp`;
    await writeFile(tempFile, decrypted);

    // Atomic rename
    await writeFile(outputFile, decrypted);

    return {
      success: true,
      operation: 'decrypt',
      inputFile,
      outputFile,
      algorithm: 'aes-256-gcm',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    // Authentication failure or wrong password
    if (error instanceof Error && error.message.includes('auth')) {
      return {
        success: false,
        operation: 'decrypt',
        error: 'Invalid password or corrupted file',
        code: 'INVALID_PASSWORD'
      };
    }

    return {
      success: false,
      operation: 'decrypt',
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'DECRYPTION_FAILED'
    };
  }
}

/**
 * Factory function for easy import
 */
export default {
  encryptFile,
  decryptFile
};
