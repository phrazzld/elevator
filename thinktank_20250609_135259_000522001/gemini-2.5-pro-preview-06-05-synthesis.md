# Todo

## Package Publication Setup

- [ ] **T001 · Chore · P0: investigate and select final npm package name**

  - **Context:** Risk Analysis: HIGH Risk: Package Name Conflict; Open Questions: 1. Package Name Strategy
  - **Action:**
    1. Run `npm view elevator` to check for the primary name's availability.
    2. If taken, evaluate and select a fallback name from the plan's list (`elevator-cli`, `prompt-elevator`, etc.).
    3. Document the final, chosen package name for use in all subsequent tasks.
  - **Done‑when:**
    1. A final, available package name is selected and recorded.
  - **Verification:**
    1. `npm view <chosen-name>` returns a "Not Found" error, confirming availability.
  - **Depends‑on:** none

- [ ] **T002 · Feature · P1: update package.json with publication metadata**

  - **Context:** Implementation Blueprint: Phase 1.1; Security & Configuration: Package Security
  - **Action:**
    1. Update `package.json` with all required fields for publication: `name`, `version` (set to `1.0.0` per recommendation), `description`, `main`, `bin`, `files`, `keywords`, `repository`, `license`, and `engines`.
    2. Add the `publishConfig` object with `access: "public"` and `provenance: true`.
  - **Done‑when:**
    1. The `package.json` file is fully populated with the metadata from the plan.
    2. `npm pack --dry-run` successfully executes without metadata errors.
  - **Depends‑on:** [T001]

- [ ] **T003 · Feature · P2: add npm lifecycle and packaging scripts**

  - **Context:** Implementation Blueprint: Phase 1.2
  - **Action:**
    1. Add the `prepublishOnly`, `publish:check`, and `publish:local` scripts to the `scripts` section of `package.json`.
  - **Done‑when:**
    1. `npm run publish:check` executes without errors and shows the expected package contents.
    2. `npm run publish:local` successfully creates a `.tgz` package file in the project root.
  - **Depends‑on:** [T002]

- [ ] **T004 · Chore · P2: configure cli entrypoint with shebang and executable permissions**

  - **Context:** Implementation Blueprint: Phase 1.3; Risk Analysis: MEDIUM Risk: Binary Permissions
  - **Action:**
    1. Ensure the primary built CLI file (`dist/cli.js`) starts with the shebang `#!/usr/bin/env node`.
    2. Verify the build process sets executable permissions (`+x`) on `dist/cli.js`.
  - **Done‑when:**
    1. The compiled `dist/cli.js` file contains the correct shebang and has executable permissions after the build process runs.
  - **Verification:**
    1. Run `npm pack`. Unpack the generated `.tgz` file and run `ls -l` on the `dist/cli.js` file to confirm its permissions.
  - **Depends‑on:** none

- [ ] **T005 · Chore · P1: configure NPM_TOKEN secret in github repository**

  - **Context:** Implementation Blueprint: Phase 2.2
  - **Action:**
    1. Generate a new npm "Automation" access token with permissions scoped to the target package.
    2. Add the generated token as a repository secret named `NPM_TOKEN` in the project's GitHub settings.
  - **Done‑when:**
    1. The `NPM_TOKEN` secret is available in the GitHub repository's Actions secrets.
  - **Verification:**
    1. The secret appears in the list of repository secrets in GitHub settings.
  - **Depends‑on:** [T001]

- [ ] **T006 · Feature · P1: create github actions workflow to publish on tag push**

  - **Context:** Implementation Blueprint: Phase 2.1
  - **Action:**
    1. Create a new workflow file at `.github/workflows/publish.yml`.
    2. Implement the workflow to trigger on pushes to tags matching `v*`.
    3. Define a `publish` job that checks out code, sets up Node.js, installs dependencies, builds, tests, and runs `npm publish`.
    4. Configure the `npm publish` step to use the `NPM_TOKEN` secret.
  - **Done‑when:**
    1. The `publish.yml` file is committed to the repository and passes YAML validation.
  - **Verification:**
    1. Pushing a test tag (e.g., `v1.0.0-test`) successfully triggers the workflow and all steps pass (can use `npm publish --dry-run` initially).
  - **Depends‑on:** [T003], [T005]

- [ ] **T007 · Test · P2: add unit tests to validate package.json configuration**

  - **Context:** Testing Strategy: Unit Testing
  - **Action:**
    1. Create a new test file, e.g., `test/package.test.ts`.
    2. Add a test case to verify that `package.json`'s `bin` property correctly points to `dist/cli.js`.
    3. Add a test case to validate that the `files` array includes `dist/` and excludes `src/`.
  - **Done‑when:**
    1. The new unit tests are implemented and pass when `npm test` is run.
  - **Depends‑on:** [T002]

- [ ] **T008 · Test · P1: create integration test script for local packaging and installation**

  - **Context:** Testing Strategy: Integration Testing; Phase 3.1 Pre-publish testing
  - **Action:**
    1. Create an executable shell script at `test/integration/publish.test.sh`.
    2. Implement the script to perform `npm pack`, `npm install -g <package>.tgz`, run the `elevator` command, and then clean up.
    3. Integrate the script into the CI pipeline to run as part of the main test suite.
  - **Done‑when:**
    1. The script runs successfully locally and in the CI environment, printing a success message.
  - **Verification:**
    1. Script outputs "✅ Global installation test passed".
  - **Depends‑on:** [T004]

- [ ] **T009 · Chore · P2: update readme.md with npm installation and usage instructions**

  - **Context:** Implementation Blueprint: Phase 4.1
  - **Action:**
    1. Replace the existing installation section in `README.md` with the "Global Installation (Recommended)" command: `npm install -g <package-name>`.
    2. Ensure the `Usage` section is present and accurate.
  - **Done‑when:**
    1. The `README.md` file reflects the new, simpler installation method.
  - **Depends‑on:** [T001]

- [ ] **T010 · Chore · P3: document the release process and versioning guidelines**
  - **Context:** Implementation Blueprint: Phase 4.2
  - **Action:**
    1. Create a new document (e.g., `RELEASING.md` or add to `CONTRIBUTING.md`).
    2. Document the steps to publish a new version: update `package.json` version, create a git tag (`git tag vX.Y.Z`), and push the tag (`git push --tags`).
    3. Add notes on the versioning strategy (SemVer, starting at 1.0.0).
  - **Done‑when:**
    1. The release documentation is written and committed to the repository.
  - **Depends‑on:** [T006]

---

### Clarifications & Assumptions

- [ ] **Issue:** The plan's workflow uses `pnpm` but `package.json` scripts use `npm`.

  - **Context:** Phase 1.2 vs 2.1
  - **Blocking?:** yes (a decision is needed before implementing T006)

- [ ] **Issue:** A decision on release cadence is needed for process documentation.

  - **Context:** Open Questions & Decisions Needed: 3. Release Frequency
  - **Blocking?:** no

- [ ] **Issue:** A decision on cross-platform CI testing scope (Windows/macOS) is needed.
  - **Context:** Open Questions & Decisions Needed: 4. Platform Testing
  - **Blocking?:** no
