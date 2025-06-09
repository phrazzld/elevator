# Todo

## API Core
- [x] **T001 · Feature · P0: implement direct API function in `src/api.ts`**
    - **Context:** Phase 1: Core API Function
    - **Action:**
        1. Create `src/api.ts` with an `async function elevatePrompt(prompt: string): Promise<string>`.
        2. Implement the direct `fetch()` call to the Gemini API endpoint, including headers and body structure.
        3. Extract the elevation prompt template into a simple constant within the module.
    - **Done-when:**
        1. `src/api.ts` exists and compiles.
        2. The `elevatePrompt` function makes a successful API call with a valid key and prompt.
    - **Verification:**
        1. Manually invoke the function from a test script with a valid `GEMINI_API_KEY` to confirm it returns a string response.
    - **Depends-on:** none

- [ ] **T002 · Feature · P1: add robust error handling to API calls**
    - **Context:** Phase 1: Core API Function; Open Questions #1
    - **Action:**
        1. Check for `!response.ok` and throw a detailed error: `API error: ${response.status} ${response.statusText}`.
        2. Wrap `response.json()` in a try/catch block to handle malformed JSON responses.
    - **Done-when:**
        1. A failed HTTP request (e.g., 4xx, 5xx) throws a specific, descriptive error.
        2. An unparsable JSON response throws a specific error.
    - **Verification:**
        1. Point the API endpoint to a server that returns a 500 error and confirm the correct error is thrown.
    - **Depends-on:** [T001]

- [ ] **T003 · Feature · P1: implement request timeout handling**
    - **Context:** Open Questions & Decisions: #2. Timeout Handling
    - **Action:**
        1. Use an `AbortController` with `AbortSignal.timeout(30000)` to add a 30-second timeout to the `fetch()` call in `src/api.ts`.
    - **Done-when:**
        1. An API request that exceeds 30 seconds is aborted and throws a timeout error.
    - **Verification:**
        1. Test against an endpoint that intentionally delays its response for >30s to confirm the timeout error is triggered.
    - **Depends-on:** [T001]

- [ ] **T004 · Feature · P2: add basic API response structure validation**
    - **Context:** Open Questions & Decisions: #3. Response Validation
    - **Action:**
        1. After parsing the JSON response, validate that the path `data.candidates[0].content.parts[0].text` exists.
        2. If the path is invalid, throw a descriptive error like "Invalid API response structure".
    - **Done-when:**
        1. The function safely handles unexpected API response schemas without crashing.
    - **Verification:**
        1. Mock a fetch response with a valid but structurally incorrect JSON object and confirm the correct error is thrown.
    - **Depends-on:** [T001]

- [ ] **T005 · Feature · P1: implement simple structured JSON logging**
    - **Context:** Logging & Observability
    - **Action:**
        1. In `src/api.ts`, add structured `console.log` or `console.error` calls for key events: API request start, API request completion (success/failure), and error occurrences.
        2. Logged objects should include `timestamp`, `level`, and `message`.
    - **Done-when:**
        1. API interactions produce structured JSON logs to the console.
        2. API keys or other sensitive information are NOT present in logs.
    - **Depends-on:** [T001]

## CLI Integration
- [ ] **T006 · Refactor · P0: update `src/cli.ts` to use direct API call**
    - **Context:** Phase 2: CLI Integration
    - **Action:**
        1. Remove all dependency injection container setup and usage.
        2. Import `elevatePrompt` directly from `src/api.ts`.
        3. Replace the old implementation with a direct `await elevatePrompt(prompt)` call within a simple `try/catch` block.
    - **Done-when:**
        1. `src/cli.ts` no longer has dependency injection logic.
        2. The CLI successfully processes a prompt using the new direct API call.
    - **Verification:**
        1. Run the compiled CLI from the command line with a test prompt and confirm it outputs an elevated prompt.
    - **Depends-on:** [T001]

## File & Dependency Cleanup
- [ ] **T007 · Chore · P1: delete obsolete adapter and core files**
    - **Context:** Phase 3: File Elimination
    - **Action:**
        1. Delete the following files: `src/core/apiClient.ts`, `src/adapters/geminiClient.ts`, `src/adapters/apiProgressAdapter.ts`, and `src/dependencyInjection.ts`.
    - **Done-when:**
        1. The specified files are removed from the repository.
        2. The project still compiles successfully (after import paths are fixed in the next task).
    - **Depends-on:** [T006]

- [ ] **T008 · Chore · P1: update all imports and remove Result types**
    - **Context:** Phase 3: File Elimination
    - **Action:**
        1. Find and remove all imports from the deleted files across the codebase.
        2. Remove all usages of the `Result` type, refactoring code to use standard `Promise`/`async/await` with `try/catch`.
    - **Done-when:**
        1. The project compiles without any errors related to missing files or types.
    - **Depends-on:** [T007]

- [ ] **T009 · Chore · P2: remove unused dependencies from `package.json`**
    - **Context:** Phase 5: Cleanup & Verification
    - **Action:**
        1. Uninstall the Google AI SDK, any Result type libraries, and any other dependencies made redundant by this refactor.
        2. Run the package manager's install command to update the lockfile.
    - **Done-when:**
        1. `package.json` and the lockfile are clean of unused dependencies.
        2. The project installs, builds, and tests successfully.
    - **Depends-on:** [T008]

## Testing
- [ ] **T010 · Test · P1: create primary integration test for `src/api.ts`**
    - **Context:** Phase 4: Testing Strategy
    - **Action:**
        1. Create `test/api.integration.test.ts`.
        2. Add a test that calls `elevatePrompt` and asserts a successful response, running only if `GEMINI_API_KEY` is present.
        3. Add a test that asserts `elevatePrompt` rejects with an error if `GEMINI_API_KEY` is missing.
    - **Done-when:**
        1. The integration test suite passes for both happy path and API key error cases.
    - **Verification:**
        1. Run the test suite with and without the `GEMINI_API_KEY` environment variable set.
    - **Depends-on:** [T001]

- [ ] **T011 · Test · P1: create secondary integration test for the CLI**
    - **Context:** Testing Strategy: CLI Tests
    - **Action:**
        1. Create `test/cli.integration.test.ts`.
        2. Write a test that executes the compiled CLI as a subprocess (e.g., via `execAsync`).
        3. Assert that for a given prompt, the process exits with code 0 and `stdout` is not empty.
    - **Done-when:**
        1. The CLI integration test successfully verifies end-to-end functionality.
    - **Depends-on:** [T006]

- [ ] **T012 · Chore · P2: delete obsolete adapter tests**
    - **Context:** Phase 3 & 4
    - **Action:**
        1. Delete the test file `src/adapters/geminiClient.test.ts`.
        2. Review and remove any other tests that were specifically for mocking or testing the now-deleted abstractions.
    - **Done-when:**
        1. The specified test files are removed.
        2. The test suite runs successfully without them.
    - **Depends-on:** [T007]

## Finalization
- [ ] **T013 · Chore · P1: perform full end-to-end verification**
    - **Context:** Phase 5: Cleanup & Verification
    - **Action:**
        1. Manually run the CLI tool with a variety of prompts to ensure feature parity and quality of output.
    - **Done-when:**
        1. The tool is confirmed to be fully functional and reliable for its primary use case.
    - **Verification:**
        1. Run `node dist/cli.js "explain REST APIs simply"` and confirm a high-quality response.
        2. Run `node dist/cli.js ""` and confirm graceful failure.
    - **Depends-on:** [T006, T010, T011]

- [ ] **T014 · Documentation · P2: update `ARCHITECTURE.md`**
    - **Context:** Post-Implementation: Architecture Documentation
    - **Action:**
        1. Update `docs/ARCHITECTURE.md` to reflect the new, simplified architecture.
        2. Replace the old data flow diagram with `CLI → Direct Function → API`.
        3. Add a brief rationale explaining the shift to radical simplification.
    - **Done-when:**
        1. The architecture documentation accurately describes the current codebase.
    - **Depends-on:** [T013]

- [ ] **T015 · Chore · P3: benchmark performance improvements**
    - **Context:** Success Metrics: Quantitative Targets
    - **Action:**
        1. Measure and record the new build time and test execution time.
        2. Compare against pre-refactor metrics to confirm targets are met.
    - **Done-when:**
        1. Performance metrics are recorded and confirm a significant improvement.
    - **Depends-on:** [T009, T012]

---

### Clarifications & Assumptions
- [ ] **Issue:** Streaming support has been explicitly removed.
    - **Context:** Open Questions #4. This will be addressed in Issue #19 if needed.
    - **Blocking?:** no
- [ ] **Issue:** A more advanced configuration system is deferred.
    - **Context:** Configuration Migration. This will be addressed in Issue #11 if needed.
    - **Blocking?:** no
- [ ] **Issue:** Simple retry logic is deferred.
    - **Context:** Risk Analysis & Mitigation. This will be addressed in Issue #2 if needed.
    - **Blocking?:** no