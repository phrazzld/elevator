/**
 * Test data builders for API-related types.
 *
 * These builders provide fluent APIs for creating API response, error, and request objects
 * with sensible defaults and easy customization for testing different API scenarios.
 */

import type {
  APIResponse,
  APIError,
  APIStreamChunk,
  APIRequestOptions,
  APIErrorCode,
} from "../../core/apiClient";

/**
 * Builder for APIResponse objects.
 */
export class APIResponseBuilder {
  private content = "This is a generated response from the test API.";
  private model = "gemini-2.5-flash-preview-05-20";
  private usage = {
    promptTokens: 15,
    completionTokens: 25,
    totalTokens: 40,
  };
  private metadata: APIResponse["metadata"] = {
    timestamp: new Date("2024-01-01T12:00:00.000Z"),
    duration: 1500,
    finishReason: "stop",
  };

  withContent(content: string): this {
    this.content = content;
    return this;
  }

  withModel(model: string): this {
    this.model = model;
    return this;
  }

  withUsage(usage: APIResponse["usage"]): this {
    this.usage = usage;
    return this;
  }

  withPromptTokens(promptTokens: number): this {
    this.usage = {
      ...this.usage,
      promptTokens,
      totalTokens: promptTokens + this.usage.completionTokens,
    };
    return this;
  }

  withCompletionTokens(completionTokens: number): this {
    this.usage = {
      ...this.usage,
      completionTokens,
      totalTokens: this.usage.promptTokens + completionTokens,
    };
    return this;
  }

  withMetadata(metadata: APIResponse["metadata"]): this {
    this.metadata = metadata;
    return this;
  }

  withTimestamp(timestamp: Date): this {
    this.metadata = { ...this.metadata, timestamp };
    return this;
  }

  withDuration(duration: number): this {
    this.metadata = { ...this.metadata, duration };
    return this;
  }

  withFinishReason(
    finishReason: APIResponse["metadata"]["finishReason"],
  ): this {
    this.metadata = { ...this.metadata, finishReason };
    return this;
  }

  withCurrentTimestamp(): this {
    this.metadata = { ...this.metadata, timestamp: new Date() };
    return this;
  }

  withFastResponse(): this {
    this.metadata = { ...this.metadata, duration: 500 };
    return this;
  }

  withSlowResponse(): this {
    this.metadata = { ...this.metadata, duration: 5000 };
    return this;
  }

  withLargeUsage(): this {
    this.usage = {
      promptTokens: 500,
      completionTokens: 1000,
      totalTokens: 1500,
    };
    return this;
  }

  withMinimalUsage(): this {
    this.usage = {
      promptTokens: 5,
      completionTokens: 10,
      totalTokens: 15,
    };
    return this;
  }

  withLengthLimit(): this {
    this.metadata = { ...this.metadata, finishReason: "length" };
    return this;
  }

  withSafetyFilter(): this {
    this.metadata = { ...this.metadata, finishReason: "safety" };
    return this;
  }

  build(): APIResponse {
    return {
      content: this.content,
      model: this.model,
      usage: this.usage,
      metadata: this.metadata,
    };
  }
}

/**
 * Builder for APIError objects.
 */
export class APIErrorBuilder {
  private code: APIErrorCode = "UNKNOWN_ERROR";
  private message = "An unknown API error occurred";
  private details?: APIError["details"];

  withCode(code: APIErrorCode): this {
    this.code = code;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withDetails(details: APIError["details"]): this {
    this.details = details;
    return this;
  }

  withStatusCode(statusCode: number): this {
    this.details = { ...this.details, statusCode };
    return this;
  }

  withRetryAfter(retryAfter: number): this {
    this.details = { ...this.details, retryAfter };
    return this;
  }

  withRetryable(retryable: boolean): this {
    this.details = { ...this.details, retryable };
    return this;
  }

  withOriginalError(originalError: Record<string, unknown>): this {
    this.details = { ...this.details, originalError };
    return this;
  }

  asNetworkError(): this {
    this.code = "NETWORK_ERROR";
    this.message = "Network connection failed";
    this.details = { retryable: true };
    return this;
  }

  asTimeoutError(): this {
    this.code = "TIMEOUT";
    this.message = "Request timed out";
    this.details = { retryable: true };
    return this;
  }

  asRateLimitError(): this {
    this.code = "RATE_LIMITED";
    this.message = "Rate limit exceeded";
    this.details = { retryable: true, retryAfter: 60000, statusCode: 429 };
    return this;
  }

  asAuthenticationError(): this {
    this.code = "AUTHENTICATION_FAILED";
    this.message = "Invalid API key";
    this.details = { retryable: false, statusCode: 401 };
    return this;
  }

  asQuotaExceededError(): this {
    this.code = "QUOTA_EXCEEDED";
    this.message = "API quota exceeded";
    this.details = { retryable: false, statusCode: 429 };
    return this;
  }

  asServerError(): this {
    this.code = "SERVER_ERROR";
    this.message = "Internal server error";
    this.details = { retryable: true, statusCode: 500 };
    return this;
  }

  asContentFilterError(): this {
    this.code = "CONTENT_FILTERED";
    this.message = "Content was filtered by safety policies";
    this.details = { retryable: false, statusCode: 400 };
    return this;
  }

  asInvalidRequestError(): this {
    this.code = "INVALID_REQUEST";
    this.message = "Invalid request parameters";
    this.details = { retryable: false, statusCode: 400 };
    return this;
  }

  build(): APIError {
    const error: APIError = {
      type: "api",
      code: this.code,
      message: this.message,
    };

    if (this.details !== undefined) {
      (error as { details: APIError["details"] }).details = this.details;
    }

    return error;
  }
}

/**
 * Builder for APIStreamChunk objects.
 */
export class APIStreamChunkBuilder {
  private content = "Partial response content ";
  private done = false;
  private usage?: APIResponse["usage"];
  private metadata?: APIResponse["metadata"];

  withContent(content: string): this {
    this.content = content;
    return this;
  }

  withDone(done: boolean): this {
    this.done = done;
    return this;
  }

  withUsage(usage: APIResponse["usage"]): this {
    this.usage = usage;
    return this;
  }

  withMetadata(metadata: APIResponse["metadata"]): this {
    this.metadata = metadata;
    return this;
  }

  asIntermediateChunk(): this {
    this.done = false;
    // Reset optional properties for intermediate chunks
    this.usage = undefined;
    this.metadata = undefined;
    return this;
  }

  asFinalChunk(): this {
    this.done = true;
    this.usage = {
      promptTokens: 15,
      completionTokens: 25,
      totalTokens: 40,
    };
    this.metadata = {
      timestamp: new Date("2024-01-01T12:00:00.000Z"),
      duration: 1500,
      finishReason: "stop",
    };
    return this;
  }

  asEmptyChunk(): this {
    this.content = "";
    this.done = false;
    return this;
  }

  withCurrentTimestamp(): this {
    if (this.metadata) {
      this.metadata = { ...this.metadata, timestamp: new Date() };
    }
    return this;
  }

  build(): APIStreamChunk {
    const chunk: APIStreamChunk = {
      content: this.content,
      done: this.done,
    };

    if (this.usage !== undefined) {
      (chunk as { usage: APIResponse["usage"] }).usage = this.usage;
    }

    if (this.metadata !== undefined) {
      (chunk as { metadata: APIResponse["metadata"] }).metadata = this.metadata;
    }

    return chunk;
  }
}

/**
 * Builder for APIRequestOptions objects.
 */
export class APIRequestOptionsBuilder {
  private model?: string;
  private temperature?: number;
  private maxTokens?: number;
  private timeout?: number;
  private stream?: boolean;
  private safetySettings?: Record<string, unknown>;
  private lifecycle?: APIRequestOptions["lifecycle"];

  withModel(model: string): this {
    this.model = model;
    return this;
  }

  withTemperature(temperature: number): this {
    this.temperature = temperature;
    return this;
  }

  withMaxTokens(maxTokens: number): this {
    this.maxTokens = maxTokens;
    return this;
  }

  withTimeout(timeout: number): this {
    this.timeout = timeout;
    return this;
  }

  withStreaming(stream: boolean): this {
    this.stream = stream;
    return this;
  }

  withSafetySettings(safetySettings: Record<string, unknown>): this {
    this.safetySettings = safetySettings;
    return this;
  }

  withLifecycle(lifecycle: APIRequestOptions["lifecycle"]): this {
    this.lifecycle = lifecycle;
    return this;
  }

  withCreativeSettings(): this {
    this.temperature = 0.9;
    this.maxTokens = 2000;
    return this;
  }

  withConservativeSettings(): this {
    this.temperature = 0.1;
    this.maxTokens = 500;
    return this;
  }

  withFastSettings(): this {
    this.timeout = 5000;
    this.maxTokens = 100;
    return this;
  }

  withLongFormSettings(): this {
    this.timeout = 60000;
    this.maxTokens = 4000;
    return this;
  }

  withStrictSafety(): this {
    this.safetySettings = {
      harassment: "BLOCK_MEDIUM_AND_ABOVE",
      hateSpeech: "BLOCK_MEDIUM_AND_ABOVE",
      sexuallyExplicit: "BLOCK_MEDIUM_AND_ABOVE",
      dangerousContent: "BLOCK_MEDIUM_AND_ABOVE",
    };
    return this;
  }

  build(): APIRequestOptions {
    const options: APIRequestOptions = {};

    if (this.model !== undefined) {
      (options as { model: string }).model = this.model;
    }

    if (this.temperature !== undefined) {
      (options as { temperature: number }).temperature = this.temperature;
    }

    if (this.maxTokens !== undefined) {
      (options as { maxTokens: number }).maxTokens = this.maxTokens;
    }

    if (this.timeout !== undefined) {
      (options as { timeout: number }).timeout = this.timeout;
    }

    if (this.stream !== undefined) {
      (options as { stream: boolean }).stream = this.stream;
    }

    if (this.safetySettings !== undefined) {
      (options as { safetySettings: Record<string, unknown> }).safetySettings =
        this.safetySettings;
    }

    if (this.lifecycle !== undefined) {
      (options as { lifecycle: APIRequestOptions["lifecycle"] }).lifecycle =
        this.lifecycle;
    }

    return options;
  }
}

/**
 * Convenience functions for common test scenarios.
 */

/**
 * Creates a successful API response for basic testing.
 */
export function createTestAPIResponse(content = "Test response"): APIResponse {
  return new APIResponseBuilder().withContent(content).build();
}

/**
 * Creates a stream of chunks that form a complete response.
 */
export function createTestStreamChunks(
  fullContent = "Complete test response",
): APIStreamChunk[] {
  const words = fullContent.split(" ");
  const chunks: APIStreamChunk[] = [];

  // Create intermediate chunks with partial content
  for (let i = 0; i < words.length - 1; i++) {
    chunks.push(
      new APIStreamChunkBuilder()
        .withContent(words[i] + " ")
        .asIntermediateChunk()
        .build(),
    );
  }

  // Create final chunk with the last word and metadata
  const lastWord = words[words.length - 1];
  if (lastWord) {
    chunks.push(
      new APIStreamChunkBuilder()
        .withContent(lastWord)
        .asFinalChunk()
        .withCurrentTimestamp()
        .build(),
    );
  }

  return chunks;
}

/**
 * Creates a retryable API error for testing retry logic.
 */
export function createRetryableAPIError(): APIError {
  return new APIErrorBuilder().asNetworkError().build();
}

/**
 * Creates a non-retryable API error for testing failure handling.
 */
export function createNonRetryableAPIError(): APIError {
  return new APIErrorBuilder().asAuthenticationError().build();
}
