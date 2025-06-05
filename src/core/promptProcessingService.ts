/**
 * Default implementation of PromptProcessingService.
 *
 * This service orchestrates the complete prompt processing pipeline,
 * from raw user input through validation and enhancement.
 * Following hexagonal architecture, it depends on abstractions
 * defined by the core domain.
 */

import {
  type PromptProcessingService,
  type PromptValidator,
  type PromptEnhancer,
  type RawPrompt,
  type EnhancedPrompt,
  type PromptError,
  type ProcessingOptions,
  type Result,
  success,
  failure,
  isOk,
  isErr,
  createProcessingError,
} from "./promptProcessor";
import { type GeminiAPIClient } from "./apiClient";

/**
 * Default implementation of the prompt processing pipeline.
 *
 * This service coordinates validation and enhancement steps,
 * ensuring all prompts are properly processed before API calls.
 */
export class DefaultPromptProcessingService implements PromptProcessingService {
  constructor(
    private readonly validator: PromptValidator,
    private readonly enhancer: PromptEnhancer,
    private readonly apiClient: GeminiAPIClient,
  ) {}

  /**
   * Processes a raw prompt through the complete validation, enhancement, and API pipeline.
   *
   * @param prompt The raw prompt to process
   * @param options Optional processing configuration
   * @returns Promise resolving to enhanced prompt with API response or error
   */
  async processPrompt(
    prompt: RawPrompt,
    options?: ProcessingOptions,
  ): Promise<Result<EnhancedPrompt, PromptError>> {
    // Step 1: Validate the raw prompt
    const validationResult = this.validator.validate(prompt, options);

    if (!isOk(validationResult)) {
      // PromptValidationError is part of PromptError union
      return failure(
        (validationResult as { success: false; error: PromptError }).error,
      );
    }

    // Step 2: Enhance the validated prompt
    const enhancementResult = this.enhancer.enhance(
      validationResult.value,
      options,
    );

    if (!isOk(enhancementResult)) {
      // PromptProcessingError is part of PromptError union
      return failure(
        (enhancementResult as { success: false; error: PromptError }).error,
      );
    }

    // Step 3: Send enhanced prompt to Gemini API and get response
    try {
      const apiResult = await this.apiClient.generateContent(
        enhancementResult.value,
      );

      if (isErr(apiResult)) {
        // Convert API error to PromptProcessingError
        return failure(
          createProcessingError(
            "ENHANCEMENT_FAILED",
            `API call failed: ${apiResult.error.message}`,
            "enhancement",
            {
              apiError: apiResult.error,
            },
          ),
        );
      }

      if (isOk(apiResult)) {
        // Create enhanced prompt with API response content
        const enhancedPromptWithApiResponse: EnhancedPrompt = {
          ...enhancementResult.value,
          content: apiResult.value.content, // Replace enhanced content with API response
          enhancements: [
            ...enhancementResult.value.enhancements,
            "api-response",
          ],
        };

        return success(enhancedPromptWithApiResponse);
      }

      // This should never happen, but TypeScript requires it
      throw new Error("Unexpected API result state");
    } catch (error) {
      return failure(
        createProcessingError(
          "ENHANCEMENT_FAILED",
          `Unexpected error during API call: ${error instanceof Error ? error.message : String(error)}`,
          "enhancement",
          {
            originalError: error,
          },
        ),
      );
    }
  }
}
