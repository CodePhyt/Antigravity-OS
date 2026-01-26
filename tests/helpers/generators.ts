/**
 * Test Data Generators using fast-check
 * 
 * Provides arbitraries for generating test data for property-based tests
 */

import * as fc from 'fast-check';

// Generate valid requirement
export const requirementArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  acceptanceCriteria: fc.array(fc.string({ minLength: 10, maxLength: 200 }), { minLength: 1, maxLength: 10 }),
  priority: fc.constantFrom('critical', 'high', 'medium', 'low')
});

// Generate valid design
export const designArbitrary = fc.record({
  overview: fc.string({ minLength: 50, maxLength: 500 }),
  architecture: fc.string({ minLength: 50, maxLength: 500 }),
  components: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 10 })
});

// Generate valid task
export const taskArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  status: fc.constantFrom('not_started', 'in_progress', 'completed', 'blocked'),
  dependencies: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })
});

// Generate valid spec files
export const specFileArbitrary = fc.record({
  requirements: fc.array(requirementArbitrary, { minLength: 1, maxLength: 20 }),
  design: designArbitrary,
  tasks: fc.array(taskArbitrary, { minLength: 1, maxLength: 50 })
});

// Helper to check if string is valid JSON
function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// Helper to check if string is valid YAML
function isValidYAML(str: string): boolean {
  // Simple YAML validation - check for basic structure
  return str.includes(':') && !str.includes('{') && !str.includes('[');
}

// Generate malformed spec files
export const malformedSpecArbitrary = fc.oneof(
  fc.constant(''), // Empty file
  fc.constant('   \n\t  '), // Whitespace only
  fc.string().filter(s => s.length > 0 && !isValidJSON(s) && !isValidYAML(s)), // Invalid syntax
  fc.constant('{ "requirements": null }'), // Missing required fields
  fc.constant('{ "requirements": [] }'), // Empty requirements
  fc.constant('{ invalid json }') // Malformed JSON
);

// Generate file paths with edge cases
export const edgeCasePathArbitrary = fc.oneof(
  fc.constant(''), // Empty path
  fc.constant('/'.repeat(1000)), // Very long path
  fc.constant('../../etc/passwd'), // Path traversal
  fc.string({ minLength: 1, maxLength: 50 }).map(s => s.replace(/[a-zA-Z0-9]/g, '!@#$%')), // Special chars only
  fc.constant('C:\\Windows\\System32\\config\\SAM'), // Windows system path
  fc.constant('/dev/null'), // Special device
  fc.constant('con'), // Windows reserved name
  fc.constant('file\x00name.txt') // Null byte injection
);

// Generate concurrent operation scenarios
export const concurrentOperationArbitrary = fc.record({
  operationCount: fc.integer({ min: 2, max: 100 }),
  operations: fc.array(
    fc.oneof(
      fc.constant('read' as const),
      fc.constant('write' as const),
      fc.constant('validate' as const),
      fc.constant('delete' as const)
    ),
    { minLength: 2, maxLength: 100 }
  ),
  targetFile: fc.string({ minLength: 1, maxLength: 100 })
});

// Generate large data sets for stress testing
export const largeDataSetArbitrary = fc.record({
  specCount: fc.integer({ min: 100, max: 1000 }),
  logSizeBytes: fc.integer({ min: 1024 * 1024, max: 10 * 1024 * 1024 }), // 1MB - 10MB
  nestingDepth: fc.integer({ min: 10, max: 100 })
});

// Generate invalid timestamps
export const invalidTimestampArbitrary = fc.oneof(
  fc.constant('not-a-date'),
  fc.constant('2024-13-45T99:99:99Z'), // Invalid date components
  fc.constant(''), // Empty
  fc.constant('2099-01-01T00:00:00Z'), // Future date
  fc.constant('invalid-iso-8601')
);

// Generate circular dependency structures
export const circularDependencyArbitrary = fc.array(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    dependencies: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 })
  }),
  { minLength: 2, maxLength: 10 }
).filter(items => {
  // Ensure at least one circular dependency exists
  const graph = new Map(items.map(item => [item.id, item.dependencies]));
  
  function hasCycle(node: string, visited: Set<string>, recStack: Set<string>): boolean {
    visited.add(node);
    recStack.add(node);
    
    const deps = graph.get(node) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        if (hasCycle(dep, visited, recStack)) return true;
      } else if (recStack.has(dep)) {
        return true;
      }
    }
    
    recStack.delete(node);
    return false;
  }
  
  const visited = new Set<string>();
  for (const item of items) {
    if (!visited.has(item.id)) {
      if (hasCycle(item.id, visited, new Set())) return true;
    }
  }
  
  return false;
});
