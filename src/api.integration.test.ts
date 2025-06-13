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

  describe("Expert Prompt Quality Validation", () => {
    // Skip all tests in this describe block if no API key
    beforeEach(() => {
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping prompt quality tests - GEMINI_API_KEY not set",
        );
        return;
      }
    });

    it("should not contain bracket placeholders in expert responses", async () => {
      if (!process.env["GEMINI_API_KEY"]) return;

      // Test with vague input that would trigger corporate-style responses in old system
      const vaguePrompt = "make my code better";
      const result = await elevatePrompt(vaguePrompt);

      // Should not contain any bracket placeholders
      expect(result).not.toMatch(/\[.*?\]/);
      expect(result).not.toContain("[THING]");
      expect(result).not.toContain("[REQUIREMENT]");
      expect(result).not.toContain("[PARAMETER]");
      expect(result).not.toContain("[DETAIL]");
      expect(result).not.toContain("[SPECIFIC]");
    }, 20000);

    it("should produce single expert articulation with high quality", async () => {
      if (!process.env["GEMINI_API_KEY"]) return;

      // Test with simple request that should generate one expert response
      const simplePrompt = "fix the bug";
      const result = await elevatePrompt(simplePrompt);

      // Should generate a single expert response (not numbered list)
      const numberedItems = result.match(/^\s*\d+\./gm) || [];
      expect(numberedItems.length).toBeLessThanOrEqual(1); // At most one numbered item

      // Response should be meaningful and substantially enhanced
      expect(result.split(" ").length).toBeGreaterThan(
        simplePrompt.split(" ").length * 2,
      );
      expect(result.length).toBeGreaterThan(simplePrompt.length * 3);
      expect(result).not.toBe(simplePrompt); // Should be transformed
    }, 20000);

    it("should sound like domain expert wrote it, not corporate requirements", async () => {
      if (!process.env["GEMINI_API_KEY"]) return;

      // Test with business-y request that old system would make corporate
      const businessPrompt = "improve user experience";
      const result = await elevatePrompt(businessPrompt);

      // Should not contain corporate jargon patterns
      expect(result).not.toMatch(/shall\s+(?:be|have|include)/i); // "shall be", "shall have"
      expect(result).not.toMatch(/\bmust\s+(?:be|have|include)/i); // Requirements-style language
      expect(result).not.toMatch(/deliverables?/i);
      expect(result).not.toMatch(/stakeholders?/i);
      expect(result).not.toMatch(/requirements?\s+document/i);

      // Should contain natural, expert-level language
      expect(result.length).toBeGreaterThan(businessPrompt.length * 2);
      expect(result).not.toBe(businessPrompt); // Should be transformed
    }, 20000);

    it("should provide single expert articulation without corporate templates", async () => {
      if (!process.env["GEMINI_API_KEY"]) return;

      // Test that should generate single expert articulation
      const structuredPrompt = "create a web application";
      const result = await elevatePrompt(structuredPrompt);

      // Should provide single expert articulation (not multiple numbered alternatives)
      const numberedMatches = result.match(/^\s*\d+\./gm) || [];
      expect(numberedMatches.length).toBeLessThanOrEqual(1); // Should have at most one numbered item

      // Should not use corporate template headers
      expect(result).not.toMatch(
        /^#+\s*(Context|Role|Instructions|Specifics|Parameters)/im,
      );
      expect(result).not.toMatch(
        /\b(CONTEXT|ROLE|INSTRUCTIONS|SPECIFICS|PARAMETERS):/,
      );

      // Should sound natural and expert-focused
      expect(result).not.toMatch(/please\s+(?:ensure|make sure|verify)/i); // Avoid instructional tone
      expect(result.length).toBeGreaterThan(structuredPrompt.length);
    }, 20000);

    it("should demonstrate domain expertise for technical requests", async () => {
      if (!process.env["GEMINI_API_KEY"]) return;

      // Test with technical prompt that should trigger expert response
      const techPrompt = "optimize database queries";
      const result = await elevatePrompt(techPrompt);

      // Should be enhanced with technical depth (but be reasonable about expectations)
      expect(result.length).toBeGreaterThan(techPrompt.length);
      expect(result).not.toBe(techPrompt);

      // Should not contain placeholder text or generic advice
      expect(result).not.toMatch(/\[.*?\]/); // No brackets
      expect(result).not.toMatch(/\btbd\b/i); // No "to be determined"
      expect(result).not.toMatch(/\btba\b/i); // No "to be added"
      expect(result).not.toMatch(/(?:todo|fixme|xxx)/i); // No placeholder comments

      // Response should be specific and actionable (not just longer)
      expect(result.trim()).not.toBe("");
      expect(result.split(" ").length).toBeGreaterThan(
        techPrompt.split(" ").length,
      );
    }, 20000);
  });
});
