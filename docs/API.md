# Core API Documentation

## Overview

This document details the core interfaces and types that define the business domain of **elevator**. These interfaces follow **hexagonal architecture** principles, where the core domain defines contracts that infrastructure adapters must implement.

The core APIs are designed around **explicit error handling**, **immutability**, and **pure functional programming** principles. Understanding the _why_ behind these design decisions is crucial for extending and maintaining the system.

## Design Philosophy

### Why These Interfaces Exist

1. **Separation of Concerns**: Core interfaces isolate business logic from infrastructure details
2. **Testability**: Pure interfaces enable comprehensive testing without external dependencies
3. **Flexibility**: Adapters can be swapped without affecting core logic
4. **Explicit Error Handling**: `Result<T, E>` pattern eliminates unexpected exceptions
5. **Type Safety**: Strong typing prevents entire categories of runtime errors

### Core Principles

- **Dependencies Point Inward**: Core defines interfaces, infrastructure implements them
- **Immutability by Default**: All data structures use `readonly` modifiers
- **Pure Functions**: Core logic has no side effects where possible
- **Result Types**: Explicit error handling with compile-time safety

## Core Domain APIs

### Result Type System

The foundation of all error handling in the application.

#### `Result<T, E>`

**Purpose**: Provides explicit, type-safe error handling without exceptions.

**Why This Design**: Traditional exception-based error handling creates unpredictable control flow and makes error scenarios invisible at compile time. The Result type makes all possible outcomes explicit.

```typescript
export type Result<T, E> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };
```

**Key Functions**:

- `success<T, E>(value: T): Result<T, E>` - Creates successful result
- `failure<T, E>(error: E): Result<T, E>` - Creates failed result
- `isOk<T, E>(result): boolean` - Type guard for success
- `isErr<T, E>(result): boolean` - Type guard for failure

**Usage Pattern**:

```typescript
const result = await someOperation();
if (isErr(result)) {
  // Handle error with full type safety
  console.error(result.error.message);
  return;
}
// TypeScript knows result.value is available here
console.log(result.value);
```

### Prompt Processing Pipeline

The core business logic is modeled as a series of immutable transformations.

#### Prompt Types

**Why These Types**: Each stage of processing has different guarantees and capabilities. Separate types prevent using unprocessed data where processed data is expected.

```typescript
RawPrompt → ValidatedPrompt → EnhancedPrompt → APIResponse
```

##### `RawPrompt`

**Purpose**: Represents user input before any validation or processing.

```typescript
export interface RawPrompt {
  readonly id: string;
  readonly content: string;
  readonly metadata: PromptMetadata;
}
```

**Design Rationale**: Captures user input exactly as received, maintaining traceability and enabling replay/debugging scenarios.

##### `ValidatedPrompt`

**Purpose**: Represents input that has passed security and format validation.

```typescript
export interface ValidatedPrompt {
  readonly id: string;
  readonly content: string;
  readonly metadata: PromptMetadata;
  readonly validatedAt: Date;
  readonly rules: readonly string[];
}
```

**Design Rationale**: Immutable proof that content is safe for further processing. The `rules` field provides audit trail of what validation was applied.

##### `EnhancedPrompt`

**Purpose**: Represents optimized content ready for API consumption.

```typescript
export interface EnhancedPrompt {
  readonly id: string;
  readonly content: string;
  readonly metadata: PromptMetadata;
  readonly originalContent: string;
  readonly enhancedAt: Date;
  readonly enhancements: readonly string[];
}
```

**Design Rationale**: Preserves original content for debugging while providing optimized version. Enhancement tracking enables analysis of what optimizations are effective.

#### Processing Services

##### `PromptValidator`

**Purpose**: Pure function interface for validating user input.

```typescript
export interface PromptValidator {
  validate(
    prompt: RawPrompt,
    options?: ProcessingOptions,
  ): Result<ValidatedPrompt, PromptValidationError>;
}
```

**Why Pure Functions**: Validation logic must be predictable and testable. Pure functions ensure consistent behavior regardless of when or how often they're called.

##### `PromptEnhancer`

**Purpose**: Pure function interface for optimizing prompts.

```typescript
export interface PromptEnhancer {
  enhance(
    prompt: ValidatedPrompt,
    options?: ProcessingOptions,
  ): Result<EnhancedPrompt, PromptProcessingError>;
}
```

**Design Rationale**: Enhancement logic is business logic that should be independent of any infrastructure concerns like APIs or configuration.

##### `PromptProcessingService`

**Purpose**: Orchestrates the complete processing pipeline.

```typescript
export interface PromptProcessingService {
  processPrompt(
    prompt: RawPrompt,
    options?: ProcessingOptions,
  ): Promise<Result<EnhancedPrompt, PromptError>>;
}
```

**Why Async**: While core logic is pure, the service coordinates between components and may involve async operations in implementations.

## Infrastructure Interfaces

### API Client Interface

#### `GeminiAPIClient`

**Purpose**: Abstracts external API communication as defined by the core domain.

**Why This Design**: The core domain defines what it needs from an API client, not how to implement it. This enables testing with fake implementations and switching providers without core changes.

```typescript
export interface GeminiAPIClient {
  generateContent(
    prompt: EnhancedPrompt,
    options?: APIRequestOptions,
  ): Promise<Result<APIResponse, APIError>>;

  generateStreamingContent(
    prompt: EnhancedPrompt,
    options?: APIRequestOptions,
  ): AsyncIterable<Result<APIStreamChunk, APIError>>;

  healthCheck(): Promise<Result<{ status: "healthy" }, APIError>>;
}
```

**Key Design Decisions**:

1. **Takes `EnhancedPrompt`**: Only accepts processed, validated content
2. **Returns `Result<T, E>`**: Explicit error handling with typed errors
3. **Streaming Support**: AsyncIterable enables real-time response processing
4. **Health Checking**: Enables startup validation and monitoring

#### `APIRequestOptions`

**Purpose**: Configuration for individual API requests.

```typescript
export interface APIRequestOptions {
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly timeout?: number;
  readonly stream?: boolean;
  readonly safetySettings?: Record<string, unknown>;
  readonly lifecycle?: {
    readonly onStart?: () => void | Promise<void>;
    readonly onComplete?: () => void | Promise<void>;
  };
}
```

**Design Rationale**:

- **Optional Properties**: Sensible defaults allow simple usage
- **Lifecycle Hooks**: Enable progress tracking and monitoring without coupling
- **Immutable**: Prevents accidental modification during processing

#### `APIResponse`

**Purpose**: Structured response from successful API calls.

```typescript
export interface APIResponse {
  readonly content: string;
  readonly model: string;
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly metadata: {
    readonly timestamp: Date;
    readonly duration: number;
    readonly finishReason: "stop" | "length" | "safety" | "other";
  };
}
```

**Why This Structure**: Provides all information needed for billing analysis, performance monitoring, and quality assessment while maintaining immutability.

### Output Formatting Interface

#### `OutputFormatter`

**Purpose**: Abstracts console output formatting as defined by the core domain.

**Why This Interface**: UI concerns must be separated from business logic. This enables different output formats (console, file, JSON) without changing core logic.

```typescript
export interface OutputFormatter {
  formatContent(
    content: string,
    options?: FormatOptions,
  ): Promise<Result<FormattedContent, FormatterError>>;
  formatError(
    error: unknown,
    options?: FormatOptions,
  ): Promise<Result<FormattedContent, FormatterError>>;
  createProgress(
    message: string,
    options?: FormatOptions,
  ): Promise<Result<ProgressIndicator, FormatterError>>;
  updateProgress(
    indicator: ProgressIndicator,
    update: Partial<ProgressIndicator>,
  ): Promise<Result<ProgressIndicator, FormatterError>>;
  completeProgress(
    indicator: ProgressIndicator,
  ): Promise<Result<void, FormatterError>>;
  formatStreamChunk(
    contentChunk: string,
    options?: FormatOptions,
  ): Promise<Result<FormattedContent, FormatterError>>;
}
```

**Key Design Decisions**:

1. **Async Methods**: Formatting might involve complex layout or network operations
2. **Progress Management**: Built-in support for long-running operations
3. **Streaming Optimization**: Special handling for real-time content display
4. **Error Formatting**: Consistent user experience for error display

#### `FormatOptions`

**Purpose**: Configuration for output formatting behavior.

```typescript
export interface FormatOptions {
  readonly enableStyling?: boolean;
  readonly mode?: "formatted" | "raw";
  readonly streaming?: boolean;
  readonly style?: {
    readonly accent?: string;
    readonly error?: string;
    readonly success?: string;
    readonly warning?: string;
  };
}
```

**Design Rationale**: Enables different output modes (raw for scripts, formatted for humans) while maintaining consistent interface.

### Logging Interface

#### `Logger`

**Purpose**: Structured logging with correlation tracking.

**Why This Design**: Observability is crucial for production systems. Structured logging enables automated analysis while correlation tracking enables request tracing.

```typescript
export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error, data?: Record<string, unknown>): void;
  child(additionalContext: Record<string, unknown>): Logger;
  getCorrelationId(): CorrelationId;
}
```

**Key Features**:

- **Structured Data**: All log methods accept additional context
- **Child Loggers**: Enable adding context while preserving correlation
- **Correlation Tracking**: Every log entry includes request tracking ID

#### `LoggerFactory`

**Purpose**: Creates properly configured logger instances.

```typescript
export interface LoggerFactory {
  createLogger(
    correlationId: CorrelationId,
    baseContext?: Record<string, unknown>,
  ): Logger;
  createRootLogger(baseContext?: Record<string, unknown>): Logger;
}
```

**Why Factory Pattern**: Ensures all loggers are properly configured with required context and correlation IDs.

## Error Handling System

### Unified Error Types

All errors in the system follow consistent patterns for predictable handling.

#### Error Categories

1. **Domain Errors**: `PromptValidationError`, `PromptProcessingError`
2. **Infrastructure Errors**: `APIError`, `FormatterError`
3. **Configuration Errors**: `ConfigurationError`
4. **Application Errors**: `REPLError`, `ApplicationError`

#### Common Error Structure

All errors follow this pattern for consistency:

```typescript
interface BaseError {
  readonly type: string; // Error category
  readonly code: string; // Specific error code
  readonly message: string; // Human-readable description
  readonly details?: Record<string, unknown>; // Additional context
}
```

**Why This Structure**:

- **Type Field**: Enables error categorization and routing
- **Code Field**: Allows programmatic error handling
- **Message Field**: Provides human-readable context
- **Details Field**: Captures additional debugging information

## Usage Examples

### Basic Error Handling Pattern

```typescript
const result = await promptProcessingService.processPrompt(rawPrompt);
if (isErr(result)) {
  if (isValidationError(result.error)) {
    // Handle validation-specific errors
    logger.warn("Validation failed", { error: result.error });
    return;
  }
  // Handle other processing errors
  logger.error("Processing failed", result.error);
  return;
}

// Success case - TypeScript guarantees result.value exists
const enhancedPrompt = result.value;
```

### Service Integration Pattern

```typescript
// Core defines what it needs
interface ServiceContainer {
  readonly promptProcessingService: PromptProcessingService;
  readonly apiClient: GeminiAPIClient;
  readonly formatter: OutputFormatter;
  readonly loggerFactory: LoggerFactory;
}

// Infrastructure provides implementations
const services = createServiceContainer(config);

// Business logic uses only interfaces
async function processUserInput(input: string): Promise<void> {
  const logger = services.loggerFactory.createRootLogger({
    operation: "user_input",
  });

  const rawPrompt = createRawPrompt(input);
  const result =
    await services.promptProcessingService.processPrompt(rawPrompt);

  if (isErr(result)) {
    const formatted = await services.formatter.formatError(result.error);
    if (isOk(formatted)) {
      console.log(formatted.value.text);
    }
    return;
  }

  // Continue with API call...
}
```

## Testing Strategies

### Core Logic Testing

Since core interfaces are pure functions, they're highly testable:

```typescript
describe("PromptValidator", () => {
  it("should validate prompt content", () => {
    const validator = new DefaultPromptValidator();
    const rawPrompt = createRawPrompt("test prompt");

    const result = validator.validate(rawPrompt);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.content).toBe("test prompt");
      expect(result.value.rules).toContain("length_check");
    }
  });
});
```

### Infrastructure Testing

Infrastructure adapters implement core interfaces and can be tested independently:

```typescript
describe("GoogleGeminiAdapter", () => {
  it("should implement GeminiAPIClient interface", async () => {
    const client = new GoogleGeminiAdapter(testConfig);
    const enhancedPrompt = createTestEnhancedPrompt();

    const result = await client.generateContent(enhancedPrompt);

    // Result type testing
    expect(typeof result.success).toBe("boolean");
    if (isOk(result)) {
      expect(result.value.content).toBeDefined();
      expect(result.value.usage).toBeDefined();
    }
  });
});
```

## Format Preservation System

### Overview

The format preservation system enables selective elevation of text content while preserving code blocks and other structured formatting. This ensures that technical content (code snippets, configuration files, etc.) remains intact during the prompt enhancement process.

### Why Format Preservation Exists

**Problem**: Traditional prompt elevation transforms all content, including code blocks, which can corrupt syntax and break functionality.

**Solution**: Detect formatted content (code blocks, quotes), preserve code segments unchanged, and only elevate plain text and quote content.

**Benefits**:

- Code blocks remain syntactically correct
- Technical examples are preserved exactly
- Only relevant content gets elevated
- Performance impact is minimal (<5% overhead)

### Core Format Detection Types

#### `FormattingInfo`

**Purpose**: Represents a detected formatting element in text.

````typescript
export interface FormattingInfo {
  /** The type of formatting detected */
  type: "codeblock" | "quote" | "plain";

  /** The marker that identifies this formatting (e.g., '```', '>', '') */
  marker: string;

  /** Programming language specified for code blocks (optional) */
  language?: string;

  /** The content inside the formatting markers */
  content: string;

  /** The complete original text including markers */
  originalText: string;

  /** Starting character index in the original text */
  startIndex: number;

  /** Ending character index in the original text */
  endIndex: number;
}
````

**Design Rationale**:

- **Type Field**: Determines processing strategy (preserve vs elevate)
- **Marker Field**: Enables accurate reconstruction of original formatting
- **Language Field**: Preserves syntax highlighting information
- **Index Fields**: Enable precise text segment extraction and reconstruction

#### `FormattedSegment`

**Purpose**: A text segment with associated formatting and optional elevated content.

```typescript
export interface FormattedSegment {
  /** Formatting information for this segment */
  formatting: FormattingInfo;

  /** Elevated version of the content (undefined for preserved segments) */
  elevated?: string;
}
```

**Design Rationale**: Separates formatting metadata from content transformation, enabling different processing strategies for different segment types.

### Format Detection Pipeline

The format preservation system uses a multi-stage pipeline:

```typescript
detectFormatting() → extractSegments() → elevateSegments() → reconstructText()
```

#### Format Detection Functions

##### `detectFormatting(text: string): FormattingInfo[]`

**Purpose**: Analyzes text and identifies all formatting elements.

**Detection Capabilities**:

- **Code Blocks**: Triple backtick blocks (`language...`)
- **Inline Code**: Single backtick segments (`code`)
- **Block Quotes**: Lines starting with > marker
- **Plain Text**: Unformatted content between other elements

**Why This Design**: Uses regex patterns optimized for common markdown-style formatting while maintaining accuracy and performance.

##### `extractSegments(text: string, formatting: FormattingInfo[]): FormattedSegment[]`

**Purpose**: Splits text into segments based on detected formatting boundaries.

**Key Features**:

- Preserves exact spacing and line breaks
- Handles overlapping and adjacent formatting
- Creates segments for both formatted and plain text regions

##### `elevateSegments(segments: FormattedSegment[]): Promise<FormattedSegment[]>`

**Purpose**: Selectively processes segments based on their type.

**Processing Strategy**:

- **Code Blocks**: Preserved unchanged (no API call)
- **Plain Text**: Elevated via API for enhancement
- **Quotes**: Elevated via API for enhancement
- **Parallel Processing**: Multiple segments elevated concurrently

**Error Handling**: If elevation fails for any segment, the original content is preserved to maintain system stability.

##### `reconstructText(segments: FormattedSegment[]): string`

**Purpose**: Reassembles processed segments back into complete text.

**Reconstruction Logic**:

- Uses `elevated` content when available
- Falls back to original `formatting.originalText` when preservation is needed
- Maintains exact spacing and formatting structure

### Integration with Prompt Elevation

#### `shouldUseFormatPreservation(text: string): boolean`

**Purpose**: Determines if text contains formatting that requires preservation.

```typescript
export function shouldUseFormatPreservation(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  const formatting = detectFormatting(text);
  return formatting.some((format) => format.type === "codeblock");
}
```

**Design Rationale**:

- Returns `true` only if code blocks are present (need preservation)
- Returns `false` for plain text or quotes-only (can use standard elevation)
- Enables fallback to simpler processing when format preservation isn't needed

#### Enhanced `elevatePrompt()` Function

The main elevation function now includes format preservation logic:

```typescript
export async function elevatePrompt(
  prompt: string,
  debug: boolean = false,
  raw: boolean = false,
): Promise<string>;
```

**Processing Flow**:

1. **Format Detection**: Check if `shouldUseFormatPreservation(prompt)` returns true
2. **Conditional Processing**:
   - **With Format Preservation**: Use 4-stage pipeline (detect → extract → elevate → reconstruct)
   - **Standard Processing**: Use original direct API elevation
3. **Error Handling**: Format preservation errors fall back to standard processing
4. **Performance Monitoring**: Both paths include structured logging and metrics

**Why This Design**: Maintains backward compatibility while adding advanced format preservation capabilities only when needed.

### Performance Characteristics

#### Overhead Analysis

Format preservation adds minimal performance overhead:

- **Detection Phase**: ~0.1ms for typical prompts
- **Segmentation**: ~0.05ms per formatting element
- **Parallel Elevation**: Concurrent API calls for non-code segments
- **Reconstruction**: ~0.02ms regardless of content size
- **Total Overhead**: <5% in typical usage, often faster due to reduced API calls

#### Memory Usage

Memory consumption remains reasonable even with large inputs:

- **Large Code Blocks** (1MB+): <100MB memory increase
- **Multiple Large Inputs**: <150MB total for sequential processing
- **Many Small Blocks** (100+ segments): <50MB memory increase
- **Garbage Collection**: Automatic cleanup after processing

#### Scalability

The system handles various input scales efficiently:

- **1000+ Line Code Blocks**: Preserved exactly, <30 second processing
- **Multiple Programming Languages**: JavaScript, Python, SQL, YAML, etc.
- **Complex Mixed Content**: Code + quotes + plain text in single input
- **Malformed Input**: Graceful degradation to standard processing

### Usage Examples

#### Basic Format Preservation

```typescript
const mixedContent = `
Optimize this function:

\`\`\`javascript
function processData(items) {
  return items.map(item => ({
    ...item,
    processed: true
  }));
}
\`\`\`

This needs performance improvements.
`;

// Automatically uses format preservation
const result = await elevatePrompt(mixedContent);

// Code block is preserved exactly, surrounding text is elevated
console.log(result);
// Output preserves the JavaScript function while enhancing the description
```

#### Programmatic Detection

```typescript
// Check if format preservation is needed
if (shouldUseFormatPreservation(userInput)) {
  console.log("Using format preservation pipeline");
} else {
  console.log("Using standard elevation");
}

// Manual pipeline usage for advanced scenarios
const formatting = detectFormatting(text);
const segments = extractSegments(text, formatting);
const elevated = await elevateSegments(segments);
const result = reconstructText(elevated);
```

#### Debug Mode Integration

```typescript
// Enable debug logging to trace format preservation
const result = await elevatePrompt(complexInput, true); // debug=true

// Console will show:
// - Format detection results
// - Segmentation strategy
// - Elevation decisions for each segment
// - Performance metrics
```

### Error Handling Patterns

#### Graceful Degradation

```typescript
try {
  // Attempt format preservation
  const result = useFormatPreservationPipeline(input);
  return result;
} catch (error) {
  logger.warn("Format preservation failed, using fallback", { error });
  // Fall back to standard processing
  return useStandardElevation(input);
}
```

#### Segment-Level Error Recovery

```typescript
// If individual segment elevation fails, preserve original
const processedSegments = await Promise.all(
  segments.map(async (segment) => {
    try {
      return await elevateSegment(segment);
    } catch (error) {
      logger.warn("Segment elevation failed, preserving original", { error });
      return segment; // Return unchanged
    }
  }),
);
```

### Testing Strategies

#### Format Detection Testing

````typescript
describe("Format Detection", () => {
  it("should detect code blocks with language specifiers", () => {
    const text = "```typescript\ninterface User { name: string; }\n```";
    const formatting = detectFormatting(text);

    expect(formatting).toHaveLength(1);
    expect(formatting[0].type).toBe("codeblock");
    expect(formatting[0].language).toBe("typescript");
    expect(formatting[0].content).toBe("interface User { name: string; }");
  });
});
````

#### Integration Testing

```typescript
describe("Format Preservation Integration", () => {
  it("should preserve code while elevating descriptions", async () => {
    const input = `Fix this: \`\`\`js\nconsole.log("test");\n\`\`\``;
    const result = await elevatePrompt(input);

    expect(result).toContain('console.log("test");'); // Code preserved
    expect(result.length).toBeGreaterThan(input.length); // Description elevated
  });
});
```

### Configuration and Customization

#### Format Detection Configuration

The system supports customization of format detection patterns:

````typescript
// Custom regex patterns for specialized formats
const customDetectors = {
  codeBlocks: /```([a-zA-Z0-9+\-]*)\n([\s\S]*?)\n```/g,
  inlineCode: /`([^`\n]+)`/g,
  quotes: /^>\s*(.*)$/gm,
};
````

#### Processing Options

Format preservation behavior can be configured:

```typescript
interface FormatPreservationOptions {
  preserveCodeBlocks: boolean; // Default: true
  elevateQuotes: boolean; // Default: true
  parallelProcessing: boolean; // Default: true
  maxConcurrentElevations: number; // Default: 10
}
```

## Extension Guidelines

### Adding New Interfaces

1. **Define in Core First**: Always start with core domain interface
2. **Follow Result Pattern**: Use `Result<T, E>` for operations that can fail
3. **Use Immutable Types**: All properties should be `readonly`
4. **Document Why**: Explain the purpose and design decisions

### Implementation Requirements

1. **Implement Core Interfaces**: Infrastructure must satisfy core contracts
2. **Handle All Error Cases**: Every possible failure should be represented
3. **Maintain Immutability**: Never modify input parameters
4. **Use Dependency Injection**: Accept dependencies via constructor

## Migration and Evolution

### Interface Versioning

When evolving interfaces:

1. **Add Optional Properties**: Extend existing interfaces safely
2. **Create New Interfaces**: For breaking changes, define new interfaces
3. **Deprecate Gradually**: Mark old interfaces as deprecated before removal
4. **Maintain Compatibility**: Ensure adapters can support multiple versions

### Backward Compatibility

The core interfaces are designed for stability:

- Adding optional properties is safe
- Adding new methods with default implementations is safe
- Changing method signatures requires new interface versions
- Removing methods requires deprecation cycle

---

This API documentation should be updated as interfaces evolve. The focus should remain on explaining _why_ these interfaces exist and how they support the overall architecture, not just documenting what methods are available.
