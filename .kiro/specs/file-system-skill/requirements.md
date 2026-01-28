# File System Skill - Requirements

**Feature**: Safe file manipulation capabilities for autonomous agents
**Status**: Draft
**Priority**: High (Phase 6)

---

## 1. User Stories

### 1.1 As an autonomous agent, I need to read files
**So that** I can analyze code and understand the current state of the system.

**Acceptance Criteria**:
- Agent can read any file within the workspace
- Returns file content as string
- Throws error if file doesn't exist
- Throws error if path is outside workspace (SSRF protection)

### 1.2 As an autonomous agent, I need to write files
**So that** I can create new code or update existing files.

**Acceptance Criteria**:
- Agent can create new files
- Agent can overwrite existing files
- Automatically creates Git snapshot before modification
- Throws error if path is outside workspace
- Creates parent directories if needed

### 1.3 As an autonomous agent, I need to patch files
**So that** I can make surgical changes without rewriting entire files.

**Acceptance Criteria**:
- Agent can replace specific strings in files
- Uses exact string matching (like strReplace tool)
- Automatically creates Git snapshot before modification
- Throws error if search string not found
- Throws error if search string matches multiple locations
- Throws error if path is outside workspace

### 1.4 As a developer, I need CLI access to file operations
**So that** I can manually trigger file modifications when needed.

**Acceptance Criteria**:
- `ag-os edit --file <path> --content <content>` writes file
- `ag-os edit --file <path> --search <old> --replace <new>` patches file
- `ag-os read --file <path>` reads file
- All operations respect security boundaries
- All operations create Git snapshots

---

## 2. Security Requirements

### 2.1 Workspace Sandboxing
**Requirement**: All file operations MUST be restricted to the workspace directory.

**Acceptance Criteria**:
- Workspace root: `C:\Users\Kadir\Desktop\The Autonomous Spec-to-Production Engine`
- Block absolute paths outside workspace
- Block relative paths that escape workspace (e.g., `../../etc/passwd`)
- Block symbolic links that point outside workspace
- Throw `SecurityError` with clear message

### 2.2 Automatic Backups
**Requirement**: All write/patch operations MUST create Git snapshots before modification.

**Acceptance Criteria**:
- Call `GitKeeper.snapshot("Backup before file mod: <filename>")` before write
- Call `GitKeeper.snapshot("Backup before file patch: <filename>")` before patch
- If Git snapshot fails, abort the file operation
- Log all backup operations

### 2.3 Path Validation
**Requirement**: All paths MUST be validated and normalized.

**Acceptance Criteria**:
- Convert relative paths to absolute
- Normalize path separators (Windows/Unix)
- Resolve `.` and `..` components
- Validate path is within workspace
- Reject paths with null bytes or special characters

---

## 3. Functional Requirements

### 3.1 Read Operation
**Input**:
```typescript
{
  path: string; // Relative or absolute path
}
```

**Output**:
```typescript
{
  path: string;      // Normalized absolute path
  content: string;   // File content
  size: number;      // File size in bytes
  exists: boolean;   // Always true for successful reads
}
```

**Errors**:
- `SecurityError`: Path outside workspace
- `FileNotFoundError`: File doesn't exist
- `PermissionError`: Cannot read file

### 3.2 Write Operation
**Input**:
```typescript
{
  path: string;      // Relative or absolute path
  content: string;   // New file content
  backup?: boolean;  // Create Git snapshot (default: true)
}
```

**Output**:
```typescript
{
  path: string;      // Normalized absolute path
  size: number;      // Bytes written
  created: boolean;  // True if file was created
  backup: string;    // Git commit hash of backup
}
```

**Errors**:
- `SecurityError`: Path outside workspace
- `BackupError`: Git snapshot failed
- `PermissionError`: Cannot write file

### 3.3 Patch Operation
**Input**:
```typescript
{
  path: string;        // Relative or absolute path
  search: string;      // Exact string to find
  replace: string;     // Replacement string
  backup?: boolean;    // Create Git snapshot (default: true)
}
```

**Output**:
```typescript
{
  path: string;        // Normalized absolute path
  matched: boolean;    // True if search string found
  replaced: number;    // Number of replacements (should be 1)
  backup: string;      // Git commit hash of backup
}
```

**Errors**:
- `SecurityError`: Path outside workspace
- `FileNotFoundError`: File doesn't exist
- `SearchNotFoundError`: Search string not found
- `MultipleMatchesError`: Search string matches multiple locations
- `BackupError`: Git snapshot failed

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Read operations: <100ms for files <1MB
- Write operations: <500ms including Git snapshot
- Patch operations: <500ms including Git snapshot

### 4.2 Reliability
- All operations are atomic (succeed or fail completely)
- No partial writes
- Git snapshots always created before modifications

### 4.3 Usability
- Clear error messages with actionable guidance
- Consistent interface with other skills
- CLI commands are intuitive

---

## 5. Constraints

### 5.1 Technical Constraints
- Must work on Windows (primary) and Unix (secondary)
- Must integrate with existing GitKeeper skill
- Must implement ISkill interface
- Must use Node.js fs module (no external dependencies)

### 5.2 Security Constraints
- No operations outside workspace
- No execution of file content
- No following of symbolic links
- No access to system files

---

## 6. Dependencies

### 6.1 Internal Dependencies
- `GitKeeper` skill for automatic backups
- `ISkill` interface for consistency
- CLI framework for command integration

### 6.2 External Dependencies
- Node.js `fs` module (built-in)
- Node.js `path` module (built-in)

---

## 7. Success Metrics

- 100% of file operations within workspace boundaries
- 100% of write/patch operations create Git snapshots
- Zero security violations
- <1% operation failure rate
- 100% test coverage for security features

---

## 8. Out of Scope

- File watching/monitoring
- Directory operations (create, delete, list)
- File permissions management
- Binary file operations
- Large file streaming (>10MB)

---

**Status**: Ready for Design
**Next Step**: Create design.md with implementation details
