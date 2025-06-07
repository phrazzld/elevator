# Architecture Documentation

## Overview

The **prompt-elevator** CLI is built using **hexagonal architecture** (also known as ports and adapters pattern) with strict adherence to the **dependency inversion principle**. This architectural approach ensures that the core business logic remains pure, testable, and completely independent of external concerns like APIs, databases, or user interfaces.

The architecture prioritizes **simplicity**, **modularity**, and **testability** while maintaining clear separation between domain logic and infrastructure concerns.

## Core Architectural Patterns

### 1. Hexagonal Architecture (Ports & Adapters)

**Decision**: Implement hexagonal architecture to achieve complete separation of concerns.

**Rationale**:

- Enables testing of core logic without external dependencies
- Allows swapping implementations without affecting core logic
- Makes the system more maintainable and adaptable to change
- Follows the development philosophy of strict separation of concerns

**Implementation**:

```
src/core/           # Core domain logic (ports)
src/adapters/       # Infrastructure implementations (adapters)
src/infrastructure/ # Cross-cutting infrastructure services
```

### 2. Dependency Inversion Principle

**Decision**: All dependencies point inward toward the core domain.

**Rationale**:

- Core logic defines interfaces for its needs
- Infrastructure implements these core-defined interfaces
- Configuration and external concerns are injected into infrastructure only
- Supports testability and modularity principles

**Implementation**:

- Core interfaces: `src/core/apiClient.ts`, `src/core/formatter.ts`, `src/core/logger.ts`
- Adapter implementations: `src/adapters/geminiClient.ts`, `src/adapters/consoleFormatter.ts`
- Dependency injection: `src/dependencyInjection.ts`

### 3. Pure Functions and Immutability

**Decision**: Implement core logic as pure functions with immutable data structures.

**Rationale**:

- Predictable behavior and easier reasoning
- Enhanced testability without complex setup
- Thread safety and reduced debugging complexity
- Aligns with functional programming principles in TypeScript

**Implementation**:

- All core interfaces use `readonly` modifiers
- Data transformation through pure functions
- Result type for explicit error handling
- Immutable update patterns throughout

### 4. Feature-Based Organization

**Decision**: Organize code by business capabilities rather than technical layers.

**Rationale**:

- High cohesion within feature modules
- Easier to understand and modify related functionality
- Facilitates potential future modularization
- Reduces cognitive overhead when working on features

**Implementation**:

```
src/
├── core/           # Core domain logic
├── adapters/       # External system adapters
├── repl/          # REPL functionality
├── infrastructure/ # Cross-cutting concerns
└── test-utils/    # Test infrastructure
```

## Directory Structure and Design Decisions

### Core Domain (`src/core/`)

**Purpose**: Contains pure business logic and domain interfaces.

**Key Files**:

- `promptProcessor.ts` - Core domain types and interfaces
- `promptValidator.ts` - Input validation logic (pure functions)
- `promptEnhancer.ts` - Prompt optimization logic (pure functions)
- `promptProcessingService.ts` - Orchestration service
- `apiClient.ts` - API abstraction interface
- `errors.ts` - Domain error types and handling
- `security.ts` - Security validation logic

**Constraints**:

- No imports from `adapters/` or `infrastructure/`
- All functions are pure where possible
- All data structures are immutable
- Uses only interfaces and types for external dependencies

### Infrastructure Adapters (`src/adapters/`)

**Purpose**: Implements core interfaces using external libraries and APIs.

**Key Files**:

- `geminiClient.ts` - Google Generative AI SDK implementation
- `consoleFormatter.ts` - Console output formatting
- `apiProgressAdapter.ts` - API progress tracking

**Constraints**:

- Implements interfaces defined in `core/`
- Contains all external library dependencies
- Handles all infrastructure-specific concerns
- Configuration is injected via constructor

### Infrastructure Services (`src/infrastructure/`)

**Purpose**: Cross-cutting infrastructure concerns.

**Key Files**:

- `pinoLogger.ts` - Structured logging implementation

**Design**:

- Implements core logging interfaces
- Provides factory pattern for logger creation
- Handles configuration and context propagation

### Test Infrastructure (`src/test-utils/`)

**Purpose**: Comprehensive testing support following no-internal-mocking principle.

**Design**:

- **Builders** (`builders/`) - Test data creation with fluent interfaces
- **Fixtures** (`fixtures/`) - Realistic test data for various scenarios
- **DI Helpers** (`diHelpers.ts`) - Dependency injection utilities for tests

**Philosophy**: Mock only true external system boundaries, never internal collaborators.

## Key Design Decisions

### 1. Explicit Error Handling with Result Types

**Decision**: Use `Result<T, E>` types instead of throwing exceptions.

**Rationale**:

- Makes error paths explicit and compile-time checked
- Eliminates unexpected exceptions
- Improves API predictability
- Better composability of operations

**Implementation**:

```typescript
export type Result<T, E> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };
```

### 2. Configuration Isolation

**Decision**: Configuration is injected only into infrastructure adapters.

**Rationale**:

- Core logic remains environment-agnostic
- Configuration changes don't affect business logic
- Easier testing with different configurations
- Clear separation of concerns

**Implementation**:

- `config.ts` - Pure configuration factory
- Configuration injected via dependency injection
- Core services receive only necessary dependencies

### 3. Manual Dependency Injection

**Decision**: Use manual constructor injection rather than a DI framework.

**Rationale**:

- Simplicity and explicitness
- Better TypeScript integration
- Easier debugging and understanding
- No additional framework dependencies

**Implementation**:

- `dependencyInjection.ts` - Service container factory
- Constructor injection for all dependencies
- Clear service lifetime management

### 4. Comprehensive Testing Strategy

**Decision**: Implement multiple testing layers with no internal mocking.

**Rationale**:

- High confidence in system behavior
- Integration tests verify component collaboration
- Unit tests focus on pure business logic
- No brittle internal mocks that break on refactoring

**Implementation**:

- Unit tests for pure functions
- Integration tests for workflows
- E2E tests for complete scenarios
- Test builders and fixtures for realistic data

## Core Abstractions

### Prompt Processing Pipeline

The core domain models prompt processing as a series of transformations:

```
RawPrompt → ValidatedPrompt → EnhancedPrompt → APIResponse
```

Each stage is pure and testable:

- **Validation**: Security and format checks
- **Enhancement**: Optimization for API performance
- **API Communication**: External service integration

### Service Container Pattern

**Purpose**: Centralized service creation and dependency wiring.

**Benefits**:

- Single location for dependency configuration
- Clear service dependencies
- Easier testing with service substitution
- Type-safe service access

### Result Type Pattern

**Purpose**: Explicit error handling without exceptions.

**Benefits**:

- Compile-time error path checking
- Predictable API behavior
- Better error context propagation
- Functional programming compatibility

## Data Flow

### 1. CLI Entry Point

```
CLI Arguments → Configuration → Service Container → Application Logic
```

### 2. Prompt Processing Flow

```
User Input → Validation → Enhancement → API Call → Response Formatting → Output
```

### 3. Error Handling Flow

```
Error → Domain Error Type → User-Friendly Error → Formatted Output
```

### 4. Logging Flow

```
Operation → Contextual Logger → Structured Log → JSON Output
```

## Testing Architecture

### No Internal Mocking Principle

**Policy**: Mock only true external system boundaries, never internal collaborators.

**Rationale**:

- Tests remain valid during refactoring
- Better reflection of production behavior
- Encourages better design through dependency injection
- Higher confidence in integration behavior

### Test Data Management

**Builders Pattern**: Fluent interfaces for creating test data

```typescript
const prompt = promptBuilder()
  .withContent("test prompt")
  .withMetadata({ category: "test" })
  .build();
```

**Fixtures Pattern**: Realistic test data for various scenarios

```typescript
export const edgeCasePrompts = {
  emptyPrompt: "",
  maxLengthPrompt: "a".repeat(MAX_PROMPT_LENGTH),
  unicodePrompt: "测试 prompt with émojis 🚀",
};
```

### Test Organization

- **Co-located tests**: `*.test.ts` files alongside source
- **Test utilities**: Centralized in `test-utils/`
- **Coverage requirements**: 85% overall, 95% for core logic
- **Test types**: Unit, integration, and E2E tests

## Security Architecture

### Input Validation

**Principle**: Validate all external input at system boundaries.

**Implementation**:

- Security validation in `core/security.ts`
- API key validation at startup
- Input sanitization before processing
- Content safety filtering

### Secret Management

**Principle**: Never hardcode secrets, use environment variables.

**Implementation**:

- API keys only via environment variables
- Configuration validation at startup
- No secrets in logs or error messages

## Future Considerations

### Extensibility

The architecture supports future extensions:

- **New AI Providers**: Implement `GeminiAPIClient` interface
- **Additional Output Formats**: Implement `OutputFormatter` interface
- **Enhanced Processing**: Add new steps to the prompt pipeline
- **Background Processing**: Add async processing capabilities

### Modularization

The feature-based organization supports:

- **Package Extraction**: Individual features can become packages
- **Microservice Migration**: Clear boundaries for service extraction
- **Plugin Architecture**: Interface-based design enables plugins

### Performance Optimization

The clean architecture enables:

- **Caching Layers**: Add caching without affecting core logic
- **Streaming Optimizations**: Enhance streaming without core changes
- **Monitoring Integration**: Add observability without core modifications

## Development Workflow

### Adding New Features

1. **Define Core Interfaces**: Add abstractions in `core/`
2. **Implement Pure Logic**: Add business logic as pure functions
3. **Create Adapters**: Implement infrastructure concerns
4. **Wire Dependencies**: Update dependency injection
5. **Add Tests**: Unit, integration, and E2E tests
6. **Update Documentation**: Keep architecture docs current

### Refactoring Guidelines

1. **Preserve Interfaces**: Maintain public API contracts
2. **Test First**: Ensure tests pass before and after
3. **Core Isolation**: Keep core logic independent
4. **Dependencies Inward**: Maintain dependency direction

### Code Review Focus

1. **Separation of Concerns**: Core vs. infrastructure
2. **Dependency Direction**: Inward-pointing dependencies
3. **Error Handling**: Explicit Result types
4. **Testing Coverage**: Comprehensive test scenarios
5. **Documentation**: Architecture decision updates

---

This architecture documentation should be updated as the system evolves. The architectural decisions documented here support the development philosophy of building simple, modular, testable, and maintainable software.
