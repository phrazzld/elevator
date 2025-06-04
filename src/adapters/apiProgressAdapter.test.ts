/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { withProgress, withDynamicProgress } from "./apiProgressAdapter";
import {
  type GeminiAPIClient,
  type APIResponse,
  type APIError,
  type APIStreamChunk,
  type APIRequestOptions,
} from "../core/apiClient";
import {
  type OutputFormatter,
  type ProgressIndicator,
  type FormatterError,
  createFormatterError,
} from "../core/formatter";
import {
  type EnhancedPrompt,
  type Result,
  success,
  failure,
  isOk,
  isErr,
} from "../core/promptProcessor";

describe("apiProgressAdapter", () => {
  let mockApiClient: GeminiAPIClient;
  let mockFormatter: OutputFormatter;
  let mockProgressIndicator: ProgressIndicator;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock progress indicator
    mockProgressIndicator = {
      message: "Thinking...",
      stage: "thinking",
      active: true,
    };

    // Create mock API client
    mockApiClient = {
      generateContent: vi
        .fn()
        .mockImplementation(
          async (_prompt: EnhancedPrompt, options?: APIRequestOptions) => {
            // Call lifecycle hooks if provided
            if (options?.lifecycle?.onStart) {
              await options.lifecycle.onStart();
            }

            const result = success<APIResponse, APIError>({
              content: "Test response",
              model: "test-model",
              usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30,
              },
              metadata: {
                timestamp: new Date(),
                duration: 100,
                finishReason: "stop",
              },
            });

            // Call onComplete hook
            if (options?.lifecycle?.onComplete) {
              await options.lifecycle.onComplete();
            }

            return result;
          },
        ),
      generateStreamingContent: vi.fn().mockImplementation(async function* (
        _prompt: EnhancedPrompt,
        options?: APIRequestOptions,
      ): AsyncIterable<Result<APIStreamChunk, APIError>> {
        // Call onStart before yielding
        if (options?.lifecycle?.onStart) {
          await options.lifecycle.onStart();
        }

        try {
          yield success<APIStreamChunk, APIError>({
            content: "Stream chunk",
            done: false,
          });
          yield success<APIStreamChunk, APIError>({
            content: " complete",
            done: true,
          });
        } finally {
          // Call onComplete when done
          if (options?.lifecycle?.onComplete) {
            await options.lifecycle.onComplete();
          }
        }
      }),
      healthCheck: vi.fn().mockResolvedValue(success({ status: "healthy" })),
    } as GeminiAPIClient;

    // Create mock formatter
    mockFormatter = {
      formatContent: vi.fn(),
      formatError: vi.fn(),
      createProgress: vi
        .fn()
        .mockResolvedValue(
          success<ProgressIndicator, FormatterError>(mockProgressIndicator),
        ),
      updateProgress: vi.fn(),
      completeProgress: vi
        .fn()
        .mockResolvedValue(success<void, FormatterError>(undefined)),
      formatStreamChunk: vi.fn(),
    } as OutputFormatter;
  });

  function createMockEnhancedPrompt(content = "Test prompt"): EnhancedPrompt {
    return {
      id: "test-id",
      content,
      metadata: { timestamp: new Date() },
      originalContent: content,
      enhancedAt: new Date(),
      enhancements: ["clarity"],
    };
  }

  describe("withProgress", () => {
    it("should create and complete progress indicator for generateContent", async () => {
      const wrappedClient = withProgress(mockApiClient, mockFormatter);
      const prompt = createMockEnhancedPrompt();

      const result = await wrappedClient.generateContent(prompt);

      expect(isOk(result)).toBe(true);
      expect(mockFormatter.createProgress).toHaveBeenCalledWith("Thinking...");
      expect(mockFormatter.completeProgress).toHaveBeenCalledWith(
        mockProgressIndicator,
      );
    });

    it("should use custom default message", async () => {
      const wrappedClient = withProgress(
        mockApiClient,
        mockFormatter,
        "Processing...",
      );
      const prompt = createMockEnhancedPrompt();

      await wrappedClient.generateContent(prompt);

      expect(mockFormatter.createProgress).toHaveBeenCalledWith(
        "Processing...",
      );
    });

    it("should handle progress creation failure gracefully", async () => {
      vi.mocked(mockFormatter.createProgress).mockResolvedValue(
        failure<ProgressIndicator, FormatterError>(
          createFormatterError("FORMAT_ERROR", "Failed to create progress"),
        ),
      );

      const wrappedClient = withProgress(mockApiClient, mockFormatter);
      const prompt = createMockEnhancedPrompt();

      const result = await wrappedClient.generateContent(prompt);

      expect(isOk(result)).toBe(true);
      expect(mockFormatter.completeProgress).not.toHaveBeenCalled();
    });

    it("should complete progress even if API call fails", async () => {
      vi.mocked(mockApiClient.generateContent).mockImplementation(
        async (_prompt: EnhancedPrompt, options?: APIRequestOptions) => {
          // Call lifecycle hooks even on failure
          if (options?.lifecycle?.onStart) {
            await options.lifecycle.onStart();
          }

          const error = failure<APIResponse, APIError>({
            type: "api",
            code: "NETWORK_ERROR",
            message: "Network error",
          });

          if (options?.lifecycle?.onComplete) {
            await options.lifecycle.onComplete();
          }

          return error;
        },
      );

      const wrappedClient = withProgress(mockApiClient, mockFormatter);
      const prompt = createMockEnhancedPrompt();

      const result = await wrappedClient.generateContent(prompt);

      expect(isErr(result)).toBe(true);
      expect(mockFormatter.createProgress).toHaveBeenCalled();
      expect(mockFormatter.completeProgress).toHaveBeenCalledWith(
        mockProgressIndicator,
      );
    });

    it("should preserve existing lifecycle hooks", async () => {
      const originalOnStart = vi.fn();
      const originalOnComplete = vi.fn();

      const wrappedClient = withProgress(mockApiClient, mockFormatter);
      const prompt = createMockEnhancedPrompt();
      const options: APIRequestOptions = {
        lifecycle: {
          onStart: originalOnStart,
          onComplete: originalOnComplete,
        },
      };

      await wrappedClient.generateContent(prompt, options);

      expect(originalOnStart).toHaveBeenCalled();
      expect(originalOnComplete).toHaveBeenCalled();
      expect(mockFormatter.createProgress).toHaveBeenCalled();
      expect(mockFormatter.completeProgress).toHaveBeenCalled();
    });

    it("should work with streaming content", async () => {
      const wrappedClient = withProgress(mockApiClient, mockFormatter);
      const prompt = createMockEnhancedPrompt();

      const chunks: string[] = [];
      for await (const result of wrappedClient.generateStreamingContent(
        prompt,
      )) {
        if (isOk(result)) {
          chunks.push(result.value.content);
        }
      }

      expect(chunks).toEqual(["Stream chunk", " complete"]);
      expect(mockFormatter.createProgress).toHaveBeenCalled();
      expect(mockFormatter.completeProgress).toHaveBeenCalled();
    });

    it("should not add progress to healthCheck", async () => {
      const wrappedClient = withProgress(mockApiClient, mockFormatter);

      const result = await wrappedClient.healthCheck();

      expect(isOk(result)).toBe(true);
      expect(mockFormatter.createProgress).not.toHaveBeenCalled();
      expect(mockFormatter.completeProgress).not.toHaveBeenCalled();
    });
  });

  describe("withDynamicProgress", () => {
    it("should use custom message based on prompt", async () => {
      const messageProvider = (prompt: EnhancedPrompt) =>
        `Processing: ${prompt.content.substring(0, 20)}...`;

      const wrappedClient = withDynamicProgress(
        mockApiClient,
        mockFormatter,
        messageProvider,
      );
      const prompt = createMockEnhancedPrompt("Explain quantum computing");

      await wrappedClient.generateContent(prompt);

      expect(mockFormatter.createProgress).toHaveBeenCalledWith(
        "Processing: Explain quantum comp...",
      );
    });

    it("should work with streaming content using dynamic messages", async () => {
      const messageProvider = (prompt: EnhancedPrompt) =>
        `Streaming: ${prompt.id}`;

      const wrappedClient = withDynamicProgress(
        mockApiClient,
        mockFormatter,
        messageProvider,
      );
      const prompt = createMockEnhancedPrompt();

      const chunks: string[] = [];
      for await (const result of wrappedClient.generateStreamingContent(
        prompt,
      )) {
        if (isOk(result)) {
          chunks.push(result.value.content);
        }
      }

      expect(chunks).toHaveLength(2);
      expect(mockFormatter.createProgress).toHaveBeenCalledWith(
        "Streaming: test-id",
      );
    });

    it("should not add progress to healthCheck with dynamic provider", async () => {
      const messageProvider = () => "Should not be called";

      const wrappedClient = withDynamicProgress(
        mockApiClient,
        mockFormatter,
        messageProvider,
      );

      const result = await wrappedClient.healthCheck();

      expect(isOk(result)).toBe(true);
      expect(mockFormatter.createProgress).not.toHaveBeenCalled();
    });
  });
});
