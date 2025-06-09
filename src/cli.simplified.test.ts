/**
 * Tests for simplified CLI implementation.
 * Following TDD approach - these tests should guide the refactor.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Simplified CLI", () => {
  let originalApiKey: string | undefined;
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let logOutput: string[];
  let errorOutput: string[];

  beforeEach(() => {
    // Store original API key
    originalApiKey = process.env["GEMINI_API_KEY"];

    // Mock console to capture output
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    logOutput = [];
    errorOutput = [];

    console.log = vi.fn((...args) => {
      logOutput.push(args.join(" "));
    });
    console.error = vi.fn((...args) => {
      errorOutput.push(args.join(" "));
    });
  });

  afterEach(() => {
    // Restore original API key
    if (originalApiKey) {
      process.env["GEMINI_API_KEY"] = originalApiKey;
    } else {
      delete process.env["GEMINI_API_KEY"];
    }

    // Restore console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it("should require GEMINI_API_KEY for single prompt mode", async () => {
    // Remove API key
    delete process.env["GEMINI_API_KEY"];

    // Import CLI main function
    const { handleSinglePrompt } = await import("./cli.js");

    let exitCode = 0;
    const originalExit = process.exit.bind(process);
    const mockExit = vi.fn((code?: number) => {
      exitCode = code || 0;
      throw new Error("process.exit called");
    });
    process.exit = mockExit as never;

    try {
      await handleSinglePrompt("test prompt");
    } catch {
      // Expected to throw due to process.exit mock
    }

    process.exit = originalExit;
    expect(exitCode).toBe(1);
    expect(errorOutput.some((line) => line.includes("GEMINI_API_KEY"))).toBe(
      true,
    );
  });

  it("should process single prompt when API key is present", async () => {
    // Skip if no API key in environment
    if (!process.env["GEMINI_API_KEY"]) {
      console.log("Skipping integration test - no GEMINI_API_KEY");
      return;
    }

    // Test the handleSinglePrompt function directly
    const { handleSinglePrompt } = await import("./cli.js");

    // Mock process.exit to capture exit code
    let exitCode = 0;
    const originalExit = process.exit.bind(process);
    const mockExit = vi.fn((code?: number) => {
      exitCode = code || 0;
      // Don't actually exit, just capture the code
    });
    process.exit = mockExit as never;

    await handleSinglePrompt("explain REST APIs");

    // Restore process.exit
    process.exit = originalExit;

    // Should exit with 0 (success) and have output
    expect(exitCode).toBe(0);
    expect(logOutput.length).toBeGreaterThan(0);
  }, 30000); // Longer timeout for API call
});
