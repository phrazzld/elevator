# Todo

## Package Publication

- [ ] **T001 · Chore · P0: investigate and select final npm package name**

  - **Context:** Open Questions & Decisions Needed: 1. Package Name Strategy
  - **Action:**
    1. Check for the availability of the `elevator` package name on npmjs.com using `npm view elevator`.
    2. If taken, evaluate and select a fallback name from the list: `elevator-cli`, `prompt-elevator`, `ai-elevator`.
    3. Document the final chosen name for use in subsequent tasks.
  - **Done‑when:**
    1. A final, available package name is selected and confirmed.
  - **Depends‑on:** none

- [ ] **T002 · Feature · P1: update package.json with publication metadata**

  - **Context:** Implementation Blueprint: Phase 1.1, Security & Configuration: Package Security
  - **Action:**
    1. Update `package.json` with all required fields for publication: `name`, `version` (set to `1.0.0`), `description`, `main`, `bin`, `files`, `keywords`, `repository`, `license`, and `engines`.
    2. Add the `publishConfig` object to ensure public access and enable provenance.
  - **Done‑when:**
    1. The `package.json` file is fully populated with the metadata from the plan.
    2. Running `npm pack --dry-run` successfully shows the expected package contents and no errors.
  - **Depends‑on:** [T001]

- [ ] **T003 · Feature · P2: add prepublish and packaging scripts to package.json**

  - **Context:** Implementation Blueprint: Phase 1.2
  - **Action:**
    1. Add the `prepublishOnly`, `publish:check`, and `publish:local` scripts to the `scripts` section of `package.json`.
  - **Done‑when:**
    1. `npm run publish:check` executes without errors and shows the expected package contents.
    2. `npm run publish:local` successfully creates a `.tgz` package file in the project root.
  - **Depends‑on:** [T002]

- [ ] **T004 · Chore · P2: configure cli entrypoint with shebang and executable permissions**

  - **Context:** Implementation Blueprint: Phase 1.3, Risk Analysis & Mitigation: Binary Permissions
  - **Action:**
    1. Ensure the primary CLI source file (`src/cli.ts` or equivalent) starts with the shebang `#!/usr/bin/env node`.
    2. Verify the build process (`tsc`) preserves the shebang in the output file (`dist/cli.js`).
    3. Ensure the build process or CI step sets executable permissions (`+x`) on the `dist/cli.js` file.
  - **Done‑when:**
    1. The compiled `dist/cli.js` file contains the shebang and has executable permissions.
  - **Verification:**
    1. After running `npm pack`, untar the resulting `.tgz` file.
    2. Check the `package/dist/cli.js` file for the shebang and run `ls -l` to confirm its permissions.
  - **Depends‑on:** none

- [ ] **T005 · Chore · P1: configure NPM_TOKEN secret in github repository**

  - **Context:** Implementation Blueprint: Phase 2.2
  - **Action:**
    1. Generate a new npm "Automation" access token with permissions scoped to the target package.
    2. Add the generated token as a repository secret named `NPM_TOKEN` in the project's GitHub settings.
  - **Done‑when:**
    1. The `NPM_TOKEN` secret is available in the GitHub repository's Actions secrets.
  - **Depends‑on:** [T001]

- [ ] **T006 · Feature · P1: create github actions workflow to publish package on tag push**

  - **Context:** Implementation Blueprint: Phase 2.1
  - **Action:**
    1. Create a new workflow file at `.github/workflows/publish.yml`.
    2. Implement the workflow to trigger on pushes to tags matching `v*`.
    3. Define a `publish` job that checks out code, sets up Node.js, installs dependencies, builds, tests, and runs `npm publish`.
    4. Configure the `npm publish` step to use the `NPM_TOKEN` secret.
  - **Done‑when:**
    1. The `publish.yml` file is committed to the repository.
    2. A manual trigger or test push of a tag (e.g., `v1.0.0-test`) successfully runs the workflow and publishes the package to npm.
  - **Depends‑on:** [T005]

- [ ] **T007 · Test · P2: add unit tests to validate package.json configuration**

  - **Context:** Testing Strategy: Unit Testing
  - **Action:**
    1. Create a new test file, e.g., `test/package.test.ts`.
    2. Add a test case to verify that `package.json`'s `bin` property correctly points to `dist/cli.js`.
    3. Add a test case to validate that the `files` array includes `dist/` and excludes `src/`.
  - **Done‑when:**
    1. The new unit tests are implemented and pass when `npm test` is run.
  - **Depends‑on:** [T002]

- [ ] **T008 · Test · P2: create integration test script to validate local packaging and installation**

  - **Context:** Testing Strategy: Integration Testing
  - **Action:**
    1. Create an executable shell script at `test/integration/publish.test.sh`.
    2. Implement the script to perform the steps outlined in the plan: `npm pack`, `npm install -g <package>.tgz`, run the `elevator` command, and then `npm uninstall -g <package-name>` and clean up the `.tgz` file.
    3. Integrate the script into the CI pipeline to run as part of the test suite.
  - **Done‑when:**
    1. The script runs successfully locally and in the CI environment.
  - **Depends‑on:** [T002]

- [ ] **T009 · Chore · P2: update readme.md with npm installation and usage instructions**

  - **Context:** Implementation Blueprint: Phase 4.1
  - **Action:**
    1. Update the `## Installation` section in `README.md` to show the recommended global installation command: `npm install -g <package-name>`.
    2. Ensure the `## Usage` section correctly shows the command being run as `elevator`.
  - **Done‑when:**
    1. The `README.md` file reflects the new, simpler installation method.
  - **Depends‑on:** [T001]

- [ ] **T010 · Chore · P3: document the release process and versioning guidelines**
  - **Context:** Implementation Blueprint: Phase 4.2
  - **Action:**
    1. Create a new document (e.g., `RELEASING.md`).
    2. Document the steps required to publish a new version: update `package.json` version, create a git tag (`git tag vX.Y.Z`), and push the tag (`git push --tags`).
    3. Add notes on the versioning strategy (SemVer, start at 1.0.0).
  - **Done‑when:**
    1. The release documentation is written and committed to the repository.
  - **Depends‑on:** [T006]

---

### Clarifications & Assumptions

- [ ] **Issue:** A decision on release cadence is needed for process documentation.
  - **Context:** Open Questions & Decisions Needed: 3. Release Frequency
  - **Blocking?:** no
