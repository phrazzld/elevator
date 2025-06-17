/**
 * Tests for direct API implementation.
 * Following TDD approach - these tests should initially fail.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  elevatePrompt,
  shouldUseFormatPreservation,
  elevateSegments,
} from "./api";
import type { FormattedSegment } from "./formatting/types.js";

interface GeminiRequestBody {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
}

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
  }, 30000); // 30 second timeout for API call

  describe("HTTP error handling", () => {
    beforeEach(() => {
      // Set API key for error handling tests
      process.env["GEMINI_API_KEY"] = "test-key";
    });

    it("should handle 400 Bad Request with specific message", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow(
        "API error: 400 Bad Request - Check your request format and API key",
      );

      vi.unstubAllGlobals();
    });

    it("should handle 401 Unauthorized with specific message", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow(
        "API error: 401 Unauthorized - Invalid API key. Verify your GEMINI_API_KEY",
      );

      vi.unstubAllGlobals();
    });

    it("should handle 403 Forbidden with specific message", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow(
        "API error: 403 Forbidden - API key lacks required permissions",
      );

      vi.unstubAllGlobals();
    });

    it("should handle 429 Rate Limit with specific message", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow(
        "API error: 429 Too Many Requests - Rate limit exceeded. Please try again later",
      );

      vi.unstubAllGlobals();
    });

    it("should handle 500 Server Error with specific message", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow(
        "API error: 500 Internal Server Error - Gemini service temporarily unavailable",
      );

      vi.unstubAllGlobals();
    });
  });

  describe("JSON parsing error handling", () => {
    beforeEach(() => {
      // Set API key for error handling tests
      process.env["GEMINI_API_KEY"] = "test-key";
    });

    it("should handle malformed JSON responses", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow(
        "Invalid JSON response from API - response may be corrupted",
      );

      vi.unstubAllGlobals();
    });

    it("should handle valid JSON with invalid structure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          // Missing candidates or wrong structure
          error: "Invalid request",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow(
        "Invalid API response structure",
      );

      vi.unstubAllGlobals();
    });
  });

  describe("structured logging", () => {
    interface LogEntry {
      timestamp: string;
      level: string;
      message: string;
      metadata: {
        component: string;
        operation: string;
        promptLength: number;
        responseLength?: number;
        error?: string;
        httpStatus?: number;
        durationMs: number;
      };
    }

    let stderrWriteSpy: any;

    beforeEach(() => {
      // Set API key for logging tests
      process.env["GEMINI_API_KEY"] = "test-key";

      // Spy on stderr.write for the new logger
      stderrWriteSpy = vi
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true);
    });

    afterEach(() => {
      // Restore stderr.write
      vi.restoreAllMocks();
    });

    it("should log API request start with structured format", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "test response" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt("test prompt", true); // Enable debug logging

      // Verify start log was called
      expect(stderrWriteSpy).toHaveBeenCalled();

      const startLogCall = stderrWriteSpy.mock.calls.find((call: any) => {
        const logEntry = JSON.parse((call[0] as string).trim()) as {
          message: string;
        };
        return logEntry.message.includes("API request started");
      });
      expect(startLogCall).toBeDefined();

      const startLog = JSON.parse(
        (startLogCall![0] as string).trim(),
      ) as LogEntry;
      expect(startLog.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(startLog.level).toBe("info");
      expect(startLog.message).toBe("API request started");
      expect(startLog.metadata.component).toBe("api");
      expect(startLog.metadata.operation).toBe("elevatePrompt");
      expect(startLog.metadata.promptLength).toBe(11);

      vi.unstubAllGlobals();
    });

    it("should log successful API completion with structured format", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "elevated response" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt("test", true); // Enable debug logging

      // Verify success log was called
      expect(stderrWriteSpy).toHaveBeenCalled();

      const successLogCall = stderrWriteSpy.mock.calls.find((call: any) => {
        const logEntry = JSON.parse((call[0] as string).trim()) as {
          message: string;
        };
        return logEntry.message.includes("completed successfully");
      });
      expect(successLogCall).toBeDefined();

      const successLog = JSON.parse(
        (successLogCall![0] as string).trim(),
      ) as LogEntry;
      expect(successLog.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(successLog.level).toBe("info");
      expect(successLog.message).toBe("API request completed successfully");
      expect(successLog.metadata.component).toBe("api");
      expect(successLog.metadata.operation).toBe("elevatePrompt");
      expect(successLog.metadata.promptLength).toBe(4);
      expect(successLog.metadata.responseLength).toBe(17);
      expect(successLog.metadata.durationMs).toBeTypeOf("number");

      vi.unstubAllGlobals();
    });

    it("should log HTTP errors with structured format", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test", true)).rejects.toThrow(); // Enable debug logging

      // Verify error log was called
      expect(stderrWriteSpy).toHaveBeenCalled();

      const errorLogCall = stderrWriteSpy.mock.calls.find((call: any) => {
        const logEntry = JSON.parse((call[0] as string).trim()) as {
          message: string;
        };
        return logEntry.message.includes("API request failed");
      });
      expect(errorLogCall).toBeDefined();

      const errorLog = JSON.parse(
        (errorLogCall![0] as string).trim(),
      ) as LogEntry;

      expect(errorLog.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(errorLog.level).toBe("error");
      expect(errorLog.message).toBe("API request failed");
      expect(errorLog.metadata.component).toBe("api");
      expect(errorLog.metadata.operation).toBe("elevatePrompt");
      expect(errorLog.metadata.error).toContain("API error: 401 Unauthorized");
      expect(errorLog.metadata.httpStatus).toBe(401);
      expect(errorLog.metadata.promptLength).toBe(4);
      expect(errorLog.metadata.durationMs).toBeTypeOf("number");

      vi.unstubAllGlobals();
    });

    it("should log JSON parsing errors with structured format", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test", true)).rejects.toThrow(); // Enable debug logging

      // Verify error log was called
      expect(stderrWriteSpy).toHaveBeenCalled();

      const errorLogCall = stderrWriteSpy.mock.calls.find((call: any) => {
        const logEntry = JSON.parse((call[0] as string).trim()) as {
          message: string;
        };
        return logEntry.message.includes("API request failed");
      });
      expect(errorLogCall).toBeDefined();

      const errorLog = JSON.parse(
        (errorLogCall![0] as string).trim(),
      ) as LogEntry;

      expect(errorLog.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(errorLog.level).toBe("error");
      expect(errorLog.message).toBe("API request failed");
      expect(errorLog.metadata.component).toBe("api");
      expect(errorLog.metadata.operation).toBe("elevatePrompt");
      expect(errorLog.metadata.error).toBe(
        "Invalid JSON response from API - response may be corrupted",
      );
      expect(errorLog.metadata.promptLength).toBe(4);
      expect(errorLog.metadata.durationMs).toBeTypeOf("number");

      vi.unstubAllGlobals();
    });

    it("should not log sensitive information like API keys", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "test response" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt("test");

      // Check all log calls to ensure no API key is present

      const allLogCalls = stderrWriteSpy.mock.calls;
      for (const call of allLogCalls) {
        const logEntry = (call[0] as string).trim();
        expect(logEntry).not.toContain("test-key");
        expect(logEntry).not.toContain("GEMINI_API_KEY");
      }

      vi.unstubAllGlobals();
    });

    it("should not log when debug is false", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "test response" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      // Clear any previous calls
      stderrWriteSpy.mockClear();

      // Call with debug=false (default)
      await elevatePrompt("test prompt");

      // Verify no logs were written to stderr
      expect(stderrWriteSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("should log when debug is true", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "test response" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      // Clear any previous calls
      stderrWriteSpy.mockClear();

      // Call with debug=true
      await elevatePrompt("test prompt", true);

      // Verify logs were written to stderr
      expect(stderrWriteSpy).toHaveBeenCalled();

      // Should have at least 2 calls (start and complete)
      const logCalls = stderrWriteSpy.mock.calls.filter((call: any) => {
        try {
          const logEntry = JSON.parse((call[0] as string).trim());
          return (
            logEntry.message === "API request started" ||
            logEntry.message === "API request completed successfully"
          );
        } catch {
          return false;
        }
      });

      expect(logCalls).toHaveLength(2);

      vi.unstubAllGlobals();
    });
  });

  describe("progress indicator", () => {
    let stderrWriteSpy: any;
    let intervalSpy: any;
    let clearIntervalSpy: any;

    beforeEach(() => {
      process.env["GEMINI_API_KEY"] = "test-key";

      // Spy on stderr.write to capture progress dots
      stderrWriteSpy = vi
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true);

      // Mock setInterval and clearInterval
      intervalSpy = vi.fn().mockReturnValue(123); // Return a mock interval ID
      clearIntervalSpy = vi.fn().mockReturnValue(undefined);
      vi.stubGlobal("setInterval", intervalSpy);
      vi.stubGlobal("clearInterval", clearIntervalSpy);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it("should show progress indicator when raw is false (disabled in test env)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "test response" }] } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      // Clear previous calls to interval spy
      intervalSpy.mockClear();
      clearIntervalSpy.mockClear();

      await elevatePrompt("test", false, false);

      // Progress is disabled in test environment, so should not start
      expect(intervalSpy).not.toHaveBeenCalled();

      // Progress cleanup should not be called either
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("should not show progress indicator when raw is true", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "test response" }] } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      // Clear any previous calls
      stderrWriteSpy.mockClear();
      intervalSpy.mockClear();

      await elevatePrompt("test", false, true); // raw = true

      // Should not start interval
      expect(intervalSpy).not.toHaveBeenCalled();

      // Should not write dots
      const dotCalls = stderrWriteSpy.mock.calls.filter(
        (call: any) => call[0] === ".",
      );
      expect(dotCalls).toHaveLength(0);

      vi.unstubAllGlobals();
    });

    it("should stop progress indicator on error (disabled in test env)", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      vi.stubGlobal("fetch", mockFetch);

      intervalSpy.mockClear();
      clearIntervalSpy.mockClear();

      await expect(elevatePrompt("test", false, false)).rejects.toThrow(
        "Network error",
      );

      // Progress is disabled in test environment, so should not start
      expect(intervalSpy).not.toHaveBeenCalled();

      // Progress cleanup should not be called either
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe("expert-focused prompt construction", () => {
    beforeEach(() => {
      // Set API key for prompt construction tests
      process.env["GEMINI_API_KEY"] = "test-key";

      // Mock setInterval and clearInterval for progress indicator
      const intervalSpy = vi.fn().mockReturnValue(123); // Return a mock interval ID
      const clearIntervalSpy = vi.fn().mockReturnValue(undefined);
      vi.stubGlobal("setInterval", intervalSpy);
      vi.stubGlobal("clearInterval", clearIntervalSpy);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should use expert-focused prompt structure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "elevated response" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt("test prompt");

      // Verify fetch was called with expert prompt structure
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(options.body) as GeminiRequestBody;

      // The first content should be the expert system prompt
      const systemPrompt = requestBody.contents[0]?.parts[0]?.text;

      // Verify expert prompt contains expected elements
      expect(systemPrompt).toContain("expert who rearticulates");
      expect(systemPrompt).toContain("domain-specific precision and expertise");
      expect(systemPrompt).toContain("identify the domain");
      expect(systemPrompt).toContain("ONE expert articulation");
      expect(systemPrompt).toContain("precise technical terminology");
      expect(systemPrompt).toContain("User request to rearticulate:");

      // The second content should be the user prompt
      const userPrompt = requestBody.contents[1]?.parts[0]?.text;
      expect(userPrompt).toBe("test prompt");

      vi.unstubAllGlobals();
    });

    it("should include all required expert guidance elements", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "response" }] } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt("simple request");

      const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(options.body) as GeminiRequestBody;
      const systemPrompt = requestBody.contents[0]?.parts[0]?.text;

      // Verify all expert guidance elements are present
      expect(systemPrompt).toContain("precise technical terminology");
      expect(systemPrompt).toContain("concrete methodologies and tools");
      expect(systemPrompt).toContain("testing and validation approaches");
      expect(systemPrompt).toContain("industry best practices");
      expect(systemPrompt).toContain(
        "Format: Return only the single expert articulation",
      );

      vi.unstubAllGlobals();
    });

    it("should include explicit constraints against poor practices", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "response" }] } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt("help with code");

      const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(options.body) as GeminiRequestBody;
      const systemPrompt = requestBody.contents[0]?.parts[0]?.text;

      // Verify key instructions are included
      expect(systemPrompt).toContain("provide ONE expert articulation");
      expect(systemPrompt).toContain("seasoned professional would use");
      expect(systemPrompt).toContain(
        "specific technical language and actionable detail",
      );
      expect(systemPrompt).toContain(
        "Return only the single expert articulation",
      );

      vi.unstubAllGlobals();
    });

    it("should work correctly with empty input", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "response" }] } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt("");

      const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(options.body) as GeminiRequestBody;

      // System prompt should still be complete
      const systemPrompt = requestBody.contents[0]?.parts[0]?.text;
      expect(systemPrompt).toContain("expert who rearticulates");
      expect(systemPrompt).toContain("User request to rearticulate:");

      // User prompt should be empty string
      const userPrompt = requestBody.contents[1]?.parts[0]?.text;
      expect(userPrompt).toBe("");

      vi.unstubAllGlobals();
    });

    it("should work correctly with long input", async () => {
      const longInput = "a".repeat(1000);
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "response" }] } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt(longInput);

      const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(options.body) as GeminiRequestBody;

      // System prompt should be unaffected by input length
      const systemPrompt = requestBody.contents[0]?.parts[0]?.text;
      expect(systemPrompt).toContain("User request to rearticulate:");

      // User prompt should preserve full input
      const userPrompt = requestBody.contents[1]?.parts[0]?.text;
      expect(userPrompt).toBe(longInput);
      expect(userPrompt?.length).toBe(1000);

      vi.unstubAllGlobals();
    });

    it("should handle special characters and unicode correctly", async () => {
      const specialInput =
        "Hello 🌟 Test with émojis and spëcial chars: @#$%^&*()";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "response" }] } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt(specialInput);

      const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(options.body) as GeminiRequestBody;

      // User prompt should preserve special characters
      const userPrompt = requestBody.contents[1]?.parts[0]?.text;
      expect(userPrompt).toBe(specialInput);

      vi.unstubAllGlobals();
    });

    it("should maintain consistent prompt structure across different inputs", async () => {
      const inputs = ["short", "medium length prompt here", ""];
      const systemPrompts: string[] = [];

      for (const input of inputs) {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            candidates: [{ content: { parts: [{ text: "response" }] } }],
          }),
        });
        vi.stubGlobal("fetch", mockFetch);

        await elevatePrompt(input);

        const [, options] = mockFetch.mock.calls[0] as [
          string,
          { body: string },
        ];
        const requestBody = JSON.parse(options.body) as GeminiRequestBody;
        const systemPrompt = requestBody.contents[0]?.parts[0]?.text;
        if (systemPrompt) {
          systemPrompts.push(systemPrompt);
        }

        vi.unstubAllGlobals();
      }

      // All system prompts should be identical regardless of user input
      expect(systemPrompts[0]).toBe(systemPrompts[1]);
      expect(systemPrompts[1]).toBe(systemPrompts[2]);
    });

    it("should have proper API request structure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "response" }] } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await elevatePrompt("test");

      const [url, options] = mockFetch.mock.calls[0] as [
        string,
        {
          method: string;
          headers: { "Content-Type": string; "x-goog-api-key": string };
          body: string;
        },
      ];

      // Verify correct endpoint
      expect(url).toBe(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      );

      // Verify headers
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(options.headers["x-goog-api-key"]).toBe("test-key");

      // Verify method and body structure
      expect(options.method).toBe("POST");
      const requestBody = JSON.parse(options.body) as GeminiRequestBody;
      expect(requestBody.contents).toHaveLength(2);
      expect(requestBody.contents[0]?.role).toBe("user");
      expect(requestBody.contents[1]?.role).toBe("user");

      vi.unstubAllGlobals();
    });
  });
});

describe("shouldUseFormatPreservation", () => {
  describe("returns false for text that doesn't need format preservation", () => {
    it("should return false for empty text", () => {
      expect(shouldUseFormatPreservation("")).toBe(false);
    });

    it("should return false for null/undefined text", () => {
      expect(shouldUseFormatPreservation(null as unknown as string)).toBe(
        false,
      );
      expect(shouldUseFormatPreservation(undefined as unknown as string)).toBe(
        false,
      );
    });

    it("should return false for non-string input", () => {
      expect(shouldUseFormatPreservation(123 as unknown as string)).toBe(false);
      expect(shouldUseFormatPreservation({} as unknown as string)).toBe(false);
      expect(shouldUseFormatPreservation([] as unknown as string)).toBe(false);
    });

    it("should return false for plain text", () => {
      expect(shouldUseFormatPreservation("This is just plain text")).toBe(
        false,
      );
    });

    it("should return false for text with only quotes", () => {
      expect(
        shouldUseFormatPreservation("Here's a quote:\n> This is quoted\nEnd"),
      ).toBe(false);
    });

    it("should return false for text with only nested quotes", () => {
      expect(
        shouldUseFormatPreservation("Text\n> Quote\n>> Nested quote\nAfter"),
      ).toBe(false);
    });

    it("should return false for text with multiple quotes", () => {
      expect(
        shouldUseFormatPreservation(
          "First quote:\n> Quote 1\nSecond quote:\n> Quote 2",
        ),
      ).toBe(false);
    });

    it("should return false for text with whitespace only", () => {
      expect(shouldUseFormatPreservation("   \n\t  \n  ")).toBe(false);
    });
  });

  describe("returns true for text that needs format preservation", () => {
    it("should return true for text with inline code", () => {
      expect(
        shouldUseFormatPreservation("Use `console.log()` for debugging"),
      ).toBe(true);
    });

    it("should return true for text with code blocks", () => {
      expect(
        shouldUseFormatPreservation(
          "Example:\n```javascript\nconsole.log('hello');\n```",
        ),
      ).toBe(true);
    });

    it("should return true for text with multiple inline code segments", () => {
      expect(
        shouldUseFormatPreservation(
          "Use `console.log()` and `JSON.stringify()`",
        ),
      ).toBe(true);
    });

    it("should return true for text with multiple code blocks", () => {
      expect(
        shouldUseFormatPreservation(
          "First:\n```js\ncode1();\n```\nSecond:\n```py\ncode2()\n```",
        ),
      ).toBe(true);
    });

    it("should return true for text with code blocks with language specifiers", () => {
      expect(
        shouldUseFormatPreservation(
          "TypeScript example:\n```typescript\ninterface User { name: string; }\n```",
        ),
      ).toBe(true);
    });

    it("should return true for mixed inline and block code", () => {
      expect(
        shouldUseFormatPreservation(
          "Use `console.log()` like this:\n```js\nconsole.log('hello');\n```",
        ),
      ).toBe(true);
    });
  });

  describe("returns true for mixed formatting with code", () => {
    it("should return true for text with both quotes and inline code", () => {
      expect(
        shouldUseFormatPreservation(
          "Use `console.log()` for debugging.\n> Remember to check logs",
        ),
      ).toBe(true);
    });

    it("should return true for text with both quotes and code blocks", () => {
      expect(
        shouldUseFormatPreservation(
          "> Important note\nHere's the code:\n```js\nconsole.log('test');\n```",
        ),
      ).toBe(true);
    });

    it("should return true for complex mixed formatting", () => {
      const complexText = `Debug with \`console.log()\`.
> Remember to check the logs
Also use this code:
\`\`\`javascript
function debug() {
  console.log('debugging');
}
\`\`\`
> Don't forget error handling`;
      expect(shouldUseFormatPreservation(complexText)).toBe(true);
    });

    it("should return true when code appears anywhere in mixed content", () => {
      expect(
        shouldUseFormatPreservation(
          "Start\n> Quote first\nThen use `code`\n> Another quote",
        ),
      ).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for text with backticks but no valid code formatting", () => {
      expect(shouldUseFormatPreservation("This has a single ` backtick")).toBe(
        false,
      );
    });

    it("should return false for text with unclosed code blocks", () => {
      expect(
        shouldUseFormatPreservation("Unclosed:\n```javascript\ncode here"),
      ).toBe(false);
    });

    it("should return true for empty code blocks", () => {
      expect(shouldUseFormatPreservation("Empty block:\n```\n```")).toBe(true);
    });

    it("should return true for inline code with special characters", () => {
      expect(shouldUseFormatPreservation("Use `$('#id')` for jQuery")).toBe(
        true,
      );
    });

    it("should handle very long text efficiently", () => {
      const longText = "Start ".repeat(1000) + "`code`" + " End".repeat(1000);
      expect(shouldUseFormatPreservation(longText)).toBe(true);
    });
  });
});

describe("elevateSegments", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env["GEMINI_API_KEY"];
    process.env["GEMINI_API_KEY"] = "test-api-key";
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env["GEMINI_API_KEY"] = originalApiKey;
    } else {
      delete process.env["GEMINI_API_KEY"];
    }
    vi.restoreAllMocks();
  });

  describe("input validation", () => {
    it("should return empty array for empty input", async () => {
      const result = await elevateSegments([]);
      expect(result).toEqual([]);
    });

    it("should return empty array for null/undefined input", async () => {
      expect(
        await elevateSegments(null as unknown as FormattedSegment[]),
      ).toEqual([]);
      expect(
        await elevateSegments(undefined as unknown as FormattedSegment[]),
      ).toEqual([]);
    });
  });

  describe("code segment preservation", () => {
    it("should preserve inline code segments without elevation", async () => {
      const segments: FormattedSegment[] = [
        {
          formatting: {
            type: "codeblock",
            marker: "`",
            content: "console.log()",
            originalText: "`console.log()`",
            startIndex: 0,
            endIndex: 15,
          },
        },
      ];

      const result = await elevateSegments(segments);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(segments[0]); // Should be unchanged
      expect(result[0]!.elevated).toBeUndefined();
    });

    it("should preserve code block segments without elevation", async () => {
      const segments: FormattedSegment[] = [
        {
          formatting: {
            type: "codeblock",
            marker: "```",
            language: "javascript",
            content: "function test() {\n  return true;\n}",
            originalText:
              "```javascript\nfunction test() {\n  return true;\n}\n```",
            startIndex: 0,
            endIndex: 50,
          },
        },
      ];

      const result = await elevateSegments(segments);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(segments[0]); // Should be unchanged
      expect(result[0]!.elevated).toBeUndefined();
    });
  });

  describe("quote segment elevation", () => {
    it("should elevate quote segments", async () => {
      // Mock successful API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "elevated quote content" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const segments: FormattedSegment[] = [
        {
          formatting: {
            type: "quote",
            marker: ">",
            content: "Remember to check logs",
            originalText: "> Remember to check logs",
            startIndex: 0,
            endIndex: 23,
          },
        },
      ];

      const result = await elevateSegments(segments);

      expect(result).toHaveLength(1);
      expect(result[0]!.elevated).toBe("elevated quote content");
      expect(result[0]!.formatting).toEqual(segments[0]!.formatting);
      expect(mockFetch).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe("plain text segment elevation", () => {
    it("should elevate plain text segments", async () => {
      // Mock successful API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "elevated plain text" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const segments: FormattedSegment[] = [
        {
          formatting: {
            type: "plain",
            marker: "",
            content: "fix this bug",
            originalText: "fix this bug",
            startIndex: 0,
            endIndex: 12,
          },
        },
      ];

      const result = await elevateSegments(segments);

      expect(result).toHaveLength(1);
      expect(result[0]!.elevated).toBe("elevated plain text");
      expect(result[0]!.formatting).toEqual(segments[0]!.formatting);

      vi.unstubAllGlobals();
    });
  });

  describe("mixed segment types", () => {
    it("should handle mixed segments correctly", async () => {
      // Mock successful API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "elevated content" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const segments: FormattedSegment[] = [
        {
          formatting: {
            type: "plain",
            marker: "",
            content: "Use ",
            originalText: "Use ",
            startIndex: 0,
            endIndex: 4,
          },
        },
        {
          formatting: {
            type: "codeblock",
            marker: "`",
            content: "console.log()",
            originalText: "`console.log()`",
            startIndex: 4,
            endIndex: 19,
          },
        },
        {
          formatting: {
            type: "quote",
            marker: ">",
            content: "Remember this",
            originalText: "> Remember this",
            startIndex: 19,
            endIndex: 34,
          },
        },
      ];

      const result = await elevateSegments(segments);

      expect(result).toHaveLength(3);

      // Plain text should be elevated
      expect(result[0]!.elevated).toBe("elevated content");

      // Code should be preserved (no elevation)
      expect(result[1]!.elevated).toBeUndefined();
      expect(result[1]).toEqual(segments[1]);

      // Quote should be elevated
      expect(result[2]!.elevated).toBe("elevated content");

      vi.unstubAllGlobals();
    });
  });

  describe("error handling", () => {
    it("should return original segment if API fails", async () => {
      // Mock API failure
      const mockFetch = vi.fn().mockRejectedValue(new Error("API error"));
      vi.stubGlobal("fetch", mockFetch);

      const segments: FormattedSegment[] = [
        {
          formatting: {
            type: "quote",
            marker: ">",
            content: "Important note",
            originalText: "> Important note",
            startIndex: 0,
            endIndex: 16,
          },
        },
      ];

      const result = await elevateSegments(segments);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(segments[0]); // Should return original
      expect(result[0]!.elevated).toBeUndefined();

      vi.unstubAllGlobals();
    });

    it("should handle API errors gracefully for mixed segments", async () => {
      // Mock API failure for some calls, success for others
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                candidates: [
                  {
                    content: {
                      parts: [{ text: "elevated successfully" }],
                    },
                  },
                ],
              }),
          });
        } else {
          return Promise.reject(new Error("API failure"));
        }
      });
      vi.stubGlobal("fetch", mockFetch);

      const segments: FormattedSegment[] = [
        {
          formatting: {
            type: "plain",
            marker: "",
            content: "First text",
            originalText: "First text",
            startIndex: 0,
            endIndex: 10,
          },
        },
        {
          formatting: {
            type: "quote",
            marker: ">",
            content: "Second quote",
            originalText: "> Second quote",
            startIndex: 10,
            endIndex: 24,
          },
        },
      ];

      const result = await elevateSegments(segments);

      expect(result).toHaveLength(2);
      expect(result[0]!.elevated).toBe("elevated successfully");
      expect(result[1]!.elevated).toBeUndefined(); // Should be unchanged due to error

      vi.unstubAllGlobals();
    });
  });

  describe("parallel processing", () => {
    it("should process multiple segments in parallel", async () => {
      const startTimes: number[] = [];

      const mockFetch = vi.fn().mockImplementation(() => {
        startTimes.push(Date.now());
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: {
                    parts: [{ text: "elevated" }],
                  },
                },
              ],
            }),
        });
      });
      vi.stubGlobal("fetch", mockFetch);

      const segments: FormattedSegment[] = [
        {
          formatting: {
            type: "quote",
            marker: ">",
            content: "Quote 1",
            originalText: "> Quote 1",
            startIndex: 0,
            endIndex: 9,
          },
        },
        {
          formatting: {
            type: "quote",
            marker: ">",
            content: "Quote 2",
            originalText: "> Quote 2",
            startIndex: 9,
            endIndex: 18,
          },
        },
      ];

      const result = await elevateSegments(segments);

      expect(result).toHaveLength(2);
      expect(result[0]!.elevated).toBe("elevated");
      expect(result[1]!.elevated).toBe("elevated");

      // Verify calls happened in parallel (within reasonable time window)
      expect(startTimes).toHaveLength(2);
      expect(Math.abs(startTimes[1]! - startTimes[0]!)).toBeLessThan(100); // Within 100ms

      vi.unstubAllGlobals();
    });
  });
});

describe("elevatePrompt format preservation integration", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env["GEMINI_API_KEY"];
    process.env["GEMINI_API_KEY"] = "test-api-key";
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env["GEMINI_API_KEY"] = originalApiKey;
    } else {
      delete process.env["GEMINI_API_KEY"];
    }
    vi.restoreAllMocks();
  });

  describe("plain text fallback behavior", () => {
    it("should use original behavior for plain text", async () => {
      // Mock successful API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "elevated plain text" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await elevatePrompt("fix this bug", false, true);

      expect(result).toBe("elevated plain text");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });

    it("should use original behavior for text with only quotes", async () => {
      // Mock successful API response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "elevated quote content" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await elevatePrompt(
        "Here's a note:\n> Remember this",
        false,
        true,
      );

      expect(result).toBe("elevated quote content");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });
  });

  describe("format preservation pipeline", () => {
    it("should preserve inline code and elevate surrounding text", async () => {
      // Mock successful API responses for segment elevation
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "Utilize the" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const text = "Use `console.log()` for debugging";
      const result = await elevatePrompt(text, false, true);

      // Should preserve the inline code exactly
      expect(result).toContain("`console.log()`");
      // Should elevate the surrounding text segments
      expect(result).toContain("Utilize the");

      vi.unstubAllGlobals();
    });

    it("should preserve code blocks and elevate quotes", async () => {
      // Mock successful API response for quote elevation
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "Essential reminder: Monitor application logs consistently",
                  },
                ],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const text =
        "Example code:\n```javascript\nconsole.log('test');\n```\n> Remember to check logs";
      const result = await elevatePrompt(text, false, true);

      // Should preserve the code block exactly
      expect(result).toContain("```javascript\nconsole.log('test');\n```");
      // Should elevate the quote
      expect(result).toContain(
        "Essential reminder: Monitor application logs consistently",
      );

      vi.unstubAllGlobals();
    });

    it("should handle mixed formatting correctly", async () => {
      // Mock different API responses for different segments
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                candidates: [
                  {
                    content: {
                      parts: [{ text: "Utilize the" }],
                    },
                  },
                ],
              }),
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: "for comprehensive debugging and troubleshooting",
                        },
                      ],
                    },
                  },
                ],
              }),
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: "Critical reminder: Monitor application logs consistently",
                        },
                      ],
                    },
                  },
                ],
              }),
          });
        }
      });
      vi.stubGlobal("fetch", mockFetch);

      const text =
        "Use `console.log()` for debugging.\n> Remember to check logs";
      const result = await elevatePrompt(text, false, true);

      // Should preserve code and elevate other segments
      expect(result).toContain("`console.log()`");
      expect(result).toContain("Utilize the");
      expect(result).toContain("Critical reminder");

      vi.unstubAllGlobals();
    });
  });

  describe("error handling in format preservation", () => {
    it("should handle API errors gracefully during segment elevation", async () => {
      // Mock API failure for segment elevation
      const mockFetch = vi.fn().mockRejectedValue(new Error("API error"));
      vi.stubGlobal("fetch", mockFetch);

      const text =
        "Use `console.log()` for debugging.\n> Remember to check logs";
      const result = await elevatePrompt(text, false, true);

      // Should still return text with preserved code, even if elevation fails
      expect(result).toContain("`console.log()`");
      expect(result).toContain("> Remember to check logs"); // Original quote preserved

      vi.unstubAllGlobals();
    });

    it("should maintain consistent error handling for edge cases", async () => {
      // Mock API success
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "elevated" }],
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      // Test with complex formatting edge case
      const text = "Use `code` and\n```\nempty block\n```\n> quote";
      const result = await elevatePrompt(text, false, true);

      expect(result).toContain("`code`");
      expect(result).toContain("```\nempty block\n```");

      vi.unstubAllGlobals();
    });
  });
});
