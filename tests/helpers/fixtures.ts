/**
 * Test Fixtures
 * 
 * Provides reusable test data for unit and integration tests
 */

export const fixtures = {
  // Valid spec files
  validSpecs: {
    minimal: {
      requirements: [
        {
          id: '1.1',
          title: 'Basic Requirement',
          description: 'A simple requirement for testing',
          acceptanceCriteria: ['System should work'],
          priority: 'medium' as const
        }
      ],
      design: {
        overview: 'Simple design for testing purposes',
        architecture: 'Basic architecture',
        components: ['Component A']
      },
      tasks: [
        {
          id: '1',
          title: 'Implement feature',
          description: 'Basic implementation task',
          status: 'not_started' as const,
          dependencies: []
        }
      ]
    },

    complex: {
      requirements: Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}.1`,
        title: `Requirement ${i + 1}`,
        description: `Complex requirement ${i + 1} with detailed description`,
        acceptanceCriteria: [
          `Criterion 1 for requirement ${i + 1}`,
          `Criterion 2 for requirement ${i + 1}`,
          `Criterion 3 for requirement ${i + 1}`
        ],
        priority: ['critical', 'high', 'medium', 'low'][i % 4] as 'critical' | 'high' | 'medium' | 'low'
      })),
      design: {
        overview: 'Complex design with multiple components and interactions',
        architecture: 'Layered architecture with separation of concerns',
        components: Array.from({ length: 10 }, (_, i) => `Component ${String.fromCharCode(65 + i)}`)
      },
      tasks: Array.from({ length: 50 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Task ${i + 1}`,
        description: `Implementation task ${i + 1}`,
        status: ['not_started', 'in_progress', 'completed'][i % 3] as 'not_started' | 'in_progress' | 'completed',
        dependencies: i > 0 ? [`${i}`] : []
      }))
    },

    withDependencies: {
      requirements: [
        {
          id: '1.1',
          title: 'Foundation Requirement',
          description: 'Base requirement that others depend on',
          acceptanceCriteria: ['Foundation must be solid'],
          priority: 'critical' as const
        },
        {
          id: '2.1',
          title: 'Dependent Requirement',
          description: 'Requirement that depends on 1.1',
          acceptanceCriteria: ['Must build on foundation'],
          priority: 'high' as const
        }
      ],
      design: {
        overview: 'Design with dependency chain',
        architecture: 'Hierarchical architecture',
        components: ['Foundation', 'Layer 1', 'Layer 2']
      },
      tasks: [
        {
          id: '1',
          title: 'Foundation task',
          description: 'Base task',
          status: 'completed' as const,
          dependencies: []
        },
        {
          id: '2',
          title: 'Dependent task',
          description: 'Task depending on task 1',
          status: 'in_progress' as const,
          dependencies: ['1']
        },
        {
          id: '3',
          title: 'Final task',
          description: 'Task depending on task 2',
          status: 'not_started' as const,
          dependencies: ['2']
        }
      ]
    }
  },

  // Invalid spec files
  invalidSpecs: {
    emptyFile: '',
    invalidJSON: '{invalid json}',
    whitespaceOnly: '   \n\t  ',
    missingRequirements: '{ "design": {}, "tasks": [] }',
    emptyRequirements: '{ "requirements": [], "design": {}, "tasks": [] }',
    
    circularDeps: {
      requirements: [
        {
          id: '1.1',
          title: 'Req A',
          description: 'Depends on B',
          acceptanceCriteria: ['Criterion'],
          priority: 'medium' as const
        }
      ],
      design: {
        overview: 'Design with circular dependencies',
        architecture: 'Circular',
        components: ['A', 'B']
      },
      tasks: [
        {
          id: '1',
          title: 'Task A',
          description: 'Depends on Task B',
          status: 'not_started' as const,
          dependencies: ['2']
        },
        {
          id: '2',
          title: 'Task B',
          description: 'Depends on Task A',
          status: 'not_started' as const,
          dependencies: ['1']
        }
      ]
    },

    missingReferences: {
      requirements: [
        {
          id: '1.1',
          title: 'Requirement',
          description: 'References non-existent requirement 2.1',
          acceptanceCriteria: ['See requirement 2.1'],
          priority: 'medium' as const
        }
      ],
      design: {
        overview: 'Design',
        architecture: 'Architecture',
        components: ['Component']
      },
      tasks: [
        {
          id: '1',
          title: 'Task',
          description: 'Task',
          status: 'not_started' as const,
          dependencies: ['999'] // Non-existent dependency
        }
      ]
    }
  },

  // Large data sets
  largeDataSets: {
    thousandSpecs: Array.from({ length: 1000 }, (_, i) => ({
      requirements: [
        {
          id: `${i}.1`,
          title: `Requirement ${i}`,
          description: `Description for requirement ${i}`,
          acceptanceCriteria: [`Criterion for ${i}`],
          priority: 'medium' as const
        }
      ],
      design: {
        overview: `Design ${i}`,
        architecture: `Architecture ${i}`,
        components: [`Component ${i}`]
      },
      tasks: [
        {
          id: `${i}`,
          title: `Task ${i}`,
          description: `Task description ${i}`,
          status: 'not_started' as const,
          dependencies: []
        }
      ]
    })),

    tenMBLogFile: '# Activity Log\n\n' + Array.from({ length: 100000 }, (_, i) => 
      `## [2026-01-${String(i % 30 + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z] Task: task-${i}\n\n` +
      `**Category**: task\n` +
      `**Status**: success\n` +
      `**Task ID**: task-${i}\n\n` +
      `### Description\nCompleted task ${i} successfully\n\n` +
      `### Validation Results\n- ✅ All checks passed\n\n`
    ).join(''),

    deeplyNestedSpec: {
      requirements: [
        {
          id: '1.1',
          title: 'Deeply Nested Requirement',
          description: 'Requirement with deep nesting',
          acceptanceCriteria: ['Deep nesting handled'],
          priority: 'medium' as const
        }
      ],
      design: {
        overview: 'Design with deep nesting',
        architecture: 'Nested architecture',
        components: Array.from({ length: 100 }, (_, i) => `Level ${i}`)
      },
      tasks: Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Nested Task ${i + 1}`,
        description: `Task at nesting level ${i + 1}`,
        status: 'not_started' as const,
        dependencies: i > 0 ? [`${i}`] : []
      }))
    }
  },

  // Error scenarios
  errorScenarios: {
    fileNotFound: {
      path: '/nonexistent/file.md',
      error: 'ENOENT',
      message: 'File not found'
    },
    permissionDenied: {
      path: '/protected/file.md',
      error: 'EACCES',
      message: 'Permission denied'
    },
    diskFull: {
      path: '/tmp/file.md',
      error: 'ENOSPC',
      message: 'No space left on device'
    },
    tooManyOpenFiles: {
      path: '/tmp/file.md',
      error: 'EMFILE',
      message: 'Too many open files'
    }
  }
};
