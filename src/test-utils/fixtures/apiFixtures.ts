/**
 * Central API fixtures namespace providing organized access to all test fixtures.
 *
 * This namespace organizes fixtures by category and provides convenient access
 * to realistic API response data for comprehensive testing scenarios.
 */

import { GeminiFixtures } from "./geminiFixtures";
import { ErrorFixtures } from "./errorFixtures";
import { StreamingFixtures } from "./streamingFixtures";
import { EdgeCaseFixtures } from "./edgeCaseFixtures";

/**
 * Comprehensive API fixtures organized by scenario type.
 *
 * Provides realistic test data for:
 * - Gemini API responses with proper token usage and metadata
 * - Error scenarios covering all error codes and HTTP status patterns
 * - Streaming responses with realistic chunk progression
 * - Edge cases and boundary conditions
 *
 * @example
 * ```typescript
 * import { APIFixtures } from '../test-utils/fixtures';
 *
 * // Get realistic technical response
 * const response = APIFixtures.gemini.responses.technical;
 *
 * // Get rate limit error with retry-after
 * const error = APIFixtures.errors.rateLimited.withRetryAfter(60);
 *
 * // Get progressive streaming chunks
 * const chunks = APIFixtures.streaming.progressiveResponse("Long response content");
 * ```
 */
export const APIFixtures = {
  /** Gemini API specific response patterns and realistic data */
  gemini: GeminiFixtures,

  /** Comprehensive error scenarios with proper error codes and metadata */
  errors: ErrorFixtures,

  /** Streaming response patterns with realistic chunk progression */
  streaming: StreamingFixtures,

  /** Edge cases, boundary conditions, and unusual scenarios */
  edgeCases: EdgeCaseFixtures,
} as const;
