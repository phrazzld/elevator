/**
 * Tests for core error utilities and factories.
 *
 * This module tests the error creation, serialization, and conversion
 * utilities that provide structured error handling throughout the application.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createREPLError,
  createApplicationError,
  createSecurityError,
  createNetworkError,
  serializeError,
  toUserFriendlyError,
  isREPLError,
  isApplicationError,
  isSecurityError,
  isNetworkError,
  isAppError,
  type REPLErrorCode,
  type ApplicationErrorCode,
  type SecurityErrorCode,
  type NetworkErrorCode,
} from "./errors";
import { ConfigurationError } from "../config";

describe("error factories", () => {
  describe("createREPLError", () => {
    it("should create a basic REPL error", () => {
      // Arrange
      const code: REPLErrorCode = "INITIALIZATION_FAILED";
      const message = "Failed to initialize REPL";

      // Act
      const error = createREPLError(code, message);

      // Assert
      expect(error.type).toBe("repl");
      expect(error.code).toBe("INITIALIZATION_FAILED");
      expect(error.message).toBe("Failed to initialize REPL");
      expect(error.details).toBeUndefined();
    });

    it("should create REPL error with details", () => {
      // Arrange
      const code: REPLErrorCode = "INPUT_PROCESSING_ERROR";
      const message = "Failed to process user input";
      const details = {
        command: "invalid command",
        input: "malformed input",
        originalError: { name: "SyntaxError", message: "Unexpected token" },
      };

      // Act
      const error = createREPLError(code, message, details);

      // Assert
      expect(error.type).toBe("repl");
      expect(error.code).toBe("INPUT_PROCESSING_ERROR");
      expect(error.message).toBe("Failed to process user input");
      expect(error.details).toEqual(details);
      expect(error.details?.command).toBe("invalid command");
      expect(error.details?.input).toBe("malformed input");
      expect(error.details?.originalError).toEqual({
        name: "SyntaxError",
        message: "Unexpected token",
      });
    });

    it("should handle all REPL error codes", () => {
      // Arrange
      const codes: REPLErrorCode[] = [
        "INITIALIZATION_FAILED",
        "INPUT_PROCESSING_ERROR",
        "COMMAND_EXECUTION_ERROR",
        "READLINE_ERROR",
        "SHUTDOWN_ERROR",
      ];

      // Act & Assert
      codes.forEach((code) => {
        const error = createREPLError(code, `Test ${code} message`);
        expect(error.type).toBe("repl");
        expect(error.code).toBe(code);
        expect(error.message).toBe(`Test ${code} message`);
      });
    });

    it("should create error with empty details", () => {
      // Arrange
      const code: REPLErrorCode = "SHUTDOWN_ERROR";
      const message = "Graceful shutdown failed";
      const details = {};

      // Act
      const error = createREPLError(code, message, details);

      // Assert
      expect(error.type).toBe("repl");
      expect(error.details).toEqual({});
    });
  });

  describe("createApplicationError", () => {
    it("should create a basic application error", () => {
      // Arrange
      const code: ApplicationErrorCode = "SERVICE_UNAVAILABLE";
      const message = "External service is unavailable";

      // Act
      const error = createApplicationError(code, message);

      // Assert
      expect(error.type).toBe("application");
      expect(error.code).toBe("SERVICE_UNAVAILABLE");
      expect(error.message).toBe("External service is unavailable");
      expect(error.details).toBeUndefined();
    });

    it("should create application error with details", () => {
      // Arrange
      const code: ApplicationErrorCode = "DEPENDENCY_INJECTION_FAILED";
      const message = "Failed to wire dependencies";
      const details = {
        component: "ApiClient",
        operation: "initialization",
        originalError: { message: "Constructor failed" },
      };

      // Act
      const error = createApplicationError(code, message, details);

      // Assert
      expect(error.type).toBe("application");
      expect(error.code).toBe("DEPENDENCY_INJECTION_FAILED");
      expect(error.message).toBe("Failed to wire dependencies");
      expect(error.details).toEqual(details);
    });

    it("should handle all application error codes", () => {
      // Arrange
      const codes: ApplicationErrorCode[] = [
        "DEPENDENCY_INJECTION_FAILED",
        "SERVICE_UNAVAILABLE",
        "INITIALIZATION_ERROR",
        "SHUTDOWN_ERROR",
        "UNEXPECTED_ERROR",
        "INVALID_STATE",
      ];

      // Act & Assert
      codes.forEach((code) => {
        const error = createApplicationError(code, `Test ${code} message`);
        expect(error.type).toBe("application");
        expect(error.code).toBe(code);
      });
    });
  });

  describe("createSecurityError", () => {
    it("should create a basic security error", () => {
      // Arrange
      const code: SecurityErrorCode = "INVALID_API_KEY";
      const message = "API key is invalid or expired";

      // Act
      const error = createSecurityError(code, message);

      // Assert
      expect(error.type).toBe("security");
      expect(error.code).toBe("INVALID_API_KEY");
      expect(error.message).toBe("API key is invalid or expired");
      expect(error.details).toBeUndefined();
    });

    it("should create security error with details", () => {
      // Arrange
      const code: SecurityErrorCode = "INPUT_SANITIZATION_FAILED";
      const message = "Failed to sanitize user input";
      const details = {
        operation: "sanitization",
        input: "malicious input",
        originalError: { reason: "XSS attempt detected" },
      };

      // Act
      const error = createSecurityError(code, message, details);

      // Assert
      expect(error.type).toBe("security");
      expect(error.details?.operation).toBe("sanitization");
      expect(error.details?.input).toBe("malicious input");
    });

    it("should handle all security error codes", () => {
      // Arrange
      const codes: SecurityErrorCode[] = [
        "INVALID_API_KEY",
        "CREDENTIALS_MISSING",
        "INPUT_SANITIZATION_FAILED",
        "UNSAFE_OPERATION",
        "AUTHORIZATION_FAILED",
      ];

      // Act & Assert
      codes.forEach((code) => {
        const error = createSecurityError(code, `Test ${code} message`);
        expect(error.type).toBe("security");
        expect(error.code).toBe(code);
      });
    });
  });

  describe("createNetworkError", () => {
    it("should create a basic network error", () => {
      // Arrange
      const code: NetworkErrorCode = "CONNECTION_FAILED";
      const message = "Failed to establish connection";

      // Act
      const error = createNetworkError(code, message);

      // Assert
      expect(error.type).toBe("network");
      expect(error.code).toBe("CONNECTION_FAILED");
      expect(error.message).toBe("Failed to establish connection");
      expect(error.details).toBeUndefined();
    });

    it("should create network error with details", () => {
      // Arrange
      const code: NetworkErrorCode = "NETWORK_TIMEOUT";
      const message = "Request timed out";
      const details = {
        url: "https://api.example.com",
        method: "POST",
        timeout: 5000,
        originalError: { code: "ETIMEDOUT" },
      };

      // Act
      const error = createNetworkError(code, message, details);

      // Assert
      expect(error.type).toBe("network");
      expect(error.details?.url).toBe("https://api.example.com");
      expect(error.details?.method).toBe("POST");
      expect(error.details?.timeout).toBe(5000);
    });

    it("should handle all network error codes", () => {
      // Arrange
      const codes: NetworkErrorCode[] = [
        "CONNECTION_FAILED",
        "DNS_RESOLUTION_FAILED",
        "SSL_ERROR",
        "PROXY_ERROR",
        "NETWORK_TIMEOUT",
      ];

      // Act & Assert
      codes.forEach((code) => {
        const error = createNetworkError(code, `Test ${code} message`);
        expect(error.type).toBe("network");
        expect(error.code).toBe(code);
      });
    });
  });
});

describe("serializeError", () => {
  beforeEach(() => {
    // Mock Date.now for consistent timestamps in tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("structured application errors", () => {
    it("should serialize REPL error", () => {
      // Arrange
      const error = createREPLError(
        "INPUT_PROCESSING_ERROR",
        "Failed to process input",
        {
          command: "invalid",
          input: "test",
        },
      );

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("repl");
      expect(serialized.code).toBe("INPUT_PROCESSING_ERROR");
      expect(serialized.message).toBe("Failed to process input");
      expect(serialized.timestamp).toBe("2023-01-01T00:00:00.000Z");
      expect(serialized.details).toEqual({
        command: "invalid",
        input: "test",
      });
      expect(serialized.stack).toBeUndefined();
    });

    it("should serialize application error", () => {
      // Arrange
      const error = createApplicationError(
        "SERVICE_UNAVAILABLE",
        "Service is down",
      );

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("application");
      expect(serialized.code).toBe("SERVICE_UNAVAILABLE");
      expect(serialized.message).toBe("Service is down");
      expect(serialized.timestamp).toBe("2023-01-01T00:00:00.000Z");
      expect(serialized.details).toBeUndefined();
    });

    it("should serialize security error with details", () => {
      // Arrange
      const error = createSecurityError("INVALID_API_KEY", "Key expired", {
        operation: "validation",
      });

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("security");
      expect(serialized.details).toEqual({ operation: "validation" });
    });

    it("should serialize network error", () => {
      // Arrange
      const error = createNetworkError(
        "CONNECTION_FAILED",
        "Connection refused",
        {
          url: "https://api.test.com",
          timeout: 5000,
        },
      );

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("network");
      expect(serialized.details).toEqual({
        url: "https://api.test.com",
        timeout: 5000,
      });
    });
  });

  describe("configuration errors", () => {
    it("should serialize ConfigurationError without variable", () => {
      // Arrange
      const error = new ConfigurationError("Configuration is invalid");

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("configuration");
      expect(serialized.code).toBe("CONFIGURATION_ERROR");
      expect(serialized.message).toBe("Configuration is invalid");
      expect(serialized.timestamp).toBe("2023-01-01T00:00:00.000Z");
      expect(serialized.details).toBeUndefined();
      expect(serialized.stack).toBeDefined();
    });

    it("should serialize ConfigurationError with variable", () => {
      // Arrange
      const error = new ConfigurationError(
        "GEMINI_API_KEY is required",
        "GEMINI_API_KEY",
      );

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("configuration");
      expect(serialized.details).toEqual({ variable: "GEMINI_API_KEY" });
      expect(serialized.stack).toBeDefined();
    });
  });

  describe("standard errors", () => {
    it("should serialize standard Error objects", () => {
      // Arrange
      const error = new Error("Something went wrong");

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("error");
      expect(serialized.code).toBe("UNKNOWN_ERROR");
      expect(serialized.message).toBe("Something went wrong");
      expect(serialized.timestamp).toBe("2023-01-01T00:00:00.000Z");
      expect(serialized.details).toBeUndefined();
      expect(serialized.stack).toBeDefined();
    });

    it("should serialize custom Error subclasses", () => {
      // Arrange
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }
      const error = new CustomError("Custom error occurred");

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("error");
      expect(serialized.code).toBe("UNKNOWN_ERROR");
      expect(serialized.message).toBe("Custom error occurred");
      expect(serialized.stack).toBeDefined();
    });
  });

  describe("unknown error types", () => {
    it("should serialize string values", () => {
      // Arrange
      const error = "String error message";

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("unknown");
      expect(serialized.code).toBe("UNKNOWN_ERROR");
      expect(serialized.message).toBe("String error message");
      expect(serialized.timestamp).toBe("2023-01-01T00:00:00.000Z");
      expect(serialized.details).toBeUndefined();
      expect(serialized.stack).toBeUndefined();
    });

    it("should serialize number values", () => {
      // Arrange
      const error = 404;

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("unknown");
      expect(serialized.message).toBe("404");
    });

    it("should serialize null and undefined", () => {
      // Act
      const nullSerialized = serializeError(null);
      const undefinedSerialized = serializeError(undefined);

      // Assert
      expect(nullSerialized.type).toBe("unknown");
      expect(nullSerialized.message).toBe("null");
      expect(undefinedSerialized.message).toBe("undefined");
    });

    it("should serialize object values", () => {
      // Arrange
      const error = { custom: "error", code: 123 };

      // Act
      const serialized = serializeError(error);

      // Assert
      expect(serialized.type).toBe("unknown");
      expect(serialized.message).toBe("[object Object]");
    });
  });
});

describe("toUserFriendlyError", () => {
  describe("configuration errors", () => {
    it("should convert ConfigurationError to user-friendly format", () => {
      // Arrange
      const error = new ConfigurationError(
        "API key is missing",
        "GEMINI_API_KEY",
      );

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Configuration Error");
      expect(friendly.message).toBe("API key is missing");
      expect(friendly.severity).toBe("high");
      expect(friendly.suggestions).toEqual([
        "Check your environment variables",
        "Verify your .env file configuration",
        "Ensure all required settings are provided",
      ]);
      expect(friendly.recoverable).toBe(true);
    });
  });

  describe("structured application errors", () => {
    it("should convert validation errors", () => {
      // Arrange
      const error = createREPLError(
        "INPUT_PROCESSING_ERROR",
        "Invalid input format",
      );

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Interface Error");
      expect(friendly.message).toBe("Invalid input format");
      expect(friendly.severity).toBe("medium");
      expect(friendly.suggestions).toEqual([
        "Try restarting the application",
        "Check your terminal compatibility",
      ]);
      expect(friendly.recoverable).toBe(true);
    });

    it("should convert application errors", () => {
      // Arrange
      const error = createApplicationError(
        "SERVICE_UNAVAILABLE",
        "Database connection failed",
      );

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Application Error");
      expect(friendly.severity).toBe("high");
      expect(friendly.recoverable).toBe(false);
      expect(friendly.suggestions).toEqual([
        "Restart the application",
        "Check system resources",
        "Contact support if problem persists",
      ]);
    });

    it("should convert security errors", () => {
      // Arrange
      const error = createSecurityError(
        "AUTHORIZATION_FAILED",
        "Access denied",
      );

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Security Error");
      expect(friendly.severity).toBe("critical");
      expect(friendly.recoverable).toBe(false);
      expect(friendly.suggestions).toEqual([
        "Verify your credentials",
        "Check permissions",
        "Contact your administrator",
      ]);
    });

    it("should convert network errors", () => {
      // Arrange
      const error = createNetworkError(
        "CONNECTION_FAILED",
        "Unable to connect",
      );

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Network Error");
      expect(friendly.severity).toBe("high");
      expect(friendly.recoverable).toBe(true);
      expect(friendly.suggestions).toEqual([
        "Check your internet connection",
        "Verify proxy settings",
        "Try again in a few moments",
      ]);
    });
  });

  describe("standard errors", () => {
    it("should convert standard Error objects", () => {
      // Arrange
      const error = new Error("Unexpected error occurred");

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Unexpected Error");
      expect(friendly.message).toBe("Unexpected error occurred");
      expect(friendly.severity).toBe("medium");
      expect(friendly.recoverable).toBe(true);
      expect(friendly.suggestions).toEqual([
        "Try the operation again",
        "Check if all inputs are valid",
        "Contact support if problem persists",
      ]);
    });
  });

  describe("unknown error types", () => {
    it("should convert unknown errors", () => {
      // Arrange
      const error = "Unknown string error";

      // Act
      const friendly = toUserFriendlyError(error);

      // Assert
      expect(friendly.title).toBe("Unknown Error");
      expect(friendly.message).toBe("An unexpected error occurred");
      expect(friendly.severity).toBe("medium");
      expect(friendly.recoverable).toBe(true);
      expect(friendly.suggestions).toEqual([
        "Try restarting the application",
        "Contact support with details",
      ]);
    });
  });
});

describe("type guards", () => {
  describe("isREPLError", () => {
    it("should identify REPL errors", () => {
      // Arrange
      const replError = createREPLError("INITIALIZATION_FAILED", "Init failed");
      const appError = createApplicationError(
        "SERVICE_UNAVAILABLE",
        "Service down",
      );

      // Act & Assert
      expect(isREPLError(replError)).toBe(true);
      expect(isREPLError(appError)).toBe(false);
      expect(isREPLError(null)).toBe(false);
      expect(isREPLError(undefined)).toBe(false);
      expect(isREPLError("string")).toBe(false);
      expect(isREPLError({ type: "other" })).toBe(false);
    });
  });

  describe("isApplicationError", () => {
    it("should identify application errors", () => {
      // Arrange
      const appError = createApplicationError(
        "SERVICE_UNAVAILABLE",
        "Service down",
      );
      const secError = createSecurityError("INVALID_API_KEY", "Invalid key");

      // Act & Assert
      expect(isApplicationError(appError)).toBe(true);
      expect(isApplicationError(secError)).toBe(false);
      expect(isApplicationError({})).toBe(false);
    });
  });

  describe("isSecurityError", () => {
    it("should identify security errors", () => {
      // Arrange
      const secError = createSecurityError("INVALID_API_KEY", "Invalid key");
      const netError = createNetworkError(
        "CONNECTION_FAILED",
        "Connection failed",
      );

      // Act & Assert
      expect(isSecurityError(secError)).toBe(true);
      expect(isSecurityError(netError)).toBe(false);
    });
  });

  describe("isNetworkError", () => {
    it("should identify network errors", () => {
      // Arrange
      const netError = createNetworkError(
        "CONNECTION_FAILED",
        "Connection failed",
      );
      const replError = createREPLError("SHUTDOWN_ERROR", "Shutdown failed");

      // Act & Assert
      expect(isNetworkError(netError)).toBe(true);
      expect(isNetworkError(replError)).toBe(false);
    });
  });

  describe("isAppError", () => {
    it("should identify any application error", () => {
      // Arrange
      const replError = createREPLError("INITIALIZATION_FAILED", "Init failed");
      const appError = createApplicationError(
        "SERVICE_UNAVAILABLE",
        "Service down",
      );
      const secError = createSecurityError("INVALID_API_KEY", "Invalid key");
      const netError = createNetworkError(
        "CONNECTION_FAILED",
        "Connection failed",
      );
      const stdError = new Error("Standard error");

      // Act & Assert
      expect(isAppError(replError)).toBe(true);
      expect(isAppError(appError)).toBe(true);
      expect(isAppError(secError)).toBe(true);
      expect(isAppError(netError)).toBe(true);
      expect(isAppError(stdError)).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError("string")).toBe(false);
      expect(isAppError({ noType: true })).toBe(false);
    });
  });
});
