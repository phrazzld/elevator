/**
 * General utilities for working with test fixtures across all categories.
 *
 * These utilities provide common functionality for manipulating, validating,
 * and combining fixture data in tests. They work across all fixture types
 * (API responses, errors, streaming, edge cases).
 */

import type {
  APIResponse,
  APIStreamChunk,
  APIError,
} from "../../core/apiClient";

/**
 * Random data generators for creating variation in test fixtures.
 */
export const RandomGenerators = {
  /**
   * Generates a random duration within realistic API response time ranges.
   */
  randomDuration(min = 100, max = 5000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generates realistic token counts based on content length.
   */
  randomTokenUsage(contentLength: number): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    const basePromptTokens = Math.max(1, Math.floor(contentLength * 0.1));
    const baseCompletionTokens = Math.max(1, Math.floor(contentLength * 0.25));

    // Add some randomness
    const promptTokens = basePromptTokens + Math.floor(Math.random() * 10);
    const completionTokens =
      baseCompletionTokens + Math.floor(Math.random() * 20);

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  },

  /**
   * Generates a random timestamp within the last hour.
   */
  randomRecentTimestamp(): Date {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const randomTime =
      hourAgo.getTime() + Math.random() * (now.getTime() - hourAgo.getTime());
    return new Date(randomTime);
  },

  /**
   * Generates a random HTTP status code from common API status codes.
   */
  randomStatusCode(): number {
    const commonCodes = [200, 400, 401, 403, 404, 429, 500, 502, 503, 504];
    return commonCodes[Math.floor(Math.random() * commonCodes.length)]!;
  },

  /**
   * Generates random retry delay in milliseconds.
   */
  randomRetryDelay(min = 1000, max = 60000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
} as const;

/**
 * Validation utilities for fixture data integrity.
 */
export const ValidationUtils = {
  /**
   * Validates that an API response has consistent data.
   */
  validateAPIResponse(response: APIResponse): boolean {
    const hasValidContent = typeof response.content === "string";
    const hasValidUsage =
      response.usage &&
      typeof response.usage.promptTokens === "number" &&
      typeof response.usage.completionTokens === "number" &&
      typeof response.usage.totalTokens === "number" &&
      response.usage.promptTokens >= 0 &&
      response.usage.completionTokens >= 0 &&
      response.usage.totalTokens ===
        response.usage.promptTokens + response.usage.completionTokens;
    const hasValidTimestamp = response.metadata.timestamp instanceof Date;
    const hasValidDuration =
      typeof response.metadata.duration === "number" &&
      response.metadata.duration >= 0;

    return (
      hasValidContent && hasValidUsage && hasValidTimestamp && hasValidDuration
    );
  },

  /**
   * Validates that an API error has consistent data.
   */
  validateAPIError(error: APIError): boolean {
    const hasValidCode =
      typeof error.code === "string" && error.code.length > 0;
    const hasValidMessage = typeof error.message === "string";
    const hasValidRetryable =
      !error.details?.retryable || typeof error.details.retryable === "boolean";
    const hasValidStatusCode =
      !error.details?.statusCode ||
      (error.details.statusCode >= 100 && error.details.statusCode < 600);
    const hasValidRetryAfter =
      !error.details?.retryAfter ||
      (typeof error.details.retryAfter === "number" &&
        error.details.retryAfter >= 0);

    return (
      hasValidCode &&
      hasValidMessage &&
      hasValidRetryable &&
      hasValidStatusCode &&
      hasValidRetryAfter
    );
  },

  /**
   * Validates that a streaming chunk has proper structure.
   */
  validateStreamChunk(chunk: APIStreamChunk): boolean {
    const hasValidContent = typeof chunk.content === "string";
    const hasValidDoneFlag = typeof chunk.done === "boolean";
    const hasValidTimestamp =
      !chunk.metadata?.timestamp || chunk.metadata.timestamp instanceof Date;

    return hasValidContent && hasValidDoneFlag && hasValidTimestamp;
  },

  /**
   * Validates that a stream has proper progression (intermediate chunks + final chunk).
   */
  validateStreamProgression(chunks: readonly APIStreamChunk[]): boolean {
    if (chunks.length === 0) return false;

    // All chunks except the last should be intermediate (done: false)
    const intermediateChunks = chunks.slice(0, -1);
    const finalChunk = chunks[chunks.length - 1];

    return (
      intermediateChunks.every((chunk) => !chunk.done) &&
      finalChunk?.done === true
    );
  },
} as const;

/**
 * Utilities for combining and manipulating fixture data.
 */
export const CombinationUtils = {
  /**
   * Merges multiple API responses into a collection for batch testing.
   */
  combineResponses(...responses: APIResponse[]): APIResponse[] {
    return responses.filter((response) =>
      ValidationUtils.validateAPIResponse(response),
    );
  },

  /**
   * Merges multiple API errors into a collection for comprehensive error testing.
   */
  combineErrors(...errors: APIError[]): APIError[] {
    return errors.filter((error) => ValidationUtils.validateAPIError(error));
  },

  /**
   * Combines stream chunks from multiple sources into a single stream.
   */
  combineStreams(...streamArrays: APIStreamChunk[][]): APIStreamChunk[] {
    const allChunks: APIStreamChunk[] = [];

    for (const chunks of streamArrays) {
      // Add all intermediate chunks
      const intermediates = chunks.filter((chunk) => !chunk.done);
      allChunks.push(...intermediates);
    }

    // Add a final chunk to complete the combined stream
    const lastStreamFinalChunk = streamArrays[streamArrays.length - 1]?.find(
      (chunk) => chunk.done,
    );
    if (lastStreamFinalChunk) {
      allChunks.push(lastStreamFinalChunk);
    }

    return allChunks;
  },

  /**
   * Creates test data variations by applying different modifiers to base fixtures.
   */
  createVariations<T>(
    baseFixture: T,
    modifiers: Array<(fixture: T) => T>,
  ): T[] {
    return modifiers.map((modifier) => modifier(baseFixture));
  },
} as const;

/**
 * Utilities for test data selection and filtering.
 */
export const SelectionUtils = {
  /**
   * Selects random items from a fixture collection.
   */
  randomSelection<T>(items: readonly T[], count: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, items.length));
  },

  /**
   * Filters fixtures by a predicate function.
   */
  filterFixtures<T>(
    fixtures: readonly T[],
    predicate: (item: T) => boolean,
  ): T[] {
    return fixtures.filter(predicate);
  },

  /**
   * Gets a random single item from a fixture collection.
   */
  randomItem<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot select random item from empty array");
    }
    return items[Math.floor(Math.random() * items.length)]!;
  },

  /**
   * Creates a round-robin iterator for cycling through fixtures.
   */
  createRoundRobin<T>(items: readonly T[]): () => T {
    if (items.length === 0) {
      throw new Error("Cannot create round-robin iterator for empty array");
    }
    let index = 0;
    return () => {
      const item = items[index]!;
      index = (index + 1) % items.length;
      return item;
    };
  },
} as const;

/**
 * Utilities for realistic test data timing and sequencing.
 */
export const TimingUtils = {
  /**
   * Creates realistic delays for simulating network timing in tests.
   */
  createRealisticDelays(count: number, baseDelay = 100): number[] {
    return Array.from({ length: count }, (_, i) => {
      // Gradually increasing delays with some randomness
      const baseTime = baseDelay + i * 50;
      const variance = Math.random() * 100; // ±100ms variance
      return Math.floor(baseTime + variance);
    });
  },

  /**
   * Creates timestamp sequences for testing temporal ordering.
   */
  createTimestampSequence(count: number, intervalMs = 1000): Date[] {
    const start = new Date();
    return Array.from(
      { length: count },
      (_, i) => new Date(start.getTime() + i * intervalMs),
    );
  },

  /**
   * Simulates realistic API response timing based on content complexity.
   */
  estimateResponseTime(contentLength: number, hasCode = false): number {
    const baseTime = 200;
    const contentFactor = Math.min(contentLength / 100, 30); // Cap at 30x
    const codePenalty = hasCode ? 500 : 0; // Code generation takes longer
    const randomVariance = Math.random() * 200; // ±200ms variance

    return Math.floor(
      baseTime + contentFactor * 50 + codePenalty + randomVariance,
    );
  },
} as const;

/**
 * Content generation utilities for creating realistic test data.
 */
export const ContentGenerators = {
  /**
   * Generates Lorem Ipsum-style technical content.
   */
  generateTechnicalContent(paragraphCount = 2): string {
    const techTerms = [
      "TypeScript",
      "JavaScript",
      "React",
      "Node.js",
      "API",
      "interface",
      "function",
      "component",
      "module",
      "dependency",
      "asynchronous",
      "callback",
      "promise",
      "async/await",
      "immutable",
      "state management",
      "error handling",
      "testing",
    ];

    const sentences = [
      "provides robust type safety for modern web development.",
      "enables better developer experience through static analysis.",
      "improves code maintainability and reduces runtime errors.",
      "offers excellent tooling support and IntelliSense features.",
      "integrates seamlessly with existing JavaScript codebases.",
      "supports advanced features like generics and conditional types.",
    ];

    let content = "";
    for (let p = 0; p < paragraphCount; p++) {
      for (let s = 0; s < 3; s++) {
        const term = techTerms[Math.floor(Math.random() * techTerms.length)];
        const sentence =
          sentences[Math.floor(Math.random() * sentences.length)];
        content += `${term} ${sentence} `;
      }
      if (p < paragraphCount - 1) content += "\n\n";
    }

    return content.trim();
  },

  /**
   * Generates realistic code snippets for testing.
   */
  generateCodeSnippet(language = "typescript"): string {
    const tsSnippets = [
      `interface User {
  id: number;
  name: string;
  email: string;
}`,
      `function processData<T>(data: T[]): T[] {
  return data.filter(item => item != null);
}`,
      `const apiResponse = await fetch('/api/data')
  .then(res => res.json())
  .catch(err => console.error(err));`,
    ];

    const snippet = tsSnippets[Math.floor(Math.random() * tsSnippets.length)];
    return `\`\`\`${language}\n${snippet}\n\`\`\``;
  },

  /**
   * Generates realistic error messages.
   */
  generateErrorMessage(
    errorType: "network" | "auth" | "server" | "client" = "server",
  ): string {
    const templates = {
      network: [
        "Connection timeout after {0} seconds",
        "Failed to connect to {0}",
        "Network is unreachable",
      ],
      auth: [
        "Invalid API key provided",
        "Authentication failed for user {0}",
        "Access denied for resource {0}",
      ],
      server: [
        "Internal server error occurred",
        "Service temporarily unavailable",
        "Database connection failed",
      ],
      client: [
        "Invalid request format",
        "Missing required parameter: {0}",
        "Request exceeds size limit",
      ],
    };

    const typeTemplates = templates[errorType];
    if (typeTemplates.length === 0) {
      return "Unknown error occurred";
    }
    const template =
      typeTemplates[Math.floor(Math.random() * typeTemplates.length)]!;
    return template.replace("{0}", "example-value");
  },
} as const;

/**
 * Fixture utilities organized by category.
 */
export const FixtureUtils = {
  /** Random data generators */
  random: RandomGenerators,

  /** Data validation utilities */
  validation: ValidationUtils,

  /** Data combination and manipulation */
  combination: CombinationUtils,

  /** Selection and filtering utilities */
  selection: SelectionUtils,

  /** Timing and sequencing utilities */
  timing: TimingUtils,

  /** Content generation utilities */
  content: ContentGenerators,
} as const;
