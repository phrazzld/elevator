/**
 * Test data builders for configuration-related types.
 *
 * These builders provide fluent APIs for creating configuration objects with sensible defaults
 * and easy customization for testing different configuration scenarios.
 */

import type {
  AppConfig,
  ApiConfig,
  OutputConfig,
  LoggingConfig,
  LogLevel,
  GeminiModelId,
} from "../../config";

/**
 * Builder for ApiConfig objects.
 */
export class ApiConfigBuilder {
  private apiKey = "test-api-key-1234567890abcdef";
  private modelId: GeminiModelId = "gemini-2.5-flash-preview-05-20";
  private temperature = 0.7;
  private timeoutMs = 30000;
  private maxRetries = 3;

  withApiKey(apiKey: string): this {
    this.apiKey = apiKey;
    return this;
  }

  withModelId(modelId: GeminiModelId): this {
    this.modelId = modelId;
    return this;
  }

  withTemperature(temperature: number): this {
    this.temperature = temperature;
    return this;
  }

  withTimeoutMs(timeoutMs: number): this {
    this.timeoutMs = timeoutMs;
    return this;
  }

  withMaxRetries(maxRetries: number): this {
    this.maxRetries = maxRetries;
    return this;
  }

  withProductionKey(): this {
    this.apiKey = "AIzaSyBvalidProductionKey1234567890abcdef";
    return this;
  }

  withDevelopmentSettings(): this {
    this.temperature = 0.9;
    this.timeoutMs = 10000;
    this.maxRetries = 1;
    return this;
  }

  withProductionSettings(): this {
    this.temperature = 0.7;
    this.timeoutMs = 30000;
    this.maxRetries = 3;
    return this;
  }

  withHighPerformanceSettings(): this {
    this.modelId = "gemini-2.0-flash-exp";
    this.temperature = 0.5;
    this.timeoutMs = 60000;
    this.maxRetries = 5;
    return this;
  }

  build(): ApiConfig {
    return {
      apiKey: this.apiKey,
      modelId: this.modelId,
      temperature: this.temperature,
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
    };
  }
}

/**
 * Builder for OutputConfig objects.
 */
export class OutputConfigBuilder {
  private raw = false;
  private streaming = true;
  private showProgress = true;

  withRaw(raw: boolean): this {
    this.raw = raw;
    return this;
  }

  withStreaming(streaming: boolean): this {
    this.streaming = streaming;
    return this;
  }

  withShowProgress(showProgress: boolean): this {
    this.showProgress = showProgress;
    return this;
  }

  withRawMode(): this {
    this.raw = true;
    this.showProgress = false;
    return this;
  }

  withFormattedMode(): this {
    this.raw = false;
    this.showProgress = true;
    return this;
  }

  withStreamingMode(): this {
    this.streaming = true;
    this.showProgress = true;
    return this;
  }

  withBatchMode(): this {
    this.streaming = false;
    this.showProgress = true;
    return this;
  }

  withMinimalOutput(): this {
    this.raw = true;
    this.streaming = false;
    this.showProgress = false;
    return this;
  }

  build(): OutputConfig {
    return {
      raw: this.raw,
      streaming: this.streaming,
      showProgress: this.showProgress,
    };
  }
}

/**
 * Builder for LoggingConfig objects.
 */
export class LoggingConfigBuilder {
  private level: LogLevel = "info";
  private serviceName = "elevator";
  private jsonFormat = true;

  withLevel(level: LogLevel): this {
    this.level = level;
    return this;
  }

  withServiceName(serviceName: string): this {
    this.serviceName = serviceName;
    return this;
  }

  withJsonFormat(jsonFormat: boolean): this {
    this.jsonFormat = jsonFormat;
    return this;
  }

  withDebugLevel(): this {
    this.level = "debug";
    return this;
  }

  withProductionLevel(): this {
    this.level = "warn";
    return this;
  }

  withDevelopmentSettings(): this {
    this.level = "debug";
    this.jsonFormat = false;
    return this;
  }

  withProductionSettings(): this {
    this.level = "info";
    this.jsonFormat = true;
    return this;
  }

  withTestSettings(): this {
    this.level = "error"; // Minimal logging in tests
    this.jsonFormat = true;
    return this;
  }

  build(): LoggingConfig {
    return {
      level: this.level,
      serviceName: this.serviceName,
      jsonFormat: this.jsonFormat,
    };
  }
}

/**
 * Builder for complete AppConfig objects.
 */
export class AppConfigBuilder {
  private apiBuilder = new ApiConfigBuilder();
  private outputBuilder = new OutputConfigBuilder();
  private loggingBuilder = new LoggingConfigBuilder();

  withApi(api: ApiConfig): this {
    this.apiBuilder = new ApiConfigBuilder()
      .withApiKey(api.apiKey)
      .withModelId(api.modelId)
      .withTemperature(api.temperature)
      .withTimeoutMs(api.timeoutMs)
      .withMaxRetries(api.maxRetries);
    return this;
  }

  withOutput(output: OutputConfig): this {
    this.outputBuilder = new OutputConfigBuilder()
      .withRaw(output.raw)
      .withStreaming(output.streaming)
      .withShowProgress(output.showProgress);
    return this;
  }

  withLogging(logging: LoggingConfig): this {
    this.loggingBuilder = new LoggingConfigBuilder()
      .withLevel(logging.level)
      .withServiceName(logging.serviceName)
      .withJsonFormat(logging.jsonFormat);
    return this;
  }

  withApiKey(apiKey: string): this {
    this.apiBuilder.withApiKey(apiKey);
    return this;
  }

  withModelId(modelId: GeminiModelId): this {
    this.apiBuilder.withModelId(modelId);
    return this;
  }

  withTemperature(temperature: number): this {
    this.apiBuilder.withTemperature(temperature);
    return this;
  }

  withTimeoutMs(timeoutMs: number): this {
    this.apiBuilder.withTimeoutMs(timeoutMs);
    return this;
  }

  withMaxRetries(maxRetries: number): this {
    this.apiBuilder.withMaxRetries(maxRetries);
    return this;
  }

  withRawOutput(raw: boolean): this {
    this.outputBuilder.withRaw(raw);
    return this;
  }

  withStreaming(streaming: boolean): this {
    this.outputBuilder.withStreaming(streaming);
    return this;
  }

  withShowProgress(showProgress: boolean): this {
    this.outputBuilder.withShowProgress(showProgress);
    return this;
  }

  withLogLevel(level: LogLevel): this {
    this.loggingBuilder.withLevel(level);
    return this;
  }

  withServiceName(serviceName: string): this {
    this.loggingBuilder.withServiceName(serviceName);
    return this;
  }

  withJsonLogging(jsonFormat: boolean): this {
    this.loggingBuilder.withJsonFormat(jsonFormat);
    return this;
  }

  withDevelopmentSettings(): this {
    this.apiBuilder.withDevelopmentSettings();
    this.outputBuilder.withFormattedMode();
    this.loggingBuilder.withDevelopmentSettings();
    return this;
  }

  withProductionSettings(): this {
    this.apiBuilder.withProductionSettings();
    this.outputBuilder.withStreamingMode();
    this.loggingBuilder.withProductionSettings();
    return this;
  }

  withTestSettings(): this {
    this.apiBuilder.withApiKey("test-api-key");
    this.outputBuilder.withRawMode();
    this.loggingBuilder.withTestSettings();
    return this;
  }

  withMinimalConfig(): this {
    this.apiBuilder.withApiKey("test-key");
    this.outputBuilder.withMinimalOutput();
    this.loggingBuilder.withLevel("error");
    return this;
  }

  build(): AppConfig {
    return {
      api: this.apiBuilder.build(),
      output: this.outputBuilder.build(),
      logging: this.loggingBuilder.build(),
    };
  }
}

/**
 * Convenience functions for common test scenarios.
 */

/**
 * Creates a minimal valid API config for basic testing.
 */
export function createTestApiConfig(): ApiConfig {
  return new ApiConfigBuilder().build();
}

/**
 * Creates a minimal valid app config for basic testing.
 */
export function createTestAppConfig(): AppConfig {
  return new AppConfigBuilder().withTestSettings().build();
}

/**
 * Creates environment variables object that would produce the given config.
 */
export function createTestEnvironment(
  config?: Partial<AppConfig>,
): Record<string, string> {
  const baseEnv: Record<string, string> = {
    GEMINI_API_KEY: "test-api-key-1234567890abcdef",
  };

  if (config?.api?.modelId) {
    baseEnv["GEMINI_MODEL"] = config.api.modelId;
  }

  if (config?.api?.temperature !== undefined) {
    baseEnv["GEMINI_TEMPERATURE"] = config.api.temperature.toString();
  }

  if (config?.api?.timeoutMs !== undefined) {
    baseEnv["GEMINI_TIMEOUT_MS"] = config.api.timeoutMs.toString();
  }

  if (config?.api?.maxRetries !== undefined) {
    baseEnv["GEMINI_MAX_RETRIES"] = config.api.maxRetries.toString();
  }

  if (config?.output?.raw !== undefined) {
    baseEnv["OUTPUT_RAW"] = config.output.raw.toString();
  }

  if (config?.output?.streaming !== undefined) {
    baseEnv["OUTPUT_STREAMING"] = config.output.streaming.toString();
  }

  if (config?.output?.showProgress !== undefined) {
    baseEnv["OUTPUT_SHOW_PROGRESS"] = config.output.showProgress.toString();
  }

  if (config?.logging?.level) {
    baseEnv["LOG_LEVEL"] = config.logging.level;
  }

  if (config?.logging?.serviceName) {
    baseEnv["SERVICE_NAME"] = config.logging.serviceName;
  }

  if (config?.logging?.jsonFormat !== undefined) {
    baseEnv["LOG_JSON_FORMAT"] = config.logging.jsonFormat.toString();
  }

  return baseEnv;
}
