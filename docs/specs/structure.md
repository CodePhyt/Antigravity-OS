# Antigravity OS - Project Structure

## Directory Layout

```
antigravity-os/
├── .kiro/
│   ├── specs/                    # Feature specifications
│   │   └── {feature-name}/
│   │       ├── requirements.md   # User stories & acceptance criteria
│   │       ├── design.md         # Technical design & properties
│   │       └── tasks.md          # Implementation checklist
│   └── steering/                 # Kiro behavior rules
│       └── antigravity-protocol.md
│
├── docs/
│   ├── specs/                    # High-level specifications
│   │   ├── product.md           # Product vision
│   │   ├── tech.md              # Technical architecture
│   │   └── structure.md         # This file
│   └── sops/                     # Standard Operating Procedures
│
├── src/
│   ├── app/                      # Next.js app directory
│   │   ├── api/                 # API routes
│   │   ├── components/          # React components
│   │   └── page.tsx             # Main page
│   ├── lib/                      # Core libraries
│   │   ├── orchestrator/        # Spec execution engine
│   │   ├── spec-parser/         # Spec file parser
│   │   ├── ralph-loop/          # Self-correction engine
│   │   └── testing/             # Testing utilities
│   └── types/                    # TypeScript type definitions
│
├── tests/
│   ├── unit/                     # Unit tests
│   └── properties/               # Property-based tests
│
├── logs/                         # Execution logs
│   ├── execution-{timestamp}.log
│   └── errors-{timestamp}.log
│
├── DEVLOG.md                     # Development progress log
├── package.json
├── tsconfig.json
└── README.md
```

## File Naming Conventions

### Specs

- Feature directories: `kebab-case` (e.g., `spec-orchestrator`)
- Spec files: `requirements.md`, `design.md`, `tasks.md`

### Code

- Components: `PascalCase.tsx` (e.g., `SpecViewer.tsx`)
- Utilities: `camelCase.ts` (e.g., `parseSpec.ts`)
- Types: `PascalCase.ts` (e.g., `SpecTypes.ts`)

### Tests

- Unit tests: `{filename}.test.ts`
- Property tests: `{filename}.properties.ts`

## Module Organization

### Core Modules

1. **Orchestrator**: Manages spec execution lifecycle
2. **Spec Parser**: Reads and validates spec files
3. **Ralph Loop**: Handles error detection and correction
4. **Task Executor**: Runs individual tasks with progress tracking
5. **Test Runner**: Executes unit and property-based tests

### UI Modules

1. **Spec Viewer**: Display requirements, design, and tasks
2. **Execution Dashboard**: Real-time progress tracking
3. **Log Viewer**: Browse execution and error logs
4. **Spec Creator**: Guided spec generation interface

## Data Flow

```
User Input (Product Idea)
    ↓
Spec Generator (requirements → design → tasks)
    ↓
Orchestrator (reads tasks.md)
    ↓
Task Executor (sequential execution)
    ↓
Test Runner (validation)
    ↓
Ralph Loop (if errors detected)
    ↓
Completion Report
```

## Configuration Files

- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration
- `.eslintrc.json`: Linting rules
- `vitest.config.ts`: Test configuration
- `next.config.js`: Next.js configuration
