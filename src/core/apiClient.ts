/**
 * Core API client interfaces and types.
 *
 * This module defines the contracts for API communication as defined by the core domain.
 * Following hexagonal architecture, these interfaces are owned by the core and implemented
 * by infrastructure adapters.
 */

import { type EnhancedPrompt, type Result } from "./promptProcessor";

/**
 * Configuration options for API requests.
 */
export interface APIRequestOptions {
  /** Model identifier to use for generation */
  readonly model?: string;

  /** Temperature for randomness control (0.0 - 1.0) */
  readonly temperature?: number;

  /** Maximum tokens to generate */
  readonly maxTokens?: number;

  /** Request timeout in milliseconds */
  readonly timeout?: number;

  /** Enable streaming response */
  readonly stream?: boolean;

  /** Additional safety settings */
  readonly safetySettings?: Record<string, unknown>;
}

/**
 * Successful API response containing generated content.
 */
export interface APIResponse {
  /** Generated text content */
  readonly content: string;

  /** Model used for generation */
  readonly model: string;

  /** Token usage statistics */
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };

  /** Response metadata */
  readonly metadata: {
    /** Response generation timestamp */
    readonly timestamp: Date;
    /** Request processing duration in milliseconds */
    readonly duration: number;
    /** Finish reason for the response */
    readonly finishReason: "stop" | "length" | "safety" | "other";
  };
}

/**
 * Error codes for different API failure scenarios.
 */
export type APIErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "AUTHENTICATION_FAILED"
  | "MODEL_NOT_FOUND"
  | "CONTENT_FILTERED"
  | "QUOTA_EXCEEDED"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Error that occurs during API communication.
 */
export interface APIError {
  readonly type: "api";
  readonly code: APIErrorCode;
  readonly message: string;
  readonly details?: {
    /** HTTP status code if applicable */
    readonly statusCode?: number;
    /** Retry after delay in milliseconds */
    readonly retryAfter?: number;
    /** Whether this error is retryable */
    readonly retryable?: boolean;
    /** Original error details */
    readonly originalError?: Record<string, unknown>;
  };
}

/**
 * Streaming response chunk for real-time generation.
 */
export interface APIStreamChunk {
  /** Partial content in this chunk */
  readonly content: string;

  /** Whether this is the final chunk */
  readonly done: boolean;

  /** Accumulated usage stats (only in final chunk) */
  readonly usage?: APIResponse["usage"];

  /** Response metadata (only in final chunk) */
  readonly metadata?: APIResponse["metadata"];
}

/**
 * Core interface for Gemini API communication.
 * Defined by the core domain and implemented by infrastructure adapters.
 */
export interface GeminiAPIClient {
  /**
   * Generate content from an enhanced prompt.
   *
   * @param prompt The enhanced prompt to process
   * @param options Optional request configuration
   * @returns Promise resolving to API response or error
   */
  generateContent(
    prompt: EnhancedPrompt,
    options?: APIRequestOptions,
  ): Promise<Result<APIResponse, APIError>>;

  /**
   * Generate streaming content from an enhanced prompt.
   *
   * @param prompt The enhanced prompt to process
   * @param options Optional request configuration
   * @returns AsyncIterable of response chunks
   */
  generateStreamingContent(
    prompt: EnhancedPrompt,
    options?: APIRequestOptions,
  ): AsyncIterable<Result<APIStreamChunk, APIError>>;

  /**
   * Check if the API client is properly configured and accessible.
   *
   * @returns Promise resolving to success/error result
   */
  healthCheck(): Promise<Result<{ status: "healthy" }, APIError>>;
}

/**
 * Helper to create API errors.
 */
export function createAPIError(
  code: APIErrorCode,
  message: string,
  details?: APIError["details"],
): APIError {
  const error: APIError = {
    type: "api",
    code,
    message,
  };

  if (details !== undefined) {
    return { ...error, details };
  }

  return error;
}

/**
 * Type guard to check if an error is an API error.
 */
export function isAPIError(error: unknown): error is APIError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "api"
  );
}

/**
 * Helper to determine if an API error is retryable.
 */
export function isRetryableError(error: APIError): boolean {
  // Explicitly retryable if marked as such
  if (error.details?.retryable === true) {
    return true;
  }

  // Explicitly non-retryable if marked as such
  if (error.details?.retryable === false) {
    return false;
  }

  // Default retryable errors based on error codes
  const retryableCodes: APIErrorCode[] = [
    "NETWORK_ERROR",
    "TIMEOUT",
    "RATE_LIMITED",
    "QUOTA_EXCEEDED",
    "SERVER_ERROR",
  ];

  return retryableCodes.includes(error.code);
}

/**
 * Helper to get retry delay from error details.
 */
export function getRetryDelay(error: APIError, defaultDelay = 1000): number {
  return error.details?.retryAfter ?? defaultDelay;
}
