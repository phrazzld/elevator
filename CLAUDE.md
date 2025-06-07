# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**elevator** is a lightweight CLI that continuously accepts natural-language prompts and returns richer, more technical articulations using Google Gemini 2.5 Flash. Built with Node.js 18+ and TypeScript.

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
- `src/core/` - Pure business logic (prompt processing, validation)
- `src/adapters/` - Infrastructure adapters (Gemini API, formatters)
- `src/config.ts` - Configuration management

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
- `GEMINI_MODEL_ID` - Optional, defaults to `gemini-2.5-flash-preview-05-20`
- `GEMINI_TEMPERATURE` - Optional, defaults to `0.7`

### Current Implementation Status

The project is in early development phase. Key tasks from TODO.md include:

- Setting up strict TypeScript and ESLint configuration
- Implementing core domain logic as pure functions
- Creating infrastructure adapters following dependency inversion
- Setting up comprehensive testing with Vitest
- Configuring mandatory automation (pre-commit hooks, CI pipeline)
