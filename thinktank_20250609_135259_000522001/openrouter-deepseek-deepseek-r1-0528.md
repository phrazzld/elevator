# Todo

## Package Publication Setup

- [ ] **T001 · Chore · P0: Check npm package name availability**

  - **Context:** Open Question 1 (Package Name Strategy)
  - **Action:**
    1. Run `npm view elevator` to check availability
    2. Verify fallback options (`elevator-cli`, `prompt-elevator`, `ai-elevator`)
  - **Done‑when:**
    1. Name availability confirmed in documentation
  - **Depends‑on:** none

- [ ] **T002 · Feature · P1: Update package.json configuration**

  - **Context:** Phase 1.1
  - **Action:**
    1. Add required fields: name, version, description, main, bin, files, keywords, repository, license, engines
    2. Set initial version to 1.0.0 per recommendation
  - **Done‑when:**
    1. `package.json` passes `npm install` and `npm run build`
  - **Verification:**
    1. `jq . package.json` shows all required fields
  - **Depends‑on:** T001

- [ ] **T003 · Chore · P1: Add npm scripts**

  - **Context:** Phase 1.2
  - **Action:**
    1. Add "prepublishOnly", "publish:check", "publish:local" scripts
  - **Done‑when:**
    1. Scripts visible in `npm run`
  - **Depends‑on:** T002

- [ ] **T004 · Refactor · P1: Configure CLI executable**

  - **Context:** Phase 1.3
  - **Action:**
    1. Add shebang `#!/usr/bin/env node` to dist/cli.js
    2. Ensure build process sets executable permissions
  - **Done‑when:**
    1. `head -1 dist/cli.js` shows correct shebang
  - **Depends‑on:** T002

- [ ] **T005 · Feature · P1: Create GitHub Actions workflow**

  - **Context:** Phase 2.1
  - **Action:**
    1. Create .github/workflows/publish.yml
    2. Implement workflow with tag trigger, Node setup, build/test/publish steps
  - **Done‑when:**
    1. Workflow file passes YAML linting
  - **Depends‑on:** none

- [ ] **T006 · Chore · P0: Configure npm authentication**

  - **Context:** Phase 2.2
  - **Action:**
    1. Generate npm access token with publish rights
    2. Add NPM_TOKEN secret to GitHub repository
  - **Done‑when:**
    1. Secret appears in GitHub repo settings
  - **Depends‑on:** none

- [ ] **T007 · Test · P1: Implement pre-publish tests**

  - **Context:** Phase 3.1
  - **Action:**
    1. Create test/integration/publish.test.sh
    2. Implement dry-run, local install, and CLI execution tests
  - **Done‑when:**
    1. Test script runs successfully
  - **Depends‑on:** T003, T004

- [ ] **T008 · Test · P1: Add package validation suite**

  - **Context:** Phase 3.2
  - **Action:**
    1. Create test/package.test.ts
    2. Implement tests for bin config and file inclusion
  - **Done‑when:**
    1. Tests pass via `npm test`
  - **Depends‑on:** T002

- [ ] **T009 · Chore · P2: Update README installation instructions**

  - **Context:** Phase 4.1
  - **Action:**
    1. Add global installation command
    2. Add usage examples
  - **Done‑when:**
    1. Changes visible in README.md
  - **Verification:**
    1. `grep "npm install -g elevator-cli" README.md` returns match
  - **Depends‑on:** T001

- [ ] **T010 · Chore · P2: Document release process**
  - **Context:** Phase 4.2
  - **Action:**
    1. Add versioning guidelines to CONTRIBUTING.md
    2. Document tagging and release workflow
  - **Done‑when:**
    1. Documentation exists in repo
  - **Depends‑on:** none

## Clarifications & Assumptions

- [ ] **Issue:** Final package name dependency chain
  - **Context:** Task T002 depends on T001
  - **Blocking?:** yes
- [ ] **Issue:** Manual token setup required
  - **Context:** Task T006 requires manual intervention
  - **Blocking?:** no
- [ ] **Issue:** Cross-platform permission handling
  - **Context:** Risk (Binary Permissions)
  - **Blocking?:** no
