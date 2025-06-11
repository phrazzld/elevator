/**
 * Tests for direct API implementation.
 * Following TDD approach - these tests should initially fail.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { elevatePrompt } from "./api";

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

      await elevatePrompt("test prompt");

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

      await elevatePrompt("test");

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

      await expect(elevatePrompt("test")).rejects.toThrow();

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

      await expect(elevatePrompt("test")).rejects.toThrow();

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
  });

  describe("enhanced CRISP-based prompt construction", () => {
    beforeEach(() => {
      // Set API key for prompt construction tests
      process.env["GEMINI_API_KEY"] = "test-key";
    });

    it("should use enhanced prompt structure with CRISP methodology", async () => {
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

      // Verify fetch was called with enhanced prompt structure
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(options.body) as GeminiRequestBody;

      // The first content should be the enhanced system prompt
      const systemPrompt = requestBody.contents[0]?.parts[0]?.text;

      // Verify enhanced prompt contains CRISP structure elements
      expect(systemPrompt).toContain("<role>Expert prompt engineer");
      expect(systemPrompt).toContain(
        "<context>Transform requests using proven CRISP structure",
      );
      expect(systemPrompt).toContain("<instructions>");
      expect(systemPrompt).toContain("<examples>");
      expect(systemPrompt).toContain("<output_constraints>");
      expect(systemPrompt).toContain("Transform this request:");

      // The second content should be the user prompt
      const userPrompt = requestBody.contents[1]?.parts[0]?.text;
      expect(userPrompt).toBe("test prompt");

      vi.unstubAllGlobals();
    });

    it("should include all required CRISP methodology elements", async () => {
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

      // Verify all CRISP elements are present
      expect(systemPrompt).toContain(
        "1. Add specific context and measurable outcomes",
      );
      expect(systemPrompt).toContain(
        "2. Replace vague terms with precise technical language",
      );
      expect(systemPrompt).toContain(
        "3. Structure with clear sections and constraints",
      );
      expect(systemPrompt).toContain(
        "4. Include format specifications when beneficial",
      );
      expect(systemPrompt).toContain(
        "5. Specify success criteria and validation methods",
      );

      vi.unstubAllGlobals();
    });

    it("should include high-quality few-shot examples", async () => {
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

      // Verify examples are included
      expect(systemPrompt).toContain('Input: "help with my code"');
      expect(systemPrompt).toContain(
        'Output: "Review this [LANGUAGE] codebase',
      );
      expect(systemPrompt).toContain('Input: "write about AI"');
      expect(systemPrompt).toContain('Input: "analyze this data"');
      expect(systemPrompt).toContain('Input: "fix my bug"');
      expect(systemPrompt).toContain('Input: "create a design"');

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
      expect(systemPrompt).toContain("<role>");
      expect(systemPrompt).toContain("Transform this request:");

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
      expect(systemPrompt).toContain("Transform this request:");

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
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent",
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
