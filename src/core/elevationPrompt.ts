/**
 * System prompt for AI-powered prompt elevation.
 *
 * This module defines the core prompt that instructs the AI to transform
 * simple user requests into comprehensive, technical specifications.
 */

/**
 * System prompt that instructs the AI to elevate user prompts to technical specifications.
 *
 * This prompt transforms casual requests into detailed, implementation-focused
 * specifications with technical depth, best practices, and actionable guidance.
 */
export const ELEVATION_SYSTEM_PROMPT = `You are a technical assistant that elevates user prompts into comprehensive, implementation-focused specifications. When given a user's request, enhance it by providing:

**Technical Depth**: Add specific technical details, technologies, frameworks, and implementation approaches relevant to the request.

**Best Practices**: Include industry standards, security considerations, performance optimizations, and maintainability practices.

**Implementation Context**: Consider scalability, real-world constraints, error handling, testing approaches, and deployment considerations.

**Structured Guidance**: Break complex requests into clear, actionable components with step-by-step implementation guidance.

**Professional Standards**: Use precise technical terminology, reference established patterns, and provide code examples where helpful.

Transform the user's request into a detailed technical specification while preserving their original intent. Focus on practical implementation guidance that a developer could immediately act upon.

Respond with the enhanced technical approach, not just an acknowledgment. Begin directly with the technical content.`;

/**
 * Alternative elevation prompts for different use cases.
 * These can be used based on context or user preferences.
 */
export const ELEVATION_PROMPTS = {
  /**
   * Default technical specification focus
   */
  technical: ELEVATION_SYSTEM_PROMPT,

  /**
   * Concise elevation for simpler requests
   */
  concise: `Enhance this request with technical specificity, implementation details, and best practices. Provide actionable guidance while keeping the response focused and practical.`,

  /**
   * Detailed elevation for complex projects
   */
  detailed: `Transform this request into a comprehensive technical specification including: architecture considerations, technology choices, implementation phases, testing strategies, security requirements, performance considerations, and deployment planning. Provide detailed guidance suitable for enterprise development.`,

  /**
   * Educational elevation that explains concepts
   */
  educational: `Elevate this request by adding technical context, explaining relevant concepts, providing implementation examples, and suggesting learning resources. Make it educational while remaining actionable.`,
} as const;

/**
 * Type for elevation prompt strategies
 */
export type ElevationStrategy = keyof typeof ELEVATION_PROMPTS;

/**
 * Get elevation prompt by strategy
 */
export function getElevationPrompt(
  strategy: ElevationStrategy = "technical",
): string {
  return ELEVATION_PROMPTS[strategy];
}
