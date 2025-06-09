```
# Todo

## Clarifications
- [ ] **Issue:** Final package name for npm distribution is undecided.
    - **Context:** Open Questions & Decisions Needed / 1. Package Name Strategy, Risk Analysis & Mitigation / HIGH Risk: Package Name Conflict
    - **Blocking?:** yes
- [ ] **Issue:** Initial versioning strategy (1.0.0 vs 0.1.0) is undecided.
    - **Context:** Open Questions & Decisions Needed / 2. Versioning Strategy
    - **Blocking?:** no
- [ ] **Issue:** Release frequency and criteria are undecided.
    - **Context:** Open Questions & Decisions Needed / 3. Release Frequency
    - **Blocking?:** no
- [ ] **Issue:** Scope for cross-platform CI testing (Windows/macOS) is undecided.
    - **Context:** Open Questions & Decisions Needed / 4. Platform Testing
    - **Blocking?:** no

## Package Setup
- [ ] **T001 · Chore · P1: decide on npm package name**
    - **Context:** Open Questions & Decisions Needed / 1. Package Name Strategy, Risk Analysis & Mitigation / HIGH Risk: Package Name Conflict
    - **Action:**
        1. Check npm availability for "elevator" via `npm view elevator`.
        2. If unavailable, propose and decide on a fallback name (e.g., `elevator-cli`).
    - **Done‑when:** Final package name is decided and documented.
    - **Verification:** `npm view <chosen-name>` shows it's available (or the decision is made to use a scoped name).
    - **Depends‑on:** none
- [ ] **T002 · Feature · P2: configure core package.json metadata**
    - **Context:** Implementation Blueprint / Phase 1 / 1.1 Update package.json
    - **Action:**
        1. Set `name` to the chosen package name.
        2. Set `version` to `1.0.0`.
        3. Add `description`, `main`, `bin`, `files`, `keywords`, `repository`, `license`, `engines` as specified.
    - **Done‑when:** `package.json` is updated with all specified metadata.
    - **Verification:** `npm pack --dry-run` output reflects correct metadata and files.
    - **Depends‑on:** [T001]
- [ ] **T003 · Feature · P2: add npm lifecycle scripts**
    - **Context:** Implementation Blueprint / Phase 1 / 1.2 Add npm scripts
    - **Action:**
        1. Add `prepublishOnly` script: `npm run build && npm run test`.
        2. Add `publish:check` script: `npm pack --dry-run`.
        3. Add `publish:local` script: `npm pack`.
    - **Done‑when:** `package.json` includes the new scripts.
    - **Verification:**
        1. `npm run publish:check` executes without errors.
        2. `npm run publish:local` creates a `.tgz` file.
    - **Depends‑on:** [T002]
- [ ] **T004 · Refactor · P2: ensure cli executable shebang and permissions**
    - **Context:** Implementation Blueprint / Phase 1 / 1.3 CLI executable setup
    - **Action:**
        1. Verify `dist/cli.js` contains `#!/usr/bin/env node` as its first line after compilation.
        2. Ensure the build process or a post-build step sets executable permissions for `dist/cli.js`.
    - **Done‑when:** The `dist/cli.js` file has the correct shebang and is executable.
    - **Verification:**
        1. `head -n 1 dist/cli.js` shows the shebang.
        2. `ls -l dist/cli.js` shows executable permissions (e.g., `rwxr-xr-x`).
        3. `node dist/cli.js --help` executes correctly.
    - **Depends‑on:** [T003]
- [ ] **T017 · Feature · P2: configure npm publish security settings**
    - **Context:** Security & Configuration / Package Security
    - **Action:**
        1. Add `publishConfig` to `package.json`.
        2. Set `access` to `"public"`.
        3. Set `provenance` to `true`.
    - **Done‑when:** `package.json` includes `publishConfig` with specified values.
    - **Verification:** `npm pack --dry-run` output reflects these settings (though provenance might not be directly visible).
    - **Depends‑on:** [T002]

## CI/CD & Publishing
- [ ] **T005 · Feature · P2: create github actions publish workflow**
    - **Context:** Implementation Blueprint / Phase 2 / 2.1 Create .github/workflows/publish.yml
    - **Action:**
        1. Create `.github/workflows/publish.yml`.
        2. Add YAML content for `Publish to npm` workflow as specified in the plan (on `push` to `tags: ['v*']`).
        3. Configure `actions/checkout@v3`, `actions/setup-node@v3` (node 18, npm registry).
        4. Add `pnpm install`, `pnpm build`, `pnpm test` steps.
        5. Add `npm publish` step with `NODE_AUTH_TOKEN`.
    - **Done‑when:** `publish.yml` is created and committed.
    - **Verification:** Workflow file is present and correctly structured.
    - **Depends‑on:** [T004]
- [ ] **T006 · Chore · P1: generate npm automation token**
    - **Context:** Implementation Blueprint / Phase 2 / 2.2 Configure npm registry authentication
    - **Action:**
        1. Generate a new npm access token for automation with appropriate permissions (publish).
        2. Ensure 2FA is enabled on the npm account if not already.
    - **Done‑when:** npm automation token is generated.
    - **Verification:** Token is created and noted.
    - **Depends‑on:** none
- [ ] **T007 · Chore · P1: configure github repository secret for npm token**
    - **Context:** Implementation Blueprint / Phase 2 / 2.2 Configure npm registry authentication
    - **Action:**
        1. Add the generated npm access token (from T006) to GitHub repository secrets as `NPM_TOKEN`.
    - **Done‑when:** `NPM_TOKEN` secret is configured in the GitHub repository.
    - **Verification:** Secret is visible in GitHub repository settings (though value is masked).
    - **Depends‑on:** [T006]
- [ ] **T008 · Test · P2: test npm registry authentication setup in ci**
    - **Context:** Implementation Blueprint / Phase 2 / 2.2 Configure npm registry authentication
    - **Action:**
        1. Create a temporary workflow or modify `publish.yml` to run a test command using `NPM_TOKEN` without publishing (e.g., `npm whoami --registry=https://registry.npmjs.org/`).
        2. Trigger the workflow (e.g., push a temporary tag or manually run).
        3. Verify the command succeeds, indicating correct authentication.
        4. Remove temporary workflow/changes.
    - **Done‑when:** npm authentication is confirmed to work within GitHub Actions.
    - **Verification:** CI run logs show successful authentication.
    - **Depends‑on:** [T005], [T007]

## Testing & Validation
- [ ] **T009 · Test · P1: create and run pre-publish integration test script**
    - **Context:** Implementation Blueprint / Phase 3 / 3.1 Pre-publish testing, Testing Strategy / Integration Testing
    - **Action:**
        1. Create `test/integration/publish.test.sh` as specified.
        2. Implement `npm pack --dry-run` and `npm pack` checks.
        3. Implement local global installation (`npm install -g *.tgz`).
        4. Implement CLI execution test (`elevator "test prompt"`).
        5. Implement cleanup (`npm uninstall -g elevator-cli`, `rm *.tgz`).
        6. Add a step to the main CI workflow (or a dedicated integration test workflow) to run this script.
    - **Done‑when:** `publish.test.sh` script is created, executable, and passes when run locally and in CI.
    - **Verification:** Script outputs "✅ Global installation test passed". CI pipeline includes and passes this test.
    - **Depends‑on:** [T004]
- [ ] **T010 · Test · P2: add unit tests for package configuration**
    - **Context:** Testing Strategy / Unit Testing
    - **Action:**
        1. Create `test/package.test.ts`.
        2. Add unit tests to verify `package.json` bin configuration (`elevator` points to `dist/cli.js`).
        3. Add unit tests to verify `package.json` files array (includes `dist/**/*.js`, `README.md`, `LICENSE`, excludes `src/**`).
    - **Done‑when:** Unit tests for package configuration are created and pass.
    - **Verification:** `npm test` runs these tests and they pass.
    - **Depends‑on:** [T002]
- [ ] **T011 · Chore · P2: ensure package size is within target**
    - **Context:** Implementation Blueprint / Phase 3 / 3.2 Publication validation, Risk Analysis & Mitigation / LOW Risk: Package Size Bloat
    - **Action:**
        1. Run `npm pack --dry-run` and inspect the output.
        2. Verify the total package size is less than 100KB.
        3. If larger, identify and exclude unnecessary files (e.g., via `.npmignore`).
    - **Done‑when:** Packaged `.tgz` size is confirmed to be < 100KB.
    - **Verification:** `npm pack --dry-run` output or `ls -lh *.tgz` after `npm pack` confirms size.
    - **Depends‑on:** [T002]

## Documentation & Strategy
- [ ] **T012 · Chore · P2: update readme with installation instructions**
    - **Context:** Implementation Blueprint / Phase 4 / 4.1 Update README.md installation section
    - **Action:**
        1. Update `README.md` with the "Global Installation (Recommended)" section.
        2. Add the "Usage" section with `elevator "your prompt here"` and `elevator --raw "build an API"` examples.
    - **Done‑when:** `README.md` is updated with new installation and usage instructions.
    - **Verification:** Instructions are clear and correct.
    - **Depends‑on:** [T002]
- [ ] **T013 · Chore · P2: document release and versioning process**
    - **Context:** Implementation Blueprint / Phase 4 / 4.2 Add publishing documentation
    - **Action:**
        1. Add documentation (e.g., to a `RELEASING.md` or `CONTRIBUTING.md`) outlining the release process (pushing `v*` tags).
        2. Document the chosen version management guidelines (e.g., semantic versioning approach for 1.0.0 start and manual releases).
        3. Include troubleshooting notes for publishing failures.
    - **Done‑when:** Release and versioning process is documented.
    - **Verification:** Documentation exists and clearly explains the process.
    - **Depends‑on:** [T005], [T0
```
