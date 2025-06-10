# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**elevator** is a lightweight CLI that transforms natural-language prompts into more sophisticated, technically precise articulations using Google Gemini 2.5 Flash. Supports multiple input modes including single-line arguments, multiline interactive input, and piped input. Built with Node.js 18+ and TypeScript.

## Development Commands

### Build & Development

```bash
# Build TypeScript to JavaScript
pnpm build

# Watch mode for development
pnpm dev

# Clean build artifacts
pnpm clean

# Type checking without emitting files
pnpm typecheck
```

### Testing

```bash
# Run tests with Vitest
pnpm test

# Run tests with coverage report
pnpm test:coverage
```

## Architecture & Code Structure

### Core Philosophy

This project strictly adheres to the principles outlined in `docs/DEVELOPMENT_PHILOSOPHY.md` and `docs/DEVELOPMENT_PHILOSOPHY_APPENDIX_TYPESCRIPT.md`. Key principles:

1. **Separation of Concerns**: Core business logic is isolated from infrastructure
2. **Pure Functions**: Core logic is implemented as pure functions where possible
3. **Dependency Inversion**: Infrastructure depends on core abstractions, never the reverse
4. **No Internal Mocking**: Tests use real implementations; only external boundaries are mocked

### Project Structure

The codebase follows a feature-based organization:

- `src/cli.ts` - Entry point and command-line interface setup
- `src/input.ts` - Input handling module (arguments, interactive mode, piped input)
- `src/api.ts` - Direct Gemini API integration with structured logging
- `test/` - Integration tests for end-to-end CLI functionality

### TypeScript Configuration

- Strict mode enabled (`"strict": true`)
- All strictness flags active (see `tsconfig.json`)
- `any` type is forbidden - use specific types or `unknown`
- ES2022 target with NodeNext module resolution

### Testing Strategy

- **Framework**: Vitest
- **Coverage Requirements**: 85% overall, 95% for core logic
- **Mocking Policy**: Only mock external system boundaries (APIs, filesystem)
- **Test Location**: Co-locate test files with source (`*.test.ts`)

### Key Development Requirements

1. **Pre-commit Hooks**: Mandatory - never bypass with `--no-verify`
2. **Formatting**: Prettier is non-negotiable
3. **Linting**: ESLint with TypeScript rules, no suppressions allowed
4. **Conventional Commits**: Required for all commits
5. **Security**: API keys only via environment variables (never hardcoded)

### Environment Variables

- `GEMINI_API_KEY` - Required for Gemini API access

### Usage Modes

The CLI supports multiple input methods:

1. **Single-line arguments**: `elevator "prompt text"`
2. **Multiline interactive**: `elevator` (then type multiple lines, Ctrl+D to submit)
3. **Piped input**: `echo "prompt" | elevator` or `elevator < file.txt`
4. **Raw output**: Add `--raw` flag for unformatted output (useful in scripts)

### Current Implementation Status

The project has completed its core multiline input implementation:

- ✅ **Multiline Input**: Interactive mode with Ctrl+D termination
- ✅ **Piped Input**: Full support for echo, heredoc, and file input
- ✅ **Backward Compatibility**: Existing single-argument usage preserved
- ✅ **Testing**: Comprehensive unit and integration test coverage
- ✅ **Error Handling**: Timeout protection, input validation, graceful failures
- ✅ **Documentation**: Complete usage examples and troubleshooting guides

### Testing Notes

- Run `pnpm test` for unit tests (fast, mocked external dependencies)
- Run `pnpm test test/cli.integration.test.ts` for integration tests (requires GEMINI_API_KEY)
- Integration tests are skipped automatically if no API key is available
- All tests include proper cleanup and error handling
