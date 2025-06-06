/**
 * Realistic Gemini API response fixtures based on actual API patterns.
 *
 * These fixtures provide comprehensive test data that matches real Gemini API responses,
 * including proper token counting, safety ratings, and metadata structures.
 */

import type { APIResponse } from "../../core/apiClient";
import { APIResponseBuilder } from "../builders/apiBuilders";

/**
 * Realistic response content for different use cases.
 */
export const ResponseContent = {
  /** Brief technical explanation */
  technical: `TypeScript is a statically typed programming language developed by Microsoft that builds on JavaScript by adding static type definitions. Types provide a way to describe the shape of an object, providing better documentation, and allowing TypeScript to validate that your code is working correctly.`,

  /** Code-focused response */
  code: `Here's a simple example of TypeScript:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function createUser(name: string, email: string): User {
  return {
    id: Math.random(),
    name,
    email
  };
}
\`\`\`

This demonstrates type safety and interfaces in TypeScript.`,

  /** Long-form detailed response */
  detailed: `When building modern web applications, several key principles should guide your architecture decisions:

1. **Separation of Concerns**: Keep business logic separate from presentation logic. This makes your code more maintainable and testable.

2. **Single Responsibility Principle**: Each component, function, or module should have one reason to change. This reduces coupling and increases cohesion.

3. **Dependency Inversion**: High-level modules should not depend on low-level modules. Both should depend on abstractions. This enables better testing and flexibility.

4. **Immutability**: Prefer immutable data structures to reduce bugs and improve predictability. This is especially important in React applications with state management.

5. **Error Handling**: Implement comprehensive error boundaries and graceful degradation. Users should never see unexpected errors or broken interfaces.

These principles help create robust, maintainable applications that can evolve over time.`,

  /** Brief conversational response */
  conversational: `That's a great question! Yes, I can help you understand that concept. Let me break it down for you in simple terms.`,

  /** Minimal response */
  minimal: `Yes.`,

  /** Empty response (edge case) */
  empty: ``,
} as const;

/**
 * Realistic token usage patterns based on content length and complexity.
 */
export const UsagePatterns = {
  /** Minimal token usage for short responses */
  minimal: {
    promptTokens: 8,
    completionTokens: 5,
    totalTokens: 13,
  },

  /** Typical conversation token usage */
  conversational: {
    promptTokens: 25,
    completionTokens: 45,
    totalTokens: 70,
  },

  /** Technical explanation token usage */
  technical: {
    promptTokens: 15,
    completionTokens: 95,
    totalTokens: 110,
  },

  /** Code-heavy response token usage */
  code: {
    promptTokens: 20,
    completionTokens: 120,
    totalTokens: 140,
  },

  /** Detailed explanation token usage */
  detailed: {
    promptTokens: 30,
    completionTokens: 280,
    totalTokens: 310,
  },

  /** Large response token usage */
  large: {
    promptTokens: 100,
    completionTokens: 800,
    totalTokens: 900,
  },
} as const;

/**
 * Realistic timing patterns for different response types.
 */
export const TimingPatterns = {
  /** Very fast response (cached or simple) */
  fast: { duration: 245 },

  /** Typical response time */
  typical: { duration: 1250 },

  /** Slower response (complex reasoning) */
  slow: { duration: 3500 },

  /** Code generation response */
  codeGeneration: { duration: 2100 },

  /** Very slow response (near timeout) */
  verySlow: { duration: 28000 },
} as const;

/**
 * Factory functions for creating realistic Gemini API responses.
 */
export const ResponseFactories = {
  /**
   * Creates a realistic technical explanation response.
   */
  technical(): APIResponse {
    return new APIResponseBuilder()
      .withContent(ResponseContent.technical)
      .withUsage(UsagePatterns.technical)
      .withDuration(TimingPatterns.typical.duration)
      .withCurrentTimestamp()
      .build();
  },

  /**
   * Creates a realistic code-focused response.
   */
  code(): APIResponse {
    return new APIResponseBuilder()
      .withContent(ResponseContent.code)
      .withUsage(UsagePatterns.code)
      .withDuration(TimingPatterns.codeGeneration.duration)
      .withCurrentTimestamp()
      .build();
  },

  /**
   * Creates a realistic detailed explanation response.
   */
  detailed(): APIResponse {
    return new APIResponseBuilder()
      .withContent(ResponseContent.detailed)
      .withUsage(UsagePatterns.detailed)
      .withDuration(TimingPatterns.slow.duration)
      .withCurrentTimestamp()
      .build();
  },

  /**
   * Creates a realistic conversational response.
   */
  conversational(): APIResponse {
    return new APIResponseBuilder()
      .withContent(ResponseContent.conversational)
      .withUsage(UsagePatterns.conversational)
      .withDuration(TimingPatterns.fast.duration)
      .withCurrentTimestamp()
      .build();
  },

  /**
   * Creates a minimal response.
   */
  minimal(): APIResponse {
    return new APIResponseBuilder()
      .withContent(ResponseContent.minimal)
      .withUsage(UsagePatterns.minimal)
      .withDuration(TimingPatterns.fast.duration)
      .withCurrentTimestamp()
      .build();
  },

  /**
   * Creates a custom response with realistic token counting.
   * Automatically calculates appropriate token usage based on content length.
   */
  custom(content: string): APIResponse {
    // Estimate tokens based on content length (rough approximation)
    const estimatedTokens = Math.max(1, Math.floor(content.length / 4));
    const promptTokens = Math.floor(estimatedTokens * 0.2); // 20% prompt
    const completionTokens = Math.floor(estimatedTokens * 0.8); // 80% completion

    // Estimate duration based on content complexity
    const baseTime = 500;
    const contentFactor = Math.min(content.length / 100, 50); // Cap at 50x
    const estimatedDuration = baseTime + contentFactor * 50;

    return new APIResponseBuilder()
      .withContent(content)
      .withUsage({
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      })
      .withDuration(Math.floor(estimatedDuration))
      .withCurrentTimestamp()
      .build();
  },

  /**
   * Creates a response cut off due to length limits.
   */
  lengthLimited(): APIResponse {
    return new APIResponseBuilder()
      .withContent(ResponseContent.detailed.substring(0, 200) + "...")
      .withUsage(UsagePatterns.large)
      .withLengthLimit()
      .withDuration(TimingPatterns.typical.duration)
      .withCurrentTimestamp()
      .build();
  },
} as const;

/**
 * Pre-built realistic Gemini API response fixtures.
 */
export const RealisticResponses = {
  /** Technical explanation response */
  technical: ResponseFactories.technical(),

  /** Code-focused response */
  code: ResponseFactories.code(),

  /** Detailed explanation response */
  detailed: ResponseFactories.detailed(),

  /** Conversational response */
  conversational: ResponseFactories.conversational(),

  /** Minimal response */
  minimal: ResponseFactories.minimal(),

  /** Length-limited response */
  lengthLimited: ResponseFactories.lengthLimited(),
} as const;

/**
 * Gemini API fixtures organized by category.
 */
export const GeminiFixtures = {
  /** Response content templates */
  content: ResponseContent,

  /** Token usage patterns */
  usage: UsagePatterns,

  /** Timing patterns */
  timing: TimingPatterns,

  /** Factory functions for creating responses */
  factories: ResponseFactories,

  /** Pre-built realistic responses */
  responses: RealisticResponses,
} as const;
