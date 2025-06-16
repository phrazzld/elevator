# TODO: Format-Preserving Elevation (Issue #38)

## Phase 1: Foundation Setup

- [x] Create `src/formatting/` directory structure
- [x] Create `src/formatting/types.ts` with FormattingInfo and FormattedSegment interfaces
- [x] Add JSDoc comments to all interface properties in types.ts
- [x] Create empty module files: `detector.ts`, `extractor.ts`, `reconstructor.ts` with exports

## Phase 2: Format Detection Implementation

- [x] Implement `detectCodeBlocks()` function to find triple-backtick code blocks using regex
- [x] Add language detection support to `detectCodeBlocks()` (e.g., ```typescript)
- [x] Write unit test for `detectCodeBlocks()` with single code block
- [x] Write unit test for `detectCodeBlocks()` with multiple code blocks
- [x] Write unit test for `detectCodeBlocks()` with language specifiers
- [x] Write unit test for `detectCodeBlocks()` edge cases (unclosed blocks, empty blocks)
- [x] Implement `detectInlineCode()` function to find single-backtick inline code
- [x] Write unit test for `detectInlineCode()` with basic cases
- [x] Write unit test for `detectInlineCode()` with escaped backticks
- [x] Implement `detectBlockQuotes()` function to find lines starting with >
- [x] Write unit test for `detectBlockQuotes()` with single-line quotes
- [x] Write unit test for `detectBlockQuotes()` with multi-line quotes
- [x] Create main `detectFormatting()` function that combines all detectors
- [x] Ensure `detectFormatting()` returns results sorted by startIndex
- [x] Write unit test for `detectFormatting()` with mixed formatting types
- [x] Write unit test for `detectFormatting()` with overlapping formats

## Phase 3: Content Extraction Implementation

- [x] Implement `splitTextByIndices()` helper to split text based on FormattingInfo boundaries
- [x] Write unit test for `splitTextByIndices()` with non-overlapping segments
- [x] Write unit test for `splitTextByIndices()` with adjacent segments
- [x] Implement `createPlainSegment()` helper for unformatted text segments
- [x] Implement `createFormattedSegment()` helper that marks code blocks for preservation
- [x] Implement main `extractSegments()` function using the helpers
- [x] Write unit test for `extractSegments()` with code blocks marked as preserve
- [x] Write unit test for `extractSegments()` with quotes marked for elevation
- [x] Write unit test for `extractSegments()` preserving whitespace between segments
- [x] Write unit test for `extractSegments()` with empty input
- [x] Write unit test for `extractSegments()` with only plain text

## Phase 4: Format Reconstruction Implementation

- [x] Implement `reconstructSegment()` helper for single segment reconstruction
- [x] Write unit test for `reconstructSegment()` with preserved code block
- [x] Write unit test for `reconstructSegment()` with elevated quote content
- [x] Implement main `reconstructText()` function that assembles all segments
- [x] Write unit test for `reconstructText()` maintaining exact spacing
- [x] Write unit test for `reconstructText()` with mixed elevated/preserved content
- [x] Create property-based test for reconstruction idempotency (no elevation)
- [x] Create property-based test for whitespace preservation

## Phase 5: API Integration

- [x] Add import statements for formatting modules in `api.ts`
- [x] Create `shouldUseFormatPreservation()` helper to check if text needs formatting
- [x] Write unit test for `shouldUseFormatPreservation()` detection logic
- [x] Create `elevateSegments()` helper that only sends non-code segments to API
- [x] Mock and test `elevateSegments()` with mixed segment types
- [x] Update `ELEVATION_PROMPT` constant to mention code preservation behavior
- [x] Modify `elevatePrompt()` to use format detection pipeline when needed
- [x] Ensure `elevatePrompt()` falls back to original behavior for plain text
- [x] Add debug logging for format detection events
- [x] Add debug logging for segment elevation decisions
- [x] Write integration test for `elevatePrompt()` with code block preservation
- [x] Write integration test for `elevatePrompt()` with inline code preservation
- [x] Write integration test for `elevatePrompt()` with quote elevation

## Phase 6: End-to-End Testing

- [x] Create test fixture file with complex mixed formatting example
- [ ] Write CLI integration test for code block preservation via args
- [ ] Write CLI integration test for code block preservation via pipe
- [ ] Write CLI integration test for code block preservation via interactive input
- [ ] Test error message example from issue description exactly
- [ ] Test preservation of multiple code blocks with different languages
- [ ] Test extremely long code blocks (1000+ lines)
- [ ] Test malformed code blocks (missing closing backticks)
- [ ] Benchmark performance impact (should be <5% overhead)
- [ ] Verify memory usage with large inputs

## Phase 7: Documentation and Cleanup

- [ ] Update API.md with format preservation behavior
- [ ] Add examples of format preservation to README.md
- [ ] Update ARCHITECTURE.md to mention formatting module
- [ ] Ensure all functions have complete JSDoc comments
- [ ] Fix TypeScript type issues in cli.test.ts (ConsoleSpy interface and processExitSpy)
- [ ] Run linter and fix any issues
- [ ] Run type checker and fix any issues
- [ ] Verify test coverage meets 95% threshold for formatting modules
- [ ] Remove PLAN.md and PLAN-CONTEXT.md files
- [ ] Update this TODO.md to mark all items complete

## Phase 8: Final Validation

- [ ] Manual test: Copy exact example from issue #38 and verify it works
- [ ] Manual test: Try various code block formats (Python, JS, JSON, etc.)
- [ ] Manual test: Mix code blocks with regular text needing elevation
- [ ] Run full test suite and ensure no regressions
- [ ] Run build and verify no errors
- [ ] Commit changes with conventional commit message