# Autonomous Fixer - Design Document

**Feature**: Self-healing autonomous error correction
**Status**: Draft
**Version**: 1.0.0

---

## 1. Architecture Overview

### 1.1 The Self-Correction Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI: ag-os fix "command"                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    FixerSkill (Orchestrator)                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Attempt 1:                                         │    │
│  │  1. Execute command → Capture error                │    │
│  │  2. Analyze error → Extract context                │    │
│  │  3. Research solution → Researcher skill           │    │
│  │  4. Apply fix → FileSystem skill                   │    │
│  │  5. Verify → Re-execute command                    │    │
│  └────────────────────────────────────────────────────┘    │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Attempt 2: (if Attempt 1 failed)                   │    │
│  │  - Different research query                        │    │
│  │  - Alternative fix approach                        │    │
│  └────────────────────────────────────────────────────┘    │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Attempt 3: (if Attempt 2 failed)                   │    │
│  │  - Last resort fix                                 │    │
│  │  - Report failure if still broken                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Skills Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Researcher   │  │ FileSystem   │  │ GitKeeper    │     │
│  │ (Solutions)  │  │ (Patches)    │  │ (Backups)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

**Successful Fix**:
1. Execute `npx tsx broken.ts` → Error: "Unexpected token ;"
2. Analyze error → File: broken.ts, Line: 1, Type: SyntaxError
3. Research → Query: "TypeScript SyntaxError Unexpected token semicolon"
4. Extract solution → "Add value after assignment operator"
5. Apply patch → Change `const x = ;` to `const x = 0;`
6. Verify → Execute `npx tsx broken.ts` → Success!

**Failed Fix** (after 3 attempts):
1. Attempt 1: Fix doesn't work
2. Attempt 2: Different fix, still doesn't work
3. Attempt 3: Last resort, still doesn't work
4. Report failure with all attempted fixes

---

## 2. Interface Design

### 2.1 ISkill Implementation

```typescript
export interface FixerInput {
  command: string;      // Command to execute and fix
  maxAttempts?: number; // Default: 3
  timeout?: number;     // Per-attempt timeout (default: 60000ms)
}

export interface FixerOutput {
  success: boolean;
  attempts: number;
  finalOutput: string;
  fixes: FixAttempt[];
}

export interface FixAttempt {
  attempt: number;
  error: string;
  errorAnalysis: ErrorAnalysis;
  research: string;
  patch?: PatchInfo;
  result: 'success' | 'failure';
  duration: number;
}

export interface ErrorAnalysis {
  file?: string;
  line?: number;
  column?: number;
  type: string;        // SyntaxError, TypeError, ReferenceError, etc.
  message: string;
  searchQuery: string;
}

export interface PatchInfo {
  file: string;
  search: string;
  replace: string;
  backup: string;      // Git commit hash
}
```

### 2.2 Schema Definition

```typescript
schema = {
  type: 'object',
  properties: {
    command: {
      type: 'string',
      description: 'Command to execute and fix',
      minLength: 1
    },
    maxAttempts: {
      type: 'number',
      description: 'Maximum fix attempts',
      minimum: 1,
      maximum: 5,
      default: 3
    },
    timeout: {
      type: 'number',
      description: 'Timeout per attempt (ms)',
      minimum: 10000,
      maximum: 300000,
      default: 60000
    }
  },
  required: ['command']
}
```

---

## 3. Implementation Details

### 3.1 Command Execution

```typescript
private async executeCommand(command: string, timeout: number): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const child = exec(command, { timeout }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout,
        stderr,
        exitCode: error?.code || 0
      });
    });
  });
}
```

### 3.2 Error Analysis

```typescript
private analyzeError(stderr: string): ErrorAnalysis {
  // Extract file path
  const fileMatch = stderr.match(/at\s+(.+?):(\d+):(\d+)/);
  const file = fileMatch?.[1];
  const line = fileMatch?.[2] ? parseInt(fileMatch[2]) : undefined;
  const column = fileMatch?.[3] ? parseInt(fileMatch[3]) : undefined;
  
  // Extract error type
  const typeMatch = stderr.match(/(SyntaxError|TypeError|ReferenceError|Error):/);
  const type = typeMatch?.[1] || 'Error';
  
  // Extract error message
  const messageMatch = stderr.match(/Error:\s*(.+?)(\n|$)/);
  const message = messageMatch?.[1] || stderr.substring(0, 200);
  
  // Generate search query
  const searchQuery = `${type} ${message} fix`;
  
  return {
    file,
    line,
    column,
    type,
    message,
    searchQuery
  };
}
```

### 3.3 Solution Research

```typescript
private async researchSolution(analysis: ErrorAnalysis): Promise<string> {
  const result = await researcher.execute({
    query: analysis.searchQuery,
    depth: 2  // Deep search for better solutions
  });
  
  // Extract most relevant solution
  const topResult = result.results[0];
  return topResult?.snippet || result.summary;
}
```

### 3.4 Fix Application

```typescript
private async applyFix(analysis: ErrorAnalysis, solution: string): Promise<PatchInfo | null> {
  if (!analysis.file) {
    return null;  // Can't fix without knowing which file
  }
  
  // Read current file content
  const fileContent = await fileSystem.execute({
    operation: 'read',
    path: analysis.file
  });
  
  // Extract problematic line
  const lines = fileContent.content!.split('\n');
  const problemLine = lines[analysis.line! - 1];
  
  // Generate fix based on error type
  const fix = this.generateFix(analysis, problemLine, solution);
  
  if (!fix) {
    return null;  // Couldn't generate fix
  }
  
  // Apply patch
  const patchResult = await fileSystem.execute({
    operation: 'patch',
    path: analysis.file,
    search: fix.search,
    replace: fix.replace
  });
  
  return {
    file: analysis.file,
    search: fix.search,
    replace: fix.replace,
    backup: patchResult.backup!
  };
}
```

### 3.5 Fix Generation

```typescript
private generateFix(
  analysis: ErrorAnalysis,
  problemLine: string,
  solution: string
): { search: string; replace: string } | null {
  
  // Syntax Error: Unexpected token ';'
  if (analysis.type === 'SyntaxError' && analysis.message.includes('Unexpected token')) {
    // Example: const x = ; → const x = 0;
    if (problemLine.includes('= ;')) {
      return {
        search: problemLine,
        replace: problemLine.replace('= ;', '= 0;')
      };
    }
  }
  
  // Type Error: Cannot find name 'x'
  if (analysis.type === 'TypeError' && analysis.message.includes('Cannot find name')) {
    const varName = analysis.message.match(/Cannot find name '(.+?)'/)?.[1];
    if (varName) {
      return {
        search: problemLine,
        replace: `const ${varName} = 0; // Auto-fixed\n${problemLine}`
      };
    }
  }
  
  // Generic fix: Comment out problematic line
  return {
    search: problemLine,
    replace: `// ${problemLine} // Auto-commented by fixer`
  };
}
```

### 3.6 The Main Loop

```typescript
async execute(input: FixerInput): Promise<FixerOutput> {
  const maxAttempts = input.maxAttempts || 3;
  const timeout = input.timeout || 60000;
  const fixes: FixAttempt[] = [];
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${maxAttempts}`);
    
    // 1. Execute command
    const result = await this.executeCommand(input.command, timeout);
    
    if (result.success) {
      // Success!
      return {
        success: true,
        attempts: attempt,
        finalOutput: result.stdout,
        fixes
      };
    }
    
    // 2. Analyze error
    const analysis = this.analyzeError(result.stderr);
    console.log(`❌ Error: ${analysis.type} - ${analysis.message}`);
    
    // 3. Research solution
    console.log(`🔍 Researching solution...`);
    const solution = await this.researchSolution(analysis);
    console.log(`💡 Found solution: ${solution.substring(0, 100)}...`);
    
    // 4. Apply fix
    console.log(`🔧 Applying fix...`);
    const patch = await this.applyFix(analysis, solution);
    
    if (patch) {
      console.log(`✅ Patch applied: ${patch.file}`);
      console.log(`📦 Backup: ${patch.backup}`);
    } else {
      console.log(`⚠️  Could not generate fix`);
    }
    
    // Record attempt
    fixes.push({
      attempt,
      error: result.stderr,
      errorAnalysis: analysis,
      research: solution,
      patch: patch || undefined,
      result: 'failure',
      duration: 0
    });
  }
  
  // All attempts failed
  return {
    success: false,
    attempts: maxAttempts,
    finalOutput: 'All fix attempts failed',
    fixes
  };
}
```

---

## 4. CLI Integration

### 4.1 Command Structure

```typescript
// In src/cli.ts

type Command = 
  | 'test' 
  | 'test:quick' 
  | 'status' 
  | 'validate' 
  | 'ask' 
  | 'edit'
  | 'read'
  | 'fix'      // NEW
  | 'gateway:start' 
  | 'gateway:stop' 
  | 'help';
```

### 4.2 Fix Command

```bash
# Fix a broken command
ag-os fix "npx tsx broken.ts"

# Fix tests
ag-os fix "npm test"

# Fix with custom attempts
ag-os fix "npm test" --attempts 5
```

```typescript
async function executeFix(args: string[]): Promise<void> {
  // Extract command (everything after "fix")
  const command = args.join(' ');
  
  if (!command || command.trim().length === 0) {
    console.error('❌ Error: Command is required');
    console.log('Usage: ag-os fix "<command>"');
    console.log('Example: ag-os fix "npx tsx broken.ts"');
    process.exit(1);
  }
  
  console.log(`🔧 Autonomous Fixer`);
  console.log(`Command: ${command}\n`);
  
  try {
    const result = await fixer.execute({
      command,
      maxAttempts: 3,
      timeout: 60000
    });
    
    if (result.success) {
      console.log(`\n✅ Fixed in ${result.attempts} attempt(s)!`);
      console.log(`\nFinal Output:`);
      console.log(result.finalOutput);
    } else {
      console.log(`\n❌ Could not fix after ${result.attempts} attempts`);
      console.log(`\nAttempted Fixes:`);
      result.fixes.forEach((fix, i) => {
        console.log(`\n${i + 1}. ${fix.errorAnalysis.type}: ${fix.errorAnalysis.message}`);
        if (fix.patch) {
          console.log(`   Patch: ${fix.patch.file}`);
          console.log(`   Backup: ${fix.patch.backup}`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Fixer failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
```

---

## 5. Safety Mechanisms

### 5.1 Command Whitelist

```typescript
const SAFE_COMMANDS = [
  'npm',
  'npx',
  'node',
  'tsc',
  'vitest',
  'tsx'
];

function validateCommand(command: string): void {
  const firstWord = command.split(' ')[0];
  
  if (!SAFE_COMMANDS.includes(firstWord)) {
    throw new SecurityError(
      `Command not whitelisted: ${firstWord}\n` +
      `Allowed: ${SAFE_COMMANDS.join(', ')}`
    );
  }
}
```

### 5.2 File Modification Limits

- Use FileSystem skill (inherits workspace sandboxing)
- Never modify node_modules
- Never modify system files
- Git snapshot before every modification

### 5.3 Rollback on Worse Errors

```typescript
// If fix makes error worse, rollback
if (newErrorSeverity > oldErrorSeverity) {
  await gitKeeper.execute({ action: 'rollback' });
  console.log('⚠️  Fix made things worse, rolled back');
}
```

---

## 6. Testing Strategy

### 6.1 Test Cases

**Syntax Errors**:
- Missing semicolon
- Unexpected token
- Unclosed bracket

**Type Errors**:
- Undefined variable
- Type mismatch
- Missing import

**Runtime Errors**:
- Null reference
- Division by zero
- File not found

### 6.2 Success Criteria

- 80% of syntax errors fixed
- 60% of type errors fixed
- 40% of runtime errors fixed
- 0% system damage
- 100% Git backup coverage

---

## 7. Limitations

### 7.1 Cannot Fix

- Errors in external dependencies
- Errors requiring architectural changes
- Errors requiring human judgment
- Errors in node_modules
- Errors in system files

### 7.2 May Struggle With

- Complex logic errors
- Performance issues
- Design flaws
- Multi-file refactoring

---

**Status**: Ready for Implementation
**Next Step**: Create tasks.md and implement
