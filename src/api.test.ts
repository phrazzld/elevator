/**
 * Tests for direct API implementation.
 * Following TDD approach - these tests should initially fail.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  describe("timeout handling", () => {
    beforeEach(() => {
      // Set API key for timeout tests
      process.env["GEMINI_API_KEY"] = "test-key";
    });

    it("should handle TimeoutError and throw descriptive message", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";

      const mockFetch = vi.fn().mockRejectedValue(timeoutError);
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow(
        "Request timeout - API call exceeded 30 seconds",
      );

      vi.unstubAllGlobals();
    });

    it("should handle AbortError and throw descriptive message", async () => {
      const abortError = new Error("Request aborted");
      abortError.name = "AbortError";

      const mockFetch = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow(
        "Request timeout - API call exceeded 30 seconds",
      );

      vi.unstubAllGlobals();
    });

    it("should include timeout signal in fetch call", async () => {
      // Mock fetch to capture the arguments
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

      // Verify fetch was called with signal parameter
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0] as [
        string,
        { signal?: AbortSignal },
      ];
      expect(options.signal).toBeDefined();

      vi.unstubAllGlobals();
    });
  });

  describe("structured logging", () => {
    interface LogEntry {
      timestamp: string;
      level: string;
      message: string;
      component: string;
      operation: string;
      promptLength: number;
      responseLength?: number;
      error?: string;
      httpStatus?: number;
      errorType?: string;
    }

    let originalConsoleLog: typeof console.log;
    let originalConsoleError: typeof console.error;
    let logSpy: ReturnType<typeof vi.fn>;
    let errorSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Set API key for logging tests
      process.env["GEMINI_API_KEY"] = "test-key";

      // Spy on console methods
      originalConsoleLog = console.log;
      originalConsoleError = console.error;
      logSpy = vi.fn();
      errorSpy = vi.fn();
      console.log = logSpy;
      console.error = errorSpy;
    });

    afterEach(() => {
      // Restore console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
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
      expect(logSpy).toHaveBeenCalled();
      const startLogCall = logSpy.mock.calls.find((call) => {
        const logEntry = JSON.parse(call[0] as string) as { message: string };
        return logEntry.message.includes("API request started");
      });
      expect(startLogCall).toBeDefined();

      const startLog = JSON.parse(startLogCall![0] as string) as LogEntry;
      expect(startLog.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(startLog.level).toBe("info");
      expect(startLog.message).toBe("API request started");
      expect(startLog.component).toBe("api");
      expect(startLog.operation).toBe("elevatePrompt");
      expect(startLog.promptLength).toBe(11);

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
      expect(logSpy).toHaveBeenCalled();
      const successLogCall = logSpy.mock.calls.find((call) => {
        const logEntry = JSON.parse(call[0] as string) as { message: string };
        return logEntry.message.includes("completed successfully");
      });
      expect(successLogCall).toBeDefined();

      const successLog = JSON.parse(successLogCall![0] as string) as LogEntry;
      expect(successLog.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(successLog.level).toBe("info");
      expect(successLog.message).toBe("API request completed successfully");
      expect(successLog.component).toBe("api");
      expect(successLog.operation).toBe("elevatePrompt");
      expect(successLog.promptLength).toBe(4);
      expect(successLog.responseLength).toBe(17);

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
      expect(errorSpy).toHaveBeenCalled();
      const errorLogCall = errorSpy.mock.calls[0];
      expect(errorLogCall).toBeDefined();
      const errorLog = JSON.parse(errorLogCall![0] as string) as LogEntry;

      expect(errorLog.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(errorLog.level).toBe("error");
      expect(errorLog.message).toBe("API request failed");
      expect(errorLog.component).toBe("api");
      expect(errorLog.operation).toBe("elevatePrompt");
      expect(errorLog.error).toContain("API error: 401 Unauthorized");
      expect(errorLog.httpStatus).toBe(401);
      expect(errorLog.promptLength).toBe(4);

      vi.unstubAllGlobals();
    });

    it("should log timeout errors with structured format", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";

      const mockFetch = vi.fn().mockRejectedValue(timeoutError);
      vi.stubGlobal("fetch", mockFetch);

      await expect(elevatePrompt("test")).rejects.toThrow();

      // Verify error log was called
      expect(errorSpy).toHaveBeenCalled();
      const errorLogCall = errorSpy.mock.calls[0];
      expect(errorLogCall).toBeDefined();
      const errorLog = JSON.parse(errorLogCall![0] as string) as LogEntry;

      expect(errorLog.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(errorLog.level).toBe("error");
      expect(errorLog.message).toBe("API request failed");
      expect(errorLog.component).toBe("api");
      expect(errorLog.operation).toBe("elevatePrompt");
      expect(errorLog.error).toBe(
        "Request timeout - API call exceeded 30 seconds",
      );
      expect(errorLog.errorType).toBe("timeout");
      expect(errorLog.promptLength).toBe(4);

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
      expect(errorSpy).toHaveBeenCalled();
      const errorLogCall = errorSpy.mock.calls[0];
      expect(errorLogCall).toBeDefined();
      const errorLog = JSON.parse(errorLogCall![0] as string) as LogEntry;

      expect(errorLog.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(errorLog.level).toBe("error");
      expect(errorLog.message).toBe("API request failed");
      expect(errorLog.component).toBe("api");
      expect(errorLog.operation).toBe("elevatePrompt");
      expect(errorLog.error).toBe(
        "Invalid JSON response from API - response may be corrupted",
      );
      expect(errorLog.promptLength).toBe(4);

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
      const allLogCalls = [...logSpy.mock.calls, ...errorSpy.mock.calls];
      for (const call of allLogCalls) {
        const logEntry = call[0] as string;
        expect(logEntry).not.toContain("test-key");
        expect(logEntry).not.toContain("GEMINI_API_KEY");
      }

      vi.unstubAllGlobals();
    });
  });
});
