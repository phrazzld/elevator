```markdown
# Todo

## Package Publication Setup

### 1. Update `package.json` with required fields

- **T001 · Chore · P0: Update `package.json` with required fields**
  - **Context:** Phase 1.1 of PLAN.md
  - **Action:**
    1. Add `name`, `version`, `description`, `main`, `bin`, `files`, `keywords`, `repository`, `license`, and `engines` to `package.json`.
    2. Ensure `name` is available (`elevator-cli` or fallback).
  - **Done-when:**
    1. `package.json` contains all required fields with correct values.
  - **Verification:**
    1. Run `npm view <package-name>` to check availability.
    2. Validate `package.json` using `npm pack --dry-run`.
  - **Depends-on:** none

### 2. Add npm scripts to `package.json`

- **T002 · Chore · P0: Add npm scripts to `package.json`**
  - **Context:** Phase 1.2 of PLAN.md
  - **Action:**
    1. Add `prepublishOnly`, `publish:check`, and `publish:local` scripts to `package.json`.
  - **Done-when:**
    1. `package.json` includes the new scripts with correct commands.
  - **Depends-on:** none

### 3. Ensure CLI executable setup

- **T003 · Chore · P0: Ensure CLI executable setup**
  - **Context:** Phase 1.3 of PLAN.md
  - **Action:**
    1. Verify `dist/cli.js` has `#!/usr/bin/env node` shebang.
    2. Ensure `dist/cli.js` has executable permissions.
  - **Done-when:**
    1. `dist/cli.js` starts with `#!/usr/bin/env node`.
    2. `dist/cli.js` is executable (`chmod +x dist/cli.js`).
  - **Verification:**
    1. Run `./dist/cli.js` to check executable status.
  - **Depends-on:** none

### 4. Create GitHub Actions publish workflow

- **T004 · Chore · P0: Create GitHub Actions publish workflow**
  - **Context:** Phase 2.1 of PLAN.md
  - **Action:**
    1. Create `.github/workflows/publish.yml` with specified content.
  - **Done-when:**
    1. `.github/workflows/publish.yml` exists with correct content.
  - **Verification:**
    1. Validate workflow syntax using `act` or GitHub Actions UI.
  - **Depends-on:** none

### 5. Configure npm registry authentication

- **T005 · Chore · P0: Configure npm registry authentication**
  - **Context:** Phase 2.2 of PLAN.md
  - **Action:**
    1. Generate npm access token.
    2. Add `NPM_TOKEN` to GitHub repository secrets.
    3. Test authentication setup.
  - **Done-when:**
    1. `NPM_TOKEN` is added to GitHub secrets.
    2. Authentication works (test with `npm whoami` using token).
  - **Verification:**
    1. Run `npm whoami` with token to verify authentication.
  - **Depends-on:** none

### 6. Test package contents locally

- **T006 · Test · P0: Test package contents locally**
  - **Context:** Phase 3.1 of PLAN.md
  - **Action:**
    1. Run `npm pack --dry-run` to inspect package contents.
  - **Done-when:**
    1. `npm pack --dry-run` runs without errors and outputs expected files.
  - **Verification:**
    1. Check output to ensure only `dist/`, `README.md`, and `LICENSE` are included.
  - **Depends-on:** T001, T002

### 7. Test local installation

- **T007 · Test · P0: Test local installation**
  - **Context:** Phase 3.1 of PLAN.md
  - **Action:**
    1. Run `npm pack` to create a local `.tgz` package.
    2. Install the package globally (`npm install -g <package.tgz>`).
    3. Run `elevator` with a test prompt.
    4. Uninstall the package.
  - **Done-when:**
    1. `elevator` command executes successfully after installation.
  - **Verification:**
    1. Check `elevator --version` and `elevator "test prompt"` output.
  - **Depends-on:** T001, T002, T003

### 8. Validate package size and content

- **T008 · Test · P0: Validate package size and content**
  - **Context:** Phase 3.2 of PLAN.md
  - **Action:**
    1. Check package size is <100KB.
    2. Verify file inclusion/exclusion.
    3. Test CLI executable after global install.
  - **Done-when:**
    1. Package size is <100KB.
    2. All required files are included, and no unnecessary files are present.
    3. CLI works after global install.
  - **Verification:**
    1. Check `.tgz` file size.
    2. Inspect `npm pack --dry-run` output.
    3. Follow T007 verification steps.
  - **Depends-on:** T006, T007

### 9. Update `README.md` with installation instructions

- **T009 · Chore · P0: Update `README.md` with installation instructions**
  - **Context:** Phase 4.1 of PLAN.md
  - **Action:**
    1. Add `## Installation` and `## Usage` sections to `README.md` with specified content.
  - **Done-when:**
    1. `README.md` contains the new sections with correct instructions.
  - **Depends-on:** none

### 10. Add publishing documentation

- **T010 · Chore · P0: Add publishing documentation**
  - **Context:** Phase 4.2 of PLAN.md
  - **Action:**
    1. Document release process, version management, and troubleshooting notes.
  - **Done-when:**
    1. Documentation is added to the appropriate file (e.g., `CONTRIBUTING.md` or `DEVELOPER.md`).
  - **Depends-on:** none

## Clarifications & Assumptions

- **Issue:** Final package name (`elevator-cli` or fallback) must be checked before implementation.
  - **Context:** Open Question 1 in PLAN.md
  - **Blocking?:** Yes (T001 depends on name availability)
```
