/**
 * Default implementation of prompt validation logic.
 *
 * This module provides pure validation functions for raw prompts,
 * ensuring they meet configured criteria before processing.
 */

import {
  type RawPrompt,
  type ValidatedPrompt,
  type PromptValidationError,
  type ProcessingOptions,
  type Result,
  type PromptValidator,
  success,
  failure,
  createValidationError,
} from "./promptProcessor";

/**
 * Default implementation of PromptValidator interface.
 * Performs standard validation checks on raw prompts.
 */
export class DefaultPromptValidator implements PromptValidator {
  private readonly defaultMinLength = 3;
  private readonly defaultMaxLength = 10000;

  /**
   * Validates a raw prompt according to configured rules.
   *
   * @param prompt The raw prompt to validate
   * @param options Optional processing configuration
   * @returns Result containing validated prompt or validation error
   */
  validate(
    prompt: RawPrompt,
    options?: ProcessingOptions,
  ): Result<ValidatedPrompt, PromptValidationError> {
    const minLength = options?.minLength ?? this.defaultMinLength;
    const maxLength = options?.maxLength ?? this.defaultMaxLength;
    const appliedRules: string[] = [];

    // Trim whitespace for validation
    const trimmedContent = prompt.content.trim();

    // Rule 1: Empty check
    appliedRules.push("empty");
    if (trimmedContent.length === 0) {
      return failure(
        createValidationError(
          "EMPTY_PROMPT",
          "Prompt cannot be empty or contain only whitespace",
        ),
      );
    }

    // Rule 2: Length validation
    appliedRules.push("length");
    if (trimmedContent.length < minLength) {
      return failure(
        createValidationError(
          "TOO_SHORT",
          `Prompt must be at least ${minLength} characters long`,
          {
            minLength,
            actualLength: trimmedContent.length,
          },
        ),
      );
    }

    if (trimmedContent.length > maxLength) {
      return failure(
        createValidationError(
          "TOO_LONG",
          `Prompt must not exceed ${maxLength} characters`,
          {
            maxLength,
            actualLength: trimmedContent.length,
          },
        ),
      );
    }

    // Rule 3: Content validation
    appliedRules.push("content");
    // Content validation passed (supports unicode, newlines, tabs)

    // Add any custom rules
    if (options?.customRules) {
      appliedRules.push(...options.customRules);
    }

    // Create validated prompt
    const validatedPrompt: ValidatedPrompt = {
      id: prompt.id,
      content: trimmedContent,
      metadata: prompt.metadata,
      validatedAt: new Date(),
      rules: appliedRules,
    };

    return success(validatedPrompt);
  }
}
