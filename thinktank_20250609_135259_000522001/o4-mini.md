# Todo

## elevator-cli npm publishing

- [ ] **T001 · Chore · P0: check npm package name availability**

  - **Context:** Risk: HIGH risk: Package Name Conflict
  - **Action:**
    1. Run `npm view elevator` to verify if the name is taken.
    2. Search registry for fallback names (`elevator-cli`, `prompt-elevator`, `ai-elevator`).
    3. Document available name options in a project issue.
  - **Done-when:**
    1. A definitive list of available package names is recorded and primary choice is selected.
  - **Verification:**
    1. Confirm `npm view <selected-name>` returns an error or “Not found”.
  - **Depends-on:** none

- [ ] **T002 · Chore · P1: decide starting version number**

  - **Context:** Open question: Versioning Strategy
  - **Action:**
    1. Review recommendation to start at `1.0.0` versus `0.1.0`.
    2. Confirm decision with product/tech lead.
    3. Record decision in project documentation or issue.
  - **Done-when:**
    1. Starting version number is agreed upon and documented.
  - **Verification:**
    1. Decision noted in project docs or GitHub issue.
  - **Depends-on:** T001

- [ ] **T003 · Chore · P2: update package.json metadata**

  - **Context:** Phase 1.1 Update package.json
  - **Action:**
    1. Insert fields: `name`, `version`, `description`, `main`, `bin`, `files`, `keywords`, `repository`, `license`, `engines`.
    2. Add `"publishConfig": {"access":"public","provenance":true}`.
  - **Done-when:**
    1. `package.json` matches the blueprint and uses the chosen name/version.
  - **Verification:**
    1. Manual inspection of `package.json`.
    2. `npm pack --dry-run` lists only intended files.
  - **Depends-on:** T001, T002

- [ ] **T004 · Chore · P2: add npm lifecycle and publish scripts**

  - **Context:** Phase 1.2 Add npm scripts
  - **Action:**
    1. Add `"prepublishOnly": "npm run build && npm run test"`.
    2. Add `"publish:check": "npm pack --dry-run"`.
    3. Add `"publish:local": "npm pack"`.
  - **Done-when:**
    1. Scripts appear in `package.json` and run without errors.
  - **Verification:**
    1. `npm run publish:check` executes successfully.
  - **Depends-on:** T003

- [ ] **T005 · Chore · P2: ensure CLI executable shebang and permissions**

  - **Context:** Phase 1.3 CLI executable setup
  - **Action:**
    1. Prepend `#!/usr/bin/env node` to `dist/cli.js`.
    2. Modify build step to set executable bit on `dist/cli.js`.
  - **Done-when:**
    1. `dist/cli.js` has the shebang and is executable after build.
  - **Verification:**
    1. `ls -l dist/cli.js` shows `-rwx`.
    2. Running `dist/cli.js` directly produces expected output.
  - **Depends-on:** T003

- [ ] **T006 · Feature · P2: create GitHub Actions workflow for npm publish**

  - **Context:** Phase 2.1 Create .github/workflows/publish.yml
  - **Action:**
    1. Create `publish.yml` triggering on `push` of tags `v*`.
    2. Include steps: checkout, setup-node@v3 (Node 18), install, build, test, `npm publish` with `NODE_AUTH_TOKEN`.
  - **Done-when:**
    1. Workflow file exists and passes YAML lint.
  - **Verification:**
    1. Push a dummy tag (`v0.0.0-test`) and confirm the workflow runs through publish step (dry-run or test registry).
  - **Depends-on:** T004, T005

- [ ] **T007 · Chore · P1: configure npm authentication token in GitHub secrets**

  - **Context:** Phase 2.2 Configure npm registry authentication
  - **Action:**
    1. Generate an npm automation token scoped to the package.
    2. Add `NPM_TOKEN` as a secret in the GitHub repository.
  - **Done-when:**
    1. Secret `NPM_TOKEN` is present and accessible to workflows.
  - **Verification:**
    1. Workflow step logs in to npm without error (use dry-run).
  - **Depends-on:** T006

- [ ] **T008 · Test · P2: write unit tests for package.json configuration**

  - **Context:** Testing Strategy: Unit Testing
  - **Action:**
    1. Create `test/package.test.ts` asserting `pkg.bin.elevator === 'dist/cli.js'` and correct `files` entries.
  - **Done-when:**
    1. `npm test` passes the new unit tests.
  - **Verification:**
    1. CI run succeeds with these tests.
  - **Depends-on:** T003

- [ ] **T009 · Test · P2: write integration test script for npm package creation and installation**

  - **Context:** Testing Strategy: Integration Testing
  - **Action:**
    1. Add `test/integration/publish.test.sh` to pack, install globally, run `elevator "test prompt"`, and uninstall.
  - **Done-when:**
    1. Script runs to completion without errors.
  - **Verification:**
    1. Script prints “✅ Global installation test passed”.
  - **Depends-on:** T006, T007

- [ ] **T010 · Test · P2: perform pre-publish content and size validation**

  - **Context:** Phase 3.1 Pre-publish testing
  - **Action:**
    1. Run `npm pack --dry-run` and inspect listed files.
    2. Pack and measure tarball size, confirm <100KB.
  - **Done-when:**
    1. Dry-run output matches expected file set.
    2. Tarball size is under 100KB.
  - **Verification:**
    1. Size recorded in CI logs meets threshold.
  - **Depends-on:** T003

- [ ] **T011 · Test · P2: test local installation of packaged CLI globally**

  - **Context:** Phase 3.1 Pre-publish testing
  - **Action:**
    1. Run `npm pack` to generate `.tgz`.
    2. Install global `.tgz`, run `elevator --help`, then uninstall.
  - **Done-when:**
    1. CLI command runs and shows help text.
  - **Verification:**
    1. Manual or automated check of help output.
  - **Depends-on:** T009

- [ ] **T012 · Chore · P2: update README.md with installation and usage instructions**

  - **Context:** Phase 4.1 Update README.md installation section
  - **Action:**
    1. Add global install command (`npm install -g elevator-cli`).
    2. Add usage examples (`elevator "your prompt here"`).
  - **Done-when:**
    1. README displays up-to-date install and usage guidance.
  - **Verification:**
    1. GitHub-rendered README shows changes correctly.
  - **Depends-on:** T003

- [ ] **T013 · Chore · P2: add publishing and release process documentation**
  - **Context:** Phase 4.2 Add publishing documentation
  - **Action:**
    1. Create `RELEASE.md` or `docs/publishing.md` outlining tag-based release, version bump, and troubleshoot steps.
  - **Done-when:**
    1. Publishing guide exists and covers necessary steps and recovery procedures.
  - **Verification:**
    1. Team member can follow guide to simulate a release.
  - **Depends-on:** T006, T007, T012

## Clarifications & Assumptions

- [ ] **Issue:** release cadence undefined

  - **Context:** Open question: Release Frequency
  - **Blocking?:** no

- [ ] **Issue:** CI platform testing scope undefined
  - **Context:** Open question: Platform Testing
  - **Blocking?:** no
