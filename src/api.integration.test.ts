/**
 * Integration tests for direct API implementation.
 *
 * These are pure integration tests that test against the real Gemini API
 * without any mocking. They verify the complete end-to-end functionality
 * of the elevatePrompt function.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { elevatePrompt } from "./api";

describe("elevatePrompt - Integration Tests", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    // Store original API key to restore after tests
    originalApiKey = process.env["GEMINI_API_KEY"];
  });

  afterEach(() => {
    // Restore original API key
    if (originalApiKey) {
      process.env["GEMINI_API_KEY"] = originalApiKey;
    } else {
      delete process.env["GEMINI_API_KEY"];
    }
  });

  it("should reject with error when GEMINI_API_KEY is missing", async () => {
    // Remove API key to test validation
    delete process.env["GEMINI_API_KEY"];

    await expect(elevatePrompt("test prompt")).rejects.toThrow(
      "GEMINI_API_KEY required",
    );
  });

  it("should return elevated prompt for valid input when API key is present", async () => {
    // Skip this test if no API key is available in the environment
    if (!process.env["GEMINI_API_KEY"]) {
      console.log("⏭️  Skipping integration test - GEMINI_API_KEY not set");
      return;
    }

    // Test with a simple prompt that should get elevated
    const testPrompt = "make a todo app";
    const result = await elevatePrompt(testPrompt);

    // Verify the response is a non-empty string
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);

    // Verify the response is different from the input (i.e., it was elevated)
    expect(result).not.toBe(testPrompt);

    // Verify the response contains more technical language
    // (The elevation should make it more sophisticated)
    expect(result.length).toBeGreaterThan(testPrompt.length);
  }, 20000); // 20 second timeout for real API calls
});
