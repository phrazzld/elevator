# Contributing to prompt-elevator

Thank you for your interest in contributing to **prompt-elevator**! This document provides guidelines for contributing to this project while adhering to our development philosophy and maintaining code quality.

## Table of Contents

- [Development Philosophy](#development-philosophy)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Guidelines](#documentation-guidelines)
- [Pull Request Process](#pull-request-process)
- [Architecture Guidelines](#architecture-guidelines)
- [Common Pitfalls](#common-pitfalls)

## Development Philosophy

This project strictly adheres to the principles outlined in [`docs/DEVELOPMENT_PHILOSOPHY.md`](docs/DEVELOPMENT_PHILOSOPHY.md) and [`docs/DEVELOPMENT_PHILOSOPHY_APPENDIX_TYPESCRIPT.md`](docs/DEVELOPMENT_PHILOSOPHY_APPENDIX_TYPESCRIPT.md). **All contributions MUST follow these guidelines.**

### Core Principles

1. **Simplicity First**: Always seek the simplest solution that meets requirements
2. **Modularity is Mandatory**: Build small, focused, testable components
3. **Design for Testability**: Code must be designed for comprehensive testing
4. **Maintainability Over Optimization**: Write code for human understanding
5. **Explicit is Better than Implicit**: Make dependencies and data flow clear
6. **Automate Everything**: Use automation for consistency and quality
7. **Document Decisions, Not Mechanics**: Explain the _why_, not the _how_

**Required Reading**: Before contributing, please read:

- [`docs/DEVELOPMENT_PHILOSOPHY.md`](docs/DEVELOPMENT_PHILOSOPHY.md) - Core development principles
- [`docs/DEVELOPMENT_PHILOSOPHY_APPENDIX_TYPESCRIPT.md`](docs/DEVELOPMENT_PHILOSOPHY_APPENDIX_TYPESCRIPT.md) - TypeScript-specific standards
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - Architecture decisions and patterns

## Getting Started

### Prerequisites

- **Node.js** >=18.0.0
- **pnpm** >=10.0.0 (required package manager)
- **Git** with conventional commit support

### Initial Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/prompt-elevator.git
   cd prompt-elevator
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Set Up Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your GEMINI_API_KEY
   ```

4. **Verify Setup**
   ```bash
   pnpm test        # Run tests
   pnpm lint        # Check linting
   pnpm typecheck   # Verify TypeScript
   pnpm build       # Build project
   ```

## Development Workflow

### 1. Branch Creation

Create feature branches from `master`:

```bash
git checkout -b feature/your-feature-name
git checkout -b fix/issue-description
git checkout -b docs/documentation-update
```

### 2. Development Process

**Follow Test-Driven Development (TDD) for non-trivial changes:**

1. **Write Failing Tests First**

   ```bash
   # Add tests in *.test.ts files
   pnpm test --watch
   ```

2. **Implement Minimum Code to Pass Tests**

   - Focus on making tests pass
   - Follow hexagonal architecture patterns
   - Maintain separation of concerns

3. **Refactor for Quality**
   - Improve code clarity
   - Extract pure functions
   - Ensure proper dependency injection

### 3. Quality Gates (MANDATORY)

Before committing, ensure all checks pass:

```bash
pnpm format      # Format code with Prettier
pnpm lint        # ESLint checks (zero warnings/errors)
pnpm typecheck   # TypeScript compilation
pnpm test        # All tests pass
pnpm test:coverage # Coverage thresholds met
```

**Pre-commit hooks will enforce these checks. Bypassing with `--no-verify` is FORBIDDEN.**

## Code Standards

### TypeScript Requirements

- **Strict Mode**: `"strict": true` is mandatory
- **No `any`**: Use specific types, `unknown`, or proper interfaces
- **Explicit Types**: All function parameters and return values must be typed
- **Immutability**: Use `readonly` modifiers and immutable patterns
- **Pure Functions**: Prefer pure functions for core logic

### Architectural Constraints

#### Core Domain (`src/core/`)

- **NO** imports from `adapters/` or `infrastructure/`
- All functions are pure where possible
- All data structures are immutable
- Uses only interfaces for external dependencies

#### Infrastructure Adapters (`src/adapters/`)

- Implements interfaces defined in `core/`
- Contains all external library dependencies
- Configuration injected via constructor

#### Testing Rules

- **NO MOCKING INTERNAL COLLABORATORS** - Refactor for testability instead
- Mock only true external system boundaries (APIs, file system, etc.)
- Use dependency injection for testability
- Co-locate tests with source code

### Code Style

```typescript
// ✅ Good: Pure function with explicit types
export function validatePrompt(
  input: string,
  rules: readonly ValidationRule[],
): Result<ValidatedPrompt, ValidationError> {
  // Implementation
}

// ❌ Bad: Impure function with any type
export function validatePrompt(input: any): any {
  // Accesses global state, uses any type
}
```

### Error Handling

Use explicit `Result<T, E>` types instead of throwing exceptions:

```typescript
// ✅ Good: Explicit error handling
const result = await apiClient.generateContent(prompt);
if (isErr(result)) {
  return failure(result.error);
}
return success(result.value);

// ❌ Bad: Exception-based error handling
try {
  const response = await apiClient.generateContent(prompt);
  return response;
} catch (error) {
  throw error;
}
```

## Testing Requirements

### Coverage Thresholds (ENFORCED)

- **Overall coverage**: 85% minimum
- **Core logic**: 95% minimum
- **Builds WILL FAIL** if coverage drops below thresholds

### Testing Strategy

1. **Unit Tests**: Test pure functions and isolated logic
2. **Integration Tests**: Test component collaboration (HIGH PRIORITY)
3. **E2E Tests**: Test complete user workflows (sparingly)

### Test Organization

```bash
src/
├── core/
│   ├── promptValidator.ts
│   └── promptValidator.test.ts     # Co-located tests
├── adapters/
│   ├── geminiClient.ts
│   └── geminiClient.test.ts
└── test-utils/                     # Test infrastructure
    ├── builders/                   # Test data builders
    ├── fixtures/                   # Test fixtures
    └── diHelpers.ts               # DI utilities
```

### Test Data Management

Use builders and fixtures from `test-utils/`:

```typescript
// ✅ Good: Using test builders
const prompt = promptBuilder()
  .withContent("test prompt")
  .withMetadata({ category: "test" })
  .build();

// ✅ Good: Using fixtures
import { edgeCasePrompts } from "test-utils/fixtures";
```

## Documentation Guidelines

### Code Comments

Focus on **WHY**, not **WHAT**:

```typescript
// ✅ Good: Explains reasoning
// Use exponential backoff to handle rate limiting gracefully
// without overwhelming the API during temporary issues
const delay = Math.pow(2, attempt) * 1000;

// ❌ Bad: States the obvious
// Multiply 2 to the power of attempt times 1000
const delay = Math.pow(2, attempt) * 1000;
```

### README Updates

If your changes affect user-facing functionality:

- Update installation instructions
- Add usage examples
- Update CLI options documentation
- Update troubleshooting section

## Pull Request Process

### 1. Pre-Submission Checklist

- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated (if needed)
- [ ] Conventional commit messages used
- [ ] No linting errors or warnings
- [ ] Coverage thresholds maintained

### 2. Pull Request Template

**Title**: Use conventional commit format

```
feat: add streaming response support
fix: resolve API timeout handling
docs: update contribution guidelines
```

**Description** should include:

- **What**: Brief description of changes
- **Why**: Motivation and context
- **How**: Implementation approach
- **Testing**: How to verify the changes
- **Breaking Changes**: Any breaking changes (if applicable)

### 3. Review Process

**All Pull Requests must**:

- Pass automated CI checks
- Have at least one approving review
- Follow architectural guidelines
- Maintain test coverage requirements

**Reviewers will check for**:

- Adherence to development philosophy
- Proper separation of concerns
- Test quality and coverage
- Documentation completeness
- Architectural consistency

## Architecture Guidelines

### Hexagonal Architecture Compliance

When adding new features:

1. **Define Core Interfaces First**

   ```typescript
   // In src/core/
   export interface NewFeatureService {
     processData(input: Input): Result<Output, Error>;
   }
   ```

2. **Implement Pure Business Logic**

   ```typescript
   // In src/core/
   export class DefaultNewFeatureService implements NewFeatureService {
     // Pure functions, no external dependencies
   }
   ```

3. **Create Infrastructure Adapters**

   ```typescript
   // In src/adapters/
   export class ExternalServiceAdapter implements ExternalServiceClient {
     // Implements core-defined interface
   }
   ```

4. **Wire Dependencies**
   ```typescript
   // In src/dependencyInjection.ts
   const newFeatureService = new DefaultNewFeatureService(dependencies);
   ```

### Dependency Direction

**ALWAYS** ensure dependencies point inward:

```
CLI → Adapters → Core (✅ Correct)
Core → Adapters    (❌ FORBIDDEN)
```

## Common Pitfalls

### 🚫 Things to Avoid

1. **Using `any` type**

   ```typescript
   // ❌ Bad
   function process(data: any): any;

   // ✅ Good
   function process(data: Input): Result<Output, Error>;
   ```

2. **Mocking internal collaborators**

   ```typescript
   // ❌ Bad
   jest.mock("../core/promptValidator");

   // ✅ Good - Use real implementation
   const validator = new DefaultPromptValidator();
   ```

3. **Importing infrastructure in core**

   ```typescript
   // ❌ Bad - in src/core/
   import { GoogleGeminiAdapter } from "../adapters/geminiClient";

   // ✅ Good - in src/core/
   import { GeminiAPIClient } from "./apiClient";
   ```

4. **Suppressing linter warnings**

   ```typescript
   // ❌ FORBIDDEN
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const data: any = response;

   // ✅ Good - Fix the root cause
   const data: ResponseData = response as ResponseData;
   ```

5. **Hardcoding configuration**

   ```typescript
   // ❌ Bad
   const apiKey = "hardcoded-key";

   // ✅ Good
   const apiKey = config.api.apiKey;
   ```

### ✅ Best Practices

1. **Extract pure functions**
2. **Use dependency injection**
3. **Write tests first (TDD)**
4. **Keep functions small and focused**
5. **Use meaningful names**
6. **Prefer composition over inheritance**
7. **Make illegal states unrepresentable**

## Getting Help

- **Architecture Questions**: Reference [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Code Standards**: Reference [`docs/DEVELOPMENT_PHILOSOPHY_APPENDIX_TYPESCRIPT.md`](docs/DEVELOPMENT_PHILOSOPHY_APPENDIX_TYPESCRIPT.md)
- **General Principles**: Reference [`docs/DEVELOPMENT_PHILOSOPHY.md`](docs/DEVELOPMENT_PHILOSOPHY.md)
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

## License

By contributing to prompt-elevator, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

**Remember**: The goal is to build software that is simple, modular, testable, maintainable, secure, and observable. Every contribution should advance these goals while following our development philosophy.

Thank you for contributing to prompt-elevator! 🚀
