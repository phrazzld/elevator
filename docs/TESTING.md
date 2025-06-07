# Testing Strategy and Coverage Requirements

## Overview

This document outlines the comprehensive testing strategy for **elevator**, based on our development philosophy of building confidence through verification. Our testing approach prioritizes **testability as a design constraint**, **no internal mocking**, and **comprehensive coverage** of business logic.

The testing strategy supports the hexagonal architecture by focusing on **behavior verification** rather than implementation details, enabling safe refactoring and confident evolution of the codebase.

## Testing Philosophy

### Core Principles

1. **Testability is a Design Constraint**: Code must be designed from the ground up to be easily and comprehensively testable
2. **No Internal Mocking**: Never mock internal collaborators - refactor for testability instead
3. **Test Behavior, Not Implementation**: Focus on _what_ components do, not _how_ they do it
4. **Fast Feedback**: Tests provide rapid feedback during development
5. **Confidence Through Coverage**: High coverage enables safe refactoring and evolution

### Why This Approach

**Testability Drives Better Design**: When code is hard to test, it usually indicates poor design (high coupling, mixed concerns). Rather than forcing tests with mocks, we refactor the code to be more testable through dependency injection and pure functions.

**No Internal Mocking Policy**: Mocking internal collaborators creates brittle tests that break when refactoring internal implementation. By using real implementations for internal dependencies, tests remain valid during refactoring and provide higher confidence.

**Architectural Alignment**: Our testing strategy mirrors the hexagonal architecture - core logic is tested in isolation using pure functions, while infrastructure adapters are tested at boundaries with external mocks only.

## Test Organization

### Directory Structure

Tests are **co-located** with source code for maintainability:

```
src/
├── core/
│   ├── promptValidator.ts
│   ├── promptValidator.test.ts      # Unit tests for pure functions
│   ├── promptProcessingService.ts
│   └── promptProcessingService.test.ts # Integration tests
├── adapters/
│   ├── geminiClient.ts
│   ├── geminiClient.test.ts         # Adapter tests with external mocks
│   └── geminiClient.integration.test.ts # Integration tests
├── test-utils/                     # Centralized test infrastructure
│   ├── builders/                   # Test data builders
│   ├── fixtures/                   # Test fixtures and scenarios
│   └── diHelpers.ts               # Dependency injection helpers
└── e2e.test.ts                    # End-to-end workflow tests
```

### Test File Naming

- `*.test.ts` - Unit and integration tests
- `*.integration.test.ts` - Integration tests with external systems
- `*.e2e.test.ts` - End-to-end tests

## Test Types

### 1. Unit Tests

**Purpose**: Verify small, isolated logic units (pure functions, algorithms) without external dependencies.

**What to Test**:

- Pure business logic in `src/core/`
- Input validation functions
- Data transformation logic
- Error handling scenarios

**Characteristics**:

- Fast execution (< 10ms per test)
- No external dependencies
- No file system or network access
- Deterministic results

**Example**:

```typescript
describe("DefaultPromptValidator", () => {
  const validator = new DefaultPromptValidator();

  it("should validate a valid prompt", () => {
    const prompt = createRawPrompt("This is a valid prompt");
    const result = validator.validate(prompt);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.content).toBe("This is a valid prompt");
      expect(result.value.rules).toContain("length");
    }
  });
});
```

### 2. Integration Tests

**Purpose**: Verify collaboration between multiple internal components through defined interfaces.

**What to Test**:

- Component interaction workflows
- Service orchestration logic
- Interface contracts between layers
- Error propagation through the system

**No Internal Mocking**: Use real implementations of internal collaborators:

```typescript
describe("DefaultPromptProcessingService", () => {
  // ✅ Good: Real implementations
  const validator = new DefaultPromptValidator();
  const enhancer = new DefaultPromptEnhancer();
  const service = new DefaultPromptProcessingService(
    validator,
    enhancer,
    apiClient,
  );

  it("should process prompt through complete pipeline", async () => {
    const rawPrompt = createRawPrompt("test input");
    const result = await service.processPrompt(rawPrompt);

    expect(isOk(result)).toBe(true);
  });
});
```

### 3. Infrastructure Tests

**Purpose**: Verify infrastructure adapters implement core interfaces correctly.

**External Mocking Only**: Mock true external system boundaries:

```typescript
describe("GoogleGeminiAdapter", () => {
  it("should handle API errors gracefully", async () => {
    // ✅ Good: Mock external API
    const mockClient = createMockGoogleGenerativeAI();
    mockClient.generateContent.mockRejectedValue(new Error("API Error"));

    const adapter = new GoogleGeminiAdapter(config, mockClient);
    const result = await adapter.generateContent(prompt);

    expect(isErr(result)).toBe(true);
  });
});
```

### 4. End-to-End Tests

**Purpose**: Validate complete user journeys and critical workflows.

**What to Test**:

- CLI argument parsing and configuration
- Complete prompt processing workflows
- Error handling across the entire system
- REPL interaction scenarios

**Usage**: Use sparingly due to cost and complexity.

```typescript
describe("End-to-End Workflow Tests", () => {
  it("should process a prompt through the entire pipeline", async () => {
    const services = createServiceContainer(testConfig);
    const rawPrompt = createRawPrompt("test prompt");

    const result =
      await services.promptProcessingService.processPrompt(rawPrompt);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.content).toBeDefined();
      expect(result.value.enhancements).toHaveLength(2);
    }
  });
});
```

## Coverage Requirements

### Thresholds (Enforced in CI)

Coverage requirements vary by architectural layer to reflect their importance and risk:

#### Core Business Logic (95%+ required)

```typescript
// vitest.config.ts
"src/core/promptProcessor.ts": {
  branches: 100,
  functions: 100,
  lines: 100,
  statements: 100,
},
"src/core/promptValidator.ts": {
  branches: 100,
  functions: 100,
  lines: 100,
  statements: 100,
},
```

**Why 100% for Core**: Core business logic contains the most critical functionality and is the most stable. High coverage ensures confidence in business rules.

#### Infrastructure Adapters (75%+ required)

```typescript
"src/adapters/": {
  branches: 75,
  functions: 90,
  lines: 75,
  statements: 75,
},
```

**Why Lower for Adapters**: Infrastructure adapters contain more error handling paths and external integration complexity. Focus on happy paths and critical error scenarios.

#### Global Minimum (80%+ required)

```typescript
global: {
  branches: 80,
  functions: 80,
  lines: 80,
  statements: 80,
},
```

### Coverage Enforcement

**Build Failure**: CI builds fail if coverage drops below thresholds:

```bash
pnpm test:coverage:ci  # Used in CI pipeline
```

**Local Development**: Check coverage during development:

```bash
pnpm test:coverage     # Local coverage report
pnpm coverage:report   # HTML and JSON reports
```

## Testing Patterns

### Result Type Testing

Always test both success and error paths with Result types:

```typescript
it("should handle validation errors", () => {
  const prompt = createRawPrompt(""); // Invalid empty prompt
  const result = validator.validate(prompt);

  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.error.code).toBe("EMPTY_PROMPT");
    expect(result.error.message).toContain("empty");
  }
});
```

### Test Data Management

#### Builders Pattern

Use fluent builders for complex test data:

```typescript
const prompt = TestDataBuilders.rawPrompt()
  .withContent("custom content")
  .withMetadata({ userId: "test-user" })
  .build();
```

#### Fixtures Pattern

Use fixtures for realistic test scenarios:

```typescript
import { edgeCasePrompts } from "test-utils/fixtures";

it("should handle unicode content", () => {
  const result = validator.validate(edgeCasePrompts.unicodePrompt);
  expect(isOk(result)).toBe(true);
});
```

#### Test Chains

Create related test data efficiently:

```typescript
const [raw, validated, enhanced] = createPromptChain("test content");
```

### Dependency Injection in Tests

#### Service Container Pattern

Use real service containers in integration tests:

```typescript
describe("Integration Tests", () => {
  let services: ServiceContainer;

  beforeEach(() => {
    services = createServiceContainer(testConfig);
  });

  it("should integrate services correctly", async () => {
    const result = await services.promptProcessingService.processPrompt(prompt);
    expect(isOk(result)).toBe(true);
  });
});
```

#### Test Implementations

Create test implementations for external boundaries:

```typescript
class TestGeminiAPIClient implements GeminiAPIClient {
  async generateContent(): Promise<Result<APIResponse, APIError>> {
    return success({
      content: "Generated content",
      model: "test-model",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      metadata: { timestamp: new Date(), duration: 100, finishReason: "stop" },
    });
  }
}
```

## Testing Tools

### Framework: Vitest

**Why Vitest**: Fast, TypeScript-native, excellent coverage reporting, compatible with modern Node.js.

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
```

### Configuration

#### Test Environment

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10000,
  },
});
```

#### Coverage Provider

```typescript
coverage: {
  provider: "v8",          // Fast native coverage
  reporter: ["text", "json", "html", "lcov"],
  all: true,               // Include all files
}
```

### Test Scripts

```bash
pnpm test              # Interactive test runner
pnpm test:watch        # Watch mode for development
pnpm test:coverage     # Run tests with coverage report
pnpm test:coverage:ci  # CI-optimized coverage run
```

## Common Testing Patterns

### Error Handling Testing

Test all error scenarios comprehensively:

```typescript
describe("Error Handling", () => {
  it("should handle network errors", async () => {
    const client = createFailingAPIClient();
    const result = await client.generateContent(prompt);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.details?.retryable).toBe(true);
    }
  });
});
```

### Async Operation Testing

Handle async operations properly:

```typescript
it("should process async operations", async () => {
  const promise = service.processPrompt(prompt);

  // Test that operation is pending
  expect(promise).toBeInstanceOf(Promise);

  // Test resolution
  const result = await promise;
  expect(isOk(result)).toBe(true);
});
```

### Progress and Lifecycle Testing

Test progress indicators and lifecycle hooks:

```typescript
it("should call lifecycle hooks", async () => {
  let startCalled = false;
  let completeCalled = false;

  const options = {
    lifecycle: {
      onStart: () => {
        startCalled = true;
      },
      onComplete: () => {
        completeCalled = true;
      },
    },
  };

  await client.generateContent(prompt, options);

  expect(startCalled).toBe(true);
  expect(completeCalled).toBe(true);
});
```

## Test Development Workflow

### Test-Driven Development (TDD)

For non-trivial features, follow TDD:

1. **Write Failing Test**: Define expected behavior

```typescript
it("should enhance prompt with context", () => {
  const prompt = createValidatedPrompt("simple prompt");
  const result = enhancer.enhance(prompt);

  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.value.enhancements).toContain("context_added");
  }
});
```

2. **Implement Minimum Code**: Make test pass
3. **Refactor**: Improve design while keeping tests green

### Development Commands

```bash
# Start development with tests
pnpm test:watch

# Run specific test file
pnpm test src/core/promptValidator.test.ts

# Debug test with inspector
pnpm test --inspect-brk

# Update test snapshots (if using)
pnpm test --update-snapshots
```

## Quality Gates

### Pre-commit Requirements

All commits must pass:

```bash
pnpm format      # Code formatting
pnpm lint        # Linting rules
pnpm typecheck   # TypeScript compilation
pnpm test        # All tests pass
```

### CI Pipeline Requirements

CI enforces comprehensive testing:

1. **Lint & Format Check**: Code style compliance
2. **Type Check**: TypeScript compilation without errors
3. **Unit Tests**: All unit tests pass
4. **Integration Tests**: Component collaboration works
5. **Coverage Check**: Thresholds met, no regression
6. **Build Validation**: Production build succeeds

## Anti-Patterns to Avoid

### ❌ Internal Mocking

```typescript
// ❌ Bad: Mocking internal collaborator
jest.mock("../core/promptValidator");
const mockValidator = jest.mocked(PromptValidator);
```

### ❌ Implementation Testing

```typescript
// ❌ Bad: Testing internal implementation
expect(validator.validateLength).toHaveBeenCalledWith(prompt.content);
```

### ❌ Brittle Assertions

```typescript
// ❌ Bad: Overly specific assertions
expect(result.value.validatedAt.getTime()).toBe(1234567890);
```

### ❌ Global State Dependencies

```typescript
// ❌ Bad: Tests depend on global state
process.env.TEST_MODE = "true"; // Affects other tests
```

## Best Practices

### ✅ Pure Function Testing

```typescript
// ✅ Good: Testing pure function behavior
const result = validator.validate(prompt);
expect(isOk(result)).toBe(true);
```

### ✅ Interface Contract Testing

```typescript
// ✅ Good: Testing interface contracts
expect(result.value).toHaveProperty("content");
expect(result.value).toHaveProperty("metadata");
```

### ✅ Error Scenario Coverage

```typescript
// ✅ Good: Comprehensive error testing
describe("Error Scenarios", () => {
  test.each([
    ["empty", ""],
    ["too long", "a".repeat(10000)],
    ["invalid chars", "prompt\x00with\x01control"],
  ])("should reject %s prompt", (description, content) => {
    const result = validator.validate(createRawPrompt(content));
    expect(isErr(result)).toBe(true);
  });
});
```

### ✅ Test Isolation

```typescript
// ✅ Good: Each test is independent
beforeEach(() => {
  services = createServiceContainer(testConfig);
});
```

## Maintenance and Evolution

### Adding New Tests

When adding new functionality:

1. **Start with tests** for core business logic
2. **Test error scenarios** comprehensively
3. **Use existing patterns** from similar components
4. **Update coverage thresholds** if appropriate

### Refactoring with Tests

Tests enable safe refactoring:

1. **Ensure high coverage** before refactoring
2. **Keep tests green** throughout refactoring
3. **Update tests only** if behavior actually changes
4. **Add tests** for new code paths

### Performance Considerations

Keep tests fast:

- **Unit tests**: < 10ms each
- **Integration tests**: < 100ms each
- **E2E tests**: < 5000ms each

**Slow test detection**:

```bash
pnpm test --reporter=verbose | grep "slow"
```

## Debugging Tests

### Common Debugging Techniques

1. **Isolate failing tests**:

```bash
pnpm test --run --reporter=verbose src/core/promptValidator.test.ts
```

2. **Use console.log strategically**:

```typescript
it("should debug this test", () => {
  console.log("Debug data:", { prompt, result });
  expect(result).toBeDefined();
});
```

3. **Use debugger with inspect**:

```bash
pnpm test --inspect-brk
```

4. **Test with coverage to find gaps**:

```bash
pnpm test:coverage --reporter=verbose
```

### Test Failure Analysis

When tests fail:

1. **Read the error message carefully**
2. **Check if it's a real bug or test issue**
3. **Verify test assumptions are still valid**
4. **Update tests if behavior intentionally changed**

---

This testing strategy should be followed consistently across the project. Regular review and updates ensure it remains aligned with the codebase evolution and development philosophy.
