/**
 * Test data builders for error-related types.
 *
 * These builders provide fluent APIs for creating various error objects with sensible defaults
 * and easy customization for testing different error scenarios.
 */

import type {
  PromptValidationError,
  PromptProcessingError,
  REPLError,
  ApplicationError,
  SecurityError,
  NetworkError,
  ValidationErrorCode,
  ProcessingErrorCode,
  ProcessingStage,
  REPLErrorCode,
  ApplicationErrorCode,
  SecurityErrorCode,
  NetworkErrorCode,
} from "../../core/errors";

/**
 * Builder for PromptValidationError objects.
 */
export class PromptValidationErrorBuilder {
  private code: ValidationErrorCode = "INVALID_CHARACTERS";
  private message = "Prompt contains invalid characters";
  private details?: Record<string, unknown>;

  withCode(code: ValidationErrorCode): this {
    this.code = code;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withDetails(details: Record<string, unknown>): this {
    this.details = details;
    return this;
  }

  asEmptyPromptError(): this {
    this.code = "EMPTY_PROMPT";
    this.message = "Prompt cannot be empty";
    this.details = { minLength: 1 };
    return this;
  }

  asTooLongError(): this {
    this.code = "TOO_LONG";
    this.message = "Prompt exceeds maximum length";
    this.details = { maxLength: 1000, actualLength: 1500 };
    return this;
  }

  asTooShortError(): this {
    this.code = "TOO_SHORT";
    this.message = "Prompt is too short";
    this.details = { minLength: 10, actualLength: 5 };
    return this;
  }

  asInvalidCharactersError(): this {
    this.code = "INVALID_CHARACTERS";
    this.message = "Prompt contains invalid characters";
    this.details = { invalidChars: ["<", ">", "&"] };
    return this;
  }

  asMalformedContentError(): this {
    this.code = "MALFORMED_CONTENT";
    this.message = "Prompt content is malformed";
    this.details = { reason: "Unbalanced quotes" };
    return this;
  }

  asUnsafeContentError(): this {
    this.code = "UNSAFE_CONTENT";
    this.message = "Prompt contains unsafe content";
    this.details = { categories: ["violence", "hate-speech"] };
    return this;
  }

  build(): PromptValidationError {
    const error: PromptValidationError = {
      type: "validation",
      code: this.code,
      message: this.message,
    };

    if (this.details !== undefined) {
      (error as { details: Record<string, unknown> }).details = this.details;
    }

    return error;
  }
}

/**
 * Builder for PromptProcessingError objects.
 */
export class PromptProcessingErrorBuilder {
  private code: ProcessingErrorCode = "ENHANCEMENT_FAILED";
  private message = "Failed to enhance prompt";
  private stage: ProcessingStage = "enhancement";
  private details?: Record<string, unknown>;

  withCode(code: ProcessingErrorCode): this {
    this.code = code;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withStage(stage: ProcessingStage): this {
    this.stage = stage;
    return this;
  }

  withDetails(details: Record<string, unknown>): this {
    this.details = details;
    return this;
  }

  asEnhancementFailedError(): this {
    this.code = "ENHANCEMENT_FAILED";
    this.message = "Failed to enhance prompt";
    this.stage = "enhancement";
    this.details = { reason: "Service unavailable" };
    return this;
  }

  asProcessingTimeoutError(): this {
    this.code = "PROCESSING_TIMEOUT";
    this.message = "Processing operation timed out";
    this.stage = "enhancement";
    this.details = { timeoutMs: 30000 };
    return this;
  }

  asInvalidStateError(): this {
    this.code = "INVALID_STATE";
    this.message = "Processing state is invalid";
    this.stage = "validation";
    this.details = { currentState: "uninitialized" };
    return this;
  }

  asConfigurationError(): this {
    this.code = "CONFIGURATION_ERROR";
    this.message = "Invalid processing configuration";
    this.stage = "preparation";
    this.details = { missingConfig: ["apiKey", "modelId"] };
    return this;
  }

  build(): PromptProcessingError {
    const error: PromptProcessingError = {
      type: "processing",
      code: this.code,
      message: this.message,
      stage: this.stage,
    };

    if (this.details !== undefined) {
      (error as { details: Record<string, unknown> }).details = this.details;
    }

    return error;
  }
}

/**
 * Builder for REPLError objects.
 */
export class REPLErrorBuilder {
  private code: REPLErrorCode = "INPUT_PROCESSING_ERROR";
  private message = "Failed to process input";
  private details?: REPLError["details"];

  withCode(code: REPLErrorCode): this {
    this.code = code;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withDetails(details: REPLError["details"]): this {
    this.details = details;
    return this;
  }

  asInitializationError(): this {
    this.code = "INITIALIZATION_FAILED";
    this.message = "REPL initialization failed";
    this.details = {
      originalError: { name: "ConfigError", message: "Missing config" },
    };
    return this;
  }

  asInputProcessingError(): this {
    this.code = "INPUT_PROCESSING_ERROR";
    this.message = "Failed to process user input";
    this.details = { input: "invalid command" };
    return this;
  }

  asCommandExecutionError(): this {
    this.code = "COMMAND_EXECUTION_ERROR";
    this.message = "Command execution failed";
    this.details = { command: "generate", input: "test prompt" };
    return this;
  }

  asReadlineError(): this {
    this.code = "READLINE_ERROR";
    this.message = "Readline interface error";
    this.details = {
      originalError: { name: "SIGINT", message: "Interrupted" },
    };
    return this;
  }

  asShutdownError(): this {
    this.code = "SHUTDOWN_ERROR";
    this.message = "Failed to shutdown gracefully";
    this.details = {
      originalError: { name: "TimeoutError", message: "Shutdown timeout" },
    };
    return this;
  }

  build(): REPLError {
    const error: REPLError = {
      type: "repl",
      code: this.code,
      message: this.message,
    };

    if (this.details !== undefined) {
      (error as { details: REPLError["details"] }).details = this.details;
    }

    return error;
  }
}

/**
 * Builder for ApplicationError objects.
 */
export class ApplicationErrorBuilder {
  private code: ApplicationErrorCode = "UNEXPECTED_ERROR";
  private message = "An unexpected error occurred";
  private details?: ApplicationError["details"];

  withCode(code: ApplicationErrorCode): this {
    this.code = code;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withDetails(details: ApplicationError["details"]): this {
    this.details = details;
    return this;
  }

  asDependencyInjectionError(): this {
    this.code = "DEPENDENCY_INJECTION_FAILED";
    this.message = "Dependency injection failed";
    this.details = { component: "ApiClient", operation: "initialization" };
    return this;
  }

  asServiceUnavailableError(): this {
    this.code = "SERVICE_UNAVAILABLE";
    this.message = "Required service is unavailable";
    this.details = { component: "GeminiAPI", operation: "healthCheck" };
    return this;
  }

  asInitializationError(): this {
    this.code = "INITIALIZATION_ERROR";
    this.message = "Application initialization failed";
    this.details = { component: "CLI", operation: "startup" };
    return this;
  }

  asShutdownError(): this {
    this.code = "SHUTDOWN_ERROR";
    this.message = "Application shutdown failed";
    this.details = { component: "Logger", operation: "cleanup" };
    return this;
  }

  asInvalidStateError(): this {
    this.code = "INVALID_STATE";
    this.message = "Application is in invalid state";
    this.details = { component: "REPL", operation: "processInput" };
    return this;
  }

  build(): ApplicationError {
    const error: ApplicationError = {
      type: "application",
      code: this.code,
      message: this.message,
    };

    if (this.details !== undefined) {
      (error as { details: ApplicationError["details"] }).details =
        this.details;
    }

    return error;
  }
}

/**
 * Builder for SecurityError objects.
 */
export class SecurityErrorBuilder {
  private code: SecurityErrorCode = "INVALID_API_KEY";
  private message = "Invalid API key provided";
  private details?: SecurityError["details"];

  withCode(code: SecurityErrorCode): this {
    this.code = code;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withDetails(details: SecurityError["details"]): this {
    this.details = details;
    return this;
  }

  asInvalidApiKeyError(): this {
    this.code = "INVALID_API_KEY";
    this.message = "API key is invalid or expired";
    this.details = { operation: "authentication" };
    return this;
  }

  asCredentialsMissingError(): this {
    this.code = "CREDENTIALS_MISSING";
    this.message = "Required credentials are missing";
    this.details = { operation: "apiCall" };
    return this;
  }

  asInputSanitizationError(): this {
    this.code = "INPUT_SANITIZATION_FAILED";
    this.message = "Failed to sanitize user input";
    this.details = { operation: "validation", input: "suspicious input" };
    return this;
  }

  asUnsafeOperationError(): this {
    this.code = "UNSAFE_OPERATION";
    this.message = "Operation is not safe to execute";
    this.details = { operation: "fileAccess" };
    return this;
  }

  asAuthorizationError(): this {
    this.code = "AUTHORIZATION_FAILED";
    this.message = "User is not authorized for this operation";
    this.details = { operation: "adminAction" };
    return this;
  }

  build(): SecurityError {
    const error: SecurityError = {
      type: "security",
      code: this.code,
      message: this.message,
    };

    if (this.details !== undefined) {
      (error as { details: SecurityError["details"] }).details = this.details;
    }

    return error;
  }
}

/**
 * Builder for NetworkError objects.
 */
export class NetworkErrorBuilder {
  private code: NetworkErrorCode = "CONNECTION_FAILED";
  private message = "Network connection failed";
  private details?: NetworkError["details"];

  withCode(code: NetworkErrorCode): this {
    this.code = code;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withDetails(details: NetworkError["details"]): this {
    this.details = details;
    return this;
  }

  asConnectionFailedError(): this {
    this.code = "CONNECTION_FAILED";
    this.message = "Failed to establish network connection";
    this.details = { url: "https://api.gemini.com", method: "POST" };
    return this;
  }

  asDNSResolutionError(): this {
    this.code = "DNS_RESOLUTION_FAILED";
    this.message = "DNS resolution failed";
    this.details = { url: "https://api.gemini.com" };
    return this;
  }

  asSSLError(): this {
    this.code = "SSL_ERROR";
    this.message = "SSL/TLS connection error";
    this.details = { url: "https://api.gemini.com" };
    return this;
  }

  asProxyError(): this {
    this.code = "PROXY_ERROR";
    this.message = "Proxy server error";
    this.details = { url: "https://api.gemini.com" };
    return this;
  }

  asNetworkTimeoutError(): this {
    this.code = "NETWORK_TIMEOUT";
    this.message = "Network operation timed out";
    this.details = { url: "https://api.gemini.com", timeout: 30000 };
    return this;
  }

  build(): NetworkError {
    const error: NetworkError = {
      type: "network",
      code: this.code,
      message: this.message,
    };

    if (this.details !== undefined) {
      (error as { details: NetworkError["details"] }).details = this.details;
    }

    return error;
  }
}

/**
 * Convenience functions for common test scenarios.
 */

/**
 * Creates a basic validation error for testing error handling.
 */
export function createTestValidationError(): PromptValidationError {
  return new PromptValidationErrorBuilder().asEmptyPromptError().build();
}

/**
 * Creates a basic processing error for testing error handling.
 */
export function createTestProcessingError(): PromptProcessingError {
  return new PromptProcessingErrorBuilder().asEnhancementFailedError().build();
}

/**
 * Creates a collection of different error types for comprehensive testing.
 */
export function createErrorTestSuite() {
  return {
    validation: createTestValidationError(),
    processing: createTestProcessingError(),
    repl: new REPLErrorBuilder().asInputProcessingError().build(),
    application: new ApplicationErrorBuilder()
      .asServiceUnavailableError()
      .build(),
    security: new SecurityErrorBuilder().asInvalidApiKeyError().build(),
    network: new NetworkErrorBuilder().asConnectionFailedError().build(),
  };
}
