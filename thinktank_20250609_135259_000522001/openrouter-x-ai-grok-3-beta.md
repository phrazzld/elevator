# Todo

## Package Configuration

- [ ] **T001 · Feature · P2: Update package.json for npm distribution**

  - **Context:** Phase 1.1 - Update package.json
  - **Action:**
    1. Modify `package.json` with provided metadata including name, version, description, main, bin, files, and other fields.
    2. Ensure name availability or select fallback as per risk mitigation.
  - **Done-when:**
    1. `package.json` reflects all specified fields correctly.
  - **Verification:**
    1. Run `npm pack --dry-run` to confirm package metadata.
  - **Depends-on:** none

- [ ] **T002 · Feature · P2: Add npm scripts for publishing checks**

  - **Context:** Phase 1.2 - Add npm scripts
  - **Action:**
    1. Add `prepublishOnly`, `publish:check`, and `publish:local` scripts to `package.json`.
  - **Done-when:**
    1. Scripts are added and executable without errors.
  - **Verification:**
    1. Run `npm run prepublishOnly` to ensure build and test steps execute.
  - **Depends-on:** [T001]

- [ ] **T003 · Feature · P2: Configure CLI executable setup**
  - **Context:** Phase 1.3 - CLI executable setup
  - **Action:**
    1. Add shebang line to `dist/cli.js`.
    2. Set executable permissions during build process.
  - **Done-when:**
    1. `dist/cli.js` has correct shebang and permissions.
  - **Verification:**
    1. Check file contents for shebang.
    2. Test permissions with `ls -l dist/cli.js`.
  - **Depends-on:** [T001]

## Publishing Workflow

- [ ] **T004 · Feature · P2: Create GitHub Actions workflow for npm publish**

  - **Context:** Phase 2.1 - Create .github/workflows/publish.yml
  - **Action:**
    1. Create `publish.yml` with provided configuration for automated publishing on tag push.
  - **Done-when:**
    1. Workflow file is created and syntax is valid.
  - **Verification:**
    1. Trigger a test run in GitHub Actions with a dummy tag to validate setup.
  - **Depends-on:** [T001]

- [ ] **T005 · Feature · P2: Configure npm registry authentication**
  - **Context:** Phase 2.2 - Configure npm registry authentication
  - **Action:**
    1. Generate npm access token and add to GitHub repository secrets as `NPM_TOKEN`.
    2. Test authentication setup with a manual publish command.
  - **Done-when:**
    1. Token is stored in secrets and authentication test passes.
  - **Verification:**
    1. Confirm token works by running a manual `npm publish` with dummy package.
  - **Depends-on:** [T004]

## Validation & Testing

- [ ] **T006 · Test · P2: Perform pre-publish package testing**

  - **Context:** Phase 3.1 - Pre-publish testing
  - **Action:**
    1. Run `npm pack --dry-run` to inspect package contents.
    2. Test local installation with `npm pack` and `npm install -g`.
  - **Done-when:**
    1. Package contents are verified and local install succeeds.
  - **Verification:**
    1. Execute `elevator "test prompt"` post-install to confirm functionality.
    2. Uninstall with `npm uninstall -g elevator-cli` to cleanup.
  - **Depends-on:** [T003]

- [ ] **T007 · Test · P2: Validate publication criteria**
  - **Context:** Phase 3.2 - Publication validation
  - **Action:**
    1. Check package size is under 100KB.
    2. Verify included/excluded files and test CLI executable post-install.
  - **Done-when:**
    1. Package meets size target and all validation checks pass.
  - **Verification:**
    1. Install globally and run `elevator "test"` to ensure it works.
  - **Depends-on:** [T006]

## Documentation Update

- [ ] **T008 · Chore · P2: Update README.md installation section**

  - **Context:** Phase 4.1 - Update README.md installation section
  - **Action:**
    1. Revise installation instructions in README.md with provided markdown.
  - **Done-when:**
    1. README.md reflects updated installation steps.
  - **Verification:**
    1. Review README.md content for accuracy.
  - **Depends-on:** none

- [ ] **T009 · Chore · P2: Add publishing documentation**
  - **Context:** Phase 4.2 - Add publishing documentation
  - **Action:**
    1. Document release process, version management, and troubleshooting notes.
  - **Done-when:**
    1. Documentation for publishing is complete in project files.
  - **Verification:**
    1. Confirm documentation covers all specified topics.
  - **Depends-on:** [T008]

## Risk Mitigation

- [ ] **T010 · Chore · P1: Check package name availability on npm**

  - **Context:** Risk Analysis - Package Name Conflict
  - **Action:**
    1. Run `npm view elevator` to check availability.
    2. Decide on fallback name if unavailable (`elevator-cli`, `prompt-elevator`, `ai-elevator`).
  - **Done-when:**
    1. Package name or fallback is confirmed available.
  - **Verification:**
    1. Document the chosen name in project notes.
  - **Depends-on:** none

- [ ] **T011 · Test · P2: Test publishing workflow in staging**

  - **Context:** Risk Analysis - Publishing Failure
  - **Action:**
    1. Run workflow in a staging environment to validate automated publishing.
  - **Done-when:**
    1. Workflow executes successfully in staging.
  - **Verification:**
    1. Confirm package is published to a test registry or locally.
  - **Depends-on:** [T004, T005]

- [ ] **T012 · Test · P2: Verify binary permissions on multiple platforms**

  - **Context:** Risk Analysis - Binary Permissions
  - **Action:**
    1. Test CLI executable permissions post-install on Linux, macOS, and Windows if feasible.
  - **Done-when:**
    1. CLI works across tested platforms without permission issues.
  - **Verification:**
    1. Install and run `elevator "test"` on each platform.
  - **Depends-on:** [T003, T006]

- [ ] **T013 · Chore · P3: Audit package size for bloat**
  - **Context:** Risk Analysis - Package Size Bloat
  - **Action:**
    1. Monitor package contents with `npm pack --dry-run`.
    2. Update `.npmignore` to exclude unnecessary files if needed.
  - **Done-when:**
    1. Package size remains under 100KB.
  - **Verification:**
    1. Check size output from `npm pack --dry-run`.
  - **Depends-on:** [T006]

## Open Questions & Decisions

- [ ] **T014 · Chore · P1: Decide final package name based on availability**

  - **Context:** Open Questions - Package Name Strategy
  - **Action:**
    1. Finalize package name after availability check.
  - **Done-when:**
    1. Decision on package name is documented.
  - **Verification:**
    1. Update `package.json` with final name.
  - **Depends-on:** [T010]

- [ ] **T015 · Chore · P2: Establish versioning strategy for initial release**

  - **Context:** Open Questions - Versioning Strategy
  - **Action:**
    1. Decide between starting at 1.0.0 or 0.1.0 for initial release.
  - **Done-when:**
    1. Versioning approach is agreed upon and documented.
  - **Verification:**
    1. Reflect decision in `package.json` version field.
  - **Depends-on:** [T001]

- [ ] **T016 · Chore · P2: Define release frequency and criteria**

  - **Context:** Open Questions - Release Frequency
  - **Action:**
    1. Establish cadence and criteria for publishing new versions.
  - **Done-when:**
    1. Release policy is documented in project guidelines.
  - **Verification:**
    1. Confirm policy in documentation.
  - **Depends-on:** [T009]

- [ ] **T017 · Chore · P3: Determine scope for cross-platform testing**
  - **Context:** Open Questions - Platform Testing
  - **Action:**
    1. Decide whether to include Windows/macOS testing in CI.
  - **Done-when:**
    1. Decision on testing scope is documented.
  - **Verification:**
    1. Update CI configuration if additional platforms are included.
  - **Depends-on:** [T004]

## Clarifications & Assumptions

- [ ] **Issue:** Confirmation of npm account access for token generation\*\*

  - **Context:** Phase 2.2 - Configure npm registry authentication
  - **Blocking?:** yes

- [ ] **Issue:** Availability of GitHub repository admin access for secrets setup\*\*
  - **Context:** Phase 2.2 - Configure npm registry authentication
  - **Blocking?:** yes
