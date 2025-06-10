# Release Process and Versioning Guidelines

This document outlines the release process for the `prompt-elevator` package and versioning guidelines.

## Versioning Strategy

This project follows [Semantic Versioning (SemVer)](https://semver.org/) starting from `1.0.0`:

- **MAJOR** (`X.0.0`): Breaking changes that require user action
- **MINOR** (`1.X.0`): New features that are backward compatible
- **PATCH** (`1.0.X`): Bug fixes and maintenance updates

### Version Examples

- `1.0.0` → `1.0.1`: Bug fix (patch)
- `1.0.1` → `1.1.0`: New CLI option added (minor)
- `1.1.0` → `2.0.0`: Breaking API change (major)

## Release Process

### Prerequisites

1. All tests passing locally (`pnpm test` and `pnpm test:integration`)
2. Code linted and formatted (`pnpm lint`, `pnpm format`)
3. NPM_TOKEN configured in GitHub repository secrets (see `NPM_TOKEN_SETUP.md`)

### Step-by-Step Release

1. **Update Package Version**

   ```bash
   # Update version in package.json
   npm version patch|minor|major --no-git-tag-version

   # Or manually edit package.json version field
   ```

2. **Commit Version Change**

   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z"
   ```

3. **Create and Push Git Tag**

   ```bash
   # Create annotated tag (use same version as package.json)
   git tag -a vX.Y.Z -m "Release vX.Y.Z"

   # Push commits and tags
   git push origin main
   git push origin vX.Y.Z
   ```

4. **Automated Publishing**
   - The GitHub Actions workflow (`.github/workflows/publish.yml`) automatically triggers on tag push
   - Workflow validates, builds, tests, and publishes to npm
   - Creates a GitHub release with changelog

### Validation Steps

The release workflow automatically performs these validations:

- ✅ Linting and type checking
- ✅ Full test suite with coverage
- ✅ Integration testing (packaging and installation)
- ✅ Version consistency check (package.json vs git tag)
- ✅ Package contents verification

### Manual Testing (Optional)

For critical releases, consider manual validation:

```bash
# Test packaging locally
pnpm test:integration

# Verify package contents
npm run publish:check

# Test installation in clean environment
npm pack
npm install -g ./prompt-elevator-X.Y.Z.tgz
prompt-elevator "test prompt"
npm uninstall -g prompt-elevator
```

## Release Types

### Patch Release (1.0.X)

**When to use:** Bug fixes, documentation updates, dependency updates

**Example changes:**

- Fix CLI error handling
- Update README examples
- Security vulnerability patches

### Minor Release (1.X.0)

**When to use:** New features, additional CLI options, API additions

**Example changes:**

- New `--output-format` option
- Additional prompt enhancement modes
- Performance improvements

### Major Release (X.0.0)

**When to use:** Breaking changes, major refactoring, API removals

**Example changes:**

- Remove or change existing CLI options
- Change default behavior
- Require higher Node.js version
- Major dependency updates with breaking changes

## Hotfix Process

For critical bugs in production:

1. **Create hotfix branch from tag:**

   ```bash
   git checkout -b hotfix/vX.Y.Z+1 vX.Y.Z
   ```

2. **Apply minimal fix and test**

3. **Follow standard release process** (update version, tag, push)

4. **Merge back to main:**
   ```bash
   git checkout main
   git merge hotfix/vX.Y.Z+1
   git push origin main
   ```

## Rollback Process

If a release has critical issues:

1. **Remove from npm** (if necessary):

   ```bash
   npm unpublish prompt-elevator@X.Y.Z
   ```

2. **Create fixed version** following hotfix process

3. **Communicate** the issue and resolution to users

## Release Checklist

**Pre-release:**

- [ ] All features complete and tested
- [ ] Documentation updated
- [ ] Version number decided (patch/minor/major)
- [ ] Changelog reviewed

**Release:**

- [ ] `package.json` version updated
- [ ] Version change committed
- [ ] Git tag created and pushed
- [ ] GitHub Actions workflow completed successfully
- [ ] Package available on npm
- [ ] GitHub release created

**Post-release:**

- [ ] Verify installation works: `npm install -g prompt-elevator@X.Y.Z`
- [ ] Update any dependent projects/documentation
- [ ] Announce release (if applicable)

## Troubleshooting

### Common Issues

**Workflow fails on version mismatch:**

- Ensure `package.json` version matches git tag (without `v` prefix)

**NPM publish fails:**

- Verify NPM_TOKEN is correctly set in GitHub secrets
- Check npm registry status: https://status.npmjs.org/

**Tests fail in CI:**

- Run full test suite locally first: `pnpm test && pnpm test:integration`
- Check for environment-specific issues

### Getting Help

- Review workflow logs in GitHub Actions tab
- Check npm package status: `npm view prompt-elevator`
- Verify GitHub releases page shows the new version
