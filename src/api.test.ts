/**
 * Tests for direct API implementation.
 * Following TDD approach - these tests should initially fail.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { elevatePrompt } from "./api";

describe("elevatePrompt", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    // Store original API key
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

  it("should require GEMINI_API_KEY environment variable", async () => {
    // Remove API key
    delete process.env["GEMINI_API_KEY"];

    await expect(elevatePrompt("test prompt")).rejects.toThrow(
      "GEMINI_API_KEY required",
    );
  });

  it("should return a string response for valid input", async () => {
    // Skip if no API key in environment
    if (!process.env["GEMINI_API_KEY"]) {
      console.log("Skipping integration test - no GEMINI_API_KEY");
      return;
    }

    const result = await elevatePrompt("explain REST APIs");

    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
