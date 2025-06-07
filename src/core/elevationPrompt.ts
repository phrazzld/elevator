/**
 * System prompt for AI-powered prompt elevation.
 *
 * This module defines prompts that instruct the AI to transform and elevate
 * user requests into more sophisticated, technically precise articulations
 * while preserving the original intent and scope.
 */

/**
 * System prompt that instructs the AI to elevate user prompts into more sophisticated articulations.
 *
 * This prompt transforms simple requests into technically precise, professional-grade
 * specifications while preserving the original intent and scope.
 */
export const ELEVATION_SYSTEM_PROMPT = `Transform the user's request into a more sophisticated, technically precise articulation. Output only the elevated request - no headers, explanations, or commentary.

**Transform the request itself**: Take the user's simple prompt and rearticulate it using specific technical language, professional terminology, and structured phrasing.

**Preserve the original intent**: The elevated version must request the same outcome as the original, just expressed with greater technical sophistication.

**Add technical specificity**: Replace vague terms with precise technical concepts, methodologies, and industry-standard terminology.

**Output format**: Provide only the elevated request. No "Original Request:" or "Technically Precise Version:" headers. Just the transformed request itself.

Transform the user's prompt into a technically elevated version that a subject matter expert would use to express the same request.`;

/**
 * Alternative elevation prompts for different use cases.
 * These can be used based on context or user preferences.
 */
export const ELEVATION_PROMPTS = {
  /**
   * Balanced technical elevation (default)
   */
  balanced: ELEVATION_SYSTEM_PROMPT,

  /**
   * Concise elevation for straightforward requests
   */
  concise: `Transform this user request into a more technically precise version using professional terminology and specific technical concepts. Output only the elevated request - no headers, no explanations, no commentary. Just provide the same request articulated with greater technical sophistication.`,

  /**
   * Comprehensive elevation for complex specifications
   */
  comprehensive: `Elevate this request into a detailed, enterprise-grade technical specification that includes architectural considerations, implementation methodologies, quality assurance protocols, security requirements, performance criteria, and operational procedures. Transform the simple request into a comprehensive technical directive that captures all relevant professional considerations.`,

  /**
   * Educational elevation with learning objectives
   */
  educational: `Rearticulate this request with educational context, incorporating relevant technical concepts, learning objectives, skill development components, and knowledge transfer elements. Transform the basic request into an instructionally-focused technical directive that emphasizes understanding and capability building.`,
} as const;

/**
 * Type for elevation prompt strategies
 */
export type ElevationStrategy = keyof typeof ELEVATION_PROMPTS;

/**
 * Get elevation prompt by strategy
 */
export function getElevationPrompt(
  strategy: ElevationStrategy = "balanced",
): string {
  return ELEVATION_PROMPTS[strategy];
}
