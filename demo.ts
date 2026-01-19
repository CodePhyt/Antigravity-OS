/**
 * Antigravity OS Demo
 * Demonstrates the spec-driven development workflow with self-healing
 */

import { createOrchestrator } from './src/core/orchestrator';

async function main() {
  console.log('🚀 Antigravity OS - Spec-Driven Development Engine\n');

  // Create orchestrator for the spec-orchestrator feature
  const orchestrator = createOrchestrator({
    specPath: '.kiro/specs/spec-orchestrator',
    maxRalphLoopAttempts: 3,
    autoRunTests: false, // Disable auto-testing for demo
  });

  console.log('📋 Loading spec...');
  const loaded = await orchestrator.loadSpec();

  if (!loaded) {
    console.error('❌ Failed to load spec');
    process.exit(1);
  }

  console.log('✅ Spec loaded successfully\n');

  // Show status
  const status = orchestrator.getStatus();
  console.log('📊 Execution Status:');
  console.log(`   Total tasks: ${status.totalCount}`);
  console.log(`   Completed: ${status.completedCount}`);
  console.log(`   Progress: ${status.progress}%`);
  console.log(`   Current task: ${status.currentTask?.id || 'None'}\n`);

  // Show task manager info
  const taskManager = orchestrator.getTaskManager();
  const spec = taskManager.getSpec();

  if (spec) {
    console.log('📝 Spec Information:');
    console.log(`   Feature: ${spec.featureName}`);
    console.log(`   Requirements: ${spec.requirements.length}`);
    console.log(`   Properties: ${spec.properties.length}`);
    console.log(`   Tasks: ${spec.tasks.length}\n`);
  }

  // Show Ralph-Loop info
  // const ralphLoop = orchestrator.getRalphLoop();
  console.log('🔄 Ralph-Loop Engine:');
  console.log(`   Max attempts: 3`);
  console.log(`   Status: Ready\n`);

  console.log('✨ System is ready for execution!');
  console.log('\n💡 To execute tasks, call: orchestrator.execute()');
  console.log('🔧 The system will:');
  console.log('   1. Execute tasks sequentially');
  console.log('   2. Run tests automatically');
  console.log('   3. Self-correct errors via Ralph-Loop');
  console.log('   4. Resume from failures');
  console.log('   5. Complete all tasks or halt after 3 failed attempts\n');

  console.log('🎯 Demo complete! System is operational.');
}

main().catch(console.error);
