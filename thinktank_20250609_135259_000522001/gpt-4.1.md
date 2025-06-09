# Todo

## Package Publication

- [ ] **T001 · Feature · P0: verify npm package name availability**

  - **Context:** Risk Analysis & Mitigation, Open Questions & Decisions Needed
  - **Action:**
    1. Check if `elevator` and `elevator-cli` are available on npm using `npm view` or npm search.
    2. Decide on final package name based on availability.
  - **Done‑when:**
    1. Package name is confirmed and documented.
  - **Verification:**
    1. Attach npm output/screenshot to decision record.
  - **Depends‑on:** none

- [ ] **T002 · Feature · P0: update package.json for npm publication**

  - **Context:** Phase 1: Package Configuration (1.1 Update package.json)
  - **Action:**
    1. Update `package.json` with finalized `name`, `version`, `description`, `main`, `bin`, `files`, `keywords`, `repository`, `license`, `engines`.
    2. Add `"publishConfig"` for npm public access and provenance.
  - **Done‑when:**
    1. `package.json` reflects all required npm publication fields and points to correct entry points.
  - **Verification:**
    1. `npm pack --dry-run` shows correct metadata and files.
  - **Depends‑on:** [T001]

- [ ] **T003 · Feature · P1: add npm scripts for publish and local testing**

  - **Context:** Phase 1: Package Configuration (1.2 Add npm scripts)
  - **Action:**
    1. Add scripts to `package.json`: `prepublishOnly`, `publish:check`, and `publish:local`.
  - **Done‑when:**
    1. Scripts are present and functional in `package.json`.
  - **Verification:**
    1. Running each script completes successfully.
  - **Depends‑on:** [T002]

- [ ] **T004 · Feature · P0: ensure CLI build output is executable**

  - **Context:** Phase 1: Package Configuration (1.3 CLI executable setup)
  - **Action:**
    1. Add Node.js shebang to `dist/cli.js`.
    2. Ensure build process preserves executable permissions.
  - **Done‑when:**
    1. `dist/cli.js` is a valid, executable Node.js CLI after build.
  - **Verification:**
    1. `chmod +x dist/cli.js` not required after build.
    2. Running `node dist/cli.js --help` works.
  - **Depends‑on:** [T002]

- [ ] **T005 · Chore · P0: create minimal GitHub Actions workflow for npm publishing**

  - **Context:** Phase 2: Publishing Workflow (2.1 Create .github/workflows/publish.yml)
  - **Action:**
    1. Add `.github/workflows/publish.yml` with workflow as per plan (trigger on tag, install, build, test, publish).
  - **Done‑when:**
    1. Workflow file is present and references correct scripts/package manager.
  - **Verification:**
    1. Dry-run workflow runs to completion (e.g., with echo/publish step disabled).
  - **Depends‑on:** [T002]

- [ ] **T006 · Chore · P0: configure npm authentication for GitHub Actions**

  - **Context:** Phase 2: Publishing Workflow (2.2 Configure npm registry authentication)
  - **Action:**
    1. Generate npm access token with appropriate scope.
    2. Add `NPM_TOKEN` secret to GitHub repository.
  - **Done‑when:**
    1. Secret is present in repo and referenceable from workflow.
  - **Verification:**
    1. Test authentication in a workflow run (can be dry-run).
  - **Depends‑on:** [T005]

- [ ] **T007 · Test · P1: validate package contents and pre-publish behavior**

  - **Context:** Phase 3: Validation & Testing (3.1 Pre-publish testing)
  - **Action:**
    1. Run `npm pack --dry-run` and verify package file list.
    2. Run local global install (`npm install -g <tgz>`), verify CLI works.
  - **Done‑when:**
    1. Only intended files are included, install & CLI command work globally.
  - **Verification:**
    1. `elevator --help` and `elevator "test prompt"` run after global install.
  - **Depends‑on:** [T004], [T003]

- [ ] **T008 · Feature · P1: validate package.json metadata and binary linking**

  - **Context:** Phase 3: Validation & Testing (3.2 Publication validation)
  - **Action:**
    1. Verify `bin` field points to correct file.
    2. Confirm metadata fields (name, version, description, keywords, etc.) are accurate.
  - **Done‑when:**
    1. `npm bin` links `elevator` command globally; metadata displays correctly on npm.
  - **Verification:**
    1. Install package globally and confirm command is available in shell.
  - **Depends‑on:** [T007]

- [ ] **T009 · Chore · P1: monitor package size and exclude unnecessary files**

  - **Context:** Risk Analysis & Mitigation (LOW Risk: Package Size Bloat)
  - **Action:**
    1. Use `npm pack --dry-run` to check package size and contents.
    2. Add/update `.npmignore` if needed to exclude extra files.
  - **Done‑when:**
    1. Published package is <100KB, contains only essential files.
  - **Verification:**
    1. `npm pack --dry-run` output reviewed and matches minimal footprint.
  - **Depends‑on:** [T007]

- [ ] **T010 · Feature · P2: update README.md with installation and usage**

  - **Context:** Phase 4: Documentation Update (4.1 Update README.md)
  - **Action:**
    1. Add npm install instructions (`npm install -g <package>`).
    2. Add basic usage and CLI examples.
  - **Done‑when:**
    1. README contains clear global install and usage instructions.
  - **Verification:**
    1. README matches published CLI usage.
  - **Depends‑on:** [T008]

- [ ] **T011 · Chore · P2: document release and publishing process**

  - **Context:** Phase 4: Documentation Update (4.2 Add publishing documentation)
  - **Action:**
    1. Document release steps, version management, and troubleshooting in README or CONTRIBUTING.md.
  - **Done‑when:**
    1. Release process is documented and referenced in project.
  - **Verification:**
    1. New contributors can follow publishing steps without confusion.
  - **Depends‑on:** [T010]

- [ ] **T012 · Test · P1: add smoke and integration tests for package publication**

  - **Context:** Testing Strategy (Integration Testing, Smoke Testing)
  - **Action:**
    1. Implement integration script to test packing, install, and CLI invocation.
    2. Add unit tests for package.json config (bin, files).
  - **Done‑when:**
    1. Tests pass and catch misconfiguration.
  - **Verification:**
    1. Integration script can be run in CI.
  - **Depends‑on:** [T003], [T004]

- [ ] **T013 · Chore · P2: enforce npm publication security best practices**
  - **Context:** Security & Configuration (npm Publication Security)
  - **Action:**
    1. Confirm token is package-scoped, 2FA enabled on npm account, and tokens are rotated.
    2. Limit repo collaborator permissions as needed.
  - **Done‑when:**
    1. Security controls are in place per plan.
  - **Verification:**
    1. Security checklist reviewed and signed off.
  - **Depends‑on:** [T006]

## Versioning & Release Process

- [ ] **T014 · Chore · P1: confirm initial version and semantic versioning approach**

  - **Context:** Open Questions & Decisions Needed (Versioning Strategy)
  - **Action:**
    1. Decide whether to start at 1.0.0 or 0.1.0.
    2. Update `package.json` with final starting version.
  - **Done‑when:**
    1. Versioning approach is documented and correct version is set.
  - **Verification:**
    1. Tag and package version match published artifact.
  - **Depends‑on:** [T002]

- [ ] **T015 · Chore · P2: document release cadence and criteria**
  - **Context:** Open Questions & Decisions Needed (Release Frequency)
  - **Action:**
    1. Add guidelines for when to cut releases and update npm.
  - **Done‑when:**
    1. Release cadence is documented for maintainers.
  - **Verification:**
    1. Maintainers can reference policy for new releases.
  - **Depends‑on:** [T011]

## Cross-Platform Testing

- [ ] **T016 · Chore · P3: evaluate need for Windows/macOS CI for CLI**
  - **Context:** Open Questions & Decisions Needed (Platform Testing)
  - **Action:**
    1. Assess CLI cross-platform compatibility risks.
    2. If needed, add Windows/macOS jobs to CI workflow.
  - **Done‑when:**
    1. Decision made; additional jobs added if warranted.
  - **Verification:**
    1. CLI install and execution validated on all supported platforms.
  - **Depends‑on:** [T005]

## Clarifications & Assumptions

- [ ] **Issue:** Confirm which package manager will be used in CI and docs (npm, yarn, pnpm)

  - **Context:** Architecture Analysis, package.json scripts, publish workflow steps (plan alternates between `npm`/`pnpm`)
  - **Blocking?:** yes

- [ ] **Issue:** Confirm if package is intended for public access or needs npm organization scope

  - **Context:** Security & Configuration, `publishConfig` field
  - **Blocking?:** no

- [ ] **Issue:** Confirm if `.npmignore` is needed or if `files` field is sufficient for package content filtering

  - **Context:** Phase 3: Validation & Testing, Risk Analysis (Package Size Bloat)
  - **Blocking?:** no

- [ ] **Issue:** Confirm location/ownership of repository and npm (phrazzld/elevator or other org)
  - **Context:** package.json `repository` and npm publish permissions
  - **Blocking?:** no
