# File System Skill - Design Document

**Feature**: Safe file manipulation with automatic backups
**Status**: Draft
**Version**: 1.0.0

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Layer                               │
│  ag-os edit --file <path> --content <content>               │
│  ag-os edit --file <path> --search <old> --replace <new>    │
│  ag-os read --file <path>                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  FileSystemSkill                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ read()       │  │ write()      │  │ patch()      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Security Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ validatePath │  │ normalize    │  │ checkBounds  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Backup Layer                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ GitKeeper.snapshot("Backup before file mod")        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  File System (Node.js fs)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ readFile     │  │ writeFile    │  │ mkdir        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

**Read Operation**:
1. CLI → FileSystemSkill.execute({ operation: 'read', path })
2. Validate path (security check)
3. Normalize path (resolve relative paths)
4. Check workspace bounds
5. Read file with fs.readFileSync()
6. Return content

**Write Operation**:
1. CLI → FileSystemSkill.execute({ operation: 'write', path, content })
2. Validate path (security check)
3. Normalize path
4. Check workspace bounds
5. Create Git snapshot (GitKeeper)
6. Create parent directories if needed
7. Write file with fs.writeFileSync()
8. Return result

**Patch Operation**:
1. CLI → FileSystemSkill.execute({ operation: 'patch', path, search, replace })
2. Validate path (security check)
3. Normalize path
4. Check workspace bounds
5. Read current content
6. Search for exact string match
7. Verify single match (not zero, not multiple)
8. Create Git snapshot (GitKeeper)
9. Replace string
10. Write modified content
11. Return result

---

## 2. Interface Design

### 2.1 ISkill Implementation

```typescript
export interface FileSystemInput {
  operation: 'read' | 'write' | 'patch';
  path: string;
  content?: string;      // Required for 'write'
  search?: string;       // Required for 'patch'
  replace?: string;      // Required for 'patch'
  backup?: boolean;      // Optional, default: true
}

export interface FileSystemOutput {
  operation: string;
  path: string;
  success: boolean;
  
  // Read operation
  content?: string;
  size?: number;
  
  // Write operation
  created?: boolean;
  written?: number;
  
  // Patch operation
  matched?: boolean;
  replaced?: number;
  
  // Backup info
  backup?: string;       // Git commit hash
}
```

### 2.2 Schema Definition

```typescript
schema = {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['read', 'write', 'patch'],
      description: 'File operation type'
    },
    path: {
      type: 'string',
      description: 'File path (relative or absolute)',
      minLength: 1
    },
    content: {
      type: 'string',
      description: 'File content for write operation'
    },
    search: {
      type: 'string',
      description: 'Search string for patch operation',
      minLength: 1
    },
    replace: {
      type: 'string',
      description: 'Replacement string for patch operation'
    },
    backup: {
      type: 'boolean',
      description: 'Create Git snapshot before modification',
      default: true
    }
  },
  required: ['operation', 'path']
}
```

---

## 3. Security Design

### 3.1 Workspace Boundary Enforcement

```typescript
const WORKSPACE_ROOT = 'C:\\Users\\Kadir\\Desktop\\The Autonomous Spec-to-Production Engine';

function validatePath(inputPath: string): string {
  // 1. Normalize path (resolve . and ..)
  const normalized = path.resolve(WORKSPACE_ROOT, inputPath);
  
  // 2. Check if normalized path starts with workspace root
  if (!normalized.startsWith(WORKSPACE_ROOT)) {
    throw new SecurityError(
      `Path outside workspace: ${inputPath}\n` +
      `Workspace: ${WORKSPACE_ROOT}\n` +
      `Resolved: ${normalized}`
    );
  }
  
  // 3. Check for null bytes
  if (inputPath.includes('\0')) {
    throw new SecurityError('Path contains null byte');
  }
  
  return normalized;
}
```

### 3.2 Backup Strategy

```typescript
async function createBackup(filePath: string, operation: string): Promise<string> {
  const fileName = path.basename(filePath);
  const message = `Backup before ${operation}: ${fileName}`;
  
  try {
    const result = await gitKeeper.execute({
      operation: 'snapshot',
      message
    });
    
    return result.commit;
  } catch (error) {
    throw new BackupError(
      `Failed to create backup: ${error.message}\n` +
      `File: ${filePath}\n` +
      `Operation aborted for safety.`
    );
  }
}
```

### 3.3 Atomic Operations

All write/patch operations use atomic patterns:
1. Create backup first
2. Perform operation
3. If operation fails, backup exists for recovery
4. No partial writes (use writeFileSync, not streams)

---

## 4. Implementation Details

### 4.1 Read Operation

```typescript
private async executeRead(input: FileSystemInput): Promise<FileSystemOutput> {
  const validPath = this.validatePath(input.path);
  
  if (!fs.existsSync(validPath)) {
    throw new FileNotFoundError(`File not found: ${input.path}`);
  }
  
  const content = fs.readFileSync(validPath, 'utf-8');
  const stats = fs.statSync(validPath);
  
  return {
    operation: 'read',
    path: validPath,
    success: true,
    content,
    size: stats.size
  };
}
```

### 4.2 Write Operation

```typescript
private async executeWrite(input: FileSystemInput): Promise<FileSystemOutput> {
  if (!input.content) {
    throw new ValidationError('Content is required for write operation');
  }
  
  const validPath = this.validatePath(input.path);
  const fileExists = fs.existsSync(validPath);
  
  // Create backup if file exists and backup enabled
  let backupHash: string | undefined;
  if (fileExists && input.backup !== false) {
    backupHash = await this.createBackup(validPath, 'write');
  }
  
  // Create parent directories
  const dir = path.dirname(validPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(validPath, input.content, 'utf-8');
  
  return {
    operation: 'write',
    path: validPath,
    success: true,
    created: !fileExists,
    written: Buffer.byteLength(input.content, 'utf-8'),
    backup: backupHash
  };
}
```

### 4.3 Patch Operation

```typescript
private async executePatch(input: FileSystemInput): Promise<FileSystemOutput> {
  if (!input.search || input.replace === undefined) {
    throw new ValidationError('Search and replace are required for patch operation');
  }
  
  const validPath = this.validatePath(input.path);
  
  if (!fs.existsSync(validPath)) {
    throw new FileNotFoundError(`File not found: ${input.path}`);
  }
  
  // Read current content
  const content = fs.readFileSync(validPath, 'utf-8');
  
  // Count matches
  const matches = content.split(input.search).length - 1;
  
  if (matches === 0) {
    throw new SearchNotFoundError(
      `Search string not found in ${input.path}\n` +
      `Search: "${input.search.substring(0, 50)}..."`
    );
  }
  
  if (matches > 1) {
    throw new MultipleMatchesError(
      `Search string matches ${matches} times in ${input.path}\n` +
      `Search: "${input.search.substring(0, 50)}..."\n` +
      `Make search string more specific.`
    );
  }
  
  // Create backup
  let backupHash: string | undefined;
  if (input.backup !== false) {
    backupHash = await this.createBackup(validPath, 'patch');
  }
  
  // Replace string
  const newContent = content.replace(input.search, input.replace);
  
  // Write modified content
  fs.writeFileSync(validPath, newContent, 'utf-8');
  
  return {
    operation: 'patch',
    path: validPath,
    success: true,
    matched: true,
    replaced: 1,
    backup: backupHash
  };
}
```

---

## 5. CLI Integration

### 5.1 Command Structure

```typescript
// In src/cli.ts

type Command = 
  | 'test' 
  | 'test:quick' 
  | 'status' 
  | 'validate' 
  | 'ask' 
  | 'edit'      // NEW
  | 'read'      // NEW
  | 'gateway:start' 
  | 'gateway:stop' 
  | 'help';
```

### 5.2 Edit Command

```bash
# Write file
ag-os edit --file src/test.ts --content "console.log('hello');"

# Patch file
ag-os edit --file src/test.ts --search "hello" --replace "world"
```

```typescript
async function executeEdit(args: string[]): Promise<void> {
  const fileIndex = args.indexOf('--file');
  const contentIndex = args.indexOf('--content');
  const searchIndex = args.indexOf('--search');
  const replaceIndex = args.indexOf('--replace');
  
  if (fileIndex === -1) {
    console.error('❌ Error: --file is required');
    process.exit(1);
  }
  
  const filePath = args[fileIndex + 1];
  
  // Write operation
  if (contentIndex !== -1) {
    const content = args[contentIndex + 1];
    const result = await fileSystem.execute({
      operation: 'write',
      path: filePath,
      content
    });
    
    console.log(`✅ File written: ${result.path}`);
    if (result.backup) {
      console.log(`📦 Backup: ${result.backup}`);
    }
  }
  // Patch operation
  else if (searchIndex !== -1 && replaceIndex !== -1) {
    const search = args[searchIndex + 1];
    const replace = args[replaceIndex + 1];
    
    const result = await fileSystem.execute({
      operation: 'patch',
      path: filePath,
      search,
      replace
    });
    
    console.log(`✅ File patched: ${result.path}`);
    console.log(`📦 Backup: ${result.backup}`);
  }
  else {
    console.error('❌ Error: Provide --content OR --search + --replace');
    process.exit(1);
  }
}
```

### 5.3 Read Command

```bash
ag-os read --file src/test.ts
```

```typescript
async function executeRead(args: string[]): Promise<void> {
  const fileIndex = args.indexOf('--file');
  
  if (fileIndex === -1) {
    console.error('❌ Error: --file is required');
    process.exit(1);
  }
  
  const filePath = args[fileIndex + 1];
  
  const result = await fileSystem.execute({
    operation: 'read',
    path: filePath
  });
  
  console.log(`📄 ${result.path} (${result.size} bytes)\n`);
  console.log(result.content);
}
```

---

## 6. Error Handling

### 6.1 Custom Error Classes

```typescript
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

export class SearchNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchNotFoundError';
  }
}

export class MultipleMatchesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MultipleMatchesError';
  }
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}
```

### 6.2 Error Recovery

All errors are wrapped in `SkillExecutionError` with context:
- Original error message
- File path
- Operation type
- Input parameters

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Security Tests**:
- Block paths outside workspace
- Block relative paths that escape (../..)
- Block absolute paths to system files
- Block null bytes in paths

**Read Tests**:
- Read existing file
- Throw error for non-existent file
- Return correct content and size

**Write Tests**:
- Create new file
- Overwrite existing file
- Create parent directories
- Create Git snapshot before write
- Abort if backup fails

**Patch Tests**:
- Replace single match
- Throw error if no matches
- Throw error if multiple matches
- Create Git snapshot before patch
- Preserve file content except replaced string

### 7.2 Integration Tests

- CLI edit command creates Git snapshots
- CLI read command displays content
- Multiple operations in sequence
- Rollback using Git snapshots

---

## 8. Performance Considerations

### 8.1 Optimization Strategies

- Use synchronous fs operations (simpler, adequate for small files)
- Cache workspace root path
- Pre-compile path validation regex
- Limit file size to 10MB (throw error for larger files)

### 8.2 Performance Targets

- Read: <100ms for files <1MB
- Write: <500ms including Git snapshot
- Patch: <500ms including Git snapshot

---

## 9. Correctness Properties

### Property 1: Workspace Boundary Invariant
**Statement**: All file operations MUST occur within workspace boundaries.

**Validation**: Property-based test with random paths
```typescript
fc.assert(
  fc.property(fc.string(), (randomPath) => {
    try {
      fileSystem.execute({ operation: 'read', path: randomPath });
      // If no error, path must be within workspace
      const resolved = path.resolve(WORKSPACE_ROOT, randomPath);
      return resolved.startsWith(WORKSPACE_ROOT);
    } catch (error) {
      // SecurityError expected for invalid paths
      return error instanceof SecurityError;
    }
  })
);
```

### Property 2: Backup Before Modification
**Statement**: All write/patch operations MUST create Git snapshots before modification.

**Validation**: Mock GitKeeper and verify it's called
```typescript
fc.assert(
  fc.property(fc.string(), fc.string(), (path, content) => {
    const gitKeeperMock = vi.fn();
    fileSystem.execute({ operation: 'write', path, content });
    return gitKeeperMock.called;
  })
);
```

### Property 3: Atomic Operations
**Statement**: Operations either succeed completely or fail completely (no partial writes).

**Validation**: Inject failures and verify file state
```typescript
// If backup fails, file should not be modified
// If write fails, backup should exist for recovery
```

---

## 10. Deployment Checklist

- [ ] Implement FileSystemSkill class
- [ ] Add security validation
- [ ] Integrate GitKeeper for backups
- [ ] Add CLI commands (edit, read)
- [ ] Write unit tests (security, read, write, patch)
- [ ] Write property-based tests
- [ ] Test on Windows
- [ ] Update help text
- [ ] Document in README
- [ ] Create demo script

---

**Status**: Ready for Implementation
**Next Step**: Create tasks.md with implementation plan
