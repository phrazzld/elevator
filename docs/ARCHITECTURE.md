# Architecture Documentation

## Overview

The **elevator** CLI is built using a **radically simplified architecture** that prioritizes **directness**, **maintainability**, and **minimal complexity**. This approach eliminates layers of abstraction in favor of straightforward, explicit code that is easy to understand, debug, and extend.

The architecture embodies the principle that **simple solutions are often the best solutions**, especially for focused tools with well-defined boundaries.

## Architectural Philosophy: Radical Simplification

### Core Principle

**Direct function calls over complex patterns.**

The elevator CLI intentionally avoids enterprise patterns like hexagonal architecture, dependency injection, and complex abstraction layers. Instead, it uses:

- **Direct API calls** using native `fetch()`
- **Standard async/await** with try/catch error handling
- **Explicit imports** instead of dependency injection
- **Minimal file structure** focused on essential functionality

### Rationale for Simplification

This architecture represents a deliberate shift from complex enterprise patterns to pragmatic simplicity:

**Why we simplified:**

1. **Reduced Cognitive Overhead**: No need to understand ports, adapters, or dependency injection containers
2. **Faster Development**: Direct function calls eliminate boilerplate and ceremony
3. **Easier Debugging**: Explicit call stacks with no indirection layers
4. **Lower Maintenance**: Fewer abstractions mean fewer things that can break
5. **Clearer Intent**: Code directly expresses what it does without abstraction

**What we eliminated:**

- ❌ Hexagonal architecture (ports & adapters)
- ❌ Dependency injection containers
- ❌ Result type abstractions
- ❌ Complex service layers
- ❌ Infrastructure adapters
- ❌ 800+ lines of abstraction code

**What we gained:**

- ✅ Direct, readable code flow
- ✅ Standard JavaScript patterns
- ✅ Minimal learning curve
- ✅ Faster builds and tests
- ✅ Easier onboarding

## Current Architecture

### Directory Structure

```
src/
├── api.ts    # Direct API integration with Google Gemini
└── cli.ts    # Command-line interface and main entry point
```

**Total complexity**: ~200 lines of code (down from 1000+)

### Core Components

#### 1. API Layer (`src/api.ts`)

**Purpose**: Direct integration with Google Gemini API using native fetch.

**Key Features**:

- Environment-based configuration (`GEMINI_API_KEY`)
- 30-second request timeout with `AbortController`
- Structured JSON logging for observability
- Comprehensive error handling with descriptive messages
- No external SDK dependencies

**Interface**:

```typescript
export async function elevatePrompt(prompt: string): Promise<string>;
```

#### 2. CLI Layer (`src/cli.ts`)

**Purpose**: Command-line interface using Commander.js.

**Key Features**:

- Direct import of `elevatePrompt` function
- Simple argument parsing for `<prompt>` and `--raw` flag
- Error handling with user-friendly messages
- Environment validation (API key presence)

**Architecture Pattern**: Direct function call

```typescript
import { elevatePrompt } from "./api.js";

// Direct usage
const result = await elevatePrompt(prompt);
```

## Data Flow

### Simple Linear Flow

```
CLI Input → Direct Function Call → API Request → Response Output
```

**Detailed Flow**:

1. **CLI Entry** (`src/cli.ts`):

   - Parse command-line arguments
   - Validate environment (API key)
   - Call `elevatePrompt()` directly

2. **API Processing** (`src/api.ts`):

   - Build request payload
   - Make HTTP request with `fetch()`
   - Parse and validate response
   - Return result string

3. **Output Formatting**:
   - Raw output (`--raw` flag) or formatted output
   - Error messages for failures

### Error Handling Flow

```
Error Occurrence → Standard Exception → User-Friendly Message → Exit
```

**Philosophy**: Use standard JavaScript error handling (`try/catch`) rather than custom Result types.

## Design Decisions

### 1. Native Fetch Over SDK

**Decision**: Use native `fetch()` instead of Google AI SDK.

**Rationale**:

- **Reduced Dependencies**: No external SDK to manage or update
- **Full Control**: Direct control over request/response handling
- **Transparency**: Clear visibility into API interactions
- **Simplicity**: Standard web API patterns

**Implementation**:

```typescript
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(30000),
});
```

### 2. Environment-Based Configuration

**Decision**: Use environment variables for all configuration.

**Rationale**:

- **Security**: No hardcoded secrets
- **Simplicity**: No complex configuration system needed
- **Standard Practice**: Follow twelve-factor app principles
- **Container-Friendly**: Works seamlessly in containerized environments

**Implementation**:

```typescript
const apiKey = process.env["GEMINI_API_KEY"];
if (!apiKey) {
  // Clear error message with setup instructions
}
```

### 3. Direct Imports

**Decision**: Use direct imports instead of dependency injection.

**Rationale**:

- **Explicit Dependencies**: Clear what each module depends on
- **IDE Support**: Full TypeScript autocomplete and refactoring
- **No Magic**: No hidden service resolution or container complexity
- **Standard JavaScript**: Uses native module system

**Implementation**:

```typescript
import { elevatePrompt } from "./api.js";
```

### 4. Standard Error Handling

**Decision**: Use async/await with try/catch instead of Result types.

**Rationale**:

- **Familiar Patterns**: Standard JavaScript error handling
- **Less Ceremony**: No custom type constructors or unwrapping
- **Ecosystem Compatibility**: Works with all standard libraries
- **Simpler Testing**: Standard exception-based test patterns

**Implementation**:

```typescript
try {
  const result = await elevatePrompt(prompt);
  console.log(result);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
```

## Testing Strategy

### Integration-First Testing

**Philosophy**: Test the complete behavior rather than isolated units.

**Test Structure**:

- **`test/api.integration.test.ts`**: Tests direct API calls with real endpoints
- **`test/cli.integration.test.ts`**: Tests CLI execution as subprocess

**Benefits**:

- **High Confidence**: Tests actual behavior users experience
- **Refactoring Safety**: Tests survive architectural changes
- **Simple Setup**: No complex mocking infrastructure

### Realistic Test Data

**Approach**: Use real prompts and validate actual API responses.

**Example**:

```typescript
test("processes real prompt successfully", async () => {
  const result = await elevatePrompt("explain REST APIs simply");
  expect(result).toBeTruthy();
  expect(typeof result).toBe("string");
});
```

## Deployment and Operations

### Build Process

**Simple TypeScript compilation**:

```bash
pnpm build  # tsc compilation
```

**Output**: Standard JavaScript in `dist/` directory

### Runtime Requirements

**Minimal dependencies**:

- Node.js 18+
- Environment variable: `GEMINI_API_KEY`

### Monitoring

**Structured logging** with correlation IDs:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "correlation_id": "abc-123",
  "message": "API request started",
  "duration_ms": 1250
}
```

## Future Considerations

### When to Add Complexity

**Add abstractions only when**:

1. **Multiple API providers** require standardization
2. **Advanced caching** needs become critical
3. **Plugin architecture** is explicitly required
4. **Background processing** becomes necessary

### Scaling Strategy

**Horizontal scaling approach**:

1. **Keep CLI simple** - scale through multiple instances
2. **Add API gateway** if load requires it
3. **Extract services** only when boundaries are clear
4. **Maintain simplicity** as the default choice

### Extension Points

**Current architecture supports**:

- **New output formats**: Extend CLI option handling
- **Additional APIs**: Add new functions in `api.ts`
- **Enhanced logging**: Modify logging statements
- **Configuration options**: Add environment variables

## Comparison: Before vs. After

### Complexity Metrics

| Metric             | Before (Hexagonal) | After (Simplified) | Improvement   |
| ------------------ | ------------------ | ------------------ | ------------- |
| Lines of Code      | ~1000              | ~200               | 80% reduction |
| File Count         | 15+ files          | 2 core files       | 87% reduction |
| Dependencies       | 8+ packages        | 2 packages         | 75% reduction |
| Abstraction Layers | 4 layers           | 1 layer            | Direct calls  |
| Build Time         | ~8 seconds         | ~2 seconds         | 75% faster    |

### Maintainability Benefits

**Before**: Understanding the codebase required knowledge of:

- Hexagonal architecture patterns
- Dependency injection containers
- Custom Result type handling
- Port/adapter abstractions
- Service layer orchestration

**After**: Understanding requires knowledge of:

- Standard async/await patterns
- Basic HTTP requests with fetch
- Command-line argument parsing
- Standard error handling

## Development Workflow

### Adding Features

1. **API Changes**: Modify `src/api.ts` directly
2. **CLI Changes**: Update `src/cli.ts` directly
3. **Testing**: Add integration tests
4. **Documentation**: Update this file if architectural decisions change

### Code Review Focus

1. **Directness**: Prefer explicit over implicit
2. **Simplicity**: Avoid unnecessary abstractions
3. **Standard Patterns**: Use familiar JavaScript patterns
4. **Clear Errors**: Provide helpful error messages
5. **Documentation**: Keep this architecture doc current

---

This architecture documentation reflects the current simplified implementation. The architectural decisions documented here support the development philosophy of building **simple, direct, and maintainable software** that solves real problems without unnecessary complexity.
