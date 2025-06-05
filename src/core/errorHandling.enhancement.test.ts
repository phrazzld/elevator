/**
 * Enhanced error handling tests covering domain-specific error creation and integration.
 *
 * This module tests the domain-specific error creation functions from individual modules
 * and their integration with the central error handling system. It complements the existing
 * errors.test.ts by focusing on prompt processing, API, and formatter error scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createValidationError,
  createProcessingError,
  type ValidationErrorCode,
  type ProcessingErrorCode,
  type ProcessingStage,
  isValidationError,
  isProcessingError,
} from "./promptProcessor";
import {
  createAPIError,
  isAPIError,
  isRetryableError,
  getRetryDelay,
  type APIErrorCode,
} from "./apiClient";
import {
  createFormatterError,
  isFormatterError,
  type FormatterError,
} from "./formatter";
import { serializeError, toUserFriendlyError, isAppError } from "./errors";

describe("domain-specific error creation", () => {
  describe("prompt processing error creation", () => {
    describe("createValidationError", () => {
      it("should create a basic validation error", () => {
        // Arrange
        const code: ValidationErrorCode = "EMPTY_PROMPT";
        const message = "Prompt cannot be empty";

        // Act
        const error = createValidationError(code, message);

        // Assert
        expect(error.type).toBe("validation");
        expect(error.code).toBe("EMPTY_PROMPT");
        expect(error.message).toBe("Prompt cannot be empty");
        expect(error.details).toBeUndefined();
      });

      it("should create validation error with details", () => {
        // Arrange
        const code: ValidationErrorCode = "TOO_LONG";
        const message = "Prompt exceeds maximum length";
        const details = {
          maxLength: 10000,
          actualLength: 15000,
          contentPreview: "Long content...",
        };

        // Act
        const error = createValidationError(code, message, details);

        // Assert
        expect(error.type).toBe("validation");
        expect(error.code).toBe("TOO_LONG");
        expect(error.message).toBe("Prompt exceeds maximum length");
        expect(error.details).toEqual(details);
        expect(error.details?.["maxLength"]).toBe(10000);
        expect(error.details?.["actualLength"]).toBe(15000);
      });

      it("should handle all validation error codes", () => {
        // Arrange
        const codes: ValidationErrorCode[] = [
          "EMPTY_PROMPT",
          "TOO_SHORT",
          "TOO_LONG",
          "INVALID_CHARACTERS",
          "MALFORMED_CONTENT",
          "UNSAFE_CONTENT",
        ];

        // Act & Assert
        codes.forEach((code) => {
          const error = createValidationError(code, `Test ${code} message`);
          expect(error.type).toBe("validation");
          expect(error.code).toBe(code);
          expect(error.message).toBe(`Test ${code} message`);
        });
      });

      it("should create error with empty details object", () => {
        // Arrange
        const code: ValidationErrorCode = "MALFORMED_CONTENT";
        const message = "Invalid format detected";
        const details = {};

        // Act
        const error = createValidationError(code, message, details);

        // Assert
        expect(error.details).toEqual({});
      });

      it("should handle complex details with nested objects", () => {
        // Arrange
        const code: ValidationErrorCode = "UNSAFE_CONTENT";
        const message = "Content contains unsafe patterns";
        const details = {
          patterns: ["script", "eval"],
          severity: "high",
          metadata: {
            detectedAt: "line 5",
            confidence: 0.95,
          },
        };

        // Act
        const error = createValidationError(code, message, details);

        // Assert
        expect(error.details?.["patterns"]).toEqual(["script", "eval"]);
        expect(error.details?.["metadata"]).toEqual({
          detectedAt: "line 5",
          confidence: 0.95,
        });
      });
    });

    describe("createProcessingError", () => {
      it("should create a basic processing error", () => {
        // Arrange
        const code: ProcessingErrorCode = "ENHANCEMENT_FAILED";
        const message = "Failed to enhance prompt";
        const stage: ProcessingStage = "enhancement";

        // Act
        const error = createProcessingError(code, message, stage);

        // Assert
        expect(error.type).toBe("processing");
        expect(error.code).toBe("ENHANCEMENT_FAILED");
        expect(error.message).toBe("Failed to enhance prompt");
        expect(error.stage).toBe("enhancement");
        expect(error.details).toBeUndefined();
      });

      it("should create processing error with details", () => {
        // Arrange
        const code: ProcessingErrorCode = "ENHANCEMENT_FAILED";
        const message = "Failed to communicate with API";
        const stage: ProcessingStage = "enhancement";
        const details = {
          attemptCount: 3,
          lastError: "Connection timeout",
          apiEndpoint: "https://api.example.com",
        };

        // Act
        const error = createProcessingError(code, message, stage, details);

        // Assert
        expect(error.type).toBe("processing");
        expect(error.code).toBe("ENHANCEMENT_FAILED");
        expect(error.stage).toBe("enhancement");
        expect(error.details).toEqual(details);
        expect(error.details?.["attemptCount"]).toBe(3);
      });

      it("should handle all processing error codes", () => {
        // Arrange
        const codes: ProcessingErrorCode[] = [
          "ENHANCEMENT_FAILED",
          "PROCESSING_TIMEOUT",
          "INVALID_STATE",
          "CONFIGURATION_ERROR",
        ];

        // Act & Assert
        codes.forEach((code) => {
          const error = createProcessingError(
            code,
            `Test ${code} message`,
            "enhancement",
          );
          expect(error.type).toBe("processing");
          expect(error.code).toBe(code);
          expect(error.stage).toBe("enhancement");
        });
      });

      it("should handle all processing stages", () => {
        // Arrange
        const stages: ProcessingStage[] = [
          "validation",
          "enhancement",
          "preparation",
        ];

        // Act & Assert
        stages.forEach((stage) => {
          const error = createProcessingError(
            "ENHANCEMENT_FAILED",
            "Test error",
            stage,
          );
          expect(error.stage).toBe(stage);
        });
      });
    });
  });

  describe("API error creation", () => {
    describe("createAPIError", () => {
      it("should create a basic API error", () => {
        // Arrange
        const code: APIErrorCode = "NETWORK_ERROR";
        const message = "Network connection failed";

        // Act
        const error = createAPIError(code, message);

        // Assert
        expect(error.type).toBe("api");
        expect(error.code).toBe("NETWORK_ERROR");
        expect(error.message).toBe("Network connection failed");
        expect(error.details).toBeUndefined();
      });

      it("should create API error with comprehensive details", () => {
        // Arrange
        const code: APIErrorCode = "RATE_LIMITED";
        const message = "API rate limit exceeded";
        const details = {
          statusCode: 429,
          retryAfter: 60000,
          retryable: true,
          originalError: {
            headers: { "x-ratelimit-remaining": "0" },
            response: "Rate limit exceeded",
          },
        };

        // Act
        const error = createAPIError(code, message, details);

        // Assert
        expect(error.type).toBe("api");
        expect(error.code).toBe("RATE_LIMITED");
        expect(error.details?.["statusCode"]).toBe(429);
        expect(error.details?.["retryAfter"]).toBe(60000);
        expect(error.details?.["retryable"]).toBe(true);
        expect(error.details?.["originalError"]).toEqual({
          headers: { "x-ratelimit-remaining": "0" },
          response: "Rate limit exceeded",
        });
      });

      it("should handle all API error codes", () => {
        // Arrange
        const codes: APIErrorCode[] = [
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
        ];

        // Act & Assert
        codes.forEach((code) => {
          const error = createAPIError(code, `Test ${code} message`);
          expect(error.type).toBe("api");
          expect(error.code).toBe(code);
        });
      });

      it("should create error with partial details", () => {
        // Arrange
        const code: APIErrorCode = "TIMEOUT";
        const message = "Request timed out";
        const details = {
          statusCode: 408,
          // retryAfter and retryable intentionally omitted
        };

        // Act
        const error = createAPIError(code, message, details);

        // Assert
        expect(error.details?.["statusCode"]).toBe(408);
        expect(error.details?.["retryAfter"]).toBeUndefined();
        expect(error.details?.["retryable"]).toBeUndefined();
      });
    });

    describe("API error utility functions", () => {
      describe("isRetryableError", () => {
        it("should identify retryable errors by code", () => {
          // Arrange
          const retryableError = createAPIError(
            "NETWORK_ERROR",
            "Network failed",
          );
          const nonRetryableError = createAPIError(
            "AUTHENTICATION_FAILED",
            "Invalid key",
          );

          // Act & Assert
          expect(isRetryableError(retryableError)).toBe(true);
          expect(isRetryableError(nonRetryableError)).toBe(false);
        });

        it("should respect explicit retryable flag", () => {
          // Arrange
          const explicitlyNonRetryable = createAPIError(
            "NETWORK_ERROR",
            "Network failed",
            { retryable: false },
          );
          const explicitlyRetryable = createAPIError(
            "AUTHENTICATION_FAILED",
            "Invalid key",
            { retryable: true },
          );

          // Act & Assert
          expect(isRetryableError(explicitlyNonRetryable)).toBe(false);
          expect(isRetryableError(explicitlyRetryable)).toBe(true);
        });

        it("should handle all retryable error codes", () => {
          // Arrange
          const retryableCodes: APIErrorCode[] = [
            "NETWORK_ERROR",
            "TIMEOUT",
            "RATE_LIMITED",
            "QUOTA_EXCEEDED",
            "SERVER_ERROR",
          ];

          // Act & Assert
          retryableCodes.forEach((code) => {
            const error = createAPIError(code, "Test message");
            expect(isRetryableError(error)).toBe(true);
          });
        });

        it("should handle all non-retryable error codes", () => {
          // Arrange
          const nonRetryableCodes: APIErrorCode[] = [
            "AUTHENTICATION_FAILED",
            "INVALID_REQUEST",
            "MODEL_NOT_FOUND",
            "CONTENT_FILTERED",
            "UNKNOWN_ERROR",
          ];

          // Act & Assert
          nonRetryableCodes.forEach((code) => {
            const error = createAPIError(code, "Test message");
            expect(isRetryableError(error)).toBe(false);
          });
        });
      });

      describe("getRetryDelay", () => {
        it("should return retryAfter from error details", () => {
          // Arrange
          const error = createAPIError("RATE_LIMITED", "Rate limited", {
            retryAfter: 30000,
          });

          // Act
          const delay = getRetryDelay(error);

          // Assert
          expect(delay).toBe(30000);
        });

        it("should return default delay when retryAfter is missing", () => {
          // Arrange
          const error = createAPIError("NETWORK_ERROR", "Network failed");

          // Act
          const delay = getRetryDelay(error);

          // Assert
          expect(delay).toBe(1000);
        });

        it("should return custom default delay", () => {
          // Arrange
          const error = createAPIError("TIMEOUT", "Request timed out");
          const customDefault = 5000;

          // Act
          const delay = getRetryDelay(error, customDefault);

          // Assert
          expect(delay).toBe(5000);
        });
      });
    });
  });

  describe("formatter error creation", () => {
    describe("createFormatterError", () => {
      it("should create a basic formatter error", () => {
        // Arrange
        const code: FormatterError["code"] = "FORMAT_ERROR";
        const message = "Failed to format content";

        // Act
        const error = createFormatterError(code, message);

        // Assert
        expect(error.type).toBe("formatter");
        expect(error.code).toBe("FORMAT_ERROR");
        expect(error.message).toBe("Failed to format content");
        expect(error.details).toBeUndefined();
      });

      it("should create formatter error with details", () => {
        // Arrange
        const code: FormatterError["code"] = "INVALID_CONTENT";
        const message = "Content cannot be formatted";
        const details = {
          originalContent: "Malformed content...",
          options: {
            mode: "formatted" as const,
            streaming: true,
          },
        };

        // Act
        const error = createFormatterError(code, message, details);

        // Assert
        expect(error.type).toBe("formatter");
        expect(error.code).toBe("INVALID_CONTENT");
        expect(error.details?.["originalContent"]).toBe("Malformed content...");
        expect(error.details?.["options"]).toEqual({
          mode: "formatted",
          streaming: true,
        });
      });

      it("should handle all formatter error codes", () => {
        // Arrange
        const codes: FormatterError["code"][] = [
          "FORMAT_ERROR",
          "INVALID_CONTENT",
          "UNKNOWN_ERROR",
        ];

        // Act & Assert
        codes.forEach((code) => {
          const error = createFormatterError(code, `Test ${code} message`);
          expect(error.type).toBe("formatter");
          expect(error.code).toBe(code);
        });
      });
    });
  });
});

describe("error integration with central system", () => {
  beforeEach(() => {
    // Mock Date.now for consistent timestamps in tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("serialization integration", () => {
    it("should serialize validation errors correctly", () => {
      // Arrange
      const error = createValidationError("TOO_LONG", "Content too long", {
        maxLength: 1000,
        actualLength: 1500,
      });

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("validation");
      expect(serialized.code).toBe("TOO_LONG");
      expect(serialized.message).toBe("Content too long");
      expect(serialized.timestamp).toBe("2023-01-01T00:00:00.000Z");
      expect(serialized.details).toEqual({
        maxLength: 1000,
        actualLength: 1500,
      });
    });

    it("should serialize processing errors correctly", () => {
      // Arrange
      const error = createProcessingError(
        "ENHANCEMENT_FAILED",
        "API call failed",
        "enhancement",
        {
          attempts: 3,
          lastError: "Timeout",
        },
      );

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("processing");
      expect(serialized.code).toBe("ENHANCEMENT_FAILED");
      expect(serialized.details).toEqual({
        attempts: 3,
        lastError: "Timeout",
      });
    });

    it("should serialize API errors correctly", () => {
      // Arrange
      const error = createAPIError("RATE_LIMITED", "Rate limit exceeded", {
        statusCode: 429,
        retryAfter: 60000,
      });

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("api");
      expect(serialized.code).toBe("RATE_LIMITED");
      expect(serialized.details).toEqual({
        statusCode: 429,
        retryAfter: 60000,
      });
    });

    it("should serialize formatter errors correctly", () => {
      // Arrange
      const error = createFormatterError("FORMAT_ERROR", "Formatting failed", {
        originalContent: "test content",
      });

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("formatter");
      expect(serialized.code).toBe("FORMAT_ERROR");
      expect(serialized.details).toEqual({
        originalContent: "test content",
      });
    });
  });

  describe("user-friendly conversion integration", () => {
    it("should convert validation errors to user-friendly format", () => {
      // Arrange
      const error = createValidationError(
        "EMPTY_PROMPT",
        "Prompt cannot be empty",
      );

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Input Validation Error");
      expect(friendly.message).toBe("Prompt cannot be empty");
      expect(friendly.severity).toBe("medium");
      expect(friendly.suggestions).toEqual([
        "Check your input format",
        "Ensure all required fields are provided",
        "Review the input requirements",
      ]);
      expect(friendly.recoverable).toBe(true);
    });

    it("should convert processing errors to user-friendly format", () => {
      // Arrange
      const error = createProcessingError(
        "ENHANCEMENT_FAILED",
        "Failed to enhance prompt",
        "enhancement",
      );

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Processing Error");
      expect(friendly.message).toBe("Failed to enhance prompt");
      expect(friendly.severity).toBe("medium");
      expect(friendly.suggestions).toEqual([
        "Try again with different input",
        "Check if the service is available",
        "Simplify your request",
      ]);
      expect(friendly.recoverable).toBe(true);
    });

    it("should convert API errors to user-friendly format", () => {
      // Arrange
      const error = createAPIError(
        "AUTHENTICATION_FAILED",
        "API key is invalid",
      );

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("API Error");
      expect(friendly.message).toBe("API key is invalid");
      expect(friendly.severity).toBe("high");
      expect(friendly.suggestions).toEqual([
        "Check your internet connection",
        "Verify your API key is valid",
        "Try again in a few moments",
      ]);
      expect(friendly.recoverable).toBe(true);
    });

    it("should convert formatter errors to user-friendly format", () => {
      // Arrange
      const error = createFormatterError(
        "FORMAT_ERROR",
        "Unable to format output",
      );

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Display Error");
      expect(friendly.message).toBe("Unable to format output properly");
      expect(friendly.severity).toBe("low");
      expect(friendly.suggestions).toEqual([
        "Try using --raw mode",
        "Check your terminal settings",
      ]);
      expect(friendly.recoverable).toBe(true);
    });
  });

  describe("type guard integration", () => {
    it("should identify domain errors with isAppError", () => {
      // Arrange
      const validationError = createValidationError(
        "EMPTY_PROMPT",
        "Empty prompt",
      );
      const processingError = createProcessingError(
        "ENHANCEMENT_FAILED",
        "Enhancement failed",
        "enhancement",
      );
      const apiError = createAPIError("NETWORK_ERROR", "Network failed");
      const formatterError = createFormatterError(
        "FORMAT_ERROR",
        "Format failed",
      );

      // Act & Assert
      expect(isAppError(validationError)).toBe(true);
      expect(isAppError(processingError)).toBe(true);
      expect(isAppError(apiError)).toBe(true);
      expect(isAppError(formatterError)).toBe(true);
    });

    it("should use specific type guards correctly", () => {
      // Arrange
      const validationError = createValidationError(
        "TOO_LONG",
        "Content too long",
      );
      const processingError = createProcessingError(
        "ENHANCEMENT_FAILED",
        "API failed",
        "enhancement",
      );
      const apiError = createAPIError("TIMEOUT", "Request timed out");
      const formatterError = createFormatterError(
        "INVALID_CONTENT",
        "Invalid content",
      );

      // Act & Assert
      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(processingError)).toBe(false);

      expect(isProcessingError(processingError)).toBe(true);
      expect(isProcessingError(validationError)).toBe(false);

      expect(isAPIError(apiError)).toBe(true);
      expect(isAPIError(validationError)).toBe(false);

      expect(isFormatterError(formatterError)).toBe(true);
      expect(isFormatterError(apiError)).toBe(false);
    });
  });

  describe("error chaining scenarios", () => {
    it("should maintain context through error transformations", () => {
      // Arrange
      const originalValidationError = createValidationError(
        "UNSAFE_CONTENT",
        "Content contains unsafe patterns",
        {
          patterns: ["script", "eval"],
          confidence: 0.95,
        },
      );

      // Act - simulate error being caught and re-thrown as processing error
      const chainedError = createProcessingError(
        "PROCESSING_TIMEOUT",
        `Processing failed due to validation: ${originalValidationError.message}`,
        "validation",
        {
          originalError: originalValidationError,
          stage: "validation",
        },
      );

      // Assert
      expect(chainedError.details?.["originalError"]).toEqual(
        originalValidationError,
      );
      expect(chainedError.message).toContain("unsafe patterns");
    });

    it("should handle nested error serialization", () => {
      // Arrange
      const innerError = createAPIError("NETWORK_ERROR", "Network failed");
      const outerError = createProcessingError(
        "ENHANCEMENT_FAILED",
        "Failed to process due to API error",
        "enhancement",
        {
          originalError: innerError,
          retryCount: 3,
        },
      );

      // Act
      const serialized = serializeError(outerError);

      // Assert
      expect(serialized.type).toBe("processing");
      expect(serialized.details?.["originalError"]).toEqual(innerError);
      expect(serialized.details?.["retryCount"]).toBe(3);
    });
  });
});
