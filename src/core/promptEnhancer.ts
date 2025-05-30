/**
 * Default implementation of prompt enhancement logic.
 *
 * This module provides pure enhancement functions for validated prompts,
 * optimizing them for API performance while preserving intent.
 */

import {
  type ValidatedPrompt,
  type EnhancedPrompt,
  type PromptProcessingError,
  type ProcessingOptions,
  type Result,
  type PromptEnhancer,
  success,
} from "./promptProcessor";

/**
 * Default implementation of PromptEnhancer interface.
 * Performs standard enhancement operations on validated prompts.
 */
export class DefaultPromptEnhancer implements PromptEnhancer {
  /**
   * Enhances a validated prompt for optimal API performance.
   *
   * @param prompt The validated prompt to enhance
   * @param options Optional processing configuration
   * @returns Result containing enhanced prompt or processing error
   */
  enhance(
    prompt: ValidatedPrompt,
    options?: ProcessingOptions,
  ): Result<EnhancedPrompt, PromptProcessingError> {
    const appliedEnhancements: string[] = [];
    let enhancedContent = prompt.content;

    // Skip enhancement if explicitly disabled
    if (options?.enableEnhancement === false) {
      const enhancedPrompt: EnhancedPrompt = {
        id: prompt.id,
        content: enhancedContent,
        metadata: prompt.metadata,
        originalContent: prompt.content,
        enhancedAt: new Date(),
        enhancements: appliedEnhancements,
      };
      return success(enhancedPrompt);
    }

    // Apply whitespace normalization
    const whitespaceEnhanced = this.normalizeWhitespace(enhancedContent);
    if (whitespaceEnhanced !== enhancedContent) {
      enhancedContent = whitespaceEnhanced;
      if (!appliedEnhancements.includes("whitespace")) {
        appliedEnhancements.push("whitespace");
      }
    } else {
      // Track that whitespace check was performed
      appliedEnhancements.push("whitespace");
    }

    // Apply clarity improvements
    const clarityEnhanced = this.improveClarity(enhancedContent);
    if (clarityEnhanced !== enhancedContent) {
      enhancedContent = clarityEnhanced;
      if (!appliedEnhancements.includes("clarity")) {
        appliedEnhancements.push("clarity");
      }
    } else {
      // Track that clarity check was performed
      appliedEnhancements.push("clarity");
    }

    // Create enhanced prompt
    const enhancedPrompt: EnhancedPrompt = {
      id: prompt.id,
      content: enhancedContent,
      metadata: prompt.metadata,
      originalContent: prompt.content,
      enhancedAt: new Date(),
      enhancements: appliedEnhancements,
    };

    return success(enhancedPrompt);
  }

  /**
   * Normalizes whitespace in the prompt content.
   * Preserves code blocks and meaningful formatting.
   */
  private normalizeWhitespace(content: string): string {
    // First, trim the entire content
    let normalized = content.trim();

    // Preserve code blocks by splitting and processing separately
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks: string[] = [];
    let placeholderIndex = 0;

    // Extract code blocks
    normalized = normalized.replace(codeBlockRegex, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${placeholderIndex++}__`;
    });

    // Normalize multiple spaces (but not newlines) to single space
    normalized = normalized.replace(/[^\S\n]+/g, " ");

    // Normalize multiple newlines to maximum of 2
    normalized = normalized.replace(/\n{3,}/g, "\n\n");

    // Restore code blocks
    for (let i = 0; i < codeBlocks.length; i++) {
      const codeBlock = codeBlocks[i];
      if (codeBlock !== undefined) {
        normalized = normalized.replace(`__CODE_BLOCK_${i}__`, codeBlock);
      }
    }

    return normalized;
  }

  /**
   * Improves clarity by adding appropriate punctuation.
   * Focuses on common patterns like questions without question marks.
   */
  private improveClarity(content: string): string {
    // Add question marks to question patterns without them
    const questionPatterns = [
      /\b(what|when|where|who|why|how|which|whose|whom|can|could|would|should|will|shall|may|might|do|does|did|is|are|was|were|have|has|had)\b[^.!?]*$/gi,
    ];

    let improved = content;

    for (const pattern of questionPatterns) {
      // Split by sentences to handle multi-sentence prompts
      const sentences = improved.split(/(?<=[.!?])\s+/);
      improved = sentences
        .map((sentence) => {
          // Skip if already has punctuation
          if (/[.!?]$/.test(sentence.trim())) {
            return sentence;
          }

          // Check if it matches question pattern
          if (pattern.test(sentence)) {
            return sentence.trim() + "?";
          }

          return sentence;
        })
        .join(" ");
    }

    return improved;
  }
}
