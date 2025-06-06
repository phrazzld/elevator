/**
 * Test utilities and data builders for consistent test setup.
 *
 * This module provides builders for creating test data objects with sensible defaults
 * and easy customization. All builders follow the fluent pattern and maintain
 * immutability as required by the domain types.
 *
 * @example
 * ```typescript
 * import { TestDataBuilders } from './test-utils';
 *
 * // Create a simple raw prompt
 * const prompt = TestDataBuilders.rawPrompt().withContent("Test prompt").build();
 *
 * // Create a configured API config
 * const config = TestDataBuilders.apiConfig()
 *   .withApiKey("test-key")
 *   .withTemperature(0.5)
 *   .build();
 * ```
 */

// Re-export all builders for convenient access
export * from "./builders/promptBuilders";
export * from "./builders/configBuilders";
export * from "./builders/apiBuilders";
export * from "./builders/errorBuilders";
export * from "./builders/formatterBuilders";

// Re-export the main builders namespace
export { TestDataBuilders } from "./builders";
