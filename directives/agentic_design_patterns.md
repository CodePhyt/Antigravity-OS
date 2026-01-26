# Agentic Design Patterns - Implementation Guide

**Version**: 1.0.0  
**Status**: 🟢 ACTIVE  
**Reference**: https://github.com/sarwarbeing-ai/Agentic_Design_Patterns  
**Last Updated**: 2026-01-20

---

## Purpose

This directive implements three core agentic design patterns that transform Antigravity OS from a reactive system into a proactive, self-improving autonomous agent:

1. **Reflection Pattern**: Self-review and improvement
2. **Tool-Centric Reasoning**: Deterministic execution prioritization
3. **Planning Logic**: Plan-Act-Observe cycle

---

## Pattern 1: Reflection Pattern

### Philosophy

_"Every execution is an opportunity for improvement. Reflect before delivering."_

### Mandate

**ALL task executions MUST include a mandatory self-review step before final delivery.**

### Implementation Protocol

#### Step 1: Execute Task

```typescript
// Execute the primary task
const result = await executeTask(task);
```

#### Step 2: Reflect on Output

```typescript
// Mandatory reflection phase
const reflection = await reflectOnOutput(result, {
  criteria: [
    'correctness',
    'completeness',
    'efficiency',
    'maintainability',
    'security',
    'documentation',
  ],
});
```

#### Step 3: Identify Improvements

```typescript
// Analyze reflection for potential improvements
const improvements = identifyImprovements(reflection);

if (improvements.length > 0) {
  // Apply improvements if beneficial
  const enhancedResult = await applyImprovements(result, improvements);
  return enhancedResult;
}

return result;
```

### Reflection Criteria

**Correctness**:

- Does the output meet all requirements?
- Are there any edge cases not handled?
- Do all tests pass?

**Completeness**:

- Is anything missing from the specification?
- Are all acceptance criteria satisfied?
- Is documentation complete?

**Efficiency**:

- Can this be done faster?
- Are there unnecessary operations?
- Is memory usage optimal?

**Maintainability**:

- Is the code readable?
- Are there clear comments?
- Is the structure logical?

**Security**:

- Are inputs validated?
- Are there potential vulnerabilities?
- Is sensitive data protected?

**Documentation**:

- Are all functions documented?
- Are examples provided?
- Is the README updated?

### Reflection Output Format

```typescript
interface ReflectionResult {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  improvements: Improvement[];
  recommendation: 'deliver' | 'improve' | 'reject';
}

interface Improvement {
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}
```

### Integration Points

**In Orchestrator** (`src/core/orchestrator.ts`):

```typescript
async function executeTaskWithReflection(task: Task): Promise<TaskResult> {
  // 1. Execute task
  const result = await executeTask(task);

  // 2. Reflect on output
  const reflection = await reflectOnOutput(result);

  // 3. Apply improvements if score < 90
  if (reflection.score < 90 && reflection.improvements.length > 0) {
    const enhancedResult = await applyImprovements(result, reflection.improvements);
    return enhancedResult;
  }

  // 4. Log reflection to memory graph
  await logReflection(task, reflection);

  return result;
}
```

**In Ralph-Loop** (`src/core/ralph-loop.ts`):

```typescript
async function correctWithReflection(error: ErrorContext): Promise<Correction> {
  // 1. Generate correction
  const correction = await generateCorrection(error);

  // 2. Reflect on correction quality
  const reflection = await reflectOnCorrection(correction);

  // 3. Improve correction if needed
  if (reflection.score < 80) {
    const enhancedCorrection = await enhanceCorrection(correction, reflection);
    return enhancedCorrection;
  }

  return correction;
}
```

### Reflection Triggers

**Mandatory Reflection**:

- After completing any task
- Before marking task as complete
- After generating corrections
- Before committing code changes

**Optional Reflection**:

- During long-running tasks (periodic check-ins)
- After applying improvements
- When user requests review

### Reflection Metrics

**Track in Telemetry**:

- Average reflection score
- Improvement application rate
- Time spent on reflection
- Impact of improvements

**Success Criteria**:

- Average reflection score >85
- Improvement application rate >50%
- Reflection time <10% of total execution time

---

## Pattern 2: Tool-Centric Reasoning

### Philosophy

_"Deterministic tools over probabilistic generation. Always."_

### Mandate

**The orchestrator MUST prioritize using deterministic scripts from the Execution Layer over probabilistic text generation.**

### Decision Tree

```
Task Received
  ↓
Does a skill exist for this task?
  ├─ YES → Use skill from /execution
  └─ NO → Can we create a skill?
      ├─ YES → Create skill, then use it
      └─ NO → Use probabilistic generation (last resort)
```

### Implementation Protocol

#### Step 1: Skill Discovery

```typescript
async function selectExecutionMethod(task: Task): Promise<ExecutionMethod> {
  // 1. Search for existing skill
  const skill = await findMatchingSkill(task);

  if (skill) {
    return { type: 'skill', skill };
  }

  // 2. Check if skill can be created
  const canCreateSkill = await canCreateSkillFor(task);

  if (canCreateSkill) {
    const newSkill = await createSkill(task);
    return { type: 'skill', skill: newSkill };
  }

  // 3. Fall back to probabilistic generation
  return { type: 'generation' };
}
```

#### Step 2: Skill Matching Algorithm

```typescript
async function findMatchingSkill(task: Task): Promise<Skill | null> {
  // Extract keywords from task description
  const keywords = extractKeywords(task.description);

  // Search skill registry
  const matches = SKILL_REGISTRY.filter((skill) =>
    skill.keywords.some((keyword) => keywords.includes(keyword))
  );

  // Rank by relevance
  const ranked = rankByRelevance(matches, task);

  // Return best match if confidence > 70%
  return ranked.length > 0 && ranked[0].confidence > 0.7 ? ranked[0].skill : null;
}
```

#### Step 3: Skill Creation Decision

```typescript
async function canCreateSkillFor(task: Task): Promise<boolean> {
  // Criteria for skill creation
  return (
    task.isRepetitive && // Task will be repeated
    task.isDeterministic && // Task has deterministic logic
    task.complexity < 'high' && // Not too complex
    task.hasTestableOutput // Output can be validated
  );
}
```

### Tool-Centric Hierarchy

**Priority 1: Existing Skills** (Highest Priority)

- Use skills from `/execution/skills/`
- Fastest execution
- Proven reliability
- Fully tested

**Priority 2: Create New Skill** (Medium Priority)

- Create skill if task is repetitive
- Add to skill registry
- Test thoroughly
- Document in directive

**Priority 3: Probabilistic Generation** (Last Resort)

- Only when no skill exists or can be created
- One-time tasks
- Highly creative tasks
- Complex reasoning tasks

### Integration with Orchestrator

```typescript
class Orchestrator {
  async executeTask(task: Task): Promise<TaskResult> {
    // 1. Consult memory graph (Memory-First Development)
    const insights = await consultMemoryGraph(task);

    // 2. Select execution method (Tool-Centric Reasoning)
    const method = await selectExecutionMethod(task);

    // 3. Execute using selected method
    let result: TaskResult;

    if (method.type === 'skill') {
      result = await executeSkill(method.skill, task);
    } else {
      result = await generateSolution(task);
    }

    // 4. Reflect on output (Reflection Pattern)
    const reflection = await reflectOnOutput(result);

    // 5. Apply improvements if needed
    if (reflection.score < 90) {
      result = await applyImprovements(result, reflection.improvements);
    }

    // 6. Log to telemetry
    await logExecution(task, method, result, reflection);

    return result;
  }
}
```

### Skill Creation Workflow

**When creating a new skill**:

1. **Analyze Task**: Extract deterministic logic
2. **Create Directive**: Write SOP in `/directives/skills/`
3. **Implement Script**: Write deterministic script in `/execution/skills/`
4. **Write Tests**: Unit + property-based tests
5. **Register Skill**: Add to `docs/SKILLS_REGISTRY.md`
6. **Update Orchestrator**: Add to skill index

### Metrics

**Track in Telemetry**:

- Skill usage rate (vs. generation)
- Skill creation rate
- Skill success rate
- Time saved by using skills

**Success Criteria**:

- Skill usage rate >70%
- Skill success rate >95%
- Time saved >50% (vs. generation)

---

## Pattern 3: Planning Logic (Plan-Act-Observe)

### Philosophy

_"Break down complexity. Plan before acting. Observe before continuing."_

### Mandate

**ALL complex tasks MUST be decomposed into a Plan-Act-Observe cycle.**

### The Cycle

```
PLAN
  ↓
ACT
  ↓
OBSERVE
  ↓
Success? ─YES→ Complete
  ↓
  NO
  ↓
REPLAN (with observations)
  ↓
(repeat cycle, max 3 iterations)
```

### Implementation Protocol

#### Phase 1: PLAN

```typescript
async function planTask(task: Task): Promise<Plan> {
  // 1. Analyze task complexity
  const complexity = analyzeComplexity(task);

  if (complexity === 'simple') {
    // Simple tasks don't need planning
    return { steps: [{ action: 'execute', task }] };
  }

  // 2. Decompose into steps
  const steps = await decomposeTask(task);

  // 3. Identify dependencies
  const dependencies = identifyDependencies(steps);

  // 4. Create execution plan
  return {
    steps,
    dependencies,
    expectedOutcome: task.expectedOutcome,
    successCriteria: task.acceptanceCriteria,
  };
}
```

#### Phase 2: ACT

```typescript
async function executeStep(step: PlanStep): Promise<StepResult> {
  // 1. Select execution method (Tool-Centric Reasoning)
  const method = await selectExecutionMethod(step);

  // 2. Execute step
  const result = await execute(method, step);

  // 3. Capture observations
  const observations = captureObservations(result);

  return {
    result,
    observations,
    success: result.success,
  };
}
```

#### Phase 3: OBSERVE

```typescript
async function observeResults(plan: Plan, stepResults: StepResult[]): Promise<Observation> {
  // 1. Check if plan succeeded
  const success = stepResults.every((r) => r.success);

  if (success) {
    return {
      status: 'success',
      message: 'Plan executed successfully',
    };
  }

  // 2. Analyze failures
  const failures = stepResults.filter((r) => !r.success);
  const analysis = await analyzeFailures(failures);

  // 3. Determine if replanning is needed
  const needsReplanning = analysis.severity > 'low';

  return {
    status: 'failure',
    failures,
    analysis,
    needsReplanning,
  };
}
```

#### Phase 4: REPLAN (if needed)

```typescript
async function replan(originalPlan: Plan, observation: Observation): Promise<Plan> {
  // 1. Incorporate observations
  const insights = extractInsights(observation);

  // 2. Adjust plan based on failures
  const adjustedSteps = await adjustSteps(originalPlan.steps, observation.failures);

  // 3. Create new plan
  return {
    ...originalPlan,
    steps: adjustedSteps,
    iteration: originalPlan.iteration + 1,
    insights,
  };
}
```

### Integration with Ralph-Loop

**Enhanced Ralph-Loop with Plan-Act-Observe**:

```typescript
async function ralphLoopWithPlanning(task: Task): Promise<TaskResult> {
  let attempt = 0;
  const maxAttempts = 3;

  // PLAN
  let plan = await planTask(task);

  while (attempt < maxAttempts) {
    attempt++;

    // ACT
    const stepResults = await executeAllSteps(plan);

    // OBSERVE
    const observation = await observeResults(plan, stepResults);

    if (observation.status === 'success') {
      // Success! Reflect and deliver
      const reflection = await reflectOnOutput(stepResults);
      return {
        success: true,
        results: stepResults,
        reflection,
        attempts: attempt,
      };
    }

    // REPLAN (if not last attempt)
    if (attempt < maxAttempts && observation.needsReplanning) {
      plan = await replan(plan, observation);

      // Log replanning to memory graph
      await logReplanning(task, plan, observation);
    } else {
      // Exhausted attempts, trigger n8n Deep Research
      await triggerDeepResearch(task, observation);
      break;
    }
  }

  return {
    success: false,
    attempts: attempt,
    lastObservation: observation,
  };
}
```

### Task Complexity Analysis

```typescript
function analyzeComplexity(task: Task): 'simple' | 'medium' | 'complex' {
  const factors = {
    dependencies: task.dependencies.length,
    subtasks: task.subtasks?.length || 0,
    unknowns: countUnknowns(task),
    riskLevel: task.riskLevel || 'low',
  };

  if (factors.dependencies === 0 && factors.subtasks === 0) {
    return 'simple';
  }

  if (factors.dependencies > 3 || factors.subtasks > 5 || factors.unknowns > 2) {
    return 'complex';
  }

  return 'medium';
}
```

### Planning Strategies

**Sequential Planning** (Default):

- Execute steps one by one
- Each step depends on previous
- Safe and predictable

**Parallel Planning** (Advanced):

- Execute independent steps concurrently
- Faster execution
- Requires careful dependency analysis

**Adaptive Planning** (Expert):

- Adjust plan dynamically based on observations
- Most flexible
- Highest complexity

### Metrics

**Track in Telemetry**:

- Planning success rate
- Average replanning count
- Time spent planning vs. executing
- Observation accuracy

**Success Criteria**:

- Planning success rate >80%
- Average replanning count <1.5
- Planning time <20% of total execution

---

## Integration Summary

### Orchestrator Enhancement

```typescript
class EnhancedOrchestrator {
  async executeTask(task: Task): Promise<TaskResult> {
    // 1. Memory-First Development (Rule 1)
    const insights = await consultMemoryGraph(task);

    // 2. Planning Logic (Pattern 3)
    const plan = await planTask(task);

    // 3. Tool-Centric Reasoning (Pattern 2)
    const executionMethods = await selectExecutionMethods(plan.steps);

    // 4. Execute with Plan-Act-Observe
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;

      // ACT
      const results = await executeSteps(plan.steps, executionMethods);

      // OBSERVE
      const observation = await observeResults(plan, results);

      if (observation.status === 'success') {
        // 5. Reflection Pattern (Pattern 1)
        const reflection = await reflectOnOutput(results);

        // 6. Apply improvements if needed
        if (reflection.score < 90) {
          results = await applyImprovements(results, reflection.improvements);
        }

        // 7. Log to telemetry
        await logExecution(task, results, reflection);

        return {
          success: true,
          results,
          reflection,
          attempts: attempt,
        };
      }

      // REPLAN if needed
      if (attempt < maxAttempts && observation.needsReplanning) {
        plan = await replan(plan, observation);
      }
    }

    // Exhausted attempts, trigger n8n Deep Research
    await triggerDeepResearch(task, observation);

    return {
      success: false,
      attempts: attempt,
    };
  }
}
```

---

## Metrics Dashboard

### Agentic Pattern Metrics

```json
{
  "reflectionPattern": {
    "averageScore": 87,
    "improvementRate": 65,
    "timeOverhead": 8
  },
  "toolCentricReasoning": {
    "skillUsageRate": 75,
    "skillSuccessRate": 96,
    "timeSaved": 55
  },
  "planningLogic": {
    "planningSuccessRate": 82,
    "averageReplanningCount": 1.2,
    "planningTimeRatio": 15
  }
}
```

---

## Best Practices

### DO

- ✅ Always reflect before delivering
- ✅ Prioritize skills over generation
- ✅ Plan complex tasks before executing
- ✅ Observe results and adjust
- ✅ Log all patterns to telemetry

### DON'T

- ❌ Skip reflection for "simple" tasks
- ❌ Generate code when skill exists
- ❌ Execute without planning (complex tasks)
- ❌ Ignore observations
- ❌ Repeat failed plans without adjustment

---

## Continuous Improvement

### Pattern Evolution

**Monthly Review**:

- Analyze pattern effectiveness
- Identify improvement opportunities
- Update thresholds and criteria
- Refine algorithms

**Quarterly Refinement**:

- Major pattern enhancements
- New pattern integration
- Deprecate ineffective patterns
- Publish pattern library

---

**Status**: 🟢 ACTIVE  
**Version**: 1.0.0  
**Last Updated**: 2026-01-20  
**Next Review**: 2026-02-20

**Philosophy**: _"Plan with purpose. Act with precision. Observe with wisdom. Reflect with honesty."_
