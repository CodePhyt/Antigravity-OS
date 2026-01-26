# Implementation Plan: Ralph's Brain View

## Overview

This implementation plan breaks down the Ralph's Brain View feature into discrete, incremental coding tasks. Each task builds on previous work, with testing integrated throughout to catch errors early. The plan follows a bottom-up approach: data layer → service layer → API layer → UI layer → integration.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create directory structure: `src/lib/services/`, `src/lib/parsers/`, `src/hooks/`, `src/components/dashboard/`
  - Install dependencies: `fast-check` for property testing
  - Configure TypeScript paths for clean imports
  - Set up test files structure mirroring source files
  - _Requirements: 10.4_

- [x] 2. Implement Activity Log Parser
  - [x] 2.1 Create ActivityLogParser class with parse method
    - Parse markdown headers with timestamp regex
    - Extract activity entries with id, timestamp, message, level
    - Implement level detection logic (info, success, error, correction)
    - Return latest 10 entries
    - _Requirements: 1.1_
  
  - [x] 2.2 Write property test for activity log parsing
    - **Property 1: Activity Stream Completeness**
    - **Validates: Requirements 1.1**
    - Generate random activity logs with varying sizes
    - Verify returned entries = min(10, total_entries)
    - Test with 100+ iterations
  
  - [x] 2.3 Write unit tests for edge cases
    - Test empty log file
    - Test log with special characters
    - Test malformed timestamps
    - Test log with only 3 entries
    - _Requirements: 1.3_

- [x] 3. Implement PRD Parser
  - [x] 3.1 Create PRDParser class with parse method
    - Parse markdown checkbox tasks with regex
    - Extract only top-level tasks (not sub-tasks)
    - Calculate completion percentage
    - Extract task dependencies from descriptions
    - Return PRDStatus with tasks array
    - _Requirements: 2.1, 2.4, 2.5_
  
  - [x] 3.2 Write property test for PRD parsing
    - **Property 4: PRD Parsing Correctness**
    - **Validates: Requirements 2.1, 2.4, 2.5**
    - Generate random PRD structures
    - Verify completion percentage calculation
    - Verify only top-level tasks counted
    - Test with 100+ iterations
  
  - [x] 3.3 Write unit tests for error handling
    - Test invalid checkbox syntax
    - Test missing task sections
    - Test nested sub-tasks exclusion
    - Test dependency extraction
    - _Requirements: 2.3_

- [x] 4. Implement File Watcher Service
  - [x] 4.1 Create FileWatcherService class
    - Extend EventEmitter for event-driven architecture
    - Watch ACTIVITY_LOG.md and PRD.md using fs.watch
    - Emit events on file changes
    - Implement cleanup method to close watchers
    - Handle file not found errors gracefully
    - _Requirements: 1.2, 2.2_
  
  - [x] 4.2 Write property test for resource cleanup
    - **Property 3: Resource Cleanup**
    - **Validates: Requirements 1.4**
    - Create watcher, close it, verify no leaks
    - Test with multiple create/close cycles
    - Test with 100+ iterations
  
  - [x] 4.3 Write unit tests for file watching
    - Test file change detection
    - Test multiple file watches
    - Test watcher cleanup
    - Test error handling for missing files
    - _Requirements: 8.1_

- [x] 5. Checkpoint - Ensure parsers and watchers work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Brain API Route
  - [x] 6.1 Create /api/system/brain route handler
    - Implement GET handler returning text/event-stream
    - Create ReadableStream with SSE format
    - Send initial state on connection
    - Set up file watcher event listeners
    - Implement heartbeat every 30 seconds
    - Handle client disconnect with cleanup
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [x] 6.2 Write property test for broadcast consistency
    - **Property 2: Broadcast Consistency**
    - **Validates: Requirements 1.5**
    - Connect multiple clients
    - Trigger file change
    - Verify all clients receive same event
    - Test with 100+ iterations
  
  - [x] 6.3 Write unit tests for API route
    - Test SSE connection establishment
    - Test initial state delivery
    - Test heartbeat messages
    - Test connection cleanup on abort
    - _Requirements: 1.4, 10.1_

- [x] 7. Implement error handling and resilience
  - [x] 7.1 Add graceful error handling to parsers
    - Wrap parser calls in try-catch
    - Return structured error responses
    - Maintain last known valid state
    - Log errors with context
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [x] 7.2 Write property test for graceful error handling
    - **Property 5: Graceful Error Handling**
    - **Validates: Requirements 2.3, 8.1, 8.2, 8.4, 8.5**
    - Generate random invalid inputs
    - Verify system continues operating
    - Verify structured error responses
    - Test with 100+ iterations
  
  - [x] 7.3 Write unit tests for error scenarios
    - Test missing ACTIVITY_LOG.md
    - Test missing PRD.md
    - Test corrupted file content
    - Test parsing failures
    - _Requirements: 8.1, 8.2_

- [x] 8. Implement SSE client hook
  - [x] 8.1 Create useBrainStream hook
    - Set up EventSource connection to /api/system/brain
    - Implement reducer for state management
    - Handle activity, prd_update, correction events
    - Implement auto-reconnection with exponential backoff
    - Clean up EventSource on unmount
    - _Requirements: 1.1, 1.2, 8.3_
  
  - [x] 8.2 Write property test for reconnection logic
    - **Property 11: Reconnection with Backoff**
    - **Validates: Requirements 8.3**
    - Simulate connection failures
    - Verify exponential backoff delays
    - Test with 100+ iterations
  
  - [x] 8.3 Write unit tests for hook behavior
    - Test initial connection
    - Test event handling
    - Test state updates
    - Test cleanup on unmount
    - _Requirements: 1.1, 1.2_

- [x] 9. Checkpoint - Ensure API and hook integration works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement base dashboard component
  - [x] 10.1 Create RalphsBrainView component
    - Set up component structure with glassmorphism styling
    - Use useBrainStream hook for data
    - Create header with title and neon indicator
    - Create grid layout for thinking stream and PRD progress
    - Add error boundary wrapper
    - _Requirements: 3.1, 6.1, 6.2, 10.2_
  
  - [x] 10.2 Write unit tests for component rendering
    - Test component renders without errors
    - Test error boundary catches crashes
    - Test layout structure
    - Test glassmorphism styles applied
    - _Requirements: 6.1, 8.5_

- [x] 11. Implement ThinkingStream component
  - [x] 11.1 Create ThinkingStream component
    - Display activity entries in terminal-style scrolling area
    - Use JetBrains Mono font
    - Implement auto-scroll to latest entry
    - Add smooth scroll animation
    - Color-code entries by level (cyan, emerald, rose)
    - _Requirements: 3.1, 3.2, 6.2_
  
  - [x] 11.2 Write property test for auto-scroll behavior
    - **Property 7: Auto-Scroll Behavior**
    - **Validates: Requirements 3.2**
    - Add random activity entries
    - Verify scroll position moves to bottom
    - Test with 100+ iterations
  
  - [x] 11.3 Write unit tests for thinking stream
    - Test rendering with empty activities
    - Test rendering with 10 activities
    - Test scroll behavior
    - Test color coding by level
    - _Requirements: 3.1, 3.2_

- [x] 12. Implement ProgressBar and NeonIndicator components
  - [x] 12.1 Create ProgressBar component
    - Display completion percentage
    - Show completed/total task counts
    - Animate progress bar fill
    - Use neon emerald color for progress
    - _Requirements: 3.3_
  
  - [x] 12.2 Create NeonIndicator component
    - Display status with color-coded indicator
    - Cyan for thinking, emerald for success, rose for error
    - Add pulsing animation for active states
    - Include text label for accessibility
    - _Requirements: 3.4, 9.3_
  
  - [x] 12.3 Write property test for state-to-visual mapping
    - **Property 6: State-to-Visual Mapping**
    - **Validates: Requirements 3.4, 4.1, 4.2, 4.5**
    - Test all agent states map to correct colors
    - Verify UI elements appear for each state
    - Test with 100+ iterations
  
  - [x] 12.4 Write unit tests for components
    - Test ProgressBar with various percentages
    - Test NeonIndicator with all states
    - Test animations trigger correctly
    - Test accessibility labels present
    - _Requirements: 3.3, 3.4, 9.1, 9.3_

- [x] 13. Implement TaskList component
  - [x] 13.1 Create TaskList component
    - Display tasks from PRD with status indicators
    - Implement click handler for task prioritization
    - Show visual feedback for prioritized tasks
    - Display dependency relationships
    - Disable blocked tasks with tooltips
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  
  - [x] 13.2 Write property test for task prioritization lifecycle
    - **Property 8: Task Prioritization Lifecycle**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Click task, verify priority set
    - Start execution, verify priority cleared
    - Test with 100+ iterations
  
  - [x] 13.3 Write property test for dependency visualization
    - **Property 9: Dependency Visualization**
    - **Validates: Requirements 5.4, 5.5**
    - Generate tasks with random dependencies
    - Verify visual indicators present
    - Verify blocked tasks disabled
    - Test with 100+ iterations
  
  - [x] 13.4 Write unit tests for task interactions
    - Test task click handling
    - Test priority visual feedback
    - Test dependency display
    - Test blocked task behavior
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 14. Implement CorrectionOverlay component
  - [x] 14.1 Create CorrectionOverlay component
    - Display "CRITICAL CORRECTION" overlay
    - Show current B.L.A.S.T. step
    - Display error message and attempt number
    - Add pulsing animation
    - Auto-dismiss after 5 seconds or on success
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [x] 14.2 Write unit tests for correction overlay
    - Test overlay appears on correction event
    - Test B.L.A.S.T. step display
    - Test auto-dismiss behavior
    - Test escalation indicator for 3 attempts
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 15. Checkpoint - Ensure all UI components work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implement accessibility features
  - [x] 16.1 Add ARIA labels and keyboard navigation
    - Add aria-label to all interactive elements
    - Implement tab navigation through tasks
    - Add keyboard shortcuts (Enter/Space for activation)
    - Test with keyboard-only navigation
    - _Requirements: 9.1, 9.2_
  
  - [x] 16.2 Write property test for keyboard navigation
    - **Property 12: Keyboard Navigation Completeness**
    - **Validates: Requirements 9.2**
    - Simulate tab key presses
    - Verify focus moves to all interactive elements
    - Test with 100+ iterations
  
  - [x] 16.3 Write property test for accessible indicators
    - **Property 13: Accessible Indicators**
    - **Validates: Requirements 9.1, 9.3**
    - Verify all color indicators have text/icon
    - Verify ARIA attributes present
    - Test with 100+ iterations

- [ ] 17. Implement motion and contrast preferences
  - [x] 17.1 Add prefers-reduced-motion support
    - Detect prefers-reduced-motion media query
    - Disable animations when enabled
    - Replace with instant transitions
    - _Requirements: 9.4_
  
  - [x] 17.2 Verify contrast ratios
    - Audit all text/background combinations
    - Ensure 4.5:1 minimum contrast
    - Adjust colors if needed
    - _Requirements: 9.5_
  
  - [x] 17.3 Write property test for motion preference
    - **Property 14: Motion Preference Respect**
    - **Validates: Requirements 9.4**
    - Set prefers-reduced-motion
    - Verify animations disabled
    - Test with 100+ iterations
  
  - [x] 17.4 Write property test for contrast compliance
    - **Property 15: Contrast Compliance**
    - **Validates: Requirements 9.5**
    - Calculate contrast ratios for all text
    - Verify minimum 4.5:1 ratio
    - Test with 100+ iterations

- [ ] 18. Implement performance optimizations
  - [x] 18.1 Add memory bounds to activity storage
    - Implement sliding window for activities (max 100)
    - Add log rotation for ACTIVITY_LOG.md
    - Optimize re-renders with React.memo
    - _Requirements: 7.1, 7.5_
  
  - [x] 18.2 Write property test for memory bounds
    - **Property 10: Memory Bounds**
    - **Validates: Requirements 7.1**
    - Add 200+ entries
    - Verify only 100 stored in memory
    - Test with 100+ iterations
  
  - [x] 18.3 Write unit tests for performance
    - Test parsing large PRD files (<100ms)
    - Test 50 concurrent connections
    - Test memory usage stays bounded
    - _Requirements: 7.2, 7.3_

- [ ] 19. Implement authentication integration
  - [x] 19.1 Add auth middleware to Brain API
    - Check authentication before streaming
    - Return 401 for unauthenticated requests
    - Use existing auth mechanisms
    - _Requirements: 10.3_
  
  - [x] 19.2 Write property test for authentication
    - **Property 16: Authentication Integration**
    - **Validates: Requirements 10.3**
    - Test unauthenticated requests rejected
    - Test authenticated requests succeed
    - Test with 100+ iterations

- [ ] 20. Integration and final polish
  - [x] 20.1 Integrate dashboard into main page
    - Import RalphsBrainView into src/app/page.tsx
    - Position in dashboard layout
    - Test responsive behavior on mobile/tablet
    - _Requirements: 10.2, 3.5_
  
  - [x] 20.2 Add command center aesthetic polish
    - Fine-tune glassmorphism effects
    - Add animated data stream effects
    - Verify neon colors match design (#06b6d4, #10b981, #f43f5e)
    - Add subtle glow effects to indicators
    - _Requirements: 6.1, 6.3, 6.4, 6.5_
  
  - [x] 20.3 Run full test suite
    - Run all unit tests
    - Run all property tests (100+ iterations each)
    - Check test coverage (minimum 80%)
    - Run accessibility tests with axe-core
    - _Requirements: All_

- [x] 21. Final checkpoint - Complete feature validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- All code must pass TypeScript strict mode and ESLint checks
- Minimum 80% test coverage required before completion
