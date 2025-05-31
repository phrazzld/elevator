# Implementation Plan: Google Generative AI Client Adapter

## Overview

Implement an adapter that bridges our domain's GeminiAPIClient interface with Google's Generative AI SDK.

## Implementation Steps

### 1. Install Dependencies

- Add @google/generative-ai to package.json
- Add @types/google.generative-ai if available (or use SDK's built-in types)

### 2. Create Adapter Structure (`src/adapters/geminiClient.ts`)

```typescript
export class GoogleGeminiAdapter implements GeminiAPIClient {
  private client: GenerativeModel;

  constructor(config: ApiConfig) {
    // Initialize Google SDK
  }

  async generateContent(...): Promise<Result<APIResponse, APIError>>
  async *generateStreamingContent(...): AsyncIterable<Result<APIStreamChunk, APIError>>
  async healthCheck(): Promise<Result<{ status: "healthy" }, APIError>>
}
```

### 3. Error Mapping Strategy

Create comprehensive error mapping:

- Network errors → NETWORK_ERROR
- Authentication errors → AUTHENTICATION_FAILED
- Rate limit errors → RATE_LIMITED
- Safety blocks → CONTENT_FILTERED
- Model not found → MODEL_NOT_FOUND
- Generic errors → SERVER_ERROR or UNKNOWN_ERROR

### 4. Response Mapping

Map SDK responses to our domain types:

- Extract text content from candidates
- Calculate token usage from SDK metadata
- Map finish reasons
- Track request duration

### 5. Streaming Implementation

- Wrap SDK's streaming API in async generator
- Yield chunks as they arrive
- Include usage stats in final chunk
- Handle stream errors gracefully

### 6. Test Strategy

- Mock Google SDK at import level
- Test all error mapping scenarios
- Test streaming behavior
- Test configuration mapping
- Verify health check functionality

## Test Plan

### Unit Tests (`src/adapters/geminiClient.test.ts`)

1. **Happy Path Tests**

   - Successful content generation
   - Successful streaming generation
   - Health check success

2. **Error Scenario Tests**

   - Network failures
   - Authentication errors
   - Rate limiting
   - Safety blocks
   - Invalid model
   - Timeout handling

3. **Configuration Tests**

   - API key configuration
   - Model selection
   - Temperature settings
   - Custom safety settings

4. **Streaming Tests**
   - Multiple chunks
   - Error during streaming
   - Empty streams
   - Usage stats in final chunk

## Risk Mitigation

- **SDK Changes**: Abstract SDK usage to minimize impact
- **Type Safety**: Use TypeScript strict mode throughout
- **Error Handling**: Comprehensive error mapping with fallbacks
- **Testing**: Mock external SDK completely

## Expected File Changes

- `package.json` - Add @google/generative-ai dependency
- `src/adapters/geminiClient.ts` - New adapter implementation
- `src/adapters/geminiClient.test.ts` - Comprehensive tests

## Success Criteria

- All GeminiAPIClient methods implemented
- 100% test coverage for adapter
- Comprehensive error mapping
- Type-safe throughout
- All tests passing
- No linting errors
