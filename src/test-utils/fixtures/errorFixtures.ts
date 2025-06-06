/**
 * Comprehensive error scenario fixtures for testing API error handling.
 *
 * These fixtures provide realistic error responses that match actual API error patterns,
 * including proper HTTP status codes, retry metadata, and error categorization.
 */

import type { APIError } from "../../core/apiClient";
import { APIErrorBuilder } from "../builders/apiBuilders";

/**
 * Realistic error messages based on actual API responses.
 */
export const ErrorMessages = {
  // Authentication errors
  invalidApiKey: "API key not valid. Please pass a valid API key.",
  missingApiKey:
    "No API key provided. Please include your API key in the request.",
  expiredApiKey: "API key has expired. Please generate a new API key.",
  forbiddenAccess:
    "The caller does not have permission to access this resource.",

  // Rate limiting errors
  rateLimitExceeded: "Request rate limit exceeded. Please try again later.",
  rateLimitWithDelay: "Too many requests. Please retry after 60 seconds.",
  quotaExceeded:
    "API quota exceeded for this project. Please check your billing settings.",
  dailyLimitReached:
    "Daily request limit reached. Quota resets at midnight UTC.",

  // Network errors
  connectionRefused: "Connection refused. Unable to reach the server.",
  connectionTimeout: "Connection timed out after 30 seconds.",
  dnsResolutionFailed: "DNS resolution failed for api.gemini.google.com.",
  sslHandshakeFailed:
    "SSL handshake failed. Please check your network configuration.",
  networkUnreachable:
    "Network is unreachable. Please check your internet connection.",

  // Server errors
  internalServerError:
    "Internal server error occurred. Please try again later.",
  serviceUnavailable: "Service temporarily unavailable due to maintenance.",
  badGateway:
    "Bad gateway. The server received an invalid response from upstream.",
  gatewayTimeout: "Gateway timeout. The server did not respond in time.",

  // Content errors
  modelNotFound: "The specified model 'invalid-model-name' was not found.",
  invalidRequest:
    "Invalid request format. Please check your request parameters.",
  contentTooLarge: "Request content exceeds maximum allowed size of 1MB.",
  malformedRequest: "Request body is malformed. Expected valid JSON.",

  // Safety filter errors
  contentFiltered: "Response was blocked by safety filters",
  hateSpeechDetected: "Content blocked due to hate speech detection",
  harassmentDetected: "Content blocked due to harassment detection",
  dangerousContentDetected:
    "Content blocked due to dangerous content detection",
  explicitContentDetected:
    "Content blocked due to sexually explicit content detection",
  recitationDetected: "Content blocked due to recitation/copyright concerns",
} as const;

/**
 * Factory functions for creating specific error scenarios.
 */
export const ErrorFactories = {
  /**
   * Creates authentication failure errors.
   */
  authentication: {
    invalidKey(): APIError {
      return new APIErrorBuilder()
        .asAuthenticationError()
        .withMessage(ErrorMessages.invalidApiKey)
        .withStatusCode(401)
        .build();
    },

    missingKey(): APIError {
      return new APIErrorBuilder()
        .asAuthenticationError()
        .withMessage(ErrorMessages.missingApiKey)
        .withStatusCode(401)
        .build();
    },

    expiredKey(): APIError {
      return new APIErrorBuilder()
        .asAuthenticationError()
        .withMessage(ErrorMessages.expiredApiKey)
        .withStatusCode(401)
        .build();
    },

    forbidden(): APIError {
      return new APIErrorBuilder()
        .asAuthenticationError()
        .withMessage(ErrorMessages.forbiddenAccess)
        .withStatusCode(403)
        .build();
    },
  },

  /**
   * Creates rate limiting and quota errors.
   */
  rateLimiting: {
    basicRateLimit(): APIError {
      return new APIErrorBuilder()
        .asRateLimitError()
        .withMessage(ErrorMessages.rateLimitExceeded)
        .withStatusCode(429)
        .build();
    },

    withRetryAfter(seconds: number): APIError {
      return new APIErrorBuilder()
        .asRateLimitError()
        .withMessage(
          `Too many requests. Please retry after ${seconds} seconds.`,
        )
        .withStatusCode(429)
        .withRetryAfter(seconds * 1000)
        .build();
    },

    quotaExceeded(): APIError {
      return new APIErrorBuilder()
        .asQuotaExceededError()
        .withMessage(ErrorMessages.quotaExceeded)
        .withStatusCode(429)
        .build();
    },

    dailyLimit(): APIError {
      return new APIErrorBuilder()
        .asQuotaExceededError()
        .withMessage(ErrorMessages.dailyLimitReached)
        .withStatusCode(429)
        .build();
    },
  },

  /**
   * Creates network-related errors.
   */
  network: {
    connectionRefused(): APIError {
      return new APIErrorBuilder()
        .asNetworkError()
        .withMessage(ErrorMessages.connectionRefused)
        .build();
    },

    timeout(): APIError {
      return new APIErrorBuilder()
        .asTimeoutError()
        .withMessage(ErrorMessages.connectionTimeout)
        .withStatusCode(408)
        .build();
    },

    dnsFailure(): APIError {
      return new APIErrorBuilder()
        .asNetworkError()
        .withMessage(ErrorMessages.dnsResolutionFailed)
        .build();
    },

    sslError(): APIError {
      return new APIErrorBuilder()
        .asNetworkError()
        .withMessage(ErrorMessages.sslHandshakeFailed)
        .build();
    },

    unreachable(): APIError {
      return new APIErrorBuilder()
        .asNetworkError()
        .withMessage(ErrorMessages.networkUnreachable)
        .build();
    },
  },

  /**
   * Creates server error scenarios.
   */
  server: {
    internalError(): APIError {
      return new APIErrorBuilder()
        .asServerError()
        .withMessage(ErrorMessages.internalServerError)
        .withStatusCode(500)
        .build();
    },

    unavailable(): APIError {
      return new APIErrorBuilder()
        .asServerError()
        .withMessage(ErrorMessages.serviceUnavailable)
        .withStatusCode(503)
        .build();
    },

    badGateway(): APIError {
      return new APIErrorBuilder()
        .asServerError()
        .withMessage(ErrorMessages.badGateway)
        .withStatusCode(502)
        .build();
    },

    gatewayTimeout(): APIError {
      return new APIErrorBuilder()
        .asServerError()
        .withMessage(ErrorMessages.gatewayTimeout)
        .withStatusCode(504)
        .build();
    },
  },

  /**
   * Creates content and request errors.
   */
  content: {
    modelNotFound(): APIError {
      return new APIErrorBuilder()
        .withCode("MODEL_NOT_FOUND")
        .withMessage(ErrorMessages.modelNotFound)
        .withStatusCode(404)
        .withRetryable(false)
        .build();
    },

    invalidRequest(): APIError {
      return new APIErrorBuilder()
        .asInvalidRequestError()
        .withMessage(ErrorMessages.invalidRequest)
        .withStatusCode(400)
        .build();
    },

    contentTooLarge(): APIError {
      return new APIErrorBuilder()
        .asInvalidRequestError()
        .withMessage(ErrorMessages.contentTooLarge)
        .withStatusCode(413)
        .build();
    },

    malformedRequest(): APIError {
      return new APIErrorBuilder()
        .asInvalidRequestError()
        .withMessage(ErrorMessages.malformedRequest)
        .withStatusCode(400)
        .build();
    },
  },

  /**
   * Creates safety filter errors with detailed category information.
   */
  safety: {
    generalContentFilter(): APIError {
      return new APIErrorBuilder()
        .asContentFilterError()
        .withMessage(ErrorMessages.contentFiltered)
        .withOriginalError({
          reason: "SAFETY",
          categories: ["content_policy_violation"],
        })
        .build();
    },

    hateSpeech(): APIError {
      return new APIErrorBuilder()
        .asContentFilterError()
        .withMessage(ErrorMessages.hateSpeechDetected)
        .withOriginalError({
          reason: "SAFETY",
          triggeredCategories: [
            { category: "hate_speech", probability: "high" },
          ],
        })
        .build();
    },

    harassment(): APIError {
      return new APIErrorBuilder()
        .asContentFilterError()
        .withMessage(ErrorMessages.harassmentDetected)
        .withOriginalError({
          reason: "SAFETY",
          triggeredCategories: [
            { category: "harassment", probability: "medium" },
          ],
        })
        .build();
    },

    dangerousContent(): APIError {
      return new APIErrorBuilder()
        .asContentFilterError()
        .withMessage(ErrorMessages.dangerousContentDetected)
        .withOriginalError({
          reason: "SAFETY",
          triggeredCategories: [
            { category: "dangerous_content", probability: "high" },
          ],
        })
        .build();
    },

    explicitContent(): APIError {
      return new APIErrorBuilder()
        .asContentFilterError()
        .withMessage(ErrorMessages.explicitContentDetected)
        .withOriginalError({
          reason: "SAFETY",
          triggeredCategories: [
            { category: "sexually_explicit", probability: "medium" },
          ],
        })
        .build();
    },

    recitation(): APIError {
      return new APIErrorBuilder()
        .asContentFilterError()
        .withMessage(ErrorMessages.recitationDetected)
        .withOriginalError({
          reason: "RECITATION",
          details: "Content may violate copyright policies",
        })
        .build();
    },

    multipleCategories(): APIError {
      return new APIErrorBuilder()
        .asContentFilterError()
        .withMessage("Content blocked by multiple safety filters")
        .withOriginalError({
          reason: "SAFETY",
          triggeredCategories: [
            { category: "hate_speech", probability: "high" },
            { category: "harassment", probability: "medium" },
            { category: "dangerous_content", probability: "low" },
          ],
        })
        .build();
    },
  },
} as const;

/**
 * Pre-built error scenarios for common test cases.
 */
export const CommonErrorScenarios = {
  // Authentication failures
  invalidApiKey: ErrorFactories.authentication.invalidKey(),
  missingApiKey: ErrorFactories.authentication.missingKey(),
  forbiddenAccess: ErrorFactories.authentication.forbidden(),

  // Rate limiting
  rateLimited: ErrorFactories.rateLimiting.basicRateLimit(),
  rateLimitedWithRetry: ErrorFactories.rateLimiting.withRetryAfter(60),
  quotaExceeded: ErrorFactories.rateLimiting.quotaExceeded(),

  // Network issues
  networkError: ErrorFactories.network.connectionRefused(),
  timeout: ErrorFactories.network.timeout(),
  dnsError: ErrorFactories.network.dnsFailure(),

  // Server problems
  serverError: ErrorFactories.server.internalError(),
  serviceUnavailable: ErrorFactories.server.unavailable(),

  // Content issues
  modelNotFound: ErrorFactories.content.modelNotFound(),
  invalidRequest: ErrorFactories.content.invalidRequest(),

  // Safety filters
  contentFiltered: ErrorFactories.safety.generalContentFilter(),
  hateSpeechBlocked: ErrorFactories.safety.hateSpeech(),
  harassmentBlocked: ErrorFactories.safety.harassment(),
  recitationBlocked: ErrorFactories.safety.recitation(),
} as const;

/**
 * Error scenario collections for comprehensive testing.
 */
export const ErrorCollections = {
  /** All retryable errors */
  retryable: [
    CommonErrorScenarios.rateLimited,
    CommonErrorScenarios.networkError,
    CommonErrorScenarios.timeout,
    CommonErrorScenarios.serverError,
    CommonErrorScenarios.serviceUnavailable,
  ],

  /** All non-retryable errors */
  nonRetryable: [
    CommonErrorScenarios.invalidApiKey,
    CommonErrorScenarios.forbiddenAccess,
    CommonErrorScenarios.modelNotFound,
    CommonErrorScenarios.invalidRequest,
    CommonErrorScenarios.contentFiltered,
    CommonErrorScenarios.hateSpeechBlocked,
  ],

  /** All authentication-related errors */
  authentication: [
    CommonErrorScenarios.invalidApiKey,
    CommonErrorScenarios.missingApiKey,
    CommonErrorScenarios.forbiddenAccess,
  ],

  /** All network-related errors */
  network: [
    CommonErrorScenarios.networkError,
    CommonErrorScenarios.timeout,
    CommonErrorScenarios.dnsError,
  ],

  /** All safety-related errors */
  safety: [
    CommonErrorScenarios.contentFiltered,
    CommonErrorScenarios.hateSpeechBlocked,
    CommonErrorScenarios.harassmentBlocked,
    CommonErrorScenarios.recitationBlocked,
  ],

  /** All server-related errors */
  server: [
    CommonErrorScenarios.serverError,
    CommonErrorScenarios.serviceUnavailable,
  ],
} as const;

/**
 * Error fixtures organized by category.
 */
export const ErrorFixtures = {
  /** Error message templates */
  messages: ErrorMessages,

  /** Factory functions for creating errors */
  factories: ErrorFactories,

  /** Pre-built common error scenarios */
  scenarios: CommonErrorScenarios,

  /** Error collections for comprehensive testing */
  collections: ErrorCollections,
} as const;
