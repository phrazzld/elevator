/**
 * Edge case and boundary condition fixtures for comprehensive testing.
 *
 * These fixtures provide unusual scenarios, boundary conditions, and edge cases
 * that help ensure robust error handling and system resilience.
 */

import type {
  APIResponse,
  APIStreamChunk,
  APIError,
} from "../../core/apiClient";
import {
  APIResponseBuilder,
  APIStreamChunkBuilder,
  APIErrorBuilder,
} from "../builders/apiBuilders";

/**
 * Boundary value content for testing limits.
 */
export const BoundaryContent = {
  /** Empty string */
  empty: "",

  /** Single character */
  singleChar: "a",

  /** Very long single word */
  veryLongWord: "supercalifragilisticexpialidocious".repeat(50),

  /** Content with only whitespace */
  whitespaceOnly: "   \t\n   \r\n   ",

  /** Content with special characters */
  specialChars: "!@#$%^&*()_+-=[]{}|;':\",./<>?`~",

  /** Unicode and emoji content */
  unicode: "Hello 🌍! Testing unicode: café, naïve, 中文, العربية, 🚀✨",

  /** Very long content (near limits) */
  veryLong:
    "This is a very long response that tests the boundaries of content handling. ".repeat(
      200,
    ),

  /** Content with unusual line breaks */
  unusualLineBreaks: "Line 1\r\nLine 2\rLine 3\nLine 4\n\rLine 5",

  /** JSON-like content */
  jsonLike:
    '{"message": "This looks like JSON", "value": 123, "nested": {"array": [1,2,3]}}',

  /** Code with unusual formatting */
  weirdCode: `function   weird_function(    ){
    let    x=1;let y=    2;
    return x+y;/* comment with
    newline */}`,

  /** Content with HTML/XML */
  markup: "<script>alert('test')</script><p>Some HTML content</p>",

  /** Binary-looking content */
  binaryLike: "01001000 01100101 01101100 01101100 01101111",

  /** Repeated patterns */
  repeatedPattern: "ABC".repeat(1000),
} as const;

/**
 * Unusual timing and performance scenarios.
 */
export const UnusualTiming = {
  /** Instant response (0ms) */
  instant: { duration: 0 },

  /** Very fast response */
  veryFast: { duration: 1 },

  /** Exactly at timeout threshold */
  nearTimeout: { duration: 29999 },

  /** Unusual precise timing */
  precise: { duration: 1337 },

  /** Very slow but not timeout */
  verySlow: { duration: 25000 },
} as const;

/**
 * Unusual token usage patterns.
 */
export const UnusualUsage = {
  /** Zero tokens (edge case) */
  zero: {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  },

  /** Only prompt tokens */
  promptOnly: {
    promptTokens: 100,
    completionTokens: 0,
    totalTokens: 100,
  },

  /** Only completion tokens */
  completionOnly: {
    promptTokens: 0,
    completionTokens: 50,
    totalTokens: 50,
  },

  /** Mismatched total (should not happen but test resilience) */
  mismatchedTotal: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 25, // Should be 30
  },

  /** Very large token count */
  veryLarge: {
    promptTokens: 100000,
    completionTokens: 500000,
    totalTokens: 600000,
  },

  /** Single token response */
  singleToken: {
    promptTokens: 1,
    completionTokens: 1,
    totalTokens: 2,
  },
} as const;

/**
 * Factory functions for edge case scenarios.
 */
export const EdgeCaseFactories = {
  /**
   * Creates responses with boundary conditions.
   */
  boundary: {
    emptyResponse(): APIResponse {
      return new APIResponseBuilder()
        .withContent(BoundaryContent.empty)
        .withUsage(UnusualUsage.zero)
        .withDuration(UnusualTiming.instant.duration)
        .build();
    },

    whitespaceOnlyResponse(): APIResponse {
      return new APIResponseBuilder()
        .withContent(BoundaryContent.whitespaceOnly)
        .withUsage(UnusualUsage.singleToken)
        .withDuration(UnusualTiming.veryFast.duration)
        .build();
    },

    veryLongResponse(): APIResponse {
      return new APIResponseBuilder()
        .withContent(BoundaryContent.veryLong)
        .withUsage(UnusualUsage.veryLarge)
        .withDuration(UnusualTiming.verySlow.duration)
        .build();
    },

    unicodeResponse(): APIResponse {
      return new APIResponseBuilder()
        .withContent(BoundaryContent.unicode)
        .withUsage({
          promptTokens: 8,
          completionTokens: 15,
          totalTokens: 23,
        })
        .withDuration(UnusualTiming.precise.duration)
        .build();
    },

    specialCharsResponse(): APIResponse {
      return new APIResponseBuilder()
        .withContent(BoundaryContent.specialChars)
        .withUsage(UnusualUsage.singleToken)
        .build();
    },
  },

  /**
   * Creates responses with unusual timing characteristics.
   */
  timing: {
    instantResponse(): APIResponse {
      return new APIResponseBuilder()
        .withContent("Instant response")
        .withUsage(UnusualUsage.singleToken)
        .withDuration(UnusualTiming.instant.duration)
        .build();
    },

    nearTimeoutResponse(): APIResponse {
      return new APIResponseBuilder()
        .withContent("Response just before timeout")
        .withUsage({
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        })
        .withDuration(UnusualTiming.nearTimeout.duration)
        .build();
    },

    preciseTimingResponse(): APIResponse {
      return new APIResponseBuilder()
        .withContent("Response with precise timing")
        .withDuration(UnusualTiming.precise.duration)
        .build();
    },
  },

  /**
   * Creates unusual streaming scenarios.
   */
  streaming: {
    emptyChunkStream(): APIStreamChunk[] {
      return [
        new APIStreamChunkBuilder()
          .withContent("")
          .asIntermediateChunk()
          .build(),
        new APIStreamChunkBuilder()
          .withContent("")
          .asIntermediateChunk()
          .build(),
        new APIStreamChunkBuilder().withContent("").asFinalChunk().build(),
      ];
    },

    singleCharacterChunks(): APIStreamChunk[] {
      const chars = "Hello!".split("");
      return chars.map((char, index) => {
        const isLast = index === chars.length - 1;
        const builder = new APIStreamChunkBuilder().withContent(char);
        return isLast
          ? builder.asFinalChunk().build()
          : builder.asIntermediateChunk().build();
      });
    },

    veryLargeChunks(): APIStreamChunk[] {
      const largeChunk = "A".repeat(10000);
      return [
        new APIStreamChunkBuilder()
          .withContent(largeChunk)
          .asIntermediateChunk()
          .build(),
        new APIStreamChunkBuilder()
          .withContent(largeChunk)
          .asFinalChunk()
          .build(),
      ];
    },

    mixedContentChunks(): APIStreamChunk[] {
      return [
        new APIStreamChunkBuilder()
          .withContent("Normal text ")
          .asIntermediateChunk()
          .build(),
        new APIStreamChunkBuilder()
          .withContent("🚀✨ ")
          .asIntermediateChunk()
          .build(),
        new APIStreamChunkBuilder()
          .withContent("中文 ")
          .asIntermediateChunk()
          .build(),
        new APIStreamChunkBuilder().withContent("fin").asFinalChunk().build(),
      ];
    },

    noContentFinalChunk(): APIStreamChunk[] {
      return [
        new APIStreamChunkBuilder()
          .withContent("Some content")
          .asIntermediateChunk()
          .build(),
        new APIStreamChunkBuilder().withContent("").asFinalChunk().build(),
      ];
    },
  },

  /**
   * Creates unusual error scenarios.
   */
  errors: {
    errorWithoutMessage(): APIError {
      return new APIErrorBuilder()
        .withCode("UNKNOWN_ERROR")
        .withMessage("")
        .build();
    },

    errorWithVeryLongMessage(): APIError {
      const longMessage =
        "This is a very long error message that goes on and on. ".repeat(100);
      return new APIErrorBuilder()
        .withCode("UNKNOWN_ERROR")
        .withMessage(longMessage)
        .build();
    },

    errorWithSpecialChars(): APIError {
      return new APIErrorBuilder()
        .withCode("UNKNOWN_ERROR")
        .withMessage("Error: !@#$%^&*()_+-=[]{}|;':\",./<>?`~")
        .build();
    },

    errorWithUnicode(): APIError {
      return new APIErrorBuilder()
        .withCode("UNKNOWN_ERROR")
        .withMessage("Erreur: Échec de l'opération 🔥❌")
        .build();
    },

    errorWithZeroStatusCode(): APIError {
      return new APIErrorBuilder()
        .withCode("UNKNOWN_ERROR")
        .withMessage("Error with zero status code")
        .withStatusCode(0)
        .build();
    },

    errorWithNegativeRetryAfter(): APIError {
      return new APIErrorBuilder()
        .asRateLimitError()
        .withRetryAfter(-1000) // Negative retry delay
        .build();
    },

    errorWithVeryLargeRetryAfter(): APIError {
      return new APIErrorBuilder()
        .asRateLimitError()
        .withRetryAfter(Number.MAX_SAFE_INTEGER)
        .build();
    },
  },
} as const;

/**
 * Pre-built edge case scenarios.
 */
export const EdgeCaseScenarios = {
  // Boundary responses
  emptyResponse: EdgeCaseFactories.boundary.emptyResponse(),
  whitespaceOnly: EdgeCaseFactories.boundary.whitespaceOnlyResponse(),
  veryLongResponse: EdgeCaseFactories.boundary.veryLongResponse(),
  unicodeResponse: EdgeCaseFactories.boundary.unicodeResponse(),
  specialChars: EdgeCaseFactories.boundary.specialCharsResponse(),

  // Timing edge cases
  instantResponse: EdgeCaseFactories.timing.instantResponse(),
  nearTimeout: EdgeCaseFactories.timing.nearTimeoutResponse(),
  preciseTime: EdgeCaseFactories.timing.preciseTimingResponse(),

  // Streaming edge cases
  emptyChunks: EdgeCaseFactories.streaming.emptyChunkStream(),
  singleCharChunks: EdgeCaseFactories.streaming.singleCharacterChunks(),
  largeChunks: EdgeCaseFactories.streaming.veryLargeChunks(),
  mixedContent: EdgeCaseFactories.streaming.mixedContentChunks(),
  noContentFinal: EdgeCaseFactories.streaming.noContentFinalChunk(),

  // Error edge cases
  emptyError: EdgeCaseFactories.errors.errorWithoutMessage(),
  longError: EdgeCaseFactories.errors.errorWithVeryLongMessage(),
  specialCharError: EdgeCaseFactories.errors.errorWithSpecialChars(),
  unicodeError: EdgeCaseFactories.errors.errorWithUnicode(),
  zeroStatusError: EdgeCaseFactories.errors.errorWithZeroStatusCode(),
  negativeRetry: EdgeCaseFactories.errors.errorWithNegativeRetryAfter(),
  largeRetry: EdgeCaseFactories.errors.errorWithVeryLargeRetryAfter(),
} as const;

/**
 * Edge case test utilities.
 */
export const EdgeCaseUtils = {
  /**
   * Validates that content handles special characters safely.
   */
  validateSpecialChars(content: string): boolean {
    // Check for potential security issues or parsing problems
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(content));
  },

  /**
   * Calculates approximate token count for content.
   */
  approximateTokenCount(content: string): number {
    // Rough approximation: 4 characters per token on average
    return Math.max(1, Math.floor(content.length / 4));
  },

  /**
   * Validates that timing values are reasonable.
   */
  validateTiming(duration: number): boolean {
    return duration >= 0 && duration <= 300000; // 0 to 5 minutes
  },

  /**
   * Checks if usage values are consistent.
   */
  validateUsage(usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }): boolean {
    return (
      usage.promptTokens >= 0 &&
      usage.completionTokens >= 0 &&
      usage.totalTokens >= 0 &&
      usage.totalTokens === usage.promptTokens + usage.completionTokens
    );
  },

  /**
   * Creates content that tests character encoding.
   */
  createEncodingTest(): string {
    return [
      "ASCII: Hello World",
      "UTF-8: café naïve résumé",
      "Emoji: 🌍🚀✨💡🔥",
      "Chinese: 你好世界",
      "Arabic: مرحبا بالعالم",
      "Russian: Привет мир",
      "Math: ∑ ∫ ∞ ≠ ≤ ≥",
      "Symbols: © ® ™ € £ ¥",
    ].join("\n");
  },

  /**
   * Creates content that tests markdown parsing.
   */
  createMarkdownTest(): string {
    return `# Heading
**Bold** and *italic* text
\`inline code\` and:

\`\`\`javascript
function test() {
  return "code block";
}
\`\`\`

- List item 1
- List item 2

[Link](https://example.com)`;
  },
} as const;

/**
 * Edge case fixtures organized by category.
 */
export const EdgeCaseFixtures = {
  /** Boundary content values */
  content: BoundaryContent,

  /** Unusual timing patterns */
  timing: UnusualTiming,

  /** Unusual usage patterns */
  usage: UnusualUsage,

  /** Factory functions for edge cases */
  factories: EdgeCaseFactories,

  /** Pre-built edge case scenarios */
  scenarios: EdgeCaseScenarios,

  /** Utilities for edge case testing */
  utils: EdgeCaseUtils,
} as const;
