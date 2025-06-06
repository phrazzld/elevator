/**
 * Streaming response fixtures for testing real-time API interactions.
 *
 * These fixtures provide realistic streaming patterns including progressive content delivery,
 * error scenarios during streaming, and proper chunk metadata handling.
 */

import type { APIStreamChunk } from "../../core/apiClient";
import { APIStreamChunkBuilder } from "../builders/apiBuilders";
import { ErrorFactories } from "./errorFixtures";

/**
 * Template content for streaming scenarios.
 */
export const StreamingContent = {
  /** Short response broken into logical chunks */
  shortResponse: ["Hello", "! I can", " help you", " with that", " question."],

  /** Technical explanation with natural breaks */
  technicalExplanation: [
    "TypeScript",
    " is a statically",
    " typed programming",
    " language that",
    " builds on JavaScript",
    " by adding",
    " static type",
    " definitions.",
    " This provides",
    " better documentation",
    " and validation",
    " for your code.",
  ],

  /** Code generation with realistic pauses */
  codeGeneration: [
    "```typescript\n",
    "interface User {\n",
    "  id: number;\n",
    "  name: string;\n",
    "  email: string;\n",
    "}\n\n",
    "function createUser(",
    "name: string,",
    " email: string",
    "): User {\n",
    "  return {\n",
    "    id: Math.random(),\n",
    "    name,\n",
    "    email\n",
    "  };\n",
    "}\n",
    "```",
  ],

  /** Long response with paragraph breaks */
  longResponse: [
    "When building modern web applications,",
    " several key principles should guide",
    " your architecture decisions.\n\n",
    "First, separation of concerns",
    " is crucial for maintainability.",
    " Keep business logic separate",
    " from presentation logic.",
    "\n\nSecond, follow the single",
    " responsibility principle.",
    " Each component should have",
    " one reason to change.",
    "\n\nFinally, implement proper",
    " error handling and graceful",
    " degradation for better",
    " user experience.",
  ],
} as const;

/**
 * Factory functions for creating streaming scenarios.
 */
export const StreamingFactories = {
  /**
   * Creates a progressive response from content chunks.
   */
  progressive(chunks: readonly string[]): APIStreamChunk[] {
    return chunks.map((chunk, index) => {
      const isLast = index === chunks.length - 1;

      if (isLast) {
        // Final chunk with metadata
        return new APIStreamChunkBuilder()
          .withContent(chunk)
          .asFinalChunk()
          .withCurrentTimestamp()
          .build();
      } else {
        // Intermediate chunk
        return new APIStreamChunkBuilder()
          .withContent(chunk)
          .asIntermediateChunk()
          .build();
      }
    });
  },

  /**
   * Creates a streaming response that gets interrupted by an error.
   */
  interruptedStream(
    successfulChunks: readonly string[],
    errorAtIndex: number,
  ): (APIStreamChunk | { error: unknown })[] {
    const chunks: (APIStreamChunk | { error: unknown })[] = [];

    // Add successful chunks up to the error point
    for (let i = 0; i < Math.min(successfulChunks.length, errorAtIndex); i++) {
      chunks.push(
        new APIStreamChunkBuilder()
          .withContent(successfulChunks[i] || "")
          .asIntermediateChunk()
          .build(),
      );
    }

    // Add error
    chunks.push({
      error: ErrorFactories.network.connectionRefused(),
    });

    return chunks;
  },

  /**
   * Creates a streaming response with variable timing between chunks.
   */
  variableTiming(content: readonly string[]): APIStreamChunk[] {
    return content.map((chunk, index) => {
      const isLast = index === content.length - 1;
      const builder = new APIStreamChunkBuilder().withContent(chunk);

      return isLast
        ? builder.asFinalChunk().withCurrentTimestamp().build()
        : builder.asIntermediateChunk().build();
    });
  },

  /**
   * Creates a streaming response with empty chunks (heartbeat scenario).
   */
  withHeartbeat(content: readonly string[]): APIStreamChunk[] {
    const chunks: APIStreamChunk[] = [];

    for (let i = 0; i < content.length; i++) {
      // Add actual content chunk
      chunks.push(
        new APIStreamChunkBuilder()
          .withContent(content[i] || "")
          .asIntermediateChunk()
          .build(),
      );

      // Add heartbeat (empty chunk) between content chunks
      if (i < content.length - 1) {
        chunks.push(
          new APIStreamChunkBuilder()
            .withContent("")
            .asIntermediateChunk()
            .build(),
        );
      }
    }

    // Add final chunk
    chunks.push(
      new APIStreamChunkBuilder()
        .withContent("")
        .asFinalChunk()
        .withCurrentTimestamp()
        .build(),
    );

    return chunks;
  },

  /**
   * Creates a streaming response that ends due to length limits.
   */
  lengthLimited(content: readonly string[]): APIStreamChunk[] {
    return content.map((chunk, index) => {
      const isLast = index === content.length - 1;
      const builder = new APIStreamChunkBuilder().withContent(chunk);

      if (isLast) {
        return builder
          .asFinalChunk()
          .withMetadata({
            timestamp: new Date(),
            duration: 1500,
            finishReason: "length",
          })
          .build();
      } else {
        return builder.asIntermediateChunk().build();
      }
    });
  },

  /**
   * Creates a streaming response that gets safety filtered mid-stream.
   */
  safetyFiltered(safeContent: readonly string[]): APIStreamChunk[] {
    const chunks: APIStreamChunk[] = [];

    // Add safe content chunks
    for (const chunk of safeContent) {
      chunks.push(
        new APIStreamChunkBuilder()
          .withContent(chunk)
          .asIntermediateChunk()
          .build(),
      );
    }

    // Add final chunk indicating safety filter
    chunks.push(
      new APIStreamChunkBuilder()
        .withContent("")
        .asFinalChunk()
        .withMetadata({
          timestamp: new Date(),
          duration: 1200,
          finishReason: "safety",
        })
        .build(),
    );

    return chunks;
  },

  /**
   * Creates a custom streaming response from a full text.
   * Automatically splits text into realistic chunks.
   */
  fromText(text: string, chunkSize = 10): APIStreamChunk[] {
    const words = text.split(/(\s+)/); // Preserve whitespace
    const chunks: string[] = [];

    let currentChunk = "";
    let wordCount = 0;

    for (const word of words) {
      currentChunk += word;
      if (!word.trim()) continue; // Skip whitespace for counting

      wordCount++;
      if (wordCount >= chunkSize) {
        chunks.push(currentChunk);
        currentChunk = "";
        wordCount = 0;
      }
    }

    // Add remaining content
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return this.progressive(chunks);
  },
} as const;

/**
 * Pre-built streaming scenarios for common test cases.
 */
export const StreamingScenarios = {
  /** Simple short response */
  shortResponse: StreamingFactories.progressive(StreamingContent.shortResponse),

  /** Technical explanation */
  technicalExplanation: StreamingFactories.progressive(
    StreamingContent.technicalExplanation,
  ),

  /** Code generation */
  codeGeneration: StreamingFactories.progressive(
    StreamingContent.codeGeneration,
  ),

  /** Long detailed response */
  longResponse: StreamingFactories.progressive(StreamingContent.longResponse),

  /** Interrupted by network error */
  networkInterruption: StreamingFactories.interruptedStream(
    StreamingContent.shortResponse,
    2,
  ),

  /** Response with heartbeat chunks */
  withHeartbeat: StreamingFactories.withHeartbeat(
    StreamingContent.shortResponse,
  ),

  /** Response cut off by length limits */
  lengthLimited: StreamingFactories.lengthLimited(
    StreamingContent.longResponse.slice(0, 8),
  ),

  /** Response blocked by safety filter */
  safetyFiltered: StreamingFactories.safetyFiltered([
    "This is safe content",
    " that will be",
    " delivered successfully.",
  ]),

  /** Empty response stream */
  empty: [
    new APIStreamChunkBuilder()
      .withContent("")
      .asFinalChunk()
      .withCurrentTimestamp()
      .build(),
  ],

  /** Single chunk response */
  singleChunk: [
    new APIStreamChunkBuilder()
      .withContent("Complete response in one chunk")
      .asFinalChunk()
      .withCurrentTimestamp()
      .build(),
  ],
} as const;

/**
 * Streaming test utilities.
 */
export const StreamingUtils = {
  /**
   * Combines all chunk content into a single string.
   */
  combineChunks(chunks: readonly APIStreamChunk[]): string {
    return chunks.map((chunk) => chunk.content).join("");
  },

  /**
   * Gets the final chunk from a stream (if any).
   */
  getFinalChunk(chunks: readonly APIStreamChunk[]): APIStreamChunk | undefined {
    return chunks.find((chunk) => chunk.done);
  },

  /**
   * Gets all intermediate chunks from a stream.
   */
  getIntermediateChunks(chunks: readonly APIStreamChunk[]): APIStreamChunk[] {
    return chunks.filter((chunk) => !chunk.done);
  },

  /**
   * Validates that a stream has proper progression (intermediate chunks followed by final chunk).
   */
  validateStreamProgression(chunks: readonly APIStreamChunk[]): boolean {
    if (chunks.length === 0) return false;

    // All chunks except the last should be intermediate
    const intermediateChunks = chunks.slice(0, -1);
    const finalChunk = chunks[chunks.length - 1];

    return (
      intermediateChunks.every((chunk) => !chunk.done) &&
      finalChunk?.done === true
    );
  },

  /**
   * Creates a realistic delay pattern for streaming chunks.
   */
  createDelayPattern(chunkCount: number): number[] {
    const delays: number[] = [];
    const baseDelay = 100;

    for (let i = 0; i < chunkCount; i++) {
      // Variable delays with some randomness
      const variance = Math.random() * 50; // 0-50ms variance
      delays.push(baseDelay + variance);
    }

    return delays;
  },
} as const;

/**
 * Streaming fixtures organized by category.
 */
export const StreamingFixtures = {
  /** Content templates for streaming */
  content: StreamingContent,

  /** Factory functions for creating streams */
  factories: StreamingFactories,

  /** Pre-built streaming scenarios */
  scenarios: StreamingScenarios,

  /** Utilities for working with streams */
  utils: StreamingUtils,
} as const;
