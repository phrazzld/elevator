import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleGeminiAdapter } from "./geminiClient";
import {
  isOk,
  isErr,
  type EnhancedPrompt,
  type Result,
} from "../core/promptProcessor";
import { type ApiConfig } from "../config";
import { type APIStreamChunk, type APIError } from "../core/apiClient";

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
  let mockConfig: ApiConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      apiKey: "test-api-key",
      modelId: "gemini-2.5-flash-preview-05-20",
      temperature: 0.7,
      timeoutMs: 30000,
      maxRetries: 3,
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
      const rateLimitError = new Error("Resource exhausted");
      rateLimitError.message = "429 Too Many Requests";
      mockGenerateContent.mockRejectedValue(rateLimitError);

      const prompt = createMockEnhancedPrompt();
      const result = await adapter.generateContent(prompt);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("RATE_LIMITED");
        expect(result.error.details?.retryable).toBe(true);
      }
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
      const networkError = new Error("Network error");
      networkError.message = "Failed to fetch";
      mockGenerateContent.mockRejectedValue(networkError);

      const prompt = createMockEnhancedPrompt();
      const result = await adapter.generateContent(prompt);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("NETWORK_ERROR");
        expect(result.error.details?.retryable).toBe(true);
      }
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
      mockGenerateContent.mockRejectedValue(new Error("Connection refused"));

      const result = await adapter.healthCheck();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe("api");
      }
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
        const error = new Error(input);
        mockGenerateContent.mockRejectedValue(error);

        const prompt = createMockEnhancedPrompt();
        const result = await adapter.generateContent(prompt);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe(expectedCode);
          expect(result.error.details?.retryable).toBe(retryable);
        }
      });
    });
  });
});
