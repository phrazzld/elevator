/**
 * Comprehensive error type definitions for prompt-elevator CLI.
 *
 * This module provides a unified error system that consolidates all error types
 * used throughout the application, following hexagonal architecture principles.
 * All error types maintain the same structure for consistency and are designed
 * to work seamlessly with the Result<T,E> pattern.
 */

// Import existing error types for use in this module
import type {
  PromptValidationError,
  PromptProcessingError,
} from "./promptProcessor";

import type { APIError } from "./apiClient";
import type { FormatterError } from "./formatter";
import { ConfigurationError } from "../config";

// Re-export existing error types for centralized access
export type {
  PromptValidationError,
  PromptProcessingError,
  PromptError,
  ValidationErrorCode,
  ProcessingErrorCode,
  ProcessingStage,
} from "./promptProcessor";

export type { APIError, APIErrorCode } from "./apiClient";
export type { FormatterError } from "./formatter";
export { ConfigurationError } from "../config";

/**
 * Error codes for REPL-related failures.
 */
export type REPLErrorCode =
  | "INITIALIZATION_FAILED"
  | "INPUT_PROCESSING_ERROR"
  | "COMMAND_EXECUTION_ERROR"
  | "READLINE_ERROR"
  | "SHUTDOWN_ERROR";

/**
 * Error codes for general application failures.
 */
export type ApplicationErrorCode =
  | "DEPENDENCY_INJECTION_FAILED"
  | "SERVICE_UNAVAILABLE"
  | "INITIALIZATION_ERROR"
  | "SHUTDOWN_ERROR"
  | "UNEXPECTED_ERROR"
  | "INVALID_STATE";

/**
 * Error codes for security-related failures.
 */
export type SecurityErrorCode =
  | "INVALID_API_KEY"
  | "CREDENTIALS_MISSING"
  | "INPUT_SANITIZATION_FAILED"
  | "UNSAFE_OPERATION"
  | "AUTHORIZATION_FAILED";

/**
 * Error codes for network-related failures that don't fit into API errors.
 */
export type NetworkErrorCode =
  | "CONNECTION_FAILED"
  | "DNS_RESOLUTION_FAILED"
  | "SSL_ERROR"
  | "PROXY_ERROR"
  | "NETWORK_TIMEOUT";

/**
 * Error that occurs during REPL operations.
 */
export interface REPLError {
  readonly type: "repl";
  readonly code: REPLErrorCode;
  readonly message: string;
  readonly details?: {
    readonly command?: string;
    readonly input?: string;
    readonly originalError?: Record<string, unknown>;
  };
}

/**
 * Error that occurs during general application operations.
 */
export interface ApplicationError {
  readonly type: "application";
  readonly code: ApplicationErrorCode;
  readonly message: string;
  readonly details?: {
    readonly component?: string;
    readonly operation?: string;
    readonly originalError?: Record<string, unknown>;
  };
}

/**
 * Error that occurs during security operations.
 */
export interface SecurityError {
  readonly type: "security";
  readonly code: SecurityErrorCode;
  readonly message: string;
  readonly details?: {
    readonly operation?: string;
    readonly input?: string;
    readonly originalError?: Record<string, unknown>;
  };
}

/**
 * Error that occurs during network operations (beyond API calls).
 */
export interface NetworkError {
  readonly type: "network";
  readonly code: NetworkErrorCode;
  readonly message: string;
  readonly details?: {
    readonly url?: string;
    readonly method?: string;
    readonly timeout?: number;
    readonly originalError?: Record<string, unknown>;
  };
}

/**
 * Union of all structured application errors (excluding ConfigurationError which is a class).
 */
export type StructuredAppError =
  | PromptValidationError
  | PromptProcessingError
  | APIError
  | FormatterError
  | REPLError
  | ApplicationError
  | SecurityError
  | NetworkError;

/**
 * Union of all possible application errors.
 * This provides a comprehensive type for error handling throughout the application.
 */
export type AppError = StructuredAppError | ConfigurationError;

/**
 * Serializable error representation for logging and debugging.
 */
export interface SerializableError {
  readonly type: string;
  readonly code: string;
  readonly message: string;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;
  readonly stack?: string;
}

/**
 * Error severity levels for logging and user display.
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/**
 * User-friendly error information for display.
 */
export interface UserFriendlyError {
  readonly title: string;
  readonly message: string;
  readonly severity: ErrorSeverity;
  readonly suggestions?: readonly string[];
  readonly recoverable: boolean;
}

/**
 * Creates a REPL error with consistent structure.
 *
 * @param code Error code identifying the specific failure
 * @param message Human-readable error description
 * @param details Optional additional error context
 * @returns Structured REPL error object
 */
export function createREPLError(
  code: REPLErrorCode,
  message: string,
  details?: REPLError["details"],
): REPLError {
  const error: REPLError = {
    type: "repl",
    code,
    message,
  };

  if (details !== undefined) {
    (error as { details: REPLError["details"] }).details = details;
  }

  return error;
}

/**
 * Creates an application error with consistent structure.
 *
 * @param code Error code identifying the specific failure
 * @param message Human-readable error description
 * @param details Optional additional error context
 * @returns Structured application error object
 */
export function createApplicationError(
  code: ApplicationErrorCode,
  message: string,
  details?: ApplicationError["details"],
): ApplicationError {
  const error: ApplicationError = {
    type: "application",
    code,
    message,
  };

  if (details !== undefined) {
    (error as { details: ApplicationError["details"] }).details = details;
  }

  return error;
}

/**
 * Creates a security error with consistent structure.
 *
 * @param code Error code identifying the specific failure
 * @param message Human-readable error description
 * @param details Optional additional error context
 * @returns Structured security error object
 */
export function createSecurityError(
  code: SecurityErrorCode,
  message: string,
  details?: SecurityError["details"],
): SecurityError {
  const error: SecurityError = {
    type: "security",
    code,
    message,
  };

  if (details !== undefined) {
    (error as { details: SecurityError["details"] }).details = details;
  }

  return error;
}

/**
 * Creates a network error with consistent structure.
 *
 * @param code Error code identifying the specific failure
 * @param message Human-readable error description
 * @param details Optional additional error context
 * @returns Structured network error object
 */
export function createNetworkError(
  code: NetworkErrorCode,
  message: string,
  details?: NetworkError["details"],
): NetworkError {
  const error: NetworkError = {
    type: "network",
    code,
    message,
  };

  if (details !== undefined) {
    (error as { details: NetworkError["details"] }).details = details;
  }

  return error;
}

/**
 * Serializes any application error for logging purposes.
 *
 * @param error The error to serialize
 * @returns Serializable error representation
 */
export function serializeError(error: AppError | Error): SerializableError;
// eslint-disable-next-line no-redeclare
export function serializeError(error: unknown): SerializableError;
// eslint-disable-next-line no-redeclare
export function serializeError(error: unknown): SerializableError {
  const timestamp = new Date().toISOString();

  // Handle ConfigurationError (class)
  if (error instanceof ConfigurationError) {
    const result: SerializableError = {
      type: "configuration",
      code: "CONFIGURATION_ERROR",
      message: error.message,
      timestamp,
    };
    if (error.variable) {
      (result as { details: Record<string, unknown> }).details = {
        variable: error.variable,
      };
    }
    if (error.stack) {
      (result as { stack: string }).stack = error.stack;
    }
    return result;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const result: SerializableError = {
      type: "error",
      code: "UNKNOWN_ERROR",
      message: error.message,
      timestamp,
    };
    if (error.stack) {
      (result as { stack: string }).stack = error.stack;
    }
    return result;
  }

  // Handle structured application errors
  if (typeof error === "object" && error !== null && "type" in error) {
    const structuredError = error as StructuredAppError;
    const result: SerializableError = {
      type: structuredError.type,
      code: structuredError.code as string,
      message: structuredError.message,
      timestamp,
    };
    if ("details" in structuredError && structuredError.details) {
      (result as { details: Record<string, unknown> }).details =
        structuredError.details as Record<string, unknown>;
    }
    return result;
  }

  // Handle unknown error types
  return {
    type: "unknown",
    code: "UNKNOWN_ERROR",
    message: String(error),
    timestamp,
  };
}

/**
 * Converts any application error to a user-friendly representation.
 *
 * @param error The error to convert
 * @returns User-friendly error information
 */
export function toUserFriendlyError(error: AppError | Error): UserFriendlyError;
// eslint-disable-next-line no-redeclare
export function toUserFriendlyError(error: unknown): UserFriendlyError;
// eslint-disable-next-line no-redeclare
export function toUserFriendlyError(error: unknown): UserFriendlyError {
  // Handle ConfigurationError
  if (error instanceof ConfigurationError) {
    return {
      title: "Configuration Error",
      message: error.message,
      severity: "high",
      suggestions: [
        "Check your environment variables",
        "Verify your .env file configuration",
        "Ensure all required settings are provided",
      ],
      recoverable: true,
    };
  }

  // Handle structured application errors
  if (typeof error === "object" && error !== null && "type" in error) {
    const structuredError = error as StructuredAppError;

    switch (structuredError.type) {
      case "validation":
        return {
          title: "Input Validation Error",
          message: structuredError.message,
          severity: "medium",
          suggestions: [
            "Check your input format",
            "Ensure all required fields are provided",
            "Review the input requirements",
          ],
          recoverable: true,
        };

      case "processing":
        return {
          title: "Processing Error",
          message: structuredError.message,
          severity: "medium",
          suggestions: [
            "Try again with different input",
            "Check if the service is available",
            "Simplify your request",
          ],
          recoverable: true,
        };

      case "api":
        return {
          title: "API Error",
          message: structuredError.message,
          severity: "high",
          suggestions: [
            "Check your internet connection",
            "Verify your API key is valid",
            "Try again in a few moments",
          ],
          recoverable: true,
        };

      case "formatter":
        return {
          title: "Display Error",
          message: "Unable to format output properly",
          severity: "low",
          suggestions: ["Try using --raw mode", "Check your terminal settings"],
          recoverable: true,
        };

      case "repl":
        return {
          title: "Interface Error",
          message: structuredError.message,
          severity: "medium",
          suggestions: [
            "Try restarting the application",
            "Check your terminal compatibility",
          ],
          recoverable: true,
        };

      case "application":
        return {
          title: "Application Error",
          message: structuredError.message,
          severity: "high",
          suggestions: [
            "Restart the application",
            "Check system resources",
            "Contact support if problem persists",
          ],
          recoverable: false,
        };

      case "security":
        return {
          title: "Security Error",
          message: structuredError.message,
          severity: "critical",
          suggestions: [
            "Verify your credentials",
            "Check permissions",
            "Contact your administrator",
          ],
          recoverable: false,
        };

      case "network":
        return {
          title: "Network Error",
          message: structuredError.message,
          severity: "high",
          suggestions: [
            "Check your internet connection",
            "Verify proxy settings",
            "Try again in a few moments",
          ],
          recoverable: true,
        };
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      title: "Unexpected Error",
      message: error.message,
      severity: "medium",
      suggestions: [
        "Try the operation again",
        "Check if all inputs are valid",
        "Contact support if problem persists",
      ],
      recoverable: true,
    };
  }

  // Handle unknown error types
  return {
    title: "Unknown Error",
    message: "An unexpected error occurred",
    severity: "medium",
    suggestions: [
      "Try restarting the application",
      "Contact support with details",
    ],
    recoverable: true,
  };
}

/**
 * Type guards for error identification
 */

export function isREPLError(error: unknown): error is REPLError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "repl"
  );
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "application"
  );
}

export function isSecurityError(error: unknown): error is SecurityError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "security"
  );
}

export function isNetworkError(error: unknown): error is NetworkError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "network"
  );
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    typeof (error as { type: unknown }).type === "string"
  );
}
