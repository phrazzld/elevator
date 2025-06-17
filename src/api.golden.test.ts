/**
 * Golden test suite for Phase 1 prompt transformations.
 *
 * These tests capture snapshots of the enhanced CRISP-based prompt construction
 * to validate quality and prevent regressions in prompt engineering patterns.
 *
 * The tests focus on the deterministic prompt building process, not the
 * non-deterministic LLM responses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { elevatePrompt } from "./api";

interface MockFetchOptions {
  method: string;
  headers: Record<string, string>;
  body: string;
}

interface GeminiRequestBody {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
}

interface CapturedPromptCall {
  systemPrompt: string;
  userPrompt: string;
  fullRequest: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  };
}

/**
 * Golden test cases representing diverse prompt transformation scenarios.
 * Each case captures a different pattern of user input to ensure comprehensive
 * coverage of prompt engineering transformations.
 */
const GOLDEN_TEST_CASES = [
  {
    name: "simple_code_request",
    input: "help with my code",
    description:
      "Basic code assistance request - tests technical domain transformation",
  },
  {
    name: "vague_bug_fix",
    input: "fix my bug",
    description: "Vague debugging request - tests specificity enhancement",
  },
  {
    name: "content_creation",
    input: "write about AI",
    description:
      "Content creation request - tests structure and audience specification",
  },
  {
    name: "data_analysis_task",
    input: "analyze this data",
    description:
      "Analysis request - tests methodology and deliverable specification",
  },
  {
    name: "design_request",
    input: "create a design",
    description: "Design task - tests constraint and requirement specification",
  },
  {
    name: "performance_optimization",
    input: "make my app faster",
    description: "Performance request - tests quantification and measurement",
  },
  {
    name: "empty_input",
    input: "",
    description: "Edge case: empty input - tests robustness",
  },
  {
    name: "long_detailed_request",
    input:
      "I need help creating a comprehensive testing strategy for my React application that includes unit tests, integration tests, and end-to-end tests, with proper mocking strategies and coverage reporting",
    description:
      "Complex detailed request - tests enhancement of already-detailed prompts",
  },
  {
    name: "single_word_request",
    input: "refactor",
    description: "Minimal input - tests maximum enhancement potential",
  },
  {
    name: "special_characters_unicode",
    input:
      "Help me debug this: console.log('Hello 🌟 World'); // Why doesn't this work?",
    description:
      "Technical content with special characters - tests preservation and enhancement",
  },
] as const;

describe("Golden Test Suite - Phase 1 Prompt Transformations", () => {
  let originalApiKey: string | undefined;
  let capturedCalls: CapturedPromptCall[] = [];

  beforeEach(() => {
    // Store original API key
    originalApiKey = process.env["GEMINI_API_KEY"];
    process.env["GEMINI_API_KEY"] = "test-golden-key";

    // Reset captured calls
    capturedCalls = [];

    // Mock fetch to capture prompt construction without making real API calls
    const mockFetch = vi
      .fn()
      .mockImplementation((url: string, options: MockFetchOptions) => {
        const body = JSON.parse(options.body) as GeminiRequestBody;
        const systemPrompt = body.contents[0]?.parts[0]?.text || "";
        const userPrompt = body.contents[1]?.parts[0]?.text || "";

        capturedCalls.push({
          systemPrompt,
          userPrompt,
          fullRequest: {
            url,
            method: options.method,
            headers: options.headers,
            body: options.body,
          },
        });

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: {
                    parts: [{ text: "mock response" }],
                  },
                },
              ],
            }),
        });
      });

    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    // Restore original API key
    if (originalApiKey) {
      process.env["GEMINI_API_KEY"] = originalApiKey;
    } else {
      delete process.env["GEMINI_API_KEY"];
    }

    vi.unstubAllGlobals();
  });

  // Generate a test for each golden case
  GOLDEN_TEST_CASES.forEach(({ name, input }) => {
    it(`should produce consistent prompt transformation for: ${name}`, async () => {
      await elevatePrompt(input);

      expect(capturedCalls).toHaveLength(1);
      const captured = capturedCalls[0];

      if (!captured) {
        throw new Error("No captured call found");
      }

      // Snapshot the system prompt - this is the core transformation we want to validate
      expect(captured.systemPrompt).toMatchSnapshot(`${name}_system_prompt`);

      // Verify user prompt preservation
      expect(captured.userPrompt).toBe(input);

      // Snapshot the full request structure for comprehensive validation
      expect(captured.fullRequest).toMatchSnapshot(`${name}_full_request`);
    });
  });

  describe("Prompt Transformation Quality Validation", () => {
    it("should maintain consistent system prompt structure across all inputs", async () => {
      const systemPrompts: string[] = [];

      // Run all test cases
      for (const { input } of GOLDEN_TEST_CASES) {
        capturedCalls = []; // Reset for each call
        await elevatePrompt(input);

        const captured = capturedCalls[0];
        if (captured) {
          systemPrompts.push(captured.systemPrompt);
        }
      }

      // All system prompts should be identical (deterministic transformation)
      const uniqueSystemPrompts = new Set(systemPrompts);
      expect(uniqueSystemPrompts.size).toBe(1);

      // Snapshot the canonical system prompt
      const canonicalPrompt = systemPrompts[0];
      if (!canonicalPrompt) {
        throw new Error("No system prompt captured");
      }
      expect(canonicalPrompt).toMatchSnapshot("canonical_system_prompt");
    });

    it("should preserve user input exactly across all test cases", async () => {
      for (const { input } of GOLDEN_TEST_CASES) {
        capturedCalls = []; // Reset for each call
        await elevatePrompt(input);

        expect(capturedCalls).toHaveLength(1);
        const captured = capturedCalls[0];
        if (!captured) {
          throw new Error("No captured call found");
        }
        expect(captured.userPrompt).toBe(input);
      }
    });

    it("should use correct API endpoint and headers consistently", async () => {
      await elevatePrompt("test input");

      expect(capturedCalls).toHaveLength(1);
      const captured = capturedCalls[0];
      if (!captured) {
        throw new Error("No captured call found");
      }
      const request = captured.fullRequest;

      expect(request.url).toBe(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      );
      expect(request.method).toBe("POST");
      expect(request.headers["Content-Type"]).toBe("application/json");
      expect(request.headers["x-goog-api-key"]).toBe("test-golden-key");
    });

    it("should include all required expert prompt elements", async () => {
      await elevatePrompt("test");

      expect(capturedCalls).toHaveLength(1);
      const captured = capturedCalls[0];
      if (!captured) {
        throw new Error("No captured call found");
      }
      const systemPrompt = captured.systemPrompt;

      // Verify expert-focused structure elements
      expect(systemPrompt).toContain("expert who rearticulates");
      expect(systemPrompt).toContain("domain-specific precision and expertise");
      expect(systemPrompt).toContain("identify the domain");

      // Verify key guidelines
      expect(systemPrompt).toContain("precise technical terminology");
      expect(systemPrompt).toContain("seasoned professional would use");
      expect(systemPrompt).toContain("actionable detail");

      // Verify output format instructions
      expect(systemPrompt).toContain(
        "Format: Return only the single expert articulation",
      );
      expect(systemPrompt).toContain("no explanations or headers");
      expect(systemPrompt).toContain("Examples:");

      // Verify it ends with prompt instruction
      expect(systemPrompt).toContain("User request to rearticulate:");
    });
  });

  describe("Regression Detection", () => {
    it("should detect changes in prompt structure immediately", async () => {
      // This test will fail if the enhanced prompt structure changes,
      // alerting developers to review whether the change is intentional
      await elevatePrompt("regression test input");

      expect(capturedCalls).toHaveLength(1);
      const captured = capturedCalls[0];
      if (!captured) {
        throw new Error("No captured call found");
      }

      const requestBody = JSON.parse(
        captured.fullRequest.body,
      ) as GeminiRequestBody;

      // Snapshot both the structure and key content
      expect({
        systemPromptLength: captured.systemPrompt.length,
        systemPromptHash: hashString(captured.systemPrompt),
        hasRole: captured.systemPrompt.includes("<role>"),
        hasExamples: captured.systemPrompt.includes("<examples>"),
        hasInstructions: captured.systemPrompt.includes("<instructions>"),
        userPrompt: captured.userPrompt,
        requestStructure: {
          contentsLength: requestBody.contents.length,
          hasSystemPrompt:
            (requestBody.contents[0]?.parts[0]?.text?.length || 0) > 100,
          hasUserPrompt:
            requestBody.contents[1]?.parts[0]?.text === "regression test input",
        },
      }).toMatchSnapshot("regression_detection_structure");
    });
  });
});

/**
 * Simple hash function for detecting content changes
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}
