# Task Details

## Task ID
line-59

## Title
Handle streaming vs non-streaming output rendering

## Original Ticket Text
- [ ] Handle streaming vs non-streaming output rendering

## Implementation Approach Analysis Prompt
Based on the task requirements and codebase context:

1. **Analyze Requirements**: Implement support for both streaming and non-streaming output rendering modes in the formatter, ensuring proper handling of content chunks, progress indicators, and error conditions in both modes
2. **Identify Dependencies**: Review existing formatter interface, console formatter implementation, and how streaming is currently handled via formatStreamChunk
3. **Design Approach**: Create a cohesive approach for differentiating and handling streaming vs non-streaming content rendering with proper buffering and progress management
4. **Risk Assessment**: Ensure backward compatibility, maintain separation of concerns, and avoid breaking existing formatter functionality
5. **Testing Strategy**: Comprehensive tests for both streaming and non-streaming modes, including edge cases and error scenarios
6. **Performance Considerations**: Streaming should provide immediate feedback without buffering entire content; non-streaming should be efficient for complete content
7. **Security Considerations**: Ensure no sensitive data leakage in partial streaming outputs
8. **Maintainability**: Clear interfaces and contracts for streaming behavior

Key architectural considerations:
- Streaming vs non-streaming is an infrastructure concern (formatter responsibility)
- Core domain should remain unaware of streaming implementation details
- Must maintain hexagonal architecture principles (ports & adapters)
- Progress indicators need different behavior during streaming (pause/resume)
- Consider how streaming interacts with raw mode (already implemented)
- Need to handle partial content chunks and ensure proper output ordering
- Error handling during streaming must not corrupt output