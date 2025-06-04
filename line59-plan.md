# Implementation Plan: Handle streaming vs non-streaming output rendering

## Context Analysis

**Current State:**
- Core `OutputFormatter` interface has both `formatContent()` and `formatStreamChunk()` methods
- `FormatOptions` includes a `streaming?: boolean` option that's currently not utilized
- `ConsoleFormatter` implements `formatStreamChunk()` by:
  - Pausing all active spinners
  - Calling `formatContent()` for the chunk
  - Resuming spinners after output
- Streaming content flows from API client as `APIStreamChunk` objects with `content` and `done` flags
- Tests exist for `formatStreamChunk()` but don't differentiate streaming behavior

**Key Gaps:**
1. No clear distinction between streaming and non-streaming modes in formatter behavior
2. The `streaming` option in `FormatOptions` is ignored
3. No buffering strategy for non-streaming mode
4. No special handling for partial lines or chunks in streaming mode
5. Missing comprehensive tests for streaming vs non-streaming scenarios

## Design Decisions

### 1. Streaming Mode Behavior
**Decision**: In streaming mode, output chunks immediately without buffering
- Each chunk is formatted and output as received
- Progress indicators are paused during output and resumed after
- No line buffering - partial lines are output immediately
- **Rationale**: Provides real-time feedback to users as content is generated

### 2. Non-Streaming Mode Behavior  
**Decision**: In non-streaming mode, complete content is formatted as a whole
- Use `formatContent()` for complete content
- No need to pause/resume progress indicators
- Apply consistent formatting across entire content
- **Rationale**: Better formatting consistency for complete content

### 3. API Design Enhancement
**Decision**: Enhance formatter interface to clarify streaming vs non-streaming
- Keep existing methods for backward compatibility
- Use `FormatOptions.streaming` to determine behavior
- Add clear documentation about when to use each method
- **Rationale**: Maintains backward compatibility while adding clarity

### 4. Progress Indicator Management
**Decision**: Different progress behavior for streaming vs non-streaming
- **Streaming**: Pause indicators during chunk output, resume after
- **Non-streaming**: Keep indicators running during formatting
- **Rationale**: Prevents visual conflicts in streaming, maintains feedback in non-streaming

## Implementation Steps

### Phase 1: Enhance Core Formatter Interface Documentation
**Goal**: Clarify the contract for streaming vs non-streaming modes

1. **Update Interface Documentation**
   - Document when to use `formatContent()` vs `formatStreamChunk()`
   - Clarify the purpose and effect of `FormatOptions.streaming`
   - Document expected behavior differences

2. **Add Usage Examples**
   - Show typical streaming workflow
   - Show typical non-streaming workflow

### Phase 2: Implement Streaming Mode Differentiation
**Goal**: Make ConsoleFormatter respect the streaming option

1. **Refactor formatStreamChunk()**
   - Check `options?.streaming` to determine behavior
   - If `streaming === true`: Current behavior (pause/resume spinners)
   - If `streaming === false`: Direct formatting without spinner management
   - Default to streaming behavior for backward compatibility

2. **Enhance formatContent()**
   - Consider `options?.streaming` for optimization
   - Non-streaming mode can apply more sophisticated formatting

3. **Handle Line Buffering (Future Enhancement)**
   - For now, keep simple chunk-by-chunk output
   - Document that line buffering is a potential future enhancement

### Phase 3: Comprehensive Testing
**Goal**: Ensure robust test coverage for all streaming scenarios

1. **Test Streaming Mode**
   - Verify spinner pause/resume behavior
   - Test partial chunk handling
   - Test multiple chunks forming complete content
   - Test with active progress indicators

2. **Test Non-Streaming Mode**
   - Verify no spinner interruption
   - Test complete content formatting
   - Test with active progress indicators

3. **Test Mode Interactions**
   - Streaming + raw mode
   - Streaming + custom styling
   - Non-streaming + raw mode
   - Error handling in both modes

4. **Test Edge Cases**
   - Empty chunks
   - Very large chunks
   - Rapid successive chunks
   - Switching between modes

### Phase 4: Integration Validation
**Goal**: Ensure streaming works correctly with API client integration

1. **Create Integration Tests**
   - Mock streaming API responses
   - Verify end-to-end streaming behavior
   - Test progress indicator lifecycle during streaming

2. **Performance Validation**
   - Ensure streaming provides immediate feedback
   - Verify no unnecessary buffering occurs

## Test Strategy

### Test Structure:
```typescript
describe("Streaming vs non-streaming output", () => {
  describe("formatStreamChunk with streaming mode", () => {
    // Tests for streaming=true behavior
  });
  
  describe("formatStreamChunk with non-streaming mode", () => {
    // Tests for streaming=false behavior
  });
  
  describe("formatContent with streaming considerations", () => {
    // Tests for how formatContent respects streaming option
  });
  
  describe("Progress indicator management", () => {
    // Tests for spinner pause/resume in different modes
  });
  
  describe("Mode interactions", () => {
    // Tests for streaming + raw, streaming + styling, etc.
  });
});
```

## Risk Mitigation

1. **Backward Compatibility**: Default behavior unchanged when streaming option not specified
2. **Performance**: Streaming mode maintains immediate output, no buffering added
3. **Visual Stability**: Proper spinner management prevents flickering
4. **Error Handling**: Consistent error handling in both modes

## Success Criteria

1. ✅ Clear documentation of streaming vs non-streaming modes
2. ✅ `FormatOptions.streaming` properly controls formatter behavior
3. ✅ Progress indicators managed correctly in each mode
4. ✅ Comprehensive test coverage for both modes
5. ✅ No breaking changes to existing functionality
6. ✅ All tests pass including new streaming tests
7. ✅ Integration tests validate end-to-end streaming

## File Changes Summary

**Modified Files:**
- `src/core/formatter.ts` - Enhanced documentation for streaming behavior
- `src/adapters/consoleFormatter.ts` - Implement streaming mode differentiation
- `src/adapters/consoleFormatter.test.ts` - Add comprehensive streaming tests

**No Breaking Changes**: All modifications maintain backward compatibility.