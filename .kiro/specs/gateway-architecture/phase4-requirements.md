# Phase 4: CLI Integration & Skills - Requirements

**Feature**: CLI Gateway Integration + Git-Keeper & Researcher Skills  
**Status**: 🟢 APPROVED  
**Priority**: P0 (Critical - Completes Gateway Architecture)

---

## 1. CLI Gateway Integration

**User Story**: As a CLI user, I need transparent Gateway communication for instant command execution.

**Acceptance Criteria**:
- 1.1 CLI checks Gateway health before executing commands
- 1.2 CLI auto-starts Gateway if not running
- 1.3 CLI forwards test/status/validate commands to Gateway
- 1.4 CLI falls back to direct execution if Gateway unavailable
- 1.5 User experience unchanged (transparent optimization)

---

## 2. Git-Keeper Skill (Time Machine)

**User Story**: As an autonomous agent, I need to snapshot and rollback code changes without human intervention.

**Acceptance Criteria**:
- 2.1 `snapshot(message)` creates WIP commit
- 2.2 `rollback()` reverts to last snapshot (hard reset)
- 2.3 `diff()` returns current changes as string
- 2.4 Implements ISkill interface
- 2.5 Schema validation for inputs

---

## 3. Researcher Skill (Skeleton)

**User Story**: As an autonomous agent, I need web search capabilities for external research.

**Acceptance Criteria**:
- 3.1 Implements ISkill interface
- 3.2 Schema accepts `{ query: string, depth: number }`
- 3.3 Skeleton structure ready for Puppeteer/Fetch implementation
- 3.4 Returns placeholder response

---

**Total Requirements**: 3  
**Total Acceptance Criteria**: 13
