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
  isRetryableError,
  getRetryDelay,
} from "../core/apiClient";
import {
  type EnhancedPrompt,
  type Result,
  success,
  failure,
  isErr,
  isOk,
} from "../core/promptProcessor";
import { type ApiConfig } from "../config";

/**
 * Type for safety rating from Gemini API
 */
interface SafetyRating {
  category?: string;
  probability?: string;
}

/**
 * Type for triggered safety category
 */
interface TriggeredCategory {
  category: string;
  probability: string;
}

/**
 * Calculates retry delay using exponential backoff with jitter.
 */
function calculateRetryDelay(
  error: APIError,
  attempt: number,
  baseDelay = 1000,
): number {
  // Use retryAfter from error if available (rate limiting)
  const delay = getRetryDelay(error, baseDelay);

  // Exponential backoff: delay * (2^attempt)
  const exponentialDelay = delay * Math.pow(2, attempt);

  // Add jitter: ±25% random variation to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);

  return Math.max(exponentialDelay + jitter, 0);
}

/**
 * Sleep for the specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

/**
 * Wraps a promise with timeout logic.
 * Rejects with TimeoutError if the promise doesn't resolve within the timeout.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  let timer: ReturnType<typeof globalThis.setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = globalThis.setTimeout(() => {
      const error = new Error(`${operation} timed out after ${timeoutMs}ms`);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([
    promise.finally(() => globalThis.clearTimeout(timer)),
    timeoutPromise,
  ]);
}

/**
 * Implements retry logic with exponential backoff for API operations.
 */
async function withRetry<T>(
  operation: () => Promise<Result<T, APIError>>,
  maxRetries: number,
): Promise<Result<T, APIError>> {
  let lastError: APIError | null = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();

      // If successful, return immediately
      if (result.success) {
        return result;
      }

      // Extract error from failed result
      if (isErr(result)) {
        lastError = result.error;
      }

      // If this is the last attempt or error is not retryable, return error
      if (
        attempt === maxRetries ||
        (lastError && !isRetryableError(lastError))
      ) {
        if (lastError) {
          // Add retry metadata to final error
          const retryMetadata = {
            attempts: attempt + 1,
            totalDuration: Date.now() - startTime,
            lastAttemptError: lastError,
          };

          return failure({
            ...lastError,
            details: {
              ...lastError.details,
              originalError: {
                ...lastError.details?.originalError,
                retryMetadata,
              },
            },
          });
        }
      }

      // Calculate delay and wait before next attempt
      if (lastError) {
        const delay = calculateRetryDelay(lastError, attempt);
        await sleep(delay);
      }
    } catch (error) {
      // Convert unexpected errors to APIError
      lastError = createAPIError(
        "UNKNOWN_ERROR",
        error instanceof Error ? error.message : "Unexpected error",
        {
          retryable: false,
          originalError: { message: String(error) },
        },
      );

      // Don't retry unexpected errors
      break;
    }
  }

  // This should not be reached, but handle gracefully
  return failure(
    lastError ??
      createAPIError("UNKNOWN_ERROR", "Retry logic failed unexpectedly"),
  );
}

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
 * Extracts retry delay from error response if available.
 * Looks for common patterns in error messages and response data.
 */
function extractRetryDelay(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined;

  // Check for explicit retry-after in error message (e.g., "retry after 60 seconds")
  const retryAfterMatch = error.message.match(
    /retry[\s-]?after[\s:]?(\d+)\s*(second|minute|hour)/i,
  );
  if (retryAfterMatch && retryAfterMatch[1] && retryAfterMatch[2]) {
    const value = parseInt(retryAfterMatch[1], 10);
    const unit = retryAfterMatch[2].toLowerCase();

    switch (unit) {
      case "second":
        return value * 1000;
      case "minute":
        return value * 60 * 1000;
      case "hour":
        return value * 60 * 60 * 1000;
    }
  }

  // Check for rate limit reset time patterns
  const resetMatch = error.message.match(/reset[s]?\s+(?:at|in)\s+(\d+)/i);
  if (resetMatch && resetMatch[1]) {
    const resetTime = parseInt(resetMatch[1], 10);
    // If it looks like a timestamp (large number), calculate delay
    if (resetTime > 1000000000) {
      const now = Date.now();
      const resetTimestamp =
        resetTime > 10000000000 ? resetTime : resetTime * 1000;
      return Math.max(0, resetTimestamp - now);
    }
  }

  return undefined;
}

/**
 * Extract HTTP status code from error if available.
 */
function extractStatusCode(error: Error): number | undefined {
  const message = error.message;

  // Look for HTTP status codes in various formats
  const statusPatterns = [
    /status:?\s*(\d{3})/i,
    /http\s*(\d{3})/i,
    /(\d{3})\s*error/i,
    /error\s*(\d{3})/i,
  ];

  for (const pattern of statusPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const status = parseInt(match[1], 10);
      if (status >= 100 && status < 600) {
        return status;
      }
    }
  }

  return undefined;
}

/**
 * Extract error details from various error properties.
 */
function extractErrorDetails(error: Error): Record<string, unknown> {
  const details: Record<string, unknown> = {
    message: error.message,
    name: error.name,
  };

  // Include stack trace for debugging (non-sensitive)
  if ("stack" in error && error.stack) {
    details["stack"] = error.stack;
  }

  // Extract additional properties that might be present
  const errorObj = error as unknown as Record<string, unknown>;

  // Common error properties from various APIs
  const relevantProps = [
    "code",
    "status",
    "statusCode",
    "errno",
    "syscall",
    "hostname",
    "port",
    "details",
    "metadata",
    "cause",
  ];

  for (const prop of relevantProps) {
    if (prop in errorObj && errorObj[prop] !== undefined) {
      details[prop] = errorObj[prop];
    }
  }

  return details;
}

/**
 * Helper to build error details with conditional statusCode inclusion.
 */
function buildErrorDetails(
  errorDetails: Record<string, unknown>,
  statusCode?: number,
  retryable?: boolean,
  retryAfter?: number,
): APIError["details"] {
  const details: Record<string, unknown> = {
    originalError: errorDetails,
  };

  if (retryable !== undefined) {
    details["retryable"] = retryable;
  }

  if (statusCode !== undefined) {
    details["statusCode"] = statusCode;
  }

  if (retryAfter !== undefined) {
    details["retryAfter"] = retryAfter;
  }

  return details as APIError["details"];
}

/**
 * Safely executes a lifecycle hook, catching and logging any errors.
 * Hook errors should not fail the main operation.
 */
async function executeLifecycleHook(
  hook: (() => void | Promise<void>) | undefined,
  phase: "onStart" | "onComplete",
): Promise<void> {
  if (!hook) return;

  try {
    await Promise.resolve(hook());
  } catch (error) {
    // Log error but don't throw - lifecycle hooks shouldn't break API calls
    console.error(`Error in lifecycle hook ${phase}:`, error);
  }
}

/**
 * Maps Google SDK errors to our domain API errors with comprehensive coverage.
 */
function mapError(error: unknown): APIError {
  if (!(error instanceof Error)) {
    return createAPIError("UNKNOWN_ERROR", "An unknown error occurred", {
      retryable: false,
      originalError: {
        type: typeof error,
        value: String(error),
      },
    });
  }

  const message = error.message.toLowerCase();
  const statusCode = extractStatusCode(error);
  const errorDetails = extractErrorDetails(error);

  // Authentication and authorization errors (4xx client errors)
  if (
    message.includes("api key") ||
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("invalid key") ||
    message.includes("auth") ||
    statusCode === 401 ||
    statusCode === 403
  ) {
    return createAPIError(
      "AUTHENTICATION_FAILED",
      "Authentication failed",
      buildErrorDetails(errorDetails, statusCode, false),
    );
  }

  // Rate limiting errors - comprehensive detection
  if (
    statusCode === 429 ||
    message.includes("rate limit") ||
    message.includes("resource exhausted") ||
    message.includes("too many requests") ||
    message.includes("requests per") ||
    message.includes("throttle") ||
    message.includes("429")
  ) {
    const retryDelay = extractRetryDelay(error);
    return createAPIError(
      "RATE_LIMITED",
      "Rate limit exceeded",
      buildErrorDetails(errorDetails, statusCode, true, retryDelay ?? 60000),
    );
  }

  // Quota errors - distinguish from rate limiting
  if (
    (message.includes("quota") && !message.includes("rate")) ||
    message.includes("billing") ||
    message.includes("usage limit") ||
    message.includes("allowance") ||
    message.includes("credit")
  ) {
    const retryDelay = extractRetryDelay(error);
    return createAPIError(
      "QUOTA_EXCEEDED",
      "API quota exceeded",
      buildErrorDetails(errorDetails, statusCode, true, retryDelay),
    );
  }

  // Timeout errors - comprehensive patterns
  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("deadline exceeded") ||
    message.includes("request timeout") ||
    message.includes("connection timeout") ||
    message.includes("read timeout") ||
    message.includes("write timeout") ||
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    statusCode === 408 ||
    statusCode === 504
  ) {
    return createAPIError(
      "TIMEOUT",
      "Request timed out",
      buildErrorDetails(errorDetails, statusCode, true),
    );
  }

  // Network and connection errors
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("dns") ||
    message.includes("resolve") ||
    message.includes("unreachable") ||
    message.includes("reset") ||
    message.includes("refused") ||
    message.includes("enotfound") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    error.name === "NetworkError" ||
    error.name === "FetchError"
  ) {
    return createAPIError(
      "NETWORK_ERROR",
      "Network error occurred",
      buildErrorDetails(errorDetails, statusCode, true),
    );
  }

  // Model and resource not found errors
  if (
    (message.includes("not found") &&
      (message.includes("model") || message.includes("resource"))) ||
    message.includes("model does not exist") ||
    message.includes("unknown model") ||
    message.includes("invalid model") ||
    statusCode === 404
  ) {
    return createAPIError(
      "MODEL_NOT_FOUND",
      "Specified model not found",
      buildErrorDetails(errorDetails, statusCode, false),
    );
  }

  // Invalid request errors (client-side issues)
  if (
    message.includes("invalid") ||
    message.includes("malformed") ||
    message.includes("bad request") ||
    message.includes("missing") ||
    message.includes("required") ||
    message.includes("validation") ||
    message.includes("parse") ||
    message.includes("format") ||
    statusCode === 400 ||
    statusCode === 422
  ) {
    return createAPIError(
      "INVALID_REQUEST",
      "Invalid request",
      buildErrorDetails(errorDetails, statusCode, false),
    );
  }

  // Server errors (5xx errors)
  if (
    message.includes("server error") ||
    message.includes("internal server") ||
    message.includes("service unavailable") ||
    message.includes("maintenance") ||
    message.includes("overloaded") ||
    message.includes("capacity") ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    (statusCode && statusCode >= 500 && statusCode < 600)
  ) {
    return createAPIError(
      "SERVER_ERROR",
      "Server error occurred",
      buildErrorDetails(errorDetails, statusCode, true),
    );
  }

  // Default case - preserve original error message but ensure proper structure
  return createAPIError(
    "UNKNOWN_ERROR",
    error.message || "An unknown error occurred",
    buildErrorDetails(errorDetails, statusCode, false),
  );
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
   * Core content generation logic without retry.
   */
  private async generateContentCore(
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
      // Apply timeout to the API call
      const timeoutMs = options?.timeout ?? this.config.timeoutMs;
      const result = await withTimeout(
        this.model.generateContent(request),
        timeoutMs,
        "Content generation",
      );

      const response = result.response;

      // Check for safety blocks
      const candidate = response.candidates?.[0];
      if ((candidate?.finishReason as string) === "SAFETY") {
        // Extract detailed safety information
        const safetyRatings = (candidate?.safetyRatings ||
          []) as SafetyRating[];
        const triggeredCategories: TriggeredCategory[] = safetyRatings
          .filter(
            (rating) =>
              rating.probability === "HIGH" || rating.probability === "MEDIUM",
          )
          .map((rating) => ({
            category:
              rating.category?.replace("HARM_CATEGORY_", "").toLowerCase() ||
              "unknown",
            probability: rating.probability?.toLowerCase() || "unknown",
          }));

        const categoriesText =
          triggeredCategories.length > 0
            ? triggeredCategories
                .map((cat) => `${cat.category} (${cat.probability})`)
                .join(", ")
            : "unspecified safety concerns";

        return failure(
          createAPIError(
            "CONTENT_FILTERED",
            `Content was blocked by safety filters: ${categoriesText}`,
            {
              retryable: false,
              originalError: {
                safetyRatings: candidate?.safetyRatings,
                triggeredCategories,
              },
            },
          ),
        );
      }

      // Check for recitation blocks (copyright/plagiarism)
      if ((candidate?.finishReason as string) === "RECITATION") {
        return failure(
          createAPIError(
            "CONTENT_FILTERED",
            "Content was blocked due to recitation (potential copyright or plagiarism concerns)",
            {
              retryable: false,
              originalError: {
                finishReason: candidate?.finishReason,
                citationMetadata: candidate?.citationMetadata,
              },
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
   * Generate content from an enhanced prompt with retry logic.
   */
  async generateContent(
    prompt: EnhancedPrompt,
    options?: APIRequestOptions,
  ): Promise<Result<APIResponse, APIError>> {
    // Call onStart lifecycle hook before starting
    await executeLifecycleHook(options?.lifecycle?.onStart, "onStart");

    try {
      // Execute with retry logic
      const result = await withRetry(
        () => this.generateContentCore(prompt, options),
        this.config.maxRetries,
      );
      return result;
    } finally {
      // Always call onComplete, even if an error occurred
      await executeLifecycleHook(options?.lifecycle?.onComplete, "onComplete");
    }
  }

  /**
   * Creates streaming connection with retry logic.
   */
  private async createStreamingConnection(
    prompt: EnhancedPrompt,
    options?: APIRequestOptions,
  ): Promise<
    Result<
      { stream: AsyncIterable<unknown>; response: Promise<unknown> },
      APIError
    >
  > {
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
      // Apply timeout to the streaming API call
      const timeoutMs = options?.timeout ?? this.config.timeoutMs;
      const streamResult = await withTimeout(
        this.model.generateContentStream(request),
        timeoutMs,
        "Streaming content generation",
      );

      return success(streamResult);
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

    // Call onStart lifecycle hook before starting
    await executeLifecycleHook(options?.lifecycle?.onStart, "onStart");

    try {
      // Retry the initial connection setup
      const connectionResult = await withRetry(
        () => this.createStreamingConnection(prompt, options),
        this.config.maxRetries,
      );

      if (isErr(connectionResult)) {
        yield failure(connectionResult.error);
        return;
      }

      if (isOk(connectionResult)) {
        const streamResult = connectionResult.value;

        try {
          // Stream chunks as they arrive
          for await (const chunk of streamResult.stream) {
            const candidateChunk = chunk as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
                finishReason?: string;
                safetyRatings?: unknown[];
                citationMetadata?: unknown;
              }>;
            };
            const candidate = candidateChunk.candidates?.[0];

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
                  const response = (await streamResult.response) as {
                    usageMetadata?: {
                      promptTokenCount?: number;
                      candidatesTokenCount?: number;
                      totalTokenCount?: number;
                    };
                  };
                  if (response.usageMetadata) {
                    streamChunk = {
                      ...streamChunk,
                      usage: {
                        promptTokens:
                          response.usageMetadata.promptTokenCount ?? 0,
                        completionTokens:
                          response.usageMetadata.candidatesTokenCount ?? 0,
                        totalTokens:
                          response.usageMetadata.totalTokenCount ?? 0,
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
              // Extract detailed safety information
              const safetyRatings = (candidate.safetyRatings ||
                []) as SafetyRating[];
              const triggeredCategories: TriggeredCategory[] = safetyRatings
                .filter(
                  (rating) =>
                    rating.probability === "HIGH" ||
                    rating.probability === "MEDIUM",
                )
                .map((rating) => ({
                  category:
                    rating.category
                      ?.replace("HARM_CATEGORY_", "")
                      .toLowerCase() || "unknown",
                  probability: rating.probability?.toLowerCase() || "unknown",
                }));

              const categoriesText =
                triggeredCategories.length > 0
                  ? triggeredCategories
                      .map((cat) => `${cat.category} (${cat.probability})`)
                      .join(", ")
                  : "unspecified safety concerns";

              yield failure(
                createAPIError(
                  "CONTENT_FILTERED",
                  `Content was blocked by safety filters: ${categoriesText}`,
                  {
                    retryable: false,
                    originalError: {
                      safetyRatings: candidate.safetyRatings,
                      triggeredCategories,
                    },
                  },
                ),
              );
              return;
            }

            // Check for recitation blocks in streaming
            if ((candidate.finishReason as string) === "RECITATION") {
              yield failure(
                createAPIError(
                  "CONTENT_FILTERED",
                  "Content was blocked due to recitation (potential copyright or plagiarism concerns)",
                  {
                    retryable: false,
                    originalError: {
                      finishReason: candidate.finishReason,
                      citationMetadata: candidate.citationMetadata,
                    },
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
      }
    } finally {
      // Always call onComplete, even if an error occurred
      await executeLifecycleHook(options?.lifecycle?.onComplete, "onComplete");
    }
  }

  /**
   * Core health check logic without retry.
   */
  private async healthCheckCore(): Promise<
    Result<{ status: "healthy" }, APIError>
  > {
    try {
      // Simple ping with minimal content
      const result = await withTimeout(
        this.model.generateContent({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0 },
        }),
        this.config.timeoutMs,
        "Health check",
      );

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
   * Check if the API client is properly configured and accessible.
   */
  async healthCheck(): Promise<Result<{ status: "healthy" }, APIError>> {
    return withRetry(() => this.healthCheckCore(), this.config.maxRetries);
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
