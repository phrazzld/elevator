import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GoogleGeminiAdapter } from "./geminiClient";
import {
  isOk,
  isErr,
  type EnhancedPrompt,
  type Result,
} from "../core/promptProcessor";
import { type AppConfig } from "../config";
import {
  type APIStreamChunk,
  type APIError,
  type APIResponse,
} from "../core/apiClient";

// Create mock functions
const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContent: mockGenerateContent,
  generateContentStream: mockGenerateContentStream,
});

// Mock the Google Generative AI SDK
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    HarmCategory: {
      HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH",
      HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT",
      HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT",
      HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    },
    HarmBlockThreshold: {
      BLOCK_NONE: "BLOCK_NONE",
      BLOCK_LOW_AND_ABOVE: "BLOCK_LOW_AND_ABOVE",
      BLOCK_MEDIUM_AND_ABOVE: "BLOCK_MEDIUM_AND_ABOVE",
      BLOCK_HIGH_AND_ABOVE: "BLOCK_HIGH_AND_ABOVE",
    },
  };
});

describe("GoogleGeminiAdapter", () => {
  let adapter: GoogleGeminiAdapter;
  let mockConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      api: {
        apiKey: "test-api-key",
        modelId: "gemini-2.5-flash-preview-05-20",
        temperature: 0.7,
        timeoutMs: 30000,
        maxRetries: 3,
      },
      prompt: {
        enableElevation: false, // Disable for most tests to avoid system prompt complications
      },
      output: {
        raw: false,
        streaming: true,
        showProgress: true,
      },
      logging: {
        level: "info",
        serviceName: "test",
        jsonFormat: true,
      },
    };

    adapter = new GoogleGeminiAdapter(mockConfig);
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

  describe("generateContent", () => {
    it("should successfully generate content", async () => {
      const mockResponse = {
        response: {
          text: () => "Generated response text",
          candidates: [
            {
              finishReason: "STOP",
              safetyRatings: [],
            },
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = createMockEnhancedPrompt();
      const result = await adapter.generateContent(prompt);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toBe("Generated response text");
        expect(result.value.model).toBe("gemini-2.5-flash-preview-05-20");
        expect(result.value.usage.promptTokens).toBe(10);
        expect(result.value.usage.completionTokens).toBe(20);
        expect(result.value.usage.totalTokens).toBe(30);
        expect(result.value.metadata.finishReason).toBe("stop");
      }
    });

    it("should handle authentication errors", async () => {
      const authError = new Error("API key not valid");
      authError.message = "API key not valid. Please pass a valid API key.";
      mockGenerateContent.mockRejectedValue(authError);

      const prompt = createMockEnhancedPrompt();
      const result = await adapter.generateContent(prompt);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("AUTHENTICATION_FAILED");
        expect(result.error.message).toContain("Authentication failed");
      }
    });

    it("should handle rate limiting", async () => {
      vi.useFakeTimers();

      const rateLimitError = new Error("Resource exhausted");
      rateLimitError.message = "429 Too Many Requests";
      mockGenerateContent.mockRejectedValue(rateLimitError);

      const prompt = createMockEnhancedPrompt();
      const resultPromise = adapter.generateContent(prompt);

      // Advance timers for all retries
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();

      const result = await resultPromise;

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("RATE_LIMITED");
        expect(result.error.details?.retryable).toBe(true);
      }

      vi.useRealTimers();
    });

    it("should handle content filtering", async () => {
      const mockResponse = {
        response: {
          text: () => "",
          candidates: [
            {
              finishReason: "SAFETY",
              safetyRatings: [
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  probability: "HIGH",
                },
              ],
            },
          ],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 0,
            totalTokenCount: 5,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = createMockEnhancedPrompt("potentially harmful content");
      const result = await adapter.generateContent(prompt);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("CONTENT_FILTERED");
        expect(result.error.message).toContain("blocked");
      }
    });

    it("should handle network errors", async () => {
      vi.useFakeTimers();

      const networkError = new Error("Network error");
      networkError.message = "Failed to fetch";
      mockGenerateContent.mockRejectedValue(networkError);

      const prompt = createMockEnhancedPrompt();
      const resultPromise = adapter.generateContent(prompt);

      // Advance timers for all retries
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();

      const result = await resultPromise;

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("NETWORK_ERROR");
        expect(result.error.details?.retryable).toBe(true);
      }

      vi.useRealTimers();
    });

    it("should handle model not found errors", async () => {
      const modelError = new Error("Model not found");
      modelError.message = "models/invalid-model is not found";
      mockGenerateContent.mockRejectedValue(modelError);

      const prompt = createMockEnhancedPrompt();
      const result = await adapter.generateContent(prompt);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("MODEL_NOT_FOUND");
        expect(result.error.details?.retryable).toBe(false);
      }
    });

    it("should use custom options when provided", async () => {
      const mockResponse = {
        response: {
          text: () => "Custom response",
          candidates: [{ finishReason: "STOP", safetyRatings: [] }],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = createMockEnhancedPrompt();
      const options = {
        temperature: 0.9,
        maxTokens: 1000,
      };

      const result = await adapter.generateContent(prompt, options);

      expect(isOk(result)).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: [{ role: "user", parts: [{ text: prompt.content }] }],
          generationConfig: expect.objectContaining({
            temperature: 0.9,
            maxOutputTokens: 1000,
          }) as unknown,
        }) as unknown,
      );
    });
  });

  describe("generateContent with lifecycle hooks", () => {
    it("should call onStart and onComplete on success", async () => {
      const mockResponse = {
        response: {
          text: () => "Generated response",
          candidates: [{ finishReason: "STOP", safetyRatings: [] }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const onStart = vi.fn();
      const onComplete = vi.fn();

      const prompt = createMockEnhancedPrompt();
      const options = {
        lifecycle: { onStart, onComplete },
      };

      const result = await adapter.generateContent(prompt, options);

      expect(isOk(result)).toBe(true);
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onStart).toHaveBeenCalledBefore(mockGenerateContent);
    });

    it("should call onComplete even on error", async () => {
      mockGenerateContent.mockRejectedValue(new Error("API error"));

      const onStart = vi.fn();
      const onComplete = vi.fn();

      const prompt = createMockEnhancedPrompt();
      const options = {
        lifecycle: { onStart, onComplete },
      };

      const result = await adapter.generateContent(prompt, options);

      expect(isErr(result)).toBe(true);
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("should handle async lifecycle hooks", async () => {
      const mockResponse = {
        response: {
          text: () => "Generated response",
          candidates: [{ finishReason: "STOP", safetyRatings: [] }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const onStartComplete = vi.fn();
      const onCompleteComplete = vi.fn();

      const onStart = vi.fn().mockImplementation(async () => {
        // Use Promise.resolve() to make it async without setTimeout
        await Promise.resolve();
        onStartComplete();
      });
      const onComplete = vi.fn().mockImplementation(async () => {
        // Use Promise.resolve() to make it async without setTimeout
        await Promise.resolve();
        onCompleteComplete();
      });

      const prompt = createMockEnhancedPrompt();
      const options = {
        lifecycle: { onStart, onComplete },
      };

      const result = await adapter.generateContent(prompt, options);

      expect(isOk(result)).toBe(true);
      expect(onStartComplete).toHaveBeenCalled();
      expect(onCompleteComplete).toHaveBeenCalled();
    });

    it("should not fail if lifecycle hook throws error", async () => {
      const mockResponse = {
        response: {
          text: () => "Generated response",
          candidates: [{ finishReason: "STOP", safetyRatings: [] }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const onStart = vi.fn().mockImplementation(() => {
        throw new Error("Hook error");
      });
      const onComplete = vi.fn();

      const prompt = createMockEnhancedPrompt();
      const options = {
        lifecycle: { onStart, onComplete },
      };

      const result = await adapter.generateContent(prompt, options);

      expect(isOk(result)).toBe(true);
      expect(onStart).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in lifecycle hook onStart:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("generateStreamingContent", () => {
    it("should successfully stream content", async () => {
      const mockStream = {
        stream: (async function* () {
          await Promise.resolve();
          yield {
            candidates: [
              {
                content: { parts: [{ text: "Hello" }] },
                finishReason: null,
              },
            ],
          };
          yield {
            candidates: [
              {
                content: { parts: [{ text: " world!" }] },
                finishReason: "STOP",
              },
            ],
          };
        })(),
        response: Promise.resolve({
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        }),
      };

      mockGenerateContentStream.mockResolvedValue(mockStream);

      const prompt = createMockEnhancedPrompt();
      const chunks: string[] = [];

      for await (const result of adapter.generateStreamingContent(prompt)) {
        if (isOk(result)) {
          chunks.push(result.value.content);
        }
      }

      expect(chunks).toEqual(["Hello", " world!"]);
    });

    it("should include usage stats in final chunk", async () => {
      const mockStream = {
        stream: (async function* () {
          await Promise.resolve();
          yield {
            candidates: [
              {
                content: { parts: [{ text: "Final" }] },
                finishReason: "STOP",
              },
            ],
          };
        })(),
        response: Promise.resolve({
          usageMetadata: {
            promptTokenCount: 8,
            candidatesTokenCount: 12,
            totalTokenCount: 20,
          },
        }),
      };

      mockGenerateContentStream.mockResolvedValue(mockStream);

      const prompt = createMockEnhancedPrompt();
      const results: APIStreamChunk[] = [];

      for await (const result of adapter.generateStreamingContent(prompt)) {
        if (isOk(result)) {
          results.push(result.value);
        }
      }

      expect(results).toHaveLength(1);
      const finalChunk = results[0];
      expect(finalChunk?.done).toBe(true);
      expect(finalChunk?.usage).toEqual({
        promptTokens: 8,
        completionTokens: 12,
        totalTokens: 20,
      });
    });

    it("should handle streaming errors", async () => {
      const mockStream = {
        stream: (async function* () {
          await Promise.resolve();
          yield {
            candidates: [
              {
                content: { parts: [{ text: "Start" }] },
                finishReason: null,
              },
            ],
          };
          throw new Error("Stream interrupted");
        })(),
        response: Promise.resolve({}),
      };

      mockGenerateContentStream.mockResolvedValue(mockStream);

      const prompt = createMockEnhancedPrompt();
      const results: Result<APIStreamChunk, APIError>[] = [];

      for await (const result of adapter.generateStreamingContent(prompt)) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      const firstResult = results[0];
      const secondResult = results[1];
      expect(firstResult && isOk(firstResult)).toBe(true);
      expect(secondResult && isErr(secondResult)).toBe(true);
      if (secondResult && isErr(secondResult)) {
        expect(secondResult.error.code).toBe("UNKNOWN_ERROR");
      }
    });
  });

  describe("generateStreamingContent with lifecycle hooks", () => {
    it("should call onStart and onComplete on success", async () => {
      const mockStream = {
        stream: (async function* () {
          await Promise.resolve();
          yield {
            candidates: [
              {
                content: { parts: [{ text: "Streaming text" }] },
                finishReason: "STOP",
              },
            ],
          };
        })(),
        response: Promise.resolve({
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        }),
      };

      mockGenerateContentStream.mockResolvedValue(mockStream);

      const onStart = vi.fn();
      const onComplete = vi.fn();

      const prompt = createMockEnhancedPrompt();
      const options = {
        lifecycle: { onStart, onComplete },
      };

      const results: string[] = [];
      for await (const result of adapter.generateStreamingContent(
        prompt,
        options,
      )) {
        if (isOk(result)) {
          results.push(result.value.content);
        }
      }

      expect(results).toHaveLength(1);
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onStart).toHaveBeenCalledBefore(mockGenerateContentStream);
    });

    it("should call onComplete even on streaming error", async () => {
      const mockStream = {
        stream: (async function* () {
          await Promise.resolve();
          // Yield an empty result to fix the require-yield lint error
          yield {
            candidates: [
              {
                content: { parts: [{ text: "Start" }] },
                finishReason: null,
              },
            ],
          };
          throw new Error("Stream error");
        })(),
        response: Promise.resolve({}),
      };

      mockGenerateContentStream.mockResolvedValue(mockStream);

      const onStart = vi.fn();
      const onComplete = vi.fn();

      const prompt = createMockEnhancedPrompt();
      const options = {
        lifecycle: { onStart, onComplete },
      };

      const results: Result<APIStreamChunk, APIError>[] = [];
      for await (const result of adapter.generateStreamingContent(
        prompt,
        options,
      )) {
        results.push(result);
      }

      // Should receive both the successful chunk and the error
      expect(results).toHaveLength(2);

      // First result should be the successful chunk
      const firstResult = results[0];
      expect(firstResult).toBeDefined();
      expect(isOk(firstResult!)).toBe(true);
      if (firstResult && isOk(firstResult)) {
        expect(firstResult.value.content).toBe("Start");
      }

      // Second result should be the error
      const secondResult = results[1];
      expect(secondResult).toBeDefined();
      expect(isErr(secondResult!)).toBe(true);
      if (secondResult && isErr(secondResult)) {
        expect(secondResult.error.message).toContain("Stream error");
      }

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("should call onComplete on connection setup failure", async () => {
      vi.useFakeTimers();

      mockGenerateContentStream.mockRejectedValue(
        new Error("Connection failed"),
      );

      const onStart = vi.fn();
      const onComplete = vi.fn();

      const prompt = createMockEnhancedPrompt();
      const options = {
        lifecycle: { onStart, onComplete },
      };

      const resultsPromise = (async () => {
        const results: Result<APIStreamChunk, APIError>[] = [];
        for await (const result of adapter.generateStreamingContent(
          prompt,
          options,
        )) {
          results.push(result);
        }
        return results;
      })();

      // Advance timers for retries
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();

      const results = await resultsPromise;

      expect(results).toHaveLength(1);
      const firstResult = results[0];
      expect(firstResult && isErr(firstResult)).toBe(true);
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe("healthCheck", () => {
    it("should return healthy when API is accessible", async () => {
      const mockResponse = {
        response: {
          text: () => "pong",
          candidates: [{ finishReason: "STOP", safetyRatings: [] }],
          usageMetadata: {
            promptTokenCount: 1,
            candidatesTokenCount: 1,
            totalTokenCount: 2,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await adapter.healthCheck();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe("healthy");
      }
    });

    it("should return error when API is not accessible", async () => {
      vi.useFakeTimers();

      mockGenerateContent.mockRejectedValue(new Error("Connection refused"));

      const resultPromise = adapter.healthCheck();

      // Advance timers for all retries
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();

      const result = await resultPromise;

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe("api");
      }

      vi.useRealTimers();
    });
  });

  describe("error mapping", () => {
    const errorTestCases = [
      {
        input: "API key not valid",
        expectedCode: "AUTHENTICATION_FAILED",
        retryable: false,
      },
      {
        input: "429 Too Many Requests",
        expectedCode: "RATE_LIMITED",
        retryable: true,
      },
      {
        input: "Resource exhausted",
        expectedCode: "RATE_LIMITED",
        retryable: true,
      },
      {
        input: "Quota exceeded",
        expectedCode: "QUOTA_EXCEEDED",
        retryable: true,
      },
      {
        input: "Failed to fetch",
        expectedCode: "NETWORK_ERROR",
        retryable: true,
      },
      {
        input: "Network error",
        expectedCode: "NETWORK_ERROR",
        retryable: true,
      },
      {
        input: "models/unknown is not found",
        expectedCode: "MODEL_NOT_FOUND",
        retryable: false,
      },
      {
        input: "Invalid request",
        expectedCode: "INVALID_REQUEST",
        retryable: false,
      },
      {
        input: "500 Internal Server Error",
        expectedCode: "SERVER_ERROR",
        retryable: true,
      },
      {
        input: "Something went wrong",
        expectedCode: "UNKNOWN_ERROR",
        retryable: false,
      },
    ];

    errorTestCases.forEach(({ input, expectedCode, retryable }) => {
      it(`should map "${input}" to ${expectedCode}`, async () => {
        if (retryable) {
          vi.useFakeTimers();
        }

        const error = new Error(input);
        mockGenerateContent.mockRejectedValue(error);

        const prompt = createMockEnhancedPrompt();

        let result: Result<APIResponse, APIError>;
        if (retryable) {
          const resultPromise = adapter.generateContent(prompt);
          // Advance timers for all retries
          await vi.advanceTimersToNextTimerAsync();
          await vi.advanceTimersToNextTimerAsync();
          await vi.advanceTimersToNextTimerAsync();
          result = await resultPromise;
        } else {
          result = await adapter.generateContent(prompt);
        }

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe(expectedCode);
          expect(result.error.details?.retryable).toBe(retryable);
        }

        if (retryable) {
          vi.useRealTimers();
        }
      });
    });
  });

  describe("retry logic", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should retry retryable errors up to maxRetries", async () => {
      const networkError = new Error("Failed to fetch");
      networkError.message = "Network error";

      // First 2 calls fail, 3rd succeeds
      mockGenerateContent
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          response: {
            text: () => "Success after retries",
            candidates: [{ finishReason: "STOP", safetyRatings: [] }],
            usageMetadata: {
              promptTokenCount: 5,
              candidatesTokenCount: 10,
              totalTokenCount: 15,
            },
          },
        });

      const prompt = createMockEnhancedPrompt();
      const resultPromise = adapter.generateContent(prompt);

      // Advance timers for each retry
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();

      const result = await resultPromise;

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toBe("Success after retries");
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it("should not retry non-retryable errors", async () => {
      const authError = new Error("API key not valid");
      authError.message = "API key not valid. Please pass a valid API key.";
      mockGenerateContent.mockRejectedValue(authError);

      const prompt = createMockEnhancedPrompt();
      const result = await adapter.generateContent(prompt);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("AUTHENTICATION_FAILED");
      }
      // Should only be called once (no retries)
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("should fail when max retries exceeded", async () => {
      const networkError = new Error("Network error");
      networkError.message = "Failed to fetch";
      mockGenerateContent.mockRejectedValue(networkError);

      const prompt = createMockEnhancedPrompt();
      const resultPromise = adapter.generateContent(prompt);

      // Advance timers for all retries
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();

      const result = await resultPromise;

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("NETWORK_ERROR");
      }
      // Should be called maxRetries + 1 times (initial + 3 retries)
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });

    it("should respect retryAfter from rate limiting errors", async () => {
      const rateLimitError = new Error("429 Too Many Requests");
      rateLimitError.message = "Resource exhausted";

      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          response: {
            text: () => "Success after rate limit",
            candidates: [{ finishReason: "STOP", safetyRatings: [] }],
            usageMetadata: {
              promptTokenCount: 5,
              candidatesTokenCount: 10,
              totalTokenCount: 15,
            },
          },
        });

      const prompt = createMockEnhancedPrompt();
      const resultPromise = adapter.generateContent(prompt);

      // Advance timer for retry
      await vi.advanceTimersToNextTimerAsync();

      const result = await resultPromise;

      expect(isOk(result)).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("should add retry metadata to error when max retries exceeded", async () => {
      const serverError = new Error("500 Internal Server Error");
      serverError.message = "Server error";
      mockGenerateContent.mockRejectedValue(serverError);

      const prompt = createMockEnhancedPrompt();
      const resultPromise = adapter.generateContent(prompt);

      // Advance timers for all retries
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();
      await vi.advanceTimersToNextTimerAsync();

      const result = await resultPromise;

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("SERVER_ERROR");
        // Should include retry information in error details
        expect(result.error.details?.originalError).toBeDefined();
      }
    });
  });

  describe("retry logic with streaming", () => {
    it("should retry initial connection failures for streaming", async () => {
      const networkError = new Error("Connection failed");
      networkError.message = "Network error";

      const mockStream = {
        stream: (async function* () {
          await Promise.resolve();
          yield {
            candidates: [
              {
                content: { parts: [{ text: "Streaming success" }] },
                finishReason: "STOP",
              },
            ],
          };
        })(),
        response: Promise.resolve({
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 10,
            totalTokenCount: 15,
          },
        }),
      };

      // First call fails, second succeeds
      mockGenerateContentStream
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockStream);

      const prompt = createMockEnhancedPrompt();
      const results = [];

      for await (const result of adapter.generateStreamingContent(prompt)) {
        if (isOk(result)) {
          results.push(result.value);
        }
      }

      expect(results).toHaveLength(1);
      expect(results[0]?.content).toBe("Streaming success");
      expect(mockGenerateContentStream).toHaveBeenCalledTimes(2);
    });

    it("should not retry once streaming has started", async () => {
      const mockStream = {
        stream: (async function* () {
          await Promise.resolve();
          yield {
            candidates: [
              {
                content: { parts: [{ text: "First chunk" }] },
                finishReason: null,
              },
            ],
          };
          // Simulate error during streaming
          throw new Error("Stream interrupted");
        })(),
        response: Promise.resolve({}),
      };

      mockGenerateContentStream.mockResolvedValueOnce(mockStream);

      const prompt = createMockEnhancedPrompt();
      const results: Result<APIStreamChunk, APIError>[] = [];

      for await (const result of adapter.generateStreamingContent(prompt)) {
        results.push(result);
      }

      // Should get first chunk successfully, then error
      expect(results).toHaveLength(2);
      const firstResult = results[0];
      const secondResult = results[1];
      expect(firstResult && isOk(firstResult)).toBe(true);
      expect(secondResult && isErr(secondResult)).toBe(true);

      // Should only call generateContentStream once (no retry during streaming)
      expect(mockGenerateContentStream).toHaveBeenCalledTimes(1);
    });
  });

  describe("retry logic with health check", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should retry health check failures", async () => {
      const networkError = new Error("Connection refused");
      networkError.message = "Network error";

      mockGenerateContent
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          response: {
            text: () => "pong",
            candidates: [{ finishReason: "STOP", safetyRatings: [] }],
            usageMetadata: {
              promptTokenCount: 1,
              candidatesTokenCount: 1,
              totalTokenCount: 2,
            },
          },
        });

      const resultPromise = adapter.healthCheck();

      // Advance timer for retry
      await vi.advanceTimersToNextTimerAsync();

      const result = await resultPromise;

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe("healthy");
      }
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });

  describe("Prompt Elevation", () => {
    it("should include elevation system prompt when enabled", async () => {
      // Arrange - Create config with elevation enabled
      const elevationConfig = {
        ...mockConfig,
        prompt: { enableElevation: true },
      };
      const elevationAdapter = new GoogleGeminiAdapter(elevationConfig);

      const mockResponse = {
        response: {
          text: () => "Technical response with elevated specifications",
          candidates: [{ finishReason: "STOP", safetyRatings: [] }],
          usageMetadata: {
            promptTokenCount: 50, // Higher due to system prompt
            candidatesTokenCount: 30,
            totalTokenCount: 80,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = createMockEnhancedPrompt("Create a login form");

      // Act
      const result = await elevationAdapter.generateContent(prompt);

      // Assert
      expect(isOk(result)).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Verify that the request included both system prompt and user prompt
      const mockCall = mockGenerateContent.mock.calls[0];
      expect(mockCall).toBeDefined();
      const requestArg = mockCall?.[0] as {
        contents: Array<{ role: string; parts: Array<{ text: string }> }>;
      };
      expect(requestArg.contents).toBeDefined();
      expect(requestArg.contents).toHaveLength(2);
      const requestContents = requestArg.contents;

      // First message should be the elevation system prompt
      expect(requestContents[0]?.role).toBe("user");
      expect(requestContents[0]?.parts[0]?.text).toContain(
        "technical assistant",
      );
      expect(requestContents[0]?.parts[0]?.text).toContain("enhance");

      // Second message should be the actual user prompt
      expect(requestContents[1]?.role).toBe("user");
      expect(requestContents[1]?.parts[0]?.text).toBe("Create a login form");
    });

    it("should not include elevation system prompt when disabled", async () => {
      // mockConfig already has elevation disabled
      const mockResponse = {
        response: {
          text: () => "Standard response",
          candidates: [{ finishReason: "STOP", safetyRatings: [] }],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 15,
            totalTokenCount: 25,
          },
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const prompt = createMockEnhancedPrompt("Create a login form");

      // Act
      const result = await adapter.generateContent(prompt);

      // Assert
      expect(isOk(result)).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Verify that the request only included the user prompt
      const mockCall = mockGenerateContent.mock.calls[0];
      expect(mockCall).toBeDefined();
      const requestArg = mockCall?.[0] as {
        contents: Array<{ role: string; parts: Array<{ text: string }> }>;
      };
      expect(requestArg.contents).toBeDefined();
      expect(requestArg.contents).toHaveLength(1);
      const requestContents = requestArg.contents;

      // Only message should be the user prompt
      expect(requestContents[0]?.role).toBe("user");
      expect(requestContents[0]?.parts[0]?.text).toBe("Create a login form");
    });
  });
});
