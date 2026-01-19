# n8n Integration Implementation Plan

## Executive Summary

This document outlines the strategic integration of n8n workflows into Antigravity OS's A.N.T. framework, transforming our autonomous agent into a **multi-agent orchestration system** capable of handling complex research, validation, and self-improvement tasks.

## Strategic Vision

### From Single Agent to Multi-Agent Ecosystem

**Current State**: Kiro agent handles all tasks inline
- Limited by single LLM context window
- Sequential processing only
- No specialized expertise
- Manual error recovery

**Future State**: Kiro orchestrates specialized n8n sub-agents
- Parallel workflow execution
- Domain-specific expertise (security, performance, research)
- Autonomous error recovery with deep research
- Continuous self-improvement

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Establish n8n connectivity and basic webhook infrastructure

**Tasks**:
1. Install n8n locally: `npx n8n`
2. Create utility function: `src/infrastructure/n8n-client.ts`
3. Implement webhook authentication
4. Add environment configuration
5. Create health check endpoint
6. Test basic webhook connectivity

**Deliverables**:
- Working n8n instance on localhost:5678
- `triggerN8nWorkflow()` utility function
- Environment variables configured
- Basic connectivity tests passing

**Success Criteria**:
- Can trigger n8n workflow from Kiro agent
- Receives structured response
- Error handling works correctly

### Phase 2: Deep Research Agent (Week 2)
**Goal**: Enhance Ralph-Loop with intelligent research capabilities

**Tasks**:
1. Create n8n workflow: "Deep Research Agent"
   - Webhook trigger node
   - Strategy agent (clarifying questions)
   - Search query generator
   - Tavily API integration
   - Content extractor loop
   - Report compiler agent
   - Response webhook
2. Integrate into Ralph-Loop engine
3. Add research result parser
4. Update DEVLOG with research findings
5. Test with complex errors

**Deliverables**:
- Deep Research workflow (JSON export)
- Ralph-Loop integration code
- Test suite for research integration
- Documentation in DEVLOG

**Success Criteria**:
- Ralph-Loop triggers research after 3 failed attempts
- Research returns actionable solutions
- Solutions successfully fix errors
- Research findings logged to memory graph

### Phase 3: Spec Validation Agent (Week 3)
**Goal**: Prevent errors before they happen with proactive validation

**Tasks**:
1. Create n8n workflow: "Spec Validation Agent"
   - Webhook trigger node
   - Spec file parser
   - Completeness checker
   - Reference validator
   - Suggestion generator
   - Response webhook
2. Integrate into Task Manager
3. Add validation report UI
4. Create validation rules engine
5. Test with incomplete specs

**Deliverables**:
- Spec Validation workflow (JSON export)
- Task Manager integration code
- Validation report format
- Test suite for validation

**Success Criteria**:
- Validates specs before task execution
- Catches missing requirements
- Identifies ambiguous criteria
- Suggests improvements

### Phase 4: Multi-Agent Code Review (Week 4)
**Goal**: Ensure code quality with specialized review agents

**Tasks**:
1. Create main coordinator workflow
2. Create sub-agent workflows:
   - Security agent (OWASP checks)
   - Performance agent (complexity analysis)
   - Test coverage agent (coverage validation)
   - Documentation agent (comment quality)
3. Integrate into Task Manager
4. Add review report UI
5. Test with real code

**Deliverables**:
- 5 n8n workflows (1 coordinator + 4 sub-agents)
- Task Manager integration code
- Review report format
- Test suite for reviews

**Success Criteria**:
- Reviews code after task completion
- Catches security vulnerabilities
- Identifies performance issues
- Validates test coverage
- Checks documentation quality

### Phase 5: Continuous Learning Agent (Week 5)
**Goal**: Enable autonomous self-improvement

**Tasks**:
1. Create n8n workflow: "Continuous Learning Agent"
   - Webhook trigger node
   - Pattern extractor
   - Memory graph updater
   - Rule generator
   - GitHub API integration
   - Response webhook
2. Integrate into Ralph-Loop
3. Add evolution metrics tracking
4. Create learning dashboard
5. Test with self-healing events

**Deliverables**:
- Continuous Learning workflow (JSON export)
- Ralph-Loop integration code
- Evolution metrics dashboard
- Test suite for learning

**Success Criteria**:
- Automatically updates memory graph
- Generates new global rules
- Proposes steering file updates
- Tracks learning effectiveness

## Technical Architecture

### n8n Client Implementation

```typescript
// src/infrastructure/n8n-client.ts

import axios, { AxiosInstance } from 'axios';
import { n8nConfig } from '@/config/n8n';

export interface N8nWorkflowPayload {
  [key: string]: unknown;
}

export interface N8nWorkflowResponse {
  success: boolean;
  data: unknown;
  executionId: string;
  timestamp: string;
}

export class N8nClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: n8nConfig.baseUrl,
      timeout: n8nConfig.timeout,
      headers: {
        'Authorization': `Bearer ${n8nConfig.webhookSecret}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  async triggerWorkflow(
    workflowName: string,
    payload: N8nWorkflowPayload
  ): Promise<N8nWorkflowResponse> {
    const endpoint = n8nConfig.workflows[workflowName];
    
    if (!endpoint) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }
    
    try {
      const response = await this.client.post(endpoint, payload);
      return response.data;
    } catch (error) {
      // Retry logic
      return await this.retryWithBackoff(endpoint, payload);
    }
  }
  
  private async retryWithBackoff(
    endpoint: string,
    payload: N8nWorkflowPayload,
    attempt: number = 1
  ): Promise<N8nWorkflowResponse> {
    if (attempt > n8nConfig.retryAttempts) {
      throw new Error('Max retry attempts exceeded');
    }
    
    await this.delay(n8nConfig.retryDelay * attempt);
    
    try {
      const response = await this.client.post(endpoint, payload);
      return response.data;
    } catch (error) {
      return await this.retryWithBackoff(endpoint, payload, attempt + 1);
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${n8nConfig.baseURL}/healthz`);
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const n8nClient = new N8nClient();

// Convenience function
export async function triggerN8nWorkflow(
  workflowName: string,
  payload: N8nWorkflowPayload
): Promise<N8nWorkflowResponse> {
  return await n8nClient.triggerWorkflow(workflowName, payload);
}
```

### Ralph-Loop Integration

```typescript
// src/core/ralph-loop.ts

import { triggerN8nWorkflow } from '@/infrastructure/n8n-client';
import type { ErrorContext, CorrectionPlan } from '@/types/ralph-loop';

export class RalphLoopEngine {
  async handleError(error: ErrorContext): Promise<CorrectionPlan> {
    // Standard correction for attempts 1-2
    if (error.attemptNumber < 3) {
      return await this.generateStandardCorrection(error);
    }
    
    // Deep research for attempt 3+
    console.log(`[Ralph-Loop] Triggering deep research for ${error.taskId}`);
    
    const research = await triggerN8nWorkflow('deepResearch', {
      taskId: error.taskId,
      errorMessage: error.errorMessage,
      stackTrace: error.stackTrace,
      specPath: error.specPath,
      attemptNumber: error.attemptNumber,
      timestamp: new Date().toISOString()
    });
    
    if (!research.success) {
      throw new Error('Deep research failed - requesting human intervention');
    }
    
    // Parse research findings
    const findings = research.data as ResearchFindings;
    
    // Generate correction from research
    return {
      errorType: error.errorType,
      targetFile: findings.targetFile,
      correction: findings.recommendedSolution,
      updatedContent: findings.updatedSpecContent,
      attemptNumber: error.attemptNumber,
      researchBacked: true,
      sources: findings.sources
    };
  }
  
  private async generateStandardCorrection(
    error: ErrorContext
  ): Promise<CorrectionPlan> {
    // Existing logic...
  }
}

interface ResearchFindings {
  rootCause: string;
  recommendedSolution: string;
  targetFile: string;
  updatedSpecContent: string;
  sources: Array<{
    url: string;
    title: string;
    relevance: number;
  }>;
  confidence: number;
}
```

### Task Manager Integration

```typescript
// src/core/task-manager.ts

import { triggerN8nWorkflow } from '@/infrastructure/n8n-client';

export class TaskManager {
  async executeTask(taskId: string): Promise<void> {
    // 1. Validate spec before execution
    const validation = await this.validateSpec(taskId);
    
    if (!validation.isValid) {
      await this.requestHumanReview(validation.issues);
      return;
    }
    
    // 2. Execute task
    await this.runTaskImplementation(taskId);
    
    // 3. Review code after completion
    const review = await this.reviewCode(taskId);
    
    if (!review.approved) {
      await this.applySuggestions(review.suggestions);
      await this.runTests(taskId);
    }
    
    // 4. Mark as complete
    await this.updateTaskStatus(taskId, 'completed');
  }
  
  private async validateSpec(taskId: string): Promise<ValidationResult> {
    const specPath = await this.getSpecPath(taskId);
    
    const validation = await triggerN8nWorkflow('specValidation', {
      specPath,
      requirementsPath: `${specPath}/requirements.md`,
      designPath: `${specPath}/design.md`,
      tasksPath: `${specPath}/tasks.md`,
      taskId
    });
    
    return validation.data as ValidationResult;
  }
  
  private async reviewCode(taskId: string): Promise<ReviewResult> {
    const changedFiles = await this.getChangedFiles(taskId);
    const testFiles = await this.getTestFiles(taskId);
    
    const review = await triggerN8nWorkflow('multiAgentReview', {
      taskId,
      changedFiles,
      testFiles,
      specPath: await this.getSpecPath(taskId)
    });
    
    return review.data as ReviewResult;
  }
}
```

## n8n Workflow Templates

### Deep Research Agent Workflow

```json
{
  "name": "Deep Research Agent",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "deep-research",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "model": "gpt-4",
        "messages": {
          "values": [
            {
              "role": "system",
              "content": "You are a strategy agent. Analyze the error and generate 2-3 clarifying search queries."
            },
            {
              "role": "user",
              "content": "={{ $json.errorMessage }}"
            }
          ]
        }
      },
      "name": "Strategy Agent",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "position": [450, 300]
    },
    {
      "parameters": {
        "batchSize": 1,
        "options": {}
      },
      "name": "Loop Over Queries",
      "type": "n8n-nodes-base.splitInBatches",
      "position": [650, 300]
    },
    {
      "parameters": {
        "url": "https://api.tavily.com/search",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "tavilyApi",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "query",
              "value": "={{ $json.query }}"
            },
            {
              "name": "max_results",
              "value": 5
            }
          ]
        }
      },
      "name": "Tavily Search",
      "type": "n8n-nodes-base.httpRequest",
      "position": [850, 300]
    },
    {
      "parameters": {
        "model": "gpt-4",
        "messages": {
          "values": [
            {
              "role": "system",
              "content": "Compile all research findings into a structured solution report."
            },
            {
              "role": "user",
              "content": "={{ $json.allFindings }}"
            }
          ]
        }
      },
      "name": "Report Compiler",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "position": [1050, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}"
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [1250, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Strategy Agent", "type": "main", "index": 0 }]]
    },
    "Strategy Agent": {
      "main": [[{ "node": "Loop Over Queries", "type": "main", "index": 0 }]]
    },
    "Loop Over Queries": {
      "main": [[{ "node": "Tavily Search", "type": "main", "index": 0 }]]
    },
    "Tavily Search": {
      "main": [[{ "node": "Report Compiler", "type": "main", "index": 0 }]]
    },
    "Report Compiler": {
      "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
    }
  }
}
```

## Success Metrics

### Phase 1 Metrics
- n8n uptime: >99%
- Webhook response time: <500ms
- Authentication success rate: 100%

### Phase 2 Metrics
- Research success rate: >80%
- Time to resolution: <5 minutes
- Solution accuracy: >70%

### Phase 3 Metrics
- Validation accuracy: >90%
- False positive rate: <10%
- Spec improvement suggestions: >5 per validation

### Phase 4 Metrics
- Review completion time: <2 minutes
- Security issue detection: >95%
- Performance issue detection: >80%

### Phase 5 Metrics
- Learning pattern extraction: >90%
- Memory graph updates: 100%
- Rule generation accuracy: >70%

## Risk Mitigation

### Risk 1: n8n Downtime
**Mitigation**: Fallback to standard Ralph-Loop if n8n unavailable

### Risk 2: API Rate Limits
**Mitigation**: Implement request queuing and retry logic

### Risk 3: Workflow Complexity
**Mitigation**: Start simple, iterate based on feedback

### Risk 4: Cost Overruns
**Mitigation**: Use local Ollama for validation, cloud for generation

## Next Steps

1. **Immediate**: Review and approve this plan
2. **Week 1**: Begin Phase 1 implementation
3. **Week 2**: Deploy Deep Research Agent
4. **Week 3**: Deploy Spec Validation Agent
5. **Week 4**: Deploy Multi-Agent Code Review
6. **Week 5**: Deploy Continuous Learning Agent
7. **Week 6**: Evaluate and optimize

## Conclusion

This integration transforms Antigravity OS from a single-agent system into a **multi-agent orchestration platform** capable of autonomous research, validation, review, and self-improvement. By leveraging n8n's visual workflow engine and specialized sub-agents, we create a scalable, maintainable, and intelligent system that continuously evolves.

**The future is multi-agent. Let's build it.**

---

**Status**: 🟢 READY FOR APPROVAL  
**Author**: Kiro Agent  
**Date**: 2026-01-19  
**Version**: 1.0.0
