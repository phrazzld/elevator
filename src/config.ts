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
  | "gemini-2.5-flash-preview-05-20"
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

/**
 * Custom error class for configuration validation failures.
 * Provides explicit, actionable error messages for environment variable issues.
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly variable?: string,
  ) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/**
 * Validates that a required environment variable exists and is not empty.
 *
 * @param name - The environment variable name
 * @param value - The environment variable value
 * @throws {ConfigurationError} When the variable is missing or empty
 */
function validateRequired(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new ConfigurationError(
      `Environment variable ${name} is required but not set. ` +
        `Please set ${name} in your environment or .env file.`,
      name,
    );
  }
  return value.trim();
}

/**
 * Validates that a Gemini API key is in the expected format.
 *
 * @param apiKey - The API key to validate
 * @throws {ConfigurationError} When the API key format is invalid
 */
function validateApiKey(apiKey: string): string {
  // Basic format validation - Gemini API keys typically start with specific prefixes
  if (apiKey.length < 10) {
    throw new ConfigurationError(
      "GEMINI_API_KEY appears to be too short. Please check your API key. " +
        "Get a valid API key from: https://aistudio.google.com/app/apikey",
      "GEMINI_API_KEY",
    );
  }

  // Check for placeholder values
  if (
    apiKey === "your_api_key_here" ||
    apiKey === "YOUR_API_KEY" ||
    apiKey === "placeholder"
  ) {
    throw new ConfigurationError(
      "GEMINI_API_KEY appears to be a placeholder value. " +
        "Please set a valid API key from: https://aistudio.google.com/app/apikey",
      "GEMINI_API_KEY",
    );
  }

  return apiKey;
}

/**
 * Validates and parses a numeric environment variable with range checking.
 *
 * @param name - The environment variable name
 * @param value - The environment variable value
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Default value if not provided
 * @throws {ConfigurationError} When the value is invalid or out of range
 */
function validateNumber(
  name: string,
  value: string | undefined,
  min: number,
  max: number,
  defaultValue: number,
): number {
  if (!value || value.trim() === "") {
    return defaultValue;
  }

  const parsed = parseFloat(value.trim());
  if (isNaN(parsed)) {
    throw new ConfigurationError(
      `Environment variable ${name} must be a valid number, got: "${value}". ` +
        `Expected a number between ${min} and ${max}.`,
      name,
    );
  }

  if (parsed < min || parsed > max) {
    throw new ConfigurationError(
      `Environment variable ${name} must be between ${min} and ${max}, got: ${parsed}.`,
      name,
    );
  }

  return parsed;
}

/**
 * Validates and parses an integer environment variable with range checking.
 *
 * @param name - The environment variable name
 * @param value - The environment variable value
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Default value if not provided
 * @throws {ConfigurationError} When the value is invalid or out of range
 */
function validateInteger(
  name: string,
  value: string | undefined,
  min: number,
  max: number,
  defaultValue: number,
): number {
  if (!value || value.trim() === "") {
    return defaultValue;
  }

  const parsed = parseInt(value.trim(), 10);
  if (isNaN(parsed) || !Number.isInteger(parsed)) {
    throw new ConfigurationError(
      `Environment variable ${name} must be a valid integer, got: "${value}". ` +
        `Expected an integer between ${min} and ${max}.`,
      name,
    );
  }

  if (parsed < min || parsed > max) {
    throw new ConfigurationError(
      `Environment variable ${name} must be between ${min} and ${max}, got: ${parsed}.`,
      name,
    );
  }

  return parsed;
}

/**
 * Validates that a value is one of the allowed enum values.
 *
 * @param name - The environment variable name
 * @param value - The environment variable value
 * @param allowedValues - Array of allowed values
 * @param defaultValue - Default value if not provided
 * @throws {ConfigurationError} When the value is not in the allowed list
 */
function validateEnum<T extends string>(
  name: string,
  value: string | undefined,
  allowedValues: readonly T[],
  defaultValue: T,
): T {
  if (!value || value.trim() === "") {
    return defaultValue;
  }

  const trimmed = value.trim() as T;
  if (!allowedValues.includes(trimmed)) {
    throw new ConfigurationError(
      `Environment variable ${name} must be one of: ${allowedValues.join(", ")}. ` +
        `Got: "${value}".`,
      name,
    );
  }

  return trimmed;
}

/**
 * Pure factory function that creates an immutable configuration object.
 * This function accepts environment variables as input, making it fully testable
 * without needing to mock process.env.
 *
 * @param env - Environment variables as a record
 * @returns Validated, immutable AppConfig object
 * @throws {ConfigurationError} When any required environment variable is missing or invalid
 *
 * @example
 * ```typescript
 * // In production
 * const config = createAppConfig(process.env);
 *
 * // In tests
 * const testEnv = { GEMINI_API_KEY: 'test-key' };
 * const config = createAppConfig(testEnv);
 * ```
 */
export function createAppConfig(
  env: Record<string, string | undefined>,
): AppConfig {
  try {
    // Validate required API key
    const rawApiKey = validateRequired("GEMINI_API_KEY", env["GEMINI_API_KEY"]);
    const apiKey = validateApiKey(rawApiKey);

    // Validate optional API configuration
    const modelId = validateEnum(
      "GEMINI_MODEL",
      env["GEMINI_MODEL"],
      [
        "gemini-2.5-flash-preview-05-20",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
      ] as const,
      "gemini-2.5-flash-preview-05-20",
    );

    const temperature = validateNumber(
      "GEMINI_TEMPERATURE",
      env["GEMINI_TEMPERATURE"],
      0.0,
      2.0,
      0.7,
    );

    const timeoutMs = validateInteger(
      "GEMINI_TIMEOUT_MS",
      env["GEMINI_TIMEOUT_MS"],
      1000,
      300000,
      30000,
    );

    const maxRetries = validateInteger(
      "GEMINI_MAX_RETRIES",
      env["GEMINI_MAX_RETRIES"],
      0,
      10,
      3,
    );

    // Validate optional output configuration
    const raw = env["OUTPUT_RAW"] === "true";
    const streaming = env["OUTPUT_STREAMING"] !== "false"; // Default to true
    const showProgress = env["OUTPUT_SHOW_PROGRESS"] !== "false"; // Default to true

    // Validate optional logging configuration
    const logLevel = validateEnum(
      "LOG_LEVEL",
      env["LOG_LEVEL"],
      ["debug", "info", "warn", "error"] as const,
      "info",
    );

    const serviceName = env["SERVICE_NAME"] || "prompt-elevator";
    const jsonFormat = env["LOG_JSON_FORMAT"] !== "false"; // Default to true

    return {
      api: {
        apiKey,
        modelId,
        temperature,
        timeoutMs,
        maxRetries,
      },
      output: {
        raw,
        streaming,
        showProgress,
      },
      logging: {
        level: logLevel,
        serviceName,
        jsonFormat,
      },
    };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      // Re-throw configuration errors as-is with their explicit messages
      throw error;
    }
    // Wrap unexpected errors
    throw new ConfigurationError(
      `Unexpected error during configuration validation: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Validates all environment variables and returns a structured configuration object.
 * This function performs comprehensive validation with explicit error messages.
 *
 * @deprecated Use createAppConfig() instead for better testability
 * @throws {ConfigurationError} When any required environment variable is missing or invalid
 */
export function validateEnvironmentVariables(): AppConfig {
  return createAppConfig(process.env);
}

/**
 * Lazy-loaded default application configuration object.
 *
 * This immutable configuration object is created from environment variables
 * when first accessed. It provides a convenient way to access validated
 * configuration throughout the application without causing side effects during module import.
 *
 * @throws {ConfigurationError} When required environment variables are missing or invalid
 *
 * @example
 * ```typescript
 * import { config } from './config';
 *
 * console.log(`Using model: ${config.api.modelId}`);
 * console.log(`Log level: ${config.logging.level}`);
 * ```
 */
let _config: Readonly<AppConfig> | undefined;

export const config: Readonly<AppConfig> = new Proxy({} as AppConfig, {
  get(_target, prop) {
    if (!_config) {
      _config = createAppConfig(process.env);
    }
    return _config[prop as keyof AppConfig];
  },
});
