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
} from "./promptProcessor";

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
  ) {}

  /**
   * Processes a raw prompt through the complete validation and enhancement pipeline.
   *
   * @param prompt The raw prompt to process
   * @param options Optional processing configuration
   * @returns Promise resolving to enhanced prompt or error
   */
  processPrompt(
    prompt: RawPrompt,
    options?: ProcessingOptions,
  ): Promise<Result<EnhancedPrompt, PromptError>> {
    // Step 1: Validate the raw prompt
    const validationResult = this.validator.validate(prompt, options);

    if (!isOk(validationResult)) {
      // PromptValidationError is part of PromptError union
      return Promise.resolve(
        failure(
          (validationResult as { success: false; error: PromptError }).error,
        ),
      );
    }

    // Step 2: Enhance the validated prompt
    const enhancementResult = this.enhancer.enhance(
      validationResult.value,
      options,
    );

    if (!isOk(enhancementResult)) {
      // PromptProcessingError is part of PromptError union
      return Promise.resolve(
        failure(
          (enhancementResult as { success: false; error: PromptError }).error,
        ),
      );
    }

    return Promise.resolve(success(enhancementResult.value));
  }
}
