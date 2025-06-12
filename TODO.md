# Todo

## utils/logger
- [x] **T001 · Feature · P0: implement structured stderr logger**
    - **Context:** PLAN.md → Phase 1: Logging Infrastructure, step 1
    - **Action:**
        1. Create `utils/logger.ts` exporting `logToStderr(level, message, metadata)` that writes newline-terminated JSON to `process.stderr`.
        2. Include mandatory fields (`timestamp`, `level`, `message`, `metadata`).
        3. Export `LogLevel` and `LogEntry` types as defined in the plan.
    - **Done‑when:**
        1. Unit test verifies correct JSON shape and `stderr` destination.
        2. `npm test` passes with 100% coverage for this new utility.
    - **Verification:**
        1. Run `node -e "require('./dist/utils/logger').logToStderr('info','test',{})"` and confirm no output on stdout.
    - **Depends‑on:** none

## utils/constants
- [x] **T002 · Feature · P0: define standardized exit codes**
    - **Context:** PLAN.md → Phase 2: Exit Code Standardization, step 1
    - **Action:**
        1. Create `utils/constants.ts` exporting `EXIT_CODES` enum: `{ SUCCESS: 0, ERROR: 1, INTERRUPTED: 130 }`.
        2. Add TSDoc comments explaining each code.
    - **Done‑when:**
        1. File is created, exported, and type-checks without errors.
    - **Depends‑on:** none

## api
- [x] **T003 · Refactor · P1: integrate stderr logger and add observability logs**
    - **Context:** PLAN.md → Phase 1: Logging Infrastructure & Logging & Observability
    - **Action:**
        1. In `api.ts`, replace all `console.log` calls for structured logs with the new `logToStderr` utility.
        2. Add `info` level logs for API request start/completion, including performance metrics like API latency.
        3. Add `error` level logs with context for all API-related error scenarios.
    - **Done‑when:**
        1. All structured logs from `api.ts` flow to stderr.
        2. Observability logs for API lifecycle and errors are implemented.
    - **Verification:**
        1. Run `node dist/cli.js "ping" 2>&1 >/dev/null | jq -e '.message'` returns a value.
    - **Depends‑on:** [T001]

- [x] **T004 · Feature · P1: implement 30s timeout for api calls** *(CANCELLED)*
    - **Context:** PLAN.md → Security Considerations & Open Question #4 - User feedback: API calls can take over a minute, timeouts not wanted
    - **Action:** *(Cancelled - timeout removed from implementation)*
    - **Depends‑on:** [T003]

## cli
- [x] **T005 · Refactor · P1: update cli exit points to use standardized codes**
    - **Context:** PLAN.md → Phase 2: Exit Code Standardization, step 2
    - **Action:**
        1. In `cli.ts`, replace all hard-coded `process.exit()` numbers with the corresponding values from `EXIT_CODES`.
        2. Ensure the Ctrl+C interrupt handler exits with `EXIT_CODES.INTERRUPTED`.
    - **Done‑when:**
        1. Manual run of `node dist/cli.js --version` exits with code 0.
        2. A forced error exits with code 1.
    - **Depends‑on:** [T002]

- [x] **T006 · Feature · P1: improve api key error message and guidance**
    - **Context:** PLAN.md → Phase 3: Error Message Enhancement, step 1
    - **Action:**
        1. In the CLI's error handler, specifically catch missing/invalid API key errors.
        2. Output a clear message to stderr with instructions on how to set the API key and a link to the documentation.
    - **Done‑when:**
        1. Running the CLI without the required API key prints the new guidance and exits with code 1.
    - **Verification:**
        1. Unset the API key and run the CLI; confirm the new error message is displayed.
    - **Depends‑on:** [T005]

- [x] **T007 · Feature · P2: enhance help text with pipe usage examples**
    - **Context:** PLAN.md → Phase 3: Error Message Enhancement, step 2
    - **Action:**
        1. Append examples for common pipe scenarios (e.g., `echo`, `cat`) and heredoc usage to the `cli --help` output.
        2. Add a brief clarification of multiline vs. piped input modes.
    - **Done‑when:**
        1. `cli --help` displays the new examples and explanations.
        2. A snapshot test for the help output is updated and passes.
    - **Verification:**
        1. Run `node dist/cli.js --help` and review the output for clarity.
    - **Depends‑on:** none

- [x] **T008 · Feature · P1: implement 1mb input size limit**
    - **Context:** PLAN.md → Security Considerations & Open Question #3
    - **Action:**
        1. In the stdin handling logic, track the size of the incoming data stream.
        2. If the input exceeds 1MB, immediately stop processing and exit with an "Input size limit exceeded" error.
    - **Done‑when:**
        1. Piping a file larger than 1MB to the CLI results in a graceful exit with a clear error message.
    - **Verification:**
        1. Create a >1MB file and run `cat large_file.txt | node dist/cli.js` to confirm the error.
    - **Depends‑on:** [T005]

## tests
- [x] **T009 · Test · P1: add test for clean stdout pipe compatibility**
    - **Context:** PLAN.md → Phase 4: Comprehensive Testing, Test `echo "test" | elevator --raw`
    - **Action:**
        1. Create an end-to-end test that spawns the CLI via a child process with piped stdin.
        2. Assert that `stdout` contains only the expected command output and nothing else.
    - **Done‑when:**
        1. Test passes on Linux & macOS CI runners.
    - **Depends‑on:** [T003]

- [x] **T010 · Test · P1: add test to verify structured logs on stderr**
    - **Context:** PLAN.md → Phase 4: Test `elevator "test" 2>&1 >/dev/null`
    - **Action:**
        1. Create an end-to-end test that runs the CLI with argument input, redirecting `stdout` to `/dev/null`.
        2. Capture `stderr` and assert that it contains valid, structured JSON logs.
    - **Done‑when:**
        1. Test successfully parses a log entry from the captured `stderr` stream.
    - **Depends‑on:** [T003]

- [x] **T011 · Test · P1: add test to ensure all standardized exit codes conform to spec**
    - **Context:** PLAN.md → Phase 4: Test exit code behavior
    - **Action:**
        1. Create end-to-end tests that execute the CLI in success, error, and interrupt (via `SIGINT`) scenarios.
        2. Assert that the process exits with the correct codes (0, 1, 130).
    - **Done‑when:**
        1. Test suite reports all exit code assertions passed.
    - **Depends‑on:** [T005]

- [x] **T012 · Test · P1: add test to ensure api key is never logged**
    - **Context:** PLAN.md → Security Considerations: API Key Handling
    - **Action:**
        1. Create a test that runs the CLI with an API key set.
        2. Capture all `stderr` output and assert that the API key value does not appear anywhere in the logs.
    - **Done‑when:**
        1. Test passes, confirming no API key leakage in logs.
    - **Depends‑on:** [T003]

- [ ] **T013 · Test · P2: implement full integration test matrix**
    - **Context:** PLAN.md → Phase 4: Integration test matrix
    - **Action:**
        1. Create a comprehensive integration test suite that covers the matrix of inputs (direct args, heredoc, interactive TTY mock) and error scenarios (timeout, size limit, API key).
        2. Use a mocked external API but real internal components as per the "No Internal Mocking Policy".
    - **Done‑when:**
        1. Test coverage for the CLI's core logic path is ≥95%.
    - **Depends‑on:** [T004, T006, T008, T012]

- [ ] **T014 · Test · P3: add performance benchmarks**
    - **Context:** PLAN.md → Phase 4: Performance testing
    - **Action:**
        1. Create a benchmark script that measures CLI startup time and memory usage for a typical operation.
        2. Add CI step to fail the build if startup time exceeds 500ms or memory usage exceeds 50MB.
    - **Done‑when:**
        1. Benchmark script is integrated into the CI pipeline and passes.
    - **Depends‑on:** [T013]

## docs
- [ ] **T015 · Chore · P2: update readme with pipe compatibility and exit codes**
    - **Context:** PLAN.md → Post-Implementation
    - **Action:**
        1. Add a new section to `README.md` detailing pipe usage with examples.
        2. Add a table explaining the standardized exit codes for scripting purposes.
        3. Update the API key section to reference the improved error message.
    - **Done‑when:**
        1. `README.md` is updated and passes markdown-lint.
    - **Depends‑on:** [T007, T011]

---

### Clarifications & Assumptions
- [ ] **Issue:** Key decisions from the plan are adopted as project direction.
    - **Context:** PLAN.md → Open Questions & Decisions Needed
    - **Blocking?:** no
    - **Decisions:**
        1.  **API Key UX:** Will remain environment-variable-only to preserve pipe compatibility.
        2.  **Logging Level:** Verbosity control is deferred until required by user feedback.
        3.  **Input Size Limit:** A 1MB limit will be implemented.
        4.  **API Timeout:** A fixed 30-second timeout will be used.