/**
 * Application configuration interface with strict typing and immutability.
 * All properties are readonly to enforce immutable configuration.
 */

/**
 * Valid log levels for structured logging
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Valid Gemini model IDs
 */
export type GeminiModelId =
  | "gemini-2.0-flash-exp"
  | "gemini-1.5-flash"
  | "gemini-1.5-flash-8b"
  | "gemini-1.5-pro";

/**
 * API configuration for Gemini integration
 */
export interface ApiConfig {
  /** Gemini API key for authentication */
  readonly apiKey: string;

  /** Gemini model ID to use for requests */
  readonly modelId: GeminiModelId;

  /** Temperature for response generation (0.0 to 2.0) */
  readonly temperature: number;

  /** Request timeout in milliseconds */
  readonly timeoutMs: number;

  /** Maximum retry attempts for failed requests */
  readonly maxRetries: number;
}

/**
 * Output formatting configuration
 */
export interface OutputConfig {
  /** Enable raw output mode (no formatting) */
  readonly raw: boolean;

  /** Enable streaming output */
  readonly streaming: boolean;

  /** Show progress indicators during processing */
  readonly showProgress: boolean;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Minimum log level to output */
  readonly level: LogLevel;

  /** Service name for structured logging */
  readonly serviceName: string;

  /** Enable JSON formatted output for logs */
  readonly jsonFormat: boolean;
}

/**
 * Complete application configuration interface.
 * All properties are readonly to enforce immutability.
 */
export interface AppConfig {
  /** API configuration for Gemini integration */
  readonly api: ApiConfig;

  /** Output formatting configuration */
  readonly output: OutputConfig;

  /** Logging configuration */
  readonly logging: LoggingConfig;
}
