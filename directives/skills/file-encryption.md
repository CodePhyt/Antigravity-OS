# Skill: File Encryption (AES-256)

**Version**: 1.0.0  
**Status**: 🟢 ACTIVE  
**Category**: Security  
**Compliance**: Article II (Security-First Principles)

---

## Purpose

Securely encrypt and decrypt text files using AES-256-GCM encryption with authenticated encryption mode.

---

## Inputs

### Encryption
- `inputFile` (string): Path to plaintext file to encrypt
- `outputFile` (string): Path where encrypted file will be saved
- `password` (string): Encryption password (min 12 characters)

### Decryption
- `inputFile` (string): Path to encrypted file
- `outputFile` (string): Path where decrypted file will be saved
- `password` (string): Decryption password

---

## Outputs

### Success
```json
{
  "success": true,
  "operation": "encrypt" | "decrypt",
  "inputFile": "path/to/input",
  "outputFile": "path/to/output",
  "algorithm": "aes-256-gcm",
  "timestamp": "2026-01-20T..."
}
```

### Failure
```json
{
  "success": false,
  "error": "Error message",
  "code": "INVALID_PASSWORD" | "FILE_NOT_FOUND" | "ENCRYPTION_FAILED"
}
```

---

## Security Guarantees

1. **AES-256-GCM**: Authenticated encryption with associated data
2. **Random IV**: Unique initialization vector per encryption
3. **PBKDF2 Key Derivation**: 100,000 iterations with random salt
4. **Auth Tag**: 16-byte authentication tag prevents tampering
5. **No Password Storage**: Password never written to disk

---

## Edge Cases

1. **Empty File**: Returns error, requires non-empty input
2. **Weak Password**: Rejects passwords <12 characters
3. **Wrong Password**: Decryption fails with authentication error
4. **Corrupted File**: Auth tag verification fails
5. **Missing File**: Returns FILE_NOT_FOUND error

---

## Usage Example

```typescript
import { encryptFile, decryptFile } from '@/execution/skills/file-encryption';

// Encrypt
const result = await encryptFile({
  inputFile: './secret.txt',
  outputFile: './secret.enc',
  password: 'MySecurePassword123!'
});

// Decrypt
const decrypted = await decryptFile({
  inputFile: './secret.enc',
  outputFile: './secret-decrypted.txt',
  password: 'MySecurePassword123!'
});
```

---

## Failure Modes

1. **Invalid Password**: Decryption fails, returns INVALID_PASSWORD
2. **File Not Found**: Returns FILE_NOT_FOUND with path
3. **Permission Denied**: Returns PERMISSION_DENIED
4. **Disk Full**: Returns DISK_FULL during write
5. **Corrupted Data**: Returns ENCRYPTION_FAILED

---

## Recovery Strategies

1. **Backup Original**: Always keep original file until encryption verified
2. **Verify Decryption**: Test decrypt immediately after encrypt
3. **Atomic Operations**: Use temp files, atomic rename
4. **Error Logging**: Log all failures to security audit log

---

## Compliance

- ✅ Article II.1: Sandbox untrusted code (N/A - deterministic crypto)
- ✅ Article II.1: Validate all inputs (password length, file existence)
- ✅ Article II.1: Atomic operations (temp file → rename)
- ✅ Article II.1: Backup before modification (original preserved)
- ✅ Article II.3: Audit trail (log to security-audit.log)

---

**Last Updated**: 2026-01-20  
**Author**: Antigravity OS Orchestrator  
**Review Status**: ✅ Constitutional Compliance Verified
