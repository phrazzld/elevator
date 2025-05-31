/**
 * Google Generative AI adapter implementation.
 *
 * This adapter implements the GeminiAPIClient interface using Google's
 * Generative AI SDK, following hexagonal architecture principles.
 */

import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
  type GenerationConfig,
  type SafetySetting,
  type GenerateContentRequest,
} from "@google/generative-ai";

import {
  type GeminiAPIClient,
  type APIResponse,
  type APIError,
  type APIStreamChunk,
  type APIRequestOptions,
  createAPIError,
} from "../core/apiClient";
import {
  type EnhancedPrompt,
  type Result,
  success,
  failure,
} from "../core/promptProcessor";
import { type ApiConfig } from "../config";

/**
 * Maps Google SDK finish reasons to our domain types.
 */
function mapFinishReason(
  reason?: string | null,
): APIResponse["metadata"]["finishReason"] {
  const reasonStr = reason as string;
  switch (reasonStr) {
    case "STOP":
      return "stop";
    case "MAX_TOKENS":
      return "length";
    case "SAFETY":
    case "RECITATION":
      return "safety";
    default:
      return "other";
  }
}

/**
 * Maps Google SDK errors to our domain API errors.
 */
function mapError(error: unknown): APIError {
  if (!(error instanceof Error)) {
    return createAPIError("UNKNOWN_ERROR", "An unknown error occurred");
  }

  const message = error.message.toLowerCase();

  // Authentication errors
  if (message.includes("api key") || message.includes("authentication")) {
    return createAPIError("AUTHENTICATION_FAILED", "Authentication failed", {
      retryable: false,
      originalError: { message: error.message },
    });
  }

  // Rate limiting
  if (
    message.includes("429") ||
    message.includes("rate") ||
    message.includes("resource exhausted")
  ) {
    return createAPIError("RATE_LIMITED", "Rate limit exceeded", {
      retryable: true,
      retryAfter: 60000, // Default to 1 minute
      originalError: { message: error.message },
    });
  }

  // Quota errors
  if (message.includes("quota")) {
    return createAPIError("QUOTA_EXCEEDED", "API quota exceeded", {
      retryable: true,
      originalError: { message: error.message },
    });
  }

  // Network errors
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("connection")
  ) {
    return createAPIError("NETWORK_ERROR", "Network error occurred", {
      retryable: true,
      originalError: { message: error.message },
    });
  }

  // Model not found
  if (message.includes("not found") && message.includes("model")) {
    return createAPIError("MODEL_NOT_FOUND", "Specified model not found", {
      retryable: false,
      originalError: { message: error.message },
    });
  }

  // Invalid request
  if (message.includes("invalid")) {
    return createAPIError("INVALID_REQUEST", "Invalid request", {
      retryable: false,
      originalError: { message: error.message },
    });
  }

  // Server errors
  if (message.includes("500") || message.includes("server error")) {
    return createAPIError("SERVER_ERROR", "Server error occurred", {
      retryable: true,
      originalError: { message: error.message },
    });
  }

  // Default
  return createAPIError("UNKNOWN_ERROR", error.message, {
    retryable: false,
    originalError: { message: error.message, stack: error.stack },
  });
}

/**
 * Google Generative AI adapter that implements the GeminiAPIClient interface.
 */
export class GoogleGeminiAdapter implements GeminiAPIClient {
  private readonly client: GoogleGenerativeAI;
  private readonly model: GenerativeModel;
  private readonly config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.client = new GoogleGenerativeAI(config.apiKey);

    this.model = this.client.getGenerativeModel({
      model: config.modelId,
      generationConfig: {
        temperature: config.temperature,
      },
    });
  }

  /**
   * Generate content from an enhanced prompt.
   */
  async generateContent(
    prompt: EnhancedPrompt,
    options?: APIRequestOptions,
  ): Promise<Result<APIResponse, APIError>> {
    const startTime = Date.now();

    try {
      // Build generation config
      const generationConfig: GenerationConfig = {
        temperature: options?.temperature ?? this.config.temperature,
      };
      if (options?.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }

      // Build content
      const contents: Content[] = [
        {
          role: "user",
          parts: [{ text: prompt.content }],
        },
      ];

      // Generate content
      const request: GenerateContentRequest = {
        contents,
        generationConfig,
      };
      const safetySettings = this.buildSafetySettings(options?.safetySettings);
      if (safetySettings) {
        request.safetySettings = safetySettings;
      }
      const result = await this.model.generateContent(request);

      const response = result.response;

      // Check for safety blocks
      const candidate = response.candidates?.[0];
      if ((candidate?.finishReason as string) === "SAFETY") {
        return failure(
          createAPIError(
            "CONTENT_FILTERED",
            "Content was blocked by safety filters",
            {
              retryable: false,
              originalError: { safetyRatings: candidate?.safetyRatings },
            },
          ),
        );
      }

      // Extract text
      const text = response.text();
      if (!text) {
        return failure(
          createAPIError("UNKNOWN_ERROR", "No content generated", {
            retryable: false,
          }),
        );
      }

      // Build response
      const apiResponse: APIResponse = {
        content: text,
        model: options?.model ?? this.config.modelId,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        },
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
          finishReason: mapFinishReason(candidate?.finishReason),
        },
      };

      return success(apiResponse);
    } catch (error) {
      return failure(mapError(error));
    }
  }

  /**
   * Generate streaming content from an enhanced prompt.
   */
  async *generateStreamingContent(
    prompt: EnhancedPrompt,
    options?: APIRequestOptions,
  ): AsyncIterable<Result<APIStreamChunk, APIError>> {
    const startTime = Date.now();

    try {
      // Build generation config
      const generationConfig: GenerationConfig = {
        temperature: options?.temperature ?? this.config.temperature,
      };
      if (options?.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }

      // Build content
      const contents: Content[] = [
        {
          role: "user",
          parts: [{ text: prompt.content }],
        },
      ];

      // Start streaming
      const request: GenerateContentRequest = {
        contents,
        generationConfig,
      };
      const safetySettings = this.buildSafetySettings(options?.safetySettings);
      if (safetySettings) {
        request.safetySettings = safetySettings;
      }
      const streamResult = await this.model.generateContentStream(request);

      try {
        // Stream chunks as they arrive
        for await (const chunk of streamResult.stream) {
          const candidate = chunk.candidates?.[0];

          if (!candidate) continue;

          const text = candidate.content?.parts?.[0]?.text;
          if (text) {
            const isLast =
              (candidate.finishReason as string) === "STOP" ||
              (candidate.finishReason as string) === "MAX_TOKENS" ||
              (candidate.finishReason as string) === "SAFETY";

            let streamChunk: APIStreamChunk = {
              content: text,
              done: isLast,
            };

            // If this is the last chunk, try to get usage metadata
            if (isLast) {
              try {
                const response = await streamResult.response;
                if (response.usageMetadata) {
                  streamChunk = {
                    ...streamChunk,
                    usage: {
                      promptTokens:
                        response.usageMetadata.promptTokenCount ?? 0,
                      completionTokens:
                        response.usageMetadata.candidatesTokenCount ?? 0,
                      totalTokens: response.usageMetadata.totalTokenCount ?? 0,
                    },
                    metadata: {
                      timestamp: new Date(),
                      duration: Date.now() - startTime,
                      finishReason: mapFinishReason(candidate.finishReason),
                    },
                  };
                }
              } catch {
                // Usage metadata might not be available
              }
            }

            yield success(streamChunk);
          }

          // Check for safety blocks
          if ((candidate.finishReason as string) === "SAFETY") {
            yield failure(
              createAPIError(
                "CONTENT_FILTERED",
                "Content was blocked by safety filters",
                {
                  retryable: false,
                  originalError: { safetyRatings: candidate?.safetyRatings },
                },
              ),
            );
            return;
          }
        }
      } catch (streamError) {
        // If error occurs during streaming, yield it
        yield failure(mapError(streamError));
      }
    } catch (error) {
      yield failure(mapError(error));
    }
  }

  /**
   * Check if the API client is properly configured and accessible.
   */
  async healthCheck(): Promise<Result<{ status: "healthy" }, APIError>> {
    try {
      // Simple ping with minimal content
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0 },
      });

      if (result.response.text()) {
        return success({ status: "healthy" });
      }

      return failure(
        createAPIError("UNKNOWN_ERROR", "Health check failed", {
          retryable: false,
        }),
      );
    } catch (error) {
      return failure(mapError(error));
    }
  }

  /**
   * Build safety settings from options.
   */
  private buildSafetySettings(
    customSettings?: Record<string, unknown>,
  ): SafetySetting[] | undefined {
    if (!customSettings) {
      return undefined;
    }

    // Map custom settings to Google SDK format
    const settings: SafetySetting[] = [];

    // Default safety settings - can be overridden by custom settings
    const defaultCategories = [
      HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      HarmCategory.HARM_CATEGORY_HARASSMENT,
      HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    ];

    for (const category of defaultCategories) {
      settings.push({
        category,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      });
    }

    return settings;
  }
}
