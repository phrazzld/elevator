import { describe, it, expect } from "vitest";
import {
  createAPIError,
  isAPIError,
  isRetryableError,
  getRetryDelay,
  type GeminiAPIClient,
  type APIResponse,
  type APIStreamChunk,
  type APIRequestOptions,
} from "./apiClient";
import {
  success,
  failure,
  isErr,
  type EnhancedPrompt,
} from "./promptProcessor";

describe("API Client Types", () => {
  describe("APIResponse", () => {
    it("should have correct structure", () => {
      const response: APIResponse = {
        content: "Generated content",
        model: "gemini-2.5-flash-preview-05-20",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        metadata: {
          timestamp: new Date(),
          duration: 1500,
          finishReason: "stop",
        },
      };

      expect(response.content).toBe("Generated content");
      expect(response.model).toBe("gemini-2.5-flash-preview-05-20");
      expect(response.usage.totalTokens).toBe(30);
      expect(response.metadata.finishReason).toBe("stop");
    });

    it("should support all finish reasons", () => {
      const finishReasons = ["stop", "length", "safety", "other"] as const;

      finishReasons.forEach((reason) => {
        const response: APIResponse = {
          content: "test",
          model: "test-model",
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          metadata: {
            timestamp: new Date(),
            duration: 100,
            finishReason: reason,
          },
        };

        expect(response.metadata.finishReason).toBe(reason);
      });
    });
  });

  describe("APIRequestOptions", () => {
    it("should handle all optional properties", () => {
      const options: APIRequestOptions = {
        model: "custom-model",
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 5000,
        stream: true,
        safetySettings: { blockLevel: "high" },
      };

      expect(options.model).toBe("custom-model");
      expect(options.temperature).toBe(0.7);
      expect(options.stream).toBe(true);
    });

    it("should handle empty options", () => {
      const options: APIRequestOptions = {};
      expect(Object.keys(options)).toHaveLength(0);
    });
  });

  describe("APIStreamChunk", () => {
    it("should handle partial chunks", () => {
      const chunk: APIStreamChunk = {
        content: "Partial response",
        done: false,
      };

      expect(chunk.content).toBe("Partial response");
      expect(chunk.done).toBe(false);
      expect(chunk.usage).toBeUndefined();
      expect(chunk.metadata).toBeUndefined();
    });

    it("should handle final chunks", () => {
      const chunk: APIStreamChunk = {
        content: "Final response",
        done: true,
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        metadata: {
          timestamp: new Date(),
          duration: 2000,
          finishReason: "stop",
        },
      };

      expect(chunk.done).toBe(true);
      expect(chunk.usage?.totalTokens).toBe(15);
      expect(chunk.metadata?.finishReason).toBe("stop");
    });
  });
});

describe("Error Creation and Utilities", () => {
  describe("createAPIError", () => {
    it("should create API error without details", () => {
      const error = createAPIError("NETWORK_ERROR", "Connection failed");

      expect(error).toEqual({
        type: "api",
        code: "NETWORK_ERROR",
        message: "Connection failed",
      });
      expect(error.details).toBeUndefined();
    });

    it("should create API error with details", () => {
      const details = {
        statusCode: 429,
        retryAfter: 5000,
        retryable: true,
        originalError: { type: "RateLimitError" },
      };
      const error = createAPIError(
        "RATE_LIMITED",
        "Rate limit exceeded",
        details,
      );

      expect(error).toEqual({
        type: "api",
        code: "RATE_LIMITED",
        message: "Rate limit exceeded",
        details,
      });
    });

    it("should create errors with all error codes", () => {
      const codes = [
        "NETWORK_ERROR",
        "TIMEOUT",
        "RATE_LIMITED",
        "INVALID_REQUEST",
        "AUTHENTICATION_FAILED",
        "MODEL_NOT_FOUND",
        "CONTENT_FILTERED",
        "QUOTA_EXCEEDED",
        "SERVER_ERROR",
        "UNKNOWN_ERROR",
      ] as const;

      codes.forEach((code) => {
        const error = createAPIError(code, `Error for ${code}`);
        expect(error.code).toBe(code);
        expect(error.type).toBe("api");
      });
    });
  });

  describe("isAPIError", () => {
    it("should return true for API errors", () => {
      const error = createAPIError("SERVER_ERROR", "Server error");
      expect(isAPIError(error)).toBe(true);
    });

    it("should return false for non-API errors", () => {
      expect(isAPIError(new Error("Regular error"))).toBe(false);
      expect(isAPIError({ type: "validation", code: "EMPTY" })).toBe(false);
      expect(isAPIError(null)).toBe(false);
      expect(isAPIError(undefined)).toBe(false);
      expect(isAPIError("string")).toBe(false);
      expect(isAPIError(42)).toBe(false);
    });

    it("should narrow type correctly", () => {
      const error: unknown = createAPIError("TIMEOUT", "Request timed out");

      if (isAPIError(error)) {
        // TypeScript should know this is APIError
        expect(error.type).toBe("api");
        expect(error.code).toBe("TIMEOUT");
      }
    });
  });

  describe("isRetryableError", () => {
    it("should return true for explicitly retryable errors", () => {
      const error = createAPIError("INVALID_REQUEST", "Bad request", {
        retryable: true,
      });
      expect(isRetryableError(error)).toBe(true);
    });

    it("should return false for explicitly non-retryable errors", () => {
      const error = createAPIError("NETWORK_ERROR", "Network error", {
        retryable: false,
      });
      expect(isRetryableError(error)).toBe(false);
    });

    it("should return true for default retryable error codes", () => {
      const retryableCodes = [
        "NETWORK_ERROR",
        "TIMEOUT",
        "RATE_LIMITED",
        "QUOTA_EXCEEDED",
        "SERVER_ERROR",
      ] as const;

      retryableCodes.forEach((code) => {
        const error = createAPIError(code, "Error");
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it("should return false for default non-retryable error codes", () => {
      const nonRetryableCodes = [
        "INVALID_REQUEST",
        "AUTHENTICATION_FAILED",
        "MODEL_NOT_FOUND",
        "CONTENT_FILTERED",
        "UNKNOWN_ERROR",
      ] as const;

      nonRetryableCodes.forEach((code) => {
        const error = createAPIError(code, "Error");
        expect(isRetryableError(error)).toBe(false);
      });
    });
  });

  describe("getRetryDelay", () => {
    it("should return retry delay from error details", () => {
      const error = createAPIError("RATE_LIMITED", "Rate limited", {
        retryAfter: 3000,
      });
      expect(getRetryDelay(error)).toBe(3000);
    });

    it("should return default delay when no retry delay specified", () => {
      const error = createAPIError("NETWORK_ERROR", "Network error");
      expect(getRetryDelay(error)).toBe(1000);
    });

    it("should return custom default delay", () => {
      const error = createAPIError("TIMEOUT", "Timeout");
      expect(getRetryDelay(error, 2500)).toBe(2500);
    });
  });
});

describe("GeminiAPIClient Interface", () => {
  // Helper to create a mock enhanced prompt
  function createMockEnhancedPrompt(): EnhancedPrompt {
    return {
      id: "test-prompt-123",
      content: "Test prompt content",
      metadata: { timestamp: new Date() },
      originalContent: "Original content",
      enhancedAt: new Date(),
      enhancements: ["clarity"],
    };
  }

  it("should define correct interface contract", () => {
    // This is a compile-time test - if it compiles, the interface is correct
    const mockClient: GeminiAPIClient = {
      generateContent: (
        prompt: EnhancedPrompt,
        options?: APIRequestOptions,
      ) => {
        return Promise.resolve(
          success({
            content: `Response to: ${prompt.content}`,
            model: options?.model ?? "gemini-2.5-flash-preview-05-20",
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            metadata: {
              timestamp: new Date(),
              duration: 1000,
              finishReason: "stop",
            },
          }),
        );
      },

      generateStreamingContent: async function* () {
        await Promise.resolve(); // Satisfy ESLint
        yield success({
          content: "Streaming response",
          done: false,
        });
        yield success({
          content: " complete",
          done: true,
          usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
          metadata: {
            timestamp: new Date(),
            duration: 500,
            finishReason: "stop",
          },
        });
      },

      healthCheck: () => {
        return Promise.resolve(success({ status: "healthy" as const }));
      },
    };

    expect(typeof mockClient.generateContent).toBe("function");
    expect(typeof mockClient.generateStreamingContent).toBe("function");
    expect(typeof mockClient.healthCheck).toBe("function");
  });

  it("should handle generateContent success", async () => {
    const mockClient: GeminiAPIClient = {
      generateContent: () => {
        return Promise.resolve(
          success({
            content: "Generated response",
            model: "test-model",
            usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
            metadata: {
              timestamp: new Date(),
              duration: 800,
              finishReason: "stop",
            },
          }),
        );
      },
      generateStreamingContent: async function* () {
        await Promise.resolve(); // Satisfy ESLint
        // Empty generator for this test - no chunks yielded
        yield* [];
      },
      healthCheck: () => Promise.resolve(success({ status: "healthy" })),
    };

    const prompt = createMockEnhancedPrompt();
    const result = await mockClient.generateContent(prompt);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.content).toBe("Generated response");
    }
  });

  it("should handle generateContent error", async () => {
    const mockClient: GeminiAPIClient = {
      generateContent: () => {
        return Promise.resolve(
          failure(createAPIError("TIMEOUT", "Request timed out")),
        );
      },
      generateStreamingContent: async function* () {
        await Promise.resolve(); // Satisfy ESLint
        // Empty generator for this test - no chunks yielded
        yield* [];
      },
      healthCheck: () => Promise.resolve(success({ status: "healthy" })),
    };

    const prompt = createMockEnhancedPrompt();
    const result = await mockClient.generateContent(prompt);

    expect(result.success).toBe(false);
    if (isErr(result)) {
      expect(result.error.code).toBe("TIMEOUT");
    }
  });

  it("should handle streaming content", async () => {
    const mockClient: GeminiAPIClient = {
      generateContent: () =>
        Promise.resolve(
          failure(createAPIError("UNKNOWN_ERROR", "Not implemented")),
        ),
      generateStreamingContent: async function* () {
        await Promise.resolve(); // Satisfy ESLint
        yield success({ content: "Hello", done: false });
        yield success({
          content: " world!",
          done: true,
          usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
          metadata: {
            timestamp: new Date(),
            duration: 300,
            finishReason: "stop",
          },
        });
      },
      healthCheck: () => Promise.resolve(success({ status: "healthy" })),
    };

    const prompt = createMockEnhancedPrompt();
    const chunks: APIStreamChunk[] = [];

    for await (const result of mockClient.generateStreamingContent(prompt)) {
      if (result.success) {
        chunks.push(result.value);
      }
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.content).toBe("Hello");
    expect(chunks[0]?.done).toBe(false);
    expect(chunks[1]?.content).toBe(" world!");
    expect(chunks[1]?.done).toBe(true);
  });
});
