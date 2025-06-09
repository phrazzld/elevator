# Todo

## Implementation Plan: Package Publication Setup

- [ ] **T001 · Feature · P2: Update package.json**
  - **Context:** [Plan Details - Phase 1: Package Configuration](https://github.com/phrazzld/elevator/blob/main/PLAN.md#phase-1-package-configuration-30-min)
  - **Action:**
    1. Check availability of package name `elevator-cli` on npm.
    2. Update `package.json` with correct metadata.
    3. Ensure `main`, `bin`, and `files` fields are properly configured.
  - **Done‑when:**
    1. `package.json` is updated and formatted correctly.
  - **Verification:**
    1. Run `npm view elevator-cli` to check package availability.
    2. Verify `package.json` contents match planned configuration.

## Implementation Plan: Publishing Workflow

- [ ] **T002 · Feature · P2: Create GitHub Actions workflow**
  - **Context:** [Plan Details - Phase 2: Publishing Workflow (45 min)](https://github.com/phrazzld/elevator/blob/main/PLAN.md#phase-2-publishing-workflow-45-min)
  - **Action:**
    1. Create `.github/workflows/publish.yml` file.
    2. Configure workflow to trigger on push with tags `v*`.
    3. Set up Node.js environment and install dependencies.
    4. Configure `npm publish` with authentication token.
  - **Done‑when:**
    1. Workflow file is created and formatted correctly.
    2. Workflow executes successfully in GitHub Actions.
  - **Verification:**
    1. Test workflow by pushing a tagged commit.

## Implementation Plan: Validation & Testing

- [ ] **T003 · Test · P2: Pre-publish testing**
  - **Context:** [Plan Details - Phase 3: Validation & Testing (30 min)](https://github.com/phrazzld/elevator/blob/main/PLAN.md#phase-3-validation-testing-30-min)
  - **Action:**
    1. Test package contents with `npm pack --dry-run`.
    2. Verify local installation with `npm pack` and `npm install -g`.
    3. Validate package.json metadata.
  - **Done‑when:**
    1. Pre-publish tests pass without errors.
  - **Verification:**
    1. Run `npm pack --dry-run` and verify output.

## Implementation Plan: Documentation Update

- [ ] **T004 · Chore · P2: Update README.md installation section**
  - **Context:** [Plan Details - Phase 4: Documentation Update (15 min)](https://github.com/phrazzld/elevator/blob/main/PLAN.md#phase-4-documentation-update-15-min)
  - **Action:**
    1. Update installation instructions in README.md.
    2. Add publishing documentation.
  - **Done‑when:**
    1. README.md is updated and formatted correctly.
  - **Verification:**
    1. Review README.md for accuracy and completeness.

## Open Questions & Decisions Needed

### 1. Package Name Strategy

**Question**: Is `elevator` available on npm? What's our fallback?
**Decision Required**: Final package name before configuration.
**Investigation**: `npm view elevator`.

- [ ] **Clarification: Check npm package availability**
  - **Context:** [Open Questions & Decisions Needed - Package Name Strategy](https://github.com/phrazzld/elevator/blob/main/PLAN.md#1-package-name-strategy)
  - **Blocking?:** yes
  - **Investigation Plan:**
    1. Run `npm view elevator` to check availability.
    2. Decide on fallback name if necessary.

### 2. Versioning Strategy

**Question**: Start at 1.0.0 or 0.1.0 for initial release?
**Decision Required**: Semantic versioning approach.
**Recommendation**: Start at 1.0.0 (tool is functional and stable)

- [ ] **Clarification: Determine initial version number**
  - **Context:** [Open Questions & Decisions Needed - Versioning Strategy](https://github.com/phrazzld/elevator/blob/main/PLAN.md#2-versioning-strategy)
  - **Blocking?:** no

### 3. Release Frequency

**Question**: How often will we publish new versions?
**Decision Required**: Release cadence and criteria.
**Recommendation**: Manual releases for significant features/fixes

- [ ] **Clarification: Define release frequency and criteria**
  - **Context:** [Open Questions & Decisions Needed - Release Frequency](https://github.com/phrazzld/elevator/blob/main/PLAN.md#3-release-frequency)
  - **Blocking?:** no

### 4. Platform Testing

**Question**: Should we test on Windows/macOS in CI?
**Decision Required**: Cross-platform validation scope.
**Recommendation**: Start with Linux CI, add platforms if issues arise.

- [ ] **Clarification: Determine cross-platform testing strategy**
  - **Context:** [Open Questions & Decisions Needed - Platform Testing](https://github.com/phrazzld/elevator/blob/main/PLAN.md#4-platform-testing)
  - **Blocking?:** no
