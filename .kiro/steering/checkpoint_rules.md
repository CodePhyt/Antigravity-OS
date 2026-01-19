---
title: Human-in-the-Loop Checkpoint Protocol
version: 1.0.0
date: 2026-01-19
status: Active
---

# Human-in-the-Loop Checkpoint Protocol

## Purpose

This protocol implements Cole Medin's "Human-Aware" pattern, ensuring critical decisions receive human review before execution. It balances autonomous operation with strategic human oversight.

## Core Principle

> **"Autonomy with Accountability"**  
> The agent operates autonomously for routine tasks but pauses for human confirmation on irreversible or high-impact changes.

## Checkpoint Triggers

### Mandatory Checkpoints (MUST pause)

#### 1. Architectural Changes
**Trigger**: Any change that affects system architecture
- Adding/removing layers in A.N.T. framework
- Changing database schema
- Modifying API contracts
- Altering authentication/authorization logic
- Introducing new external dependencies

**Impact Analysis Required**:
- Affected components
- Breaking changes
- Migration requirements
- Rollback strategy
- Testing implications

#### 2. Spec File Modifications
**Trigger**: Changes to requirements, design, or task specifications
- Adding/removing requirements
- Modifying acceptance criteria
- Changing correctness properties
- Restructuring task hierarchy
- Altering dependency relationships

**Impact Analysis Required**:
- Requirement coverage impact
- Property validation changes
- Task execution order effects
- Test suite modifications needed
- Documentation updates required

#### 3. File Deletions
**Trigger**: Deleting any file (code, spec, config, test)
- Source code files
- Test files
- Configuration files
- Documentation files
- Spec files

**Impact Analysis Required**:
- Dependent files/modules
- Test coverage impact
- Build/deployment effects
- Documentation gaps created
- Recovery procedure

#### 4. Security-Sensitive Changes
**Trigger**: Changes affecting security posture
- Authentication logic
- Authorization rules
- API key management
- Data encryption
- Input validation
- Rate limiting

**Impact Analysis Required**:
- Security implications
- Vulnerability introduction risk
- Compliance requirements
- Audit trail needs
- Penetration testing required

#### 5. Production Deployment
**Trigger**: Deploying to production environment
- Merging to main branch
- Creating production builds
- Updating production configs
- Database migrations
- API version changes

**Impact Analysis Required**:
- Deployment risk level
- Rollback plan
- Monitoring requirements
- User impact
- Downtime expectations

### Optional Checkpoints (SHOULD pause)

#### 6. Complex Refactoring
**Trigger**: Large-scale code restructuring
- Moving files between directories
- Renaming core modules
- Extracting shared utilities
- Consolidating duplicate code

**Impact Analysis Required**:
- Files affected count
- Import statement changes
- Test updates needed
- Documentation updates

#### 7. Performance Optimizations
**Trigger**: Changes targeting performance
- Algorithm complexity changes
- Caching strategies
- Database query optimization
- Bundle size reduction

**Impact Analysis Required**:
- Performance metrics before/after
- Trade-offs (speed vs. memory)
- Benchmark results
- Regression risk

#### 8. Third-Party Integrations
**Trigger**: Adding external service integrations
- New API integrations
- External webhook endpoints
- Third-party libraries
- Cloud service connections

**Impact Analysis Required**:
- Service reliability
- Cost implications
- Data privacy concerns
- Vendor lock-in risk
- Fallback strategy

## Checkpoint Protocol

### Step 1: Detect Checkpoint Trigger
```typescript
// In task execution flow
if (isCheckpointRequired(task)) {
  await executeCheckpointProtocol(task);
}
```

### Step 2: Generate Impact Analysis
```typescript
interface ImpactAnalysis {
  trigger: CheckpointTrigger;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedComponents: string[];
  breakingChanges: boolean;
  rollbackStrategy: string;
  testingRequired: string[];
  estimatedRisk: number; // 0-100
  recommendation: 'proceed' | 'review' | 'reject';
}
```

### Step 3: Present to Human
**Format**:
```markdown
## 🚨 Checkpoint Required: [Trigger Type]

### Summary
[Brief description of the proposed change]

### Impact Analysis
- **Severity**: [low/medium/high/critical]
- **Affected Components**: [list]
- **Breaking Changes**: [yes/no]
- **Estimated Risk**: [0-100]

### Details
[Detailed explanation of what will change and why]

### Rollback Strategy
[How to undo this change if needed]

### Testing Required
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Performance testing

### Recommendation
[proceed/review/reject] - [reasoning]

### Options
1. **Proceed** - Execute the change
2. **Modify** - Adjust the approach
3. **Reject** - Cancel the change
4. **Defer** - Postpone for later review

**What would you like to do?**
```

### Step 4: Await Human Decision
- Pause execution
- Wait for user input
- Log decision to DEVLOG.md
- Proceed based on decision

### Step 5: Execute or Abort
```typescript
switch (decision) {
  case 'proceed':
    await executeChange(task);
    await logCheckpointApproval(task, impactAnalysis);
    break;
  case 'modify':
    await requestModifications(task);
    await executeCheckpointProtocol(modifiedTask);
    break;
  case 'reject':
    await logCheckpointRejection(task, impactAnalysis);
    await skipTask(task);
    break;
  case 'defer':
    await markTaskAsDeferred(task);
    break;
}
```

## Checkpoint Bypass (Emergency Mode)

### When to Bypass
- Critical production bug fix
- Security vulnerability patch
- Data loss prevention
- System outage recovery

### Bypass Protocol
1. Log bypass reason
2. Execute change immediately
3. Generate post-execution report
4. Request retroactive review
5. Update checkpoint rules if needed

### Bypass Command
```typescript
// Emergency bypass (use sparingly)
await executeWithBypass(task, {
  reason: 'Critical security patch',
  severity: 'critical',
  approver: 'system',
  retroactiveReview: true
});
```

## Checkpoint Logging

### Log Format
```json
{
  "timestamp": "2026-01-19T15:30:00Z",
  "checkpointId": "cp-001",
  "trigger": "architectural_change",
  "task": "3.1 Create atomic file writer",
  "impactAnalysis": {
    "severity": "medium",
    "affectedComponents": ["file-system", "task-manager"],
    "breakingChanges": false,
    "estimatedRisk": 30
  },
  "decision": "proceed",
  "approver": "human",
  "notes": "Approved after reviewing rollback strategy"
}
```

### Log Location
- `.kiro/logs/checkpoints.log` (structured JSON)
- `DEVLOG.md` (human-readable summary)

## Checkpoint Metrics

### Track These Metrics
- Checkpoint frequency (per day/week)
- Approval rate (proceed vs. reject)
- Average decision time
- Bypass frequency
- Post-checkpoint issues

### Success Criteria
- <5% checkpoint bypass rate
- >90% approval rate (indicates good judgment)
- <10 minutes average decision time
- Zero critical issues from approved checkpoints

## Integration with B.L.A.S.T.

### Enhanced B.L.A.S.T. with Checkpoints
1. **Build**: Execute code/tests
2. **Log**: Capture full context
3. **Analyze**: Check against specs and memory
4. **Spec**: UPDATE documentation (⚠️ CHECKPOINT if major change)
5. **Test**: Re-run until green

### Checkpoint Decision Tree
```
Spec Update Required?
  ↓
Is it a minor clarification? → No Checkpoint
  ↓
Is it a new requirement? → CHECKPOINT
  ↓
Is it an architectural change? → CHECKPOINT
  ↓
Is it a property modification? → CHECKPOINT
```

## Examples

### Example 1: Architectural Change
```markdown
## 🚨 Checkpoint Required: Architectural Change

### Summary
Adding n8n webhook integration to Ralph-Loop engine

### Impact Analysis
- **Severity**: high
- **Affected Components**: ralph-loop.ts, task-manager.ts, n8n-client.ts
- **Breaking Changes**: no
- **Estimated Risk**: 40

### Details
Integrating n8n Deep Research Agent into Ralph-Loop for complex error handling.
This adds a new external dependency and changes error recovery flow.

### Rollback Strategy
1. Remove n8n client calls
2. Revert to standard Ralph-Loop correction
3. No data loss, no breaking changes

### Testing Required
- [x] Unit tests for n8n client
- [x] Integration tests for Ralph-Loop
- [ ] Manual testing with real errors
- [ ] Performance testing (webhook latency)

### Recommendation
**proceed** - Well-documented, clear rollback, comprehensive tests

**What would you like to do?**
```

### Example 2: Spec Modification
```markdown
## 🚨 Checkpoint Required: Spec File Modification

### Summary
Adding new requirement: "System must validate specs before execution"

### Impact Analysis
- **Severity**: medium
- **Affected Components**: requirements.md, task-manager.ts
- **Breaking Changes**: no
- **Estimated Risk**: 20

### Details
Adding Requirement 1.8: Spec Validation
This requires implementing a new validation workflow before task execution.

### Rollback Strategy
1. Remove requirement from requirements.md
2. Skip validation step in task manager
3. No impact on existing functionality

### Testing Required
- [ ] Unit tests for validation logic
- [ ] Integration tests with invalid specs
- [ ] Property tests for validation completeness

### Recommendation
**proceed** - Improves system reliability, low risk

**What would you like to do?**
```

## Best Practices

### For Agents
1. **Always generate impact analysis** before requesting checkpoint
2. **Be honest about risks** - don't downplay severity
3. **Provide clear options** - make decision easy for human
4. **Log all decisions** - maintain audit trail
5. **Learn from rejections** - update judgment criteria

### For Humans
1. **Review impact analysis carefully** - don't rubber-stamp
2. **Ask questions** if unclear - agent should clarify
3. **Consider long-term implications** - not just immediate impact
4. **Document reasoning** - helps agent learn
5. **Trust the process** - checkpoints prevent disasters

## Continuous Improvement

### Checkpoint Tuning
- Review checkpoint logs monthly
- Adjust trigger thresholds based on outcomes
- Add new triggers as patterns emerge
- Remove unnecessary checkpoints if safe

### Learning from Bypasses
- Every bypass is a learning opportunity
- Update checkpoint rules to prevent future bypasses
- Document bypass patterns in memory graph

## Compliance

### Audit Requirements
- All checkpoints logged with full context
- Human decisions recorded with reasoning
- Bypasses require justification
- Monthly checkpoint review reports

### Regulatory Considerations
- GDPR: Data deletion requires checkpoint
- SOC 2: Security changes require checkpoint
- HIPAA: PHI handling requires checkpoint
- PCI DSS: Payment logic requires checkpoint

---

**Status**: 🟢 ACTIVE  
**Version**: 1.0.0  
**Last Updated**: 2026-01-19  
**Next Review**: After 10 checkpoints or 1 month

**Philosophy**: *"Autonomy with accountability. Speed with safety. Trust with verification."*
