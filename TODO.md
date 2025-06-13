# Todo

## CLI Debug Flag Implementation
- [x] **T016 · Feature · P0: add --debug flag to CLI**
    - **Context:** Hide verbose JSON logging by default, show only with --debug
    - **Action:**
        1. Add `--debug` flag to commander options in `cli.ts`
        2. Add `debug?: boolean` to `CliArgs` interface
        3. Pass debug flag through to logger calls
    - **Done‑when:**
        1. `elevator --help` shows the --debug flag
        2. Flag is accessible in processPrompt function
    - **Verification:**
        1. Run `elevator --debug "test"` and confirm flag is parsed correctly

- [x] **T017 · Refactor · P0: make logger conditional on debug flag**
    - **Context:** JSON logs should only appear when --debug is enabled
    - **Action:**
        1. Add optional `debug` parameter to `logToStderr` function
        2. Only write to stderr when debug is true
        3. Update all `logToStderr` calls in `api.ts` to pass debug flag
    - **Done‑when:**
        1. Running without --debug produces no JSON output to stderr
        2. Running with --debug shows JSON logs
    - **Verification:**
        1. `elevator "test" 2>&1 | grep timestamp` returns nothing
        2. `elevator --debug "test" 2>&1 | grep timestamp` shows logs
    - **Depends‑on:** [T016]

## Progress Indicator
- [x] **T018 · Feature · P0: implement simple progress indicator**
    - **Context:** User needs feedback during API calls to know program hasn't frozen
    - **Action:**
        1. Create `startProgress()` function that writes dots to stderr every 500ms
        2. Return cleanup function to stop the interval
        3. Implement in `api.ts` before API call
        4. Clean up on success or error
    - **Done‑when:**
        1. Dots appear during API call
        2. Progress stops when response arrives
        3. No dots appear when --raw flag is used
    - **Verification:**
        1. Run `elevator "test"` and see animated dots during wait

- [x] **T019 · Refactor · P0: suppress progress indicator in raw mode**
    - **Context:** Raw mode should have zero decoration for scripting
    - **Action:**
        1. Pass `raw` flag to `elevatePrompt` function
        2. Only show progress indicator when not in raw mode
        3. Update function signature and all calls
    - **Done‑when:**
        1. `elevator --raw "test"` shows no progress dots
        2. Piped output remains clean
    - **Depends‑on:** [T018]

## Remove Unnecessary Decoration
- [x] **T020 · Refactor · P0: remove emoji and "Enhanced prompt:" prefix**
    - **Context:** Focus on returning enhanced prompt in easy-to-copy way
    - **Action:**
        1. Remove lines 40-41 from `cli.ts` (the sparkle emoji output)
        2. Output result directly to console.log regardless of raw flag
        3. Remove the conditional between raw and formatted output
    - **Done‑when:**
        1. Output shows only the enhanced prompt text
        2. No decorative elements appear
    - **Verification:**
        1. `elevator "test"` outputs only the transformed prompt

## Improve Prompt Quality
- [ ] **T021 · Refactor · P0: rewrite system prompt for domain expertise**
    - **Context:** Current outputs are corporate jargon, need expert-level rearticulation
    - **Action:**
        1. Replace entire ELEVATION_PROMPT with new expert-focused prompt
        2. Remove all CRISP methodology references
        3. Focus on: "rearticulate as a domain expert would"
        4. Emphasize clarity, precision, and natural language
        5. Remove placeholder instruction - no [BRACKETED_TERMS]
    - **Done‑when:**
        1. Outputs read like expert wrote them, not corporate brief
        2. No rigid numbered structures unless naturally appropriate
        3. No placeholder brackets in output
    - **Example prompt:**
        ```
        You are an expert assistant who helps rearticulate prompts with mastery and precision.
        
        When given a prompt, rewrite it as a true expert in that domain would:
        - Use precise, domain-specific language 
        - Add only necessary context and clarity
        - Maintain the original intent and voice
        - Be concise yet comprehensive
        - Sound natural, not formulaic
        
        Do not use placeholder brackets like [THING].
        Do not force numbered lists or rigid structures.
        Do not write corporate requirements documents.
        
        Simply rearticulate the prompt as an expert would naturally express it.
        
        Prompt to enhance:
        ```

- [ ] **T022 · Cleanup · P0: remove buildElevationPrompt function**
    - **Context:** Simplify to single well-crafted prompt string
    - **Action:**
        1. Remove `buildElevationPrompt()` function from `api.ts`
        2. Replace with direct string constant
        3. Remove dynamic example building
    - **Done‑when:**
        1. ELEVATION_PROMPT is a simple string constant
        2. No function calls to build prompt
    - **Depends‑on:** [T021]

- [ ] **T023 · Cleanup · P0: remove examples.ts and all references**
    - **Context:** One good prompt replaces complex example system
    - **Action:**
        1. Delete `src/prompting/examples.ts` file
        2. Remove import from `api.ts`
        3. Remove the entire `src/prompting/` directory if empty
        4. Update any tests that reference examples
    - **Done‑when:**
        1. No examples.ts file exists
        2. Code compiles and runs without example system
    - **Depends‑on:** [T022]

## Testing Updates
- [ ] **T024 · Test · P1: update tests for new behavior**
    - **Context:** Tests need to reflect removal of decoration and new prompts
    - **Action:**
        1. Update CLI tests to not expect "✨ Enhanced prompt:" prefix
        2. Update any snapshot tests with new output format
        3. Add test for --debug flag behavior
        4. Add test for progress indicator
    - **Done‑when:**
        1. All existing tests pass
        2. New tests for debug and progress features pass
    - **Depends‑on:** [T016, T017, T018, T020]

- [ ] **T025 · Test · P1: add test for improved prompt quality**
    - **Context:** Ensure prompts are expert-level, not corporate
    - **Action:**
        1. Create test with sample inputs
        2. Assert outputs don't contain bracket placeholders
        3. Assert outputs are reasonably sized (not 10x input)
        4. Check for natural language vs rigid structure
    - **Done‑when:**
        1. Quality assertions pass
        2. No regression to corporate style
    - **Depends‑on:** [T021]

## Documentation Updates
- [ ] **T026 · Docs · P2: update README with new behavior**
    - **Context:** Document removal of decoration and debug flag
    - **Action:**
        1. Add --debug flag to usage examples
        2. Update output examples to show clean format
        3. Add note about expert-level transformations
        4. Remove any references to structured output
    - **Done‑when:**
        1. README accurately reflects new behavior
        2. Examples show actual output format
    - **Depends‑on:** [T020, T016]

---

### Implementation Order
1. **Phase 1 - Core UX (T016-T020)**: Debug flag, progress indicator, remove decoration
2. **Phase 2 - Prompt Quality (T021-T023)**: Rewrite prompt, remove complexity
3. **Phase 3 - Testing (T024-T025)**: Update tests for new behavior
4. **Phase 4 - Documentation (T026)**: Update docs

### Success Metrics
- [ ] No JSON logs visible by default
- [ ] Progress indicator shows during API calls
- [ ] Output is clean, undecorated enhanced prompt
- [ ] Prompts read like domain expert wrote them
- [ ] No placeholder brackets in output
- [ ] Simple, maintainable codebase