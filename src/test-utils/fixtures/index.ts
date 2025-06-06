/**
 * Test fixtures for API responses, errors, and common test scenarios.
 *
 * This module provides comprehensive fixtures for testing API interactions with
 * realistic data patterns based on actual Gemini API responses. All fixtures are
 * designed to work seamlessly with the existing test data builders.
 *
 * @example
 * ```typescript
 * import { APIFixtures } from '../test-utils/fixtures';
 *
 * // Use realistic success response
 * const response = APIFixtures.gemini.successResponses.technical;
 *
 * // Use comprehensive error scenario
 * const error = APIFixtures.gemini.errorScenarios.rateLimited;
 *
 * // Load streaming fixture
 * const stream = APIFixtures.streaming.progressiveResponse;
 * ```
 */

// Re-export all fixture categories for convenient access
export * from "./geminiFixtures";
export * from "./errorFixtures";
export * from "./streamingFixtures";
export * from "./edgeCaseFixtures";
export * from "./fixtureUtils";

// Re-export the main fixtures namespace
export { APIFixtures } from "./apiFixtures";
