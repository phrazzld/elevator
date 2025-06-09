# Todo

## Package Configuration

- [ ] **T001 · Chore · P1: Configure package.json for npm publication**
  - **Context:** Phase 1: Package Configuration
  - **Action:**
    1. Update `package.json` with correct metadata (name, version, description, main, bin, files, keywords, repository, license, engines)
    2. Ensure `name` is available on npm or choose a suitable fallback
    3. Set `version` to appropriate initial release (1.0.0 or 0.1.0)
  - **Done‑when:**
    1. `package.json` contains all required fields with correct values
    2. `name` is available on npm or alternative name is used
  - **Verification:**
    1. Run `npm view <package-name>` to verify name availability
    2. Review `package.json` contents for completeness
  - **Depends‑on:** none

## Publishing Workflow

- [ ] **T002 · Chore · P1: Create GitHub Actions workflow for automated publishing**
  - **Context:** Phase 2: Publishing Workflow
  - **Action:**
    1. Create `.github/workflows/publish.yml` with tag-based trigger
    2. Configure workflow to install dependencies, build, test, and publish to npm
    3. Store `NPM_TOKEN` as GitHub repository secret
  - **Done‑when:**
    1. Workflow file exists with correct configuration
    2. Workflow successfully publishes to npm on tag push
  - **Verification:**
    1. Trigger workflow manually and verify execution
    2. Check npm registry for published package
  - **Depends‑on:** T001

## Pre-publish Testing

- [ ] **T003 · Test · P1: Implement pre-publish testing script**
  - **Context:** Phase 3: Validation & Testing
  - **Action:**
    1. Create test script to verify package contents using `npm pack --dry-run`
    2. Test local installation using `npm pack` and `npm install -g`
    3. Verify CLI executable works after global installation
  - **Done‑when:**
    1. Test script exists and passes successfully
    2. Package contents are verified to be correct
  - **Verification:**
    1. Run test script and verify output
    2. Manually test global installation and CLI execution
  - **Depends‑on:** T001

## Documentation Update

- [ ] **T004 · Chore · P1: Update README.md with new installation instructions**
  - **Context:** Phase 4: Documentation Update
  - **Action:**
    1. Update installation section to use `npm install -g`
    2. Document release process and version management guidelines
    3. Include troubleshooting notes for common issues
  - **Done‑when:**
    1. README.md contains updated installation instructions
    2. Release process is documented
  - **Verification:**
    1. Review README.md for completeness and clarity
    2. Follow installation instructions to verify they work
  - **Depends‑on:** T001, T002

## Package Name Verification

- [ ] **T005 · Chore · P2: Verify package name availability on npm**
  - **Context:** Open Question: Package Name Strategy
  - **Action:**
    1. Run `npm view elevator` to check availability
    2. Document findings and decide on fallback if necessary
  - **Done‑when:**
    1. Package name availability is checked
    2. Decision on final package name is made
  - **Verification:**
    1. Review npm search results for package name
  - **Depends‑on:** none

## Versioning Strategy Decision

- [ ] **T006 · Chore · P2: Decide on initial version number**
  - **Context:** Open Question: Versioning Strategy
  - **Action:**
    1. Review current tool functionality and stability
    2. Decide between starting at 1.0.0 or 0.1.0
  - **Done‑when:**
    1. Initial version number is decided
  - **Verification:**
    1. Review versioning decision documentation
  - **Depends‑on:** none

## Release Process Documentation

- [ ] **T007 · Chore · P2: Document release process and guidelines**
  - **Context:** Phase 4: Documentation Update
  - **Action:**
    1. Create documentation for release process
    2. Include version bumping and changelog generation steps
  - **Done‑when:**
    1. Release process is fully documented
  - **Verification:**
    1. Follow documented release process to verify it works
  - **Depends‑on:** T004

## Risk: Publishing Failure Mitigation

- [ ] **T008 · Chore · P2: Implement fallback manual publishing process**
  - **Context:** MEDIUM Risk: Publishing Failure
  - **Action:**
    1. Document manual publishing steps using `npm publish`
    2. Test manual publishing process
  - **Done‑when:**
    1. Manual publishing process is documented and tested
  - **Verification:**
    1. Perform manual publish test
  - **Depends‑on:** T001

## Risk: Binary Permissions Mitigation

- [ ] **T009 · Test · P2: Add test for CLI executable permissions**
  - **Context:** MEDIUM Risk: Binary Permissions
  - **Action:**
    1. Create test to verify shebang in `dist/cli.js`
    2. Test executable permissions after global installation
  - **Done‑when:**
    1. Test exists and passes successfully
  - **Verification:**
    1. Run test and verify CLI execution
  - **Depends‑on:** T003

## Risk: Package Size Monitoring

- [ ] **T010 · Chore · P3: Monitor package size**
  - **Context:** LOW Risk: Package Size Bloat
  - **Action:**
    1. Use `npm pack --dry-run` to monitor package contents
    2. Configure `.npmignore` to exclude unnecessary files
  - **Done‑when:**
    1. Package size is within target (<100KB)
  - **Verification:**
    1. Check package size after publishing
  - **Depends‑on:** T001
