# Implementation Plan: Support raw output mode (no formatting)

## Context Analysis

**Current State:**

- Core `FormatOptions` interface already defines `mode?: "formatted" | "raw"`
- ConsoleFormatter has partial raw mode implementation:
  - `formatContent()`: Returns unformatted text ✓
  - `formatError()`: Removes colors, excludes stack traces ✓
  - `createProgress()`: Disables spinners, returns inactive indicator ✓
  - `formatStreamChunk()`: Inherits from formatContent ✓
- Limited testing: Only 2 tests for raw mode (content + error)
- No CLI integration for users to specify raw mode

**Key Gaps:**

1. Missing comprehensive tests for raw mode across all methods
2. No CLI flag support for raw mode
3. Progress indicator behavior in raw mode needs testing/validation
4. Raw mode behavior documentation

## Design Decisions

### 1. Progress Indicators in Raw Mode

**Decision**: Progress indicators should be completely silent in raw mode

- No spinner output
- No progress messages
- Return inactive indicators that can be updated/completed without side effects
- **Rationale**: Raw mode implies machine-readable output where progress noise is unwanted

### 2. Error Formatting in Raw Mode

**Decision**: Maintain current behavior - no colors, no stack traces

- Simple "Error: {message}" format
- **Rationale**: Raw mode should be clean and parseable

### 3. CLI Integration

**Decision**: Add `--raw` flag to CLI

- Maps to `FormatOptions.mode = "raw"`
- **Rationale**: Standard flag name, clear intent

## Implementation Steps

### Phase 1: Complete Test Coverage (TDD)

**Goal**: Ensure robust test coverage for all raw mode scenarios

1. **Test Progress Indicators in Raw Mode**

   - `createProgress()` with raw mode returns inactive indicator
   - `updateProgress()` works without side effects in raw mode
   - `completeProgress()` works silently in raw mode
   - Verify no spinner creation/manipulation occurs

2. **Test Stream Formatting in Raw Mode**

   - `formatStreamChunk()` respects raw mode
   - No spinner pausing/resuming in raw mode
   - Consistent metadata reporting

3. **Test Raw Mode Edge Cases**

   - Raw mode with custom styling options (should be ignored)
   - Raw mode with enableStyling=false (redundant but should work)
   - Error handling in raw mode

4. **Test Consistency**
   - All methods return consistent metadata.mode = "raw"
   - All methods return styled = false

### Phase 2: CLI Integration

**Goal**: Allow users to specify raw mode from command line

1. **Add CLI Flag Support** (Future - CLI module not implemented yet)
   - This will be handled when CLI module is implemented
   - Design: `--raw` flag maps to FormatOptions.mode = "raw"

### Phase 3: Documentation & Validation

**Goal**: Ensure raw mode is well-documented and behaves consistently

1. **Update Interface Documentation**

   - Clarify raw mode behavior in JSDoc comments
   - Document that progress indicators are silent in raw mode

2. **Integration Testing**
   - Test raw mode with progress adapter
   - Ensure lifecycle hooks work correctly with raw mode

## Test Strategy

### Test Categories:

1. **Unit Tests**: Each formatter method with raw mode options
2. **Integration Tests**: Raw mode with progress adapter integration
3. **Edge Case Tests**: Invalid inputs, error scenarios with raw mode
4. **Consistency Tests**: Verify metadata consistency across all methods

### Test Structure:

```typescript
describe("Raw mode formatting", () => {
  describe("formatContent", () => {
    // Already exists - verify completeness
  });

  describe("formatError", () => {
    // Already exists - verify completeness
  });

  describe("Progress indicators in raw mode", () => {
    // NEW: Test all progress methods with raw mode
  });

  describe("formatStreamChunk in raw mode", () => {
    // NEW: Test streaming with raw mode
  });

  describe("Raw mode consistency", () => {
    // NEW: Test metadata consistency
  });
});
```

## Risk Mitigation

1. **Backward Compatibility**: All changes are additive/test-only
2. **Performance**: Raw mode should be faster (less processing)
3. **Consistency**: Comprehensive tests ensure consistent behavior
4. **User Experience**: Clear documentation of raw mode behavior

## Success Criteria

1. ✅ All formatter methods properly handle raw mode
2. ✅ Comprehensive test coverage (>95%) for raw mode scenarios
3. ✅ Progress indicators work correctly (silently) in raw mode
4. ✅ Consistent metadata reporting across all methods
5. ✅ No breaking changes to existing functionality
6. ✅ All tests pass including new raw mode tests

## File Changes Summary

**Modified Files:**

- `src/adapters/consoleFormatter.test.ts` - Add comprehensive raw mode tests
- `src/core/formatter.ts` - Enhance JSDoc documentation for raw mode

**No Breaking Changes**: All modifications are tests and documentation only.
