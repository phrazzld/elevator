/**
 * Central builders namespace for convenient access to all test data builders.
 */

import {
  RawPromptBuilder,
  ValidatedPromptBuilder,
  EnhancedPromptBuilder,
  PromptMetadataBuilder,
  ProcessingOptionsBuilder,
} from "./promptBuilders";

import {
  AppConfigBuilder,
  ApiConfigBuilder,
  OutputConfigBuilder,
  LoggingConfigBuilder,
} from "./configBuilders";

import {
  APIResponseBuilder,
  APIErrorBuilder,
  APIStreamChunkBuilder,
  APIRequestOptionsBuilder,
} from "./apiBuilders";

import {
  PromptValidationErrorBuilder,
  PromptProcessingErrorBuilder,
  REPLErrorBuilder,
  ApplicationErrorBuilder,
  SecurityErrorBuilder,
  NetworkErrorBuilder,
} from "./errorBuilders";

import {
  FormattedContentBuilder,
  ProgressIndicatorBuilder,
  FormatOptionsBuilder,
  FormatterErrorBuilder,
} from "./formatterBuilders";

/**
 * Convenient namespace providing access to all test data builders.
 *
 * @example
 * ```typescript
 * import { TestDataBuilders } from '../test-utils';
 *
 * const prompt = TestDataBuilders.rawPrompt()
 *   .withContent("Test prompt")
 *   .withUserId("user123")
 *   .build();
 *
 * const config = TestDataBuilders.apiConfig()
 *   .withApiKey("test-key")
 *   .withTemperature(0.5)
 *   .build();
 * ```
 */
export const TestDataBuilders = {
  // Prompt builders
  rawPrompt: () => new RawPromptBuilder(),
  validatedPrompt: () => new ValidatedPromptBuilder(),
  enhancedPrompt: () => new EnhancedPromptBuilder(),
  promptMetadata: () => new PromptMetadataBuilder(),
  processingOptions: () => new ProcessingOptionsBuilder(),

  // Configuration builders
  appConfig: () => new AppConfigBuilder(),
  apiConfig: () => new ApiConfigBuilder(),
  outputConfig: () => new OutputConfigBuilder(),
  loggingConfig: () => new LoggingConfigBuilder(),

  // API builders
  apiResponse: () => new APIResponseBuilder(),
  apiError: () => new APIErrorBuilder(),
  apiStreamChunk: () => new APIStreamChunkBuilder(),
  apiRequestOptions: () => new APIRequestOptionsBuilder(),

  // Error builders
  promptValidationError: () => new PromptValidationErrorBuilder(),
  promptProcessingError: () => new PromptProcessingErrorBuilder(),
  replError: () => new REPLErrorBuilder(),
  applicationError: () => new ApplicationErrorBuilder(),
  securityError: () => new SecurityErrorBuilder(),
  networkError: () => new NetworkErrorBuilder(),

  // Formatter builders
  formattedContent: () => new FormattedContentBuilder(),
  progressIndicator: () => new ProgressIndicatorBuilder(),
  formatOptions: () => new FormatOptionsBuilder(),
  formatterError: () => new FormatterErrorBuilder(),
} as const;
