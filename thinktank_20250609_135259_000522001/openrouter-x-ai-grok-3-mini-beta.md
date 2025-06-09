# Todo

## Package Configuration

- [ ] **T001 · Chore · P2: update package.json file**

  - **Context:** Phase 1.1 from PLAN.md
  - **Action:**
    1. Edit package.json to include specified fields and values (e.g., "name", "version", "description", "main", "bin", "files").
  - **Done-when:**
    1. package.json matches the exact JSON structure outlined in the plan.
  - **Verification:**
    1. Run `npm install` and confirm no errors in package metadata.
  - **Depends-on:** none

- [ ] **T002 · Chore · P2: add npm scripts to package.json**

  - **Context:** Phase 1.2 from PLAN.md
  - **Action:**
    1. Add "scripts" section with "prepublishOnly", "publish:check", and "publish:local" as defined.
  - **Done-when:**
    1. Scripts are present and correctly configured in package.json.
  - **Verification:**
    1. Execute each script (e.g., `npm run publish:check`) and verify it runs without errors.
  - **Depends-on:** [T001]

- [ ] **T003 · Chore · P2: set up CLI executable in dist/cli.js**
  - **Context:** Phase 1.3 from PLAN.md
  - **Action:**
    1. Add shebang line and ensure executable permissions in the build process for dist/cli.js.
  - **Done-when:**
    1. dist/cli.js includes the shebang and is configured for execution.
  - **Verification:**
    1. Run the built CLI locally and confirm it executes as expected.
  - **Depends-on:** [T001]

## Publishing Workflow

- [ ] **T004 · Feature · P2: create GitHub Actions workflow file**

  - **Context:** Phase 2.1 from PLAN.md
  - **Action:**
    1. Create .github/workflows/publish.yml with the specified YAML content.
  - **Done-when:**
    1. Workflow file is committed and triggers on tagged pushes.
  - **Verification:**
    1. Manually trigger a test run and confirm it executes steps without failures.
  - **Depends-on:** [T001, T002, T003]

- [ ] **T005 · Chore · P2: configure npm registry authentication**
  - **Context:** Phase 2.2 from PLAN.md
  - **Action:**
    1. Generate an npm access token and add it to GitHub secrets as NPM_TOKEN.
  - **Done-when:**
    1. NPM_TOKEN secret is set in GitHub repository settings.
  - **Verification:**
    1. Test the workflow with a dry run to confirm token usage.
  - **Depends-on:** [T004]

## Validation and Testing

- [ ] **T006 · Test · P2: perform pre-publish testing**

  - **Context:** Phase 3.1 from PLAN.md
  - **Action:**
    1. Run `npm pack --dry-run` and local installation tests as specified.
  - **Done-when:**
    1. All pre-publish commands execute successfully.
  - **Verification:**
    1. Verify package contents and CLI behavior post-install.
  - **Depends-on:** [T001, T002, T003]

- [ ] **T007 · Test · P2: validate publication process**
  - **Context:** Phase 3.2 from PLAN.md
  - **Action:**
    1. Check package size, file inclusion, and CLI functionality after global install.
  - **Done-when:**
    1. Package size is under 100KB and all validations pass.
  - **Verification:**
    1. Run global install tests and confirm CLI execution.
  - **Depends-on:** [T006]

## Documentation Updates

- [ ] **T008 · Chore · P2: update README.md installation section**

  - **Context:** Phase 4.1 from PLAN.md
  - **Action:**
    1. Edit README.md to include the specified installation and usage instructions.
  - **Done-when:**
    1. README.md reflects the exact markdown content from the plan.
  - **Verification:**
    1. Review README.md for accuracy and completeness.
  - **Depends-on:** none

- [ ] **T009 · Chore · P2: add publishing documentation to README.md**
  - **Context:** Phase 4.2 from PLAN.md
  - **Action:**
    1. Add sections for release process, version management, and troubleshooting.
  - **Done-when:**
    1. Documentation sections are included and clear.
  - **Verification:**
    1. Confirm the new sections are present and readable.
  - **Depends-on:** [T008]

## Risk Mitigation

- [ ] **T010 · Chore · P1: check package name availability**

  - **Context:** HIGH Risk: Package Name Conflict from PLAN.md
  - **Action:**
    1. Run `npm view elevator` and evaluate alternatives.
  - **Done-when:**
    1. Package name decision is documented (e.g., in README or a note).
  - **Verification:**
    1. Confirm availability via npm registry search.
  - **Depends-on:** none

- [ ] **T011 · Test · P2: mitigate publishing failure risk**

  - **Context:** MEDIUM Risk: Publishing Failure from PLAN.md
  - **Action:**
    1. Implement and test fallback manual publishing process.
  - **Done-when:**
    1. Manual process is documented and tested.
  - **Verification:**
    1. Perform a manual publish simulation.
  - **Depends-on:** [T004, T005]

- [ ] **T012 · Test · P2: verify binary permissions**

  - **Context:** MEDIUM Risk: Binary Permissions from PLAN.md
  - **Action:**
    1. Test CLI executable on multiple platforms.
  - **Done-when:**
    1. Permissions are confirmed working across environments.
  - **Verification:**
    1. Run CLI post-install and check for permission errors.
  - **Depends-on:** [T003, T007]

- [ ] **T013 · Chore · P3: audit package size**
  - **Context:** LOW Risk: Package Size Bloat from PLAN.md
  - **Action:**
    1. Use `.npmignore` to exclude unnecessary files.
  - **Done-when:**
    1. Package size is under 100KB.
  - **Verification:**
    1. Run `npm pack` and inspect the output size.
  - **Depends-on:** [T001]

## Open Questions and Decisions

- [ ] **T014 · Chore · P0: decide on package name strategy**

  - **Context:** Open Question 1 from PLAN.md
  - **Action:**
    1. Investigate and document final package name based on availability.
  - **Done-when:**
    1. Decision is recorded in project files.
  - **Verification:**
    1. Update and test package.json with chosen name.
  - **Depends-on:** [T010]

- [ ] **T015 · Chore · P2: decide on versioning strategy**

  - **Context:** Open Question 2 from PLAN.md
  - **Action:**
    1. Set initial version (e.g., 1.0.0) in package.json.
  - **Done-when:**
    1. Versioning approach is documented and applied.
  - **Verification:**
    1. Confirm version in package.json and workflow.
  - **Depends-on:** none

- [ ] **T016 · Chore · P3: define release frequency**

  - **Context:** Open Question 3 from PLAN.md
  - **Action:**
    1. Document release cadence and criteria.
  - **Done-when:**
    1. Guidelines are added to documentation.
  - **Verification:**
    1. Review docs for clear release process.
  - **Depends-on:** [T009]

- [ ] **T017 · Test · P3: assess platform testing needs**
  - **Context:** Open Question 4 from PLAN.md
  - **Action:**
    1. Test workflow on Linux and plan for others if issues arise.
  - **Done-when:**
    1. Initial platform testing is completed.
  - **Verification:**
    1. Run tests on multiple OSes and log results.
  - **Depends-on:** [T004, T007]
