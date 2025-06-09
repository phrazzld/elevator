```
# Todo

## Package Publication Setup

- [ ] **T001 · Feature · P0: Verify npm package name availability**
    - **Context:** Package Name Strategy in Risk Analysis
    - **Action:**
        1. Run `npm view elevator` to check name availability
        2. Determine fallback names if needed (`elevator-cli`, `prompt-elevator`, `ai-elevator`)
    - **Done-when:**
        1. Final package name is confirmed and documented
    - **Verification:**
        1. Execute `npm view <name>` to verify availability
    - **Depends-on:** none

- [ ] **T002 · Feature · P1: Update package.json configuration**
    - **Context:** Phase 1.1 Update package.json
    - **Action:**
        1. Add/modify fields: name, version, description, main, bin, files, etc.
        2. Add publishConfig.access and engines.node
    - **Done-when:**
        1. package.json matches specification in implementation plan
    - **Depends-on:** [T001]

- [ ] **T003 · Feature · P1: Add npm scripts**
    - **Context:** Phase 1.2 Add npm scripts
    - **Action:**
        1. Add prepublishOnly, publish:check, and publish:local scripts
    - **Done-when:**
        1. Scripts are added and functional when executed
    - **Depends-on:** [T002]

- [ ] **T004 · Feature · P1: Configure CLI executable**
    - **Context:** Phase 1.3 CLI executable setup
    - **Action:**
        1. Ensure dist/cli.js has proper shebang
        2. Verify executable permissions in build process
    - **Done-when:**
        1. CLI can be executed directly after build
    - **Depends-on:** none

- [ ] **T005 · Feature · P1: Create GitHub Actions workflow**
    - **Context:** Phase 2.1 Create publish.yml
    - **Action:**
        1. Create .github/workflows/publish.yml
        2. Implement tag-based trigger and publish steps
    - **Done-when:**
        1. Workflow file exists with correct configuration
    - **Depends-on:** [T002]

- [ ] **T006 · Feature · P1: Configure npm authentication**
    - **Context:** Phase 2.2 Configure npm registry authentication
    - **Action:**
        1. Generate npm access token
        2. Add NPM_TOKEN to GitHub secrets
    - **Done-when:**
        1. Token is created and stored securely
    - **Depends-on:** none

- [ ] **T007 · Test · P1: Implement package testing script**
    - **Context:** Phase 3.1 Pre-publish testing
    - **Action:**
        1. Create test/integration/publish.test.sh
        2. Implement dry-run, local install, and smoke tests
    - **Done-when:**
        1. Script passes all test cases
    - **Depends-on:** [T003]

- [ ] **T008 · Test · P2: Add package configuration tests**
    - **Context:** Unit Testing section
    - **Action:**
        1. Create test/package.test.ts
        2. Test bin config and files inclusion
    - **Done-when:**
        1. Tests pass and validate package.json structure
    - **Depends-on:** [T002]

- [ ] **T009 · Chore · P2: Update README installation docs**
    - **Context:** Phase 4.1 Update README.md
    - **Action:**
        1. Add global installation instructions
        2. Document basic usage examples
    - **Done-when:**
        1. README changes are committed
    - **Depends-on:** [T001]

- [ ] **T010 · Chore · P2: Document release process**
    - **Context:** Phase 4.2 Add publishing documentation
    - **Action:**
        1. Create RELEASE.md or add to existing docs
        2. Document version management and tag workflow
    - **Done-when:**
        1. Documentation is complete and accurate
    - **Depends-on:** [T005]

## Clarifications & Assumptions

- [ ] **Issue:** Need to confirm package name availability before proceeding
    - **Context:** Package Name Strategy in Risk Analysis
    - **Blocking?:** yes

- [ ] **Issue:** Decide on initial version number (1.0.0 vs 0.1.0)
    - **Context:** Versioning Strategy in Open Questions
    - **Blocking?:** no
```
