/**
 * Progress adapter that bridges API client and formatter.
 *
 * This adapter wraps an API client to automatically show progress indicators
 * during API calls, following the hexagonal architecture principle of
 * keeping infrastructure concerns separate from core domain logic.
 */

import {
  type GeminiAPIClient,
  type APIResponse,
  type APIError,
  type APIStreamChunk,
  type APIRequestOptions,
} from "../core/apiClient";
import {
  type OutputFormatter,
  type ProgressIndicator,
} from "../core/formatter";
import {
  type EnhancedPrompt,
  type Result,
  isOk,
} from "../core/promptProcessor";

/**
 * Creates an API client wrapper that automatically manages progress indicators.
 *
 * @param apiClient The underlying API client to wrap
 * @param formatter The formatter to use for progress indicators
 * @param defaultMessage Default progress message if none specified
 * @returns A wrapped API client with automatic progress management
 */
export function withProgress(
  apiClient: GeminiAPIClient,
  formatter: OutputFormatter,
  defaultMessage = "Thinking...",
): GeminiAPIClient {
  /**
   * Helper to create lifecycle hooks for progress management.
   */
  function createProgressLifecycle(
    customMessage?: string,
  ): NonNullable<APIRequestOptions["lifecycle"]> {
    let progressIndicator: ProgressIndicator | undefined;

    return {
      onStart: async () => {
        const message = customMessage ?? defaultMessage;
        const result = await formatter.createProgress(message);

        // Store progress indicator if creation succeeded
        if (isOk(result)) {
          progressIndicator = result.value;
        }
      },
      onComplete: async () => {
        if (progressIndicator) {
          await formatter.completeProgress(progressIndicator);
          progressIndicator = undefined;
        }
      },
    };
  }

  /**
   * Merges progress lifecycle with existing options.
   */
  function mergeOptionsWithProgress(
    options?: APIRequestOptions,
    progressMessage?: string,
  ): APIRequestOptions {
    const progressLifecycle = createProgressLifecycle(progressMessage);

    // If options already has lifecycle hooks, we need to chain them
    if (options?.lifecycle) {
      const originalLifecycle = options.lifecycle;

      return {
        ...options,
        lifecycle: {
          onStart: async () => {
            // Call progress hook first
            if (progressLifecycle.onStart) {
              await progressLifecycle.onStart();
            }
            // Then call original hook
            if (originalLifecycle.onStart) {
              await originalLifecycle.onStart();
            }
          },
          onComplete: async () => {
            // Call original hook first
            if (originalLifecycle.onComplete) {
              await originalLifecycle.onComplete();
            }
            // Then cleanup progress
            if (progressLifecycle.onComplete) {
              await progressLifecycle.onComplete();
            }
          },
        },
      };
    }

    // No existing lifecycle hooks, just add progress
    return {
      ...options,
      lifecycle: progressLifecycle,
    };
  }

  // Return wrapped API client
  return {
    async generateContent(
      prompt: EnhancedPrompt,
      options?: APIRequestOptions,
    ): Promise<Result<APIResponse, APIError>> {
      const wrappedOptions = mergeOptionsWithProgress(options);
      return apiClient.generateContent(prompt, wrappedOptions);
    },

    async *generateStreamingContent(
      prompt: EnhancedPrompt,
      options?: APIRequestOptions,
    ): AsyncIterable<Result<APIStreamChunk, APIError>> {
      const wrappedOptions = mergeOptionsWithProgress(options);
      yield* apiClient.generateStreamingContent(prompt, wrappedOptions);
    },

    async healthCheck(): Promise<Result<{ status: "healthy" }, APIError>> {
      // No progress for health checks
      return apiClient.healthCheck();
    },
  };
}

/**
 * Creates an API client wrapper with custom progress messages based on prompt.
 *
 * @param apiClient The underlying API client to wrap
 * @param formatter The formatter to use for progress indicators
 * @param messageProvider Function to generate progress message from prompt
 * @returns A wrapped API client with automatic progress management
 */
export function withDynamicProgress(
  apiClient: GeminiAPIClient,
  formatter: OutputFormatter,
  messageProvider: (prompt: EnhancedPrompt) => string,
): GeminiAPIClient {
  return {
    async generateContent(
      prompt: EnhancedPrompt,
      options?: APIRequestOptions,
    ): Promise<Result<APIResponse, APIError>> {
      const progressMessage = messageProvider(prompt);
      const wrappedClient = withProgress(apiClient, formatter, progressMessage);
      return wrappedClient.generateContent(prompt, options);
    },

    async *generateStreamingContent(
      prompt: EnhancedPrompt,
      options?: APIRequestOptions,
    ): AsyncIterable<Result<APIStreamChunk, APIError>> {
      const progressMessage = messageProvider(prompt);
      yield* withProgress(
        apiClient,
        formatter,
        progressMessage,
      ).generateStreamingContent(prompt, options);
    },

    async healthCheck(): Promise<Result<{ status: "healthy" }, APIError>> {
      return apiClient.healthCheck();
    },
  };
}
