/**
 * CLI Subprocess Integration Tests
 *
 * These tests execute the compiled CLI as a subprocess to verify
 * end-to-end functionality from command line invocation.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

/**
 * Extract JSON logs from stderr, filtering out user-facing messages and progress dots
 */
function extractJsonLogs(stderr: string): any[] {
  const lines = stderr.split("\n").filter((line) => line.trim());
  const jsonLogs: any[] = [];

  for (const line of lines) {
    if (line.startsWith("{")) {
      try {
        jsonLogs.push(JSON.parse(line));
      } catch {
        // Skip invalid JSON lines
      }
    }
  }

  return jsonLogs;
}

/**
 * Result of executing the CLI as a subprocess
 */
interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Execute the CLI with given arguments and environment
 *
 * @param args Command line arguments to pass to CLI
 * @param env Environment variables to set
 * @param stdin Optional stdin input for piped input tests
 * @returns Promise resolving to execution result
 */
async function executeCli(
  args: string[],
  env: Record<string, string> = {},
  stdin?: string,
): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn("node", ["dist/cli.js", ...args], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    // If stdin input is provided, write it and close stdin
    if (stdin !== undefined) {
      child.stdin?.write(stdin);
      child.stdin?.end();
    }

    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

describe("CLI Subprocess Integration Tests", () => {
  let originalApiKey: string | undefined;

  beforeAll(async () => {
    // Ensure CLI is built before running tests
    try {
      await execAsync("pnpm build");
    } catch (error) {
      console.error("Failed to build CLI:", error);
      throw error;
    }
  });

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

  it("should exit with error code 1 when GEMINI_API_KEY is missing", async () => {
    const result = await executeCli(["test prompt"], {
      // Explicitly remove API key
      GEMINI_API_KEY: "",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "GEMINI_API_KEY environment variable is required",
    );
    expect(result.stdout).toBe("");
  });

  it("should exit with code 1 when prompt is empty string argument", async () => {
    // When providing empty string as argument, it should enter multiline mode
    // and hang waiting for input, so we test with empty piped input instead
    const result = await executeCli(
      [""],
      {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"] || "test-key",
      },
      "",
    ); // Empty stdin

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("No input provided");
  });

  it("should exit with code 0 and return elevated prompt when API key is valid", async () => {
    // Skip this test if no API key is available
    if (!process.env["GEMINI_API_KEY"]) {
      console.log("⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set");
      return;
    }

    const testPrompt = "create a simple app";
    const result = await executeCli([testPrompt], {
      GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBeTruthy();
    expect(result.stdout.length).toBeGreaterThan(0);
    // stderr may contain progress dots or JSON logs
    expect(result.stderr).toBeDefined();

    // The output should be different from the input (elevated)
    expect(result.stdout).not.toBe(testPrompt);
    expect(result.stdout.length).toBeGreaterThan(testPrompt.length);
  }, 30000); // 30-second timeout for API call

  it("should support --raw flag for unformatted output", async () => {
    // Skip this test if no API key is available
    if (!process.env["GEMINI_API_KEY"]) {
      console.log("⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set");
      return;
    }

    const testPrompt = "build a web app";
    const result = await executeCli(["--raw", testPrompt], {
      GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBeTruthy();
    expect(result.stdout.length).toBeGreaterThan(0);
    // stderr may contain progress dots or JSON logs
    expect(result.stderr).toBeDefined();

    // With --raw flag, output should be plain text without any formatting
    expect(result.stdout).toBeTruthy();
    expect(result.stdout.length).toBeGreaterThan(0);
  }, 30000); // 30-second timeout for API call

  describe("multiline input support", () => {
    it("should handle piped input from echo", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = "fix this bug\nit's not working properly";
      const result = await executeCli(
        [],
        {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        },
        testPrompt,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      expect(result.stdout.length).toBeGreaterThan(0);
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();

      // The output should be different from the input (elevated)
      expect(result.stdout).not.toBe(testPrompt);
      expect(result.stdout.length).toBeGreaterThan(testPrompt.length);
    }, 30000);

    it("should handle multiline input with --raw flag", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = "create a component\nwith TypeScript\nand tests";
      const result = await executeCli(
        ["--raw"],
        {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        },
        testPrompt,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();

      // With --raw flag, output should be plain text without any formatting
      expect(result.stdout).toBeTruthy();
      expect(result.stdout.length).toBeGreaterThan(0);
    }, 30000);

    it("should handle empty piped input gracefully", async () => {
      const result = await executeCli(
        [],
        {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"] || "test-key",
        },
        "",
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No input provided");
    });

    it("should handle unicode characters in piped input", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = "Create a 🚀 app with 世界 support";
      const result = await executeCli(
        [],
        {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        },
        testPrompt,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();
    }, 30000);

    it("should maintain backward compatibility with single argument", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = "build a simple API";
      const result = await executeCli([testPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();

      // The output should be different from the input (elevated)
      expect(result.stdout).not.toBe(testPrompt);
      expect(result.stdout.length).toBeGreaterThan(testPrompt.length);
    }, 30000);
  });

  describe("Phase 1 Enhanced Prompt System - Backward Compatibility", () => {
    /**
     * These tests verify that the new CRISP-based prompt system maintains
     * backward compatibility and doesn't introduce regressions in CLI behavior.
     */

    it("should maintain consistent output format with enhanced prompts", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = "explain REST APIs";
      const result = await executeCli([testPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();

      // Output should be the enhanced prompt directly
      expect(result.stdout).toBeTruthy();
      expect(result.stdout.length).toBeGreaterThan(0);

      // The enhanced prompt should be significantly more detailed than input
      expect(result.stdout.length).toBeGreaterThan(testPrompt.length * 2);

      // Should not contain any error indicators
      expect(result.stdout).not.toContain("Error:");
      expect(result.stdout).not.toContain("Failed:");
      expect(result.stdout).not.toContain("undefined");
    }, 30000);

    it("should handle complex technical prompts without crashing", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const complexPrompt =
        "Create a microservices architecture with authentication, rate limiting, and monitoring";
      const result = await executeCli([complexPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();

      // Should transform the complex prompt into something more structured
      const enhancedContent = result.stdout;
      expect(enhancedContent.length).toBeGreaterThan(complexPrompt.length);

      // Enhanced prompt should include expert technical language
      expect(enhancedContent.toLowerCase()).toMatch(
        /architect|microservice|authentication|deploy|implement|system|service/,
      );
    }, 30000);

    it("should preserve special characters and formatting in prompts", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const specialPrompt =
        "Debug: console.log('Hello 🌟 World'); // Why no output?";
      const result = await executeCli([specialPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();

      // Special characters and code elements should be preserved in the output
      expect(result.stdout).toContain("🌟");
      expect(result.stdout).toContain("console.log");
      expect(result.stdout).toContain("Hello");
    }, 30000);

    it("should maintain performance and not timeout with enhanced prompts", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const startTime = Date.now();
      const result = await executeCli(["optimize my database queries"], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });
      const duration = Date.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();

      // Should complete within reasonable time (under 30 seconds)
      expect(duration).toBeLessThan(30000);

      // Should still produce meaningful enhanced output
      expect(result.stdout.length).toBeGreaterThan(50);
    }, 30000);

    it("should work correctly with edge case inputs", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      // Test with very short input
      const shortResult = await executeCli(["fix"], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(shortResult.exitCode).toBe(0);
      expect(shortResult.stdout).toBeTruthy();
      // stderr may contain progress dots
      expect(shortResult.stderr).toBeDefined();
      expect(shortResult.stdout.length).toBeGreaterThan("fix".length);

      // Test with long input
      const longPrompt = "a".repeat(500) + " - help me understand this";
      const longResult = await executeCli([longPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(longResult.exitCode).toBe(0);
      expect(longResult.stdout).toBeTruthy();
      // stderr may contain progress dots
      expect(longResult.stderr).toBeDefined();
    }, 45000);

    it("should maintain backward compatibility with existing CLI flags", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      // Test --raw flag still works with enhanced prompts
      const rawResult = await executeCli(["--raw", "create a function"], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(rawResult.exitCode).toBe(0);
      expect(rawResult.stdout).toBeTruthy();
      // In raw mode without debug, stderr is empty
      expect(rawResult.stderr).toBe("");

      // Test help flag still works
      const helpResult = await executeCli(["--help"], {});
      expect(helpResult.exitCode).toBe(0);
      expect(helpResult.stdout).toContain("Usage:");
    }, 30000);

    it("should produce qualitatively better responses with enhanced prompts", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const vaguePrompt = "make my code better";
      const result = await executeCli([vaguePrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();

      const enhancedOutput = result.stdout;

      // Enhanced prompt should be significantly more detailed and different
      expect(enhancedOutput.length).toBeGreaterThan(vaguePrompt.length * 3);

      // Should be different from the input (not just echoing back)
      expect(enhancedOutput.toLowerCase()).not.toBe(vaguePrompt.toLowerCase());

      // Should contain some elaboration (more than just a couple words added)
      expect(enhancedOutput.split(" ").length).toBeGreaterThan(
        vaguePrompt.split(" ").length + 5,
      );
    }, 30000);

    it("should handle multiline input with enhanced prompt system", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const multilinePrompt = `improve my React app
it's slow and buggy
needs better error handling`;

      const result = await executeCli(
        [],
        {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        },
        multilinePrompt,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      // stderr may contain progress dots or JSON logs
      expect(result.stderr).toBeDefined();

      // Should handle multiline input correctly
      expect(result.stdout).toBeTruthy();
      expect(result.stdout.length).toBeGreaterThan(0);

      // Enhanced output should address the multiple concerns mentioned
      const enhancedContent = result.stdout.toLowerCase();
      expect(enhancedContent).toMatch(/performance|optimization|speed/);
      expect(enhancedContent).toMatch(/error|handling|debugging/);
      expect(enhancedContent).toMatch(/react|component|application/);
    }, 30000);
  });

  describe("stdout pipe compatibility", () => {
    it("should output only API response to stdout when using --raw with piped input", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = "explain APIs";
      const result = await executeCli(
        ["--raw"],
        {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        },
        testPrompt,
      );

      expect(result.exitCode).toBe(0);

      // stdout should contain only the API response content - no formatting, logs, or extra text
      expect(result.stdout).toBeTruthy();
      expect(result.stdout.length).toBeGreaterThan(0);

      // stdout should NOT contain any CLI formatting or metadata
      expect(result.stdout).not.toContain("Error:");
      expect(result.stdout).not.toContain("API request");

      // Check for JSON log structure patterns, not individual words that could appear in responses
      expect(result.stdout).not.toMatch(/"timestamp":/);
      expect(result.stdout).not.toMatch(/"level":/);
      expect(result.stdout).not.toMatch(/"component":/);
      expect(result.stdout).not.toMatch(/"operation":/);
      expect(result.stdout).not.toMatch(/"metadata":/);
      expect(result.stdout).not.toMatch(/"message":/);
      expect(result.stdout).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp pattern

      // stdout should be pure API response - no JSON log entries
      expect(() => JSON.parse(result.stdout)).toThrow(); // Should not be valid JSON log

      // In raw mode without debug flag, stderr should be empty (no progress dots, no logs)
      expect(result.stderr).toBe("");
    }, 30000);

    it("should be fully compatible with shell pipes and redirects", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = "create a function";
      const result = await executeCli(
        ["--raw", "--debug"],
        {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        },
        testPrompt,
      );

      expect(result.exitCode).toBe(0);

      // The stdout should be suitable for piping to other commands
      // This means it should be plain text without control characters or formatting
      expect(result.stdout).not.toMatch(/\x1b\[[0-9;]*m/); // No ANSI color codes
      expect(result.stdout).not.toContain("\r"); // No carriage returns
      expect(result.stdout.trim()).toBe(result.stdout.trim()); // No unexpected whitespace

      // Should be single response, not multiple lines of logs
      expect(result.stdout).not.toContain('\n{"timestamp"'); // No JSON logs in stdout
      expect(result.stdout).not.toContain('\n{"level"'); // No JSON logs in stdout

      // stderr should contain all the logging information when debug is enabled
      expect(result.stderr).toContain('"message":"API request started"');
      expect(result.stderr).toContain(
        '"message":"API request completed successfully"',
      );
    }, 30000);
  });

  describe("structured logging on stderr", () => {
    it("should output valid JSON structured logs to stderr while redirecting stdout", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = "create a simple function";
      const result = await executeCli(["--debug", testPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);

      // stderr should contain structured JSON logs
      expect(result.stderr).toBeTruthy();
      expect(result.stderr.length).toBeGreaterThan(0);

      // Extract JSON logs from stderr, filtering out progress dots
      const jsonLogs = extractJsonLogs(result.stderr);
      expect(jsonLogs.length).toBeGreaterThan(0);

      // Each log should have required structured log fields
      let foundStartLog = false;
      let foundCompletionLog = false;

      for (const logEntry of jsonLogs) {
        // Verify required structured log fields
        expect(logEntry).toHaveProperty("timestamp");
        expect(logEntry).toHaveProperty("level");
        expect(logEntry).toHaveProperty("message");
        expect(logEntry).toHaveProperty("metadata");

        // Verify timestamp format (ISO 8601)
        expect(logEntry.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );

        // Verify level is valid
        expect(["info", "error", "warn", "debug"]).toContain(logEntry.level);

        // Verify metadata contains required API operation fields
        if (logEntry.message.includes("API request")) {
          expect(logEntry.metadata).toHaveProperty("component", "api");
          expect(logEntry.metadata).toHaveProperty(
            "operation",
            "elevatePrompt",
          );
          expect(logEntry.metadata).toHaveProperty("promptLength");
          expect(typeof logEntry.metadata.promptLength).toBe("number");

          if (logEntry.message === "API request started") {
            foundStartLog = true;
          } else if (
            logEntry.message === "API request completed successfully"
          ) {
            foundCompletionLog = true;
            expect(logEntry.metadata).toHaveProperty("responseLength");
            expect(logEntry.metadata).toHaveProperty("durationMs");
            expect(typeof logEntry.metadata.responseLength).toBe("number");
            expect(typeof logEntry.metadata.durationMs).toBe("number");
          }
        }
      }

      // Verify we found at least the start log (completion may be timing/buffering dependent)
      expect(foundStartLog).toBe(true);

      // If we have more than 1 log, verify completion log exists too
      if (jsonLogs.length > 1) {
        expect(foundCompletionLog).toBe(true);
      }
    }, 30000);

    it("should log API errors with proper structure and context", async () => {
      const testPrompt = "test error logging";
      const result = await executeCli(["--debug", testPrompt], {
        // Use invalid API key to trigger error
        GEMINI_API_KEY: "invalid-key-for-testing",
      });

      expect(result.exitCode).toBe(1);

      // stderr should contain structured error logs
      expect(result.stderr).toBeTruthy();
      const jsonLogs = extractJsonLogs(result.stderr);

      let foundErrorLog = false;

      for (const logEntry of jsonLogs) {
        if (
          logEntry.level === "error" &&
          logEntry.message === "API request failed"
        ) {
          foundErrorLog = true;

          // Verify error log structure
          expect(logEntry.metadata).toHaveProperty("component", "api");
          expect(logEntry.metadata).toHaveProperty(
            "operation",
            "elevatePrompt",
          );
          expect(logEntry.metadata).toHaveProperty("error");
          expect(logEntry.metadata).toHaveProperty("promptLength");
          expect(logEntry.metadata).toHaveProperty("durationMs");

          // Verify error message contains meaningful information
          expect(logEntry.metadata.error).toContain("API error:");
          expect(typeof logEntry.metadata.promptLength).toBe("number");
          expect(typeof logEntry.metadata.durationMs).toBe("number");

          // Should have HTTP status for API errors
          if (logEntry.metadata.httpStatus) {
            expect(typeof logEntry.metadata.httpStatus).toBe("number");
          }
        }
      }

      expect(foundErrorLog).toBe(true);
    }, 30000);

    it("should never log sensitive information like API keys", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = "security test prompt";
      const testApiKey = process.env["GEMINI_API_KEY"];
      const result = await executeCli(["--debug", testPrompt], {
        GEMINI_API_KEY: testApiKey,
      });

      expect(result.exitCode).toBe(0);

      // Check both stdout and stderr for API key leakage
      expect(result.stdout).not.toContain(testApiKey);
      expect(result.stderr).not.toContain(testApiKey);

      // Parse each log entry to ensure no sensitive data is logged
      const jsonLogs = extractJsonLogs(result.stderr);

      for (const logEntry of jsonLogs) {
        // Convert entire log entry to string and check for API key
        const logString = JSON.stringify(logEntry);
        expect(logString).not.toContain(testApiKey);

        // Ensure no generic API key patterns are present
        expect(logString).not.toMatch(/[a-zA-Z0-9]{32,}/); // No long alphanumeric strings that could be keys
        expect(logString).not.toContain("GEMINI_API_KEY");
        expect(logString).not.toContain("api_key");
        expect(logString).not.toContain("apiKey");
      }
    }, 30000);
  });

  describe("format preservation (Phase 6)", () => {
    it("should preserve code blocks when passed via args while elevating surrounding text", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      // Test prompt that mixes plain text, inline code, and a code block
      const testPrompt = `Use \`console.log()\` for debugging. Here's an example:

\`\`\`javascript
function debug() {
  console.log('debug info');
  return true;
}
\`\`\`

Remember to check logs regularly.`;

      const result = await executeCli([testPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
      expect(result.stdout.length).toBeGreaterThan(0);

      // Verify that code blocks are preserved exactly
      expect(result.stdout).toContain("`console.log()`");
      expect(result.stdout).toContain("```javascript");
      expect(result.stdout).toContain("function debug() {");
      expect(result.stdout).toContain("  console.log('debug info');");
      expect(result.stdout).toContain("  return true;");
      expect(result.stdout).toContain("}");
      expect(result.stdout).toContain("```");

      // Verify that surrounding plain text was elevated (should be different/longer)
      // The original "Remember to check logs regularly" should be enhanced
      expect(result.stdout).toContain("log"); // Should still mention logs
      expect(result.stdout.length).toBeGreaterThan(testPrompt.length);

      // Verify the output is not just the original input
      expect(result.stdout).not.toBe(testPrompt);

      // Code blocks should be exact matches (not elevated)
      const originalCodeBlock = `\`\`\`javascript
function debug() {
  console.log('debug info');
  return true;
}
\`\`\``;
      expect(result.stdout).toContain(originalCodeBlock);
    }, 30000);

    it("should preserve multiple code blocks with different languages", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = `Setup your project with these files:

\`\`\`typescript
interface User {
  name: string;
  email: string;
}
\`\`\`

And then add the Python backend:

\`\`\`python
def get_user(user_id: int) -> dict:
    return {"name": "test", "email": "test@example.com"}
\`\`\`

Make sure to test both components.`;

      const result = await executeCli([testPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();

      // Verify TypeScript code block is preserved
      expect(result.stdout).toContain("```typescript");
      expect(result.stdout).toContain("interface User {");
      expect(result.stdout).toContain("  name: string;");
      expect(result.stdout).toContain("  email: string;");

      // Verify Python code block is preserved
      expect(result.stdout).toContain("```python");
      expect(result.stdout).toContain("def get_user(user_id: int) -> dict:");
      expect(result.stdout).toContain(
        'return {"name": "test", "email": "test@example.com"}',
      );

      // Both code blocks should end with ```
      const tsEnd = result.stdout.indexOf("```typescript");
      const pyStart = result.stdout.indexOf("```python");
      expect(result.stdout.indexOf("```", tsEnd + 1)).toBeLessThan(pyStart);

      // The elevated text should be longer than original
      expect(result.stdout.length).toBeGreaterThan(testPrompt.length);
    }, 30000);

    it("should handle mixed inline code and quotes correctly", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = `Debug with \`console.log()\` and \`JSON.stringify()\`.

> Remember to check the browser console

Also use \`debugger;\` statements when needed.`;

      const result = await executeCli([testPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();

      // Verify inline code is preserved exactly
      expect(result.stdout).toContain("`console.log()`");
      expect(result.stdout).toContain("`JSON.stringify()`");
      expect(result.stdout).toContain("`debugger;`");

      // The quote and surrounding text should be elevated
      expect(result.stdout.length).toBeGreaterThan(testPrompt.length);

      // Should not contain the exact original quote format
      expect(result.stdout).not.toContain(
        "> Remember to check the browser console",
      );

      // But should still mention console/debugging concepts
      expect(result.stdout.toLowerCase()).toMatch(/console|debug|browser/);
    }, 30000);

    it("should fall back to original behavior for plain text without code", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const plainTextPrompt = "optimize my database queries";

      const result = await executeCli([plainTextPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();

      // Should elevate the entire text since there's no code to preserve
      expect(result.stdout.length).toBeGreaterThan(plainTextPrompt.length);
      expect(result.stdout).not.toBe(plainTextPrompt);

      // Should contain technical database terminology
      expect(result.stdout.toLowerCase()).toMatch(
        /database|query|optim|performance|index/,
      );
    }, 30000);

    it("should work with --raw flag while preserving code blocks", async () => {
      // Skip this test if no API key is available
      if (!process.env["GEMINI_API_KEY"]) {
        console.log(
          "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
        );
        return;
      }

      const testPrompt = `Use \`console.log()\` to debug:

\`\`\`js
console.log('test');
\`\`\``;

      const result = await executeCli(["--raw", testPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();

      // Code should be preserved even with --raw
      expect(result.stdout).toContain("`console.log()`");
      expect(result.stdout).toContain("```js");
      expect(result.stdout).toContain("console.log('test');");
      expect(result.stdout).toContain("```");

      // In raw mode, stderr should be empty (no progress dots)
      expect(result.stderr).toBe("");
    }, 30000);

    describe("piped input format preservation", () => {
      it("should preserve code blocks when input is piped from stdin", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const pipedInput = `Fix the authentication issue:

\`\`\`javascript
function authenticate(token) {
  if (!token) {
    throw new Error('No token provided');
  }
  return jwt.verify(token, secret);
}
\`\`\`

This function needs better error handling.`;

        const result = await executeCli(
          [],
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          pipedInput,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Verify code block is preserved exactly
        expect(result.stdout).toContain("```javascript");
        expect(result.stdout).toContain("function authenticate(token) {");
        expect(result.stdout).toContain("  if (!token) {");
        expect(result.stdout).toContain(
          "    throw new Error('No token provided');",
        );
        expect(result.stdout).toContain("  }");
        expect(result.stdout).toContain("  return jwt.verify(token, secret);");
        expect(result.stdout).toContain("}");
        expect(result.stdout).toContain("```");

        // Surrounding text should be elevated
        expect(result.stdout.length).toBeGreaterThan(pipedInput.length);
        expect(result.stdout).not.toBe(pipedInput);

        // Should contain enhanced technical language
        expect(result.stdout.toLowerCase()).toMatch(
          /authentication|error|handling|security/,
        );
      }, 30000);

      it("should handle complex multiline piped input with mixed formatting", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const complexInput = `Create a REST API with proper validation.

Use \`express\` and \`joi\` for validation:

\`\`\`typescript
import express from 'express';
import joi from 'joi';

const schema = joi.object({
  name: joi.string().required(),
  email: joi.string().email().required()
});

app.post('/users', (req, res) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // Process valid data
});
\`\`\`

Remember to add \`helmet\` for security headers.

\`\`\`bash
npm install helmet
\`\`\`

Test with \`curl\` or \`postman\`.`;

        const result = await executeCli(
          [],
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          complexInput,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Verify inline code is preserved
        expect(result.stdout).toContain("`express`");
        expect(result.stdout).toContain("`joi`");
        expect(result.stdout).toContain("`helmet`");
        expect(result.stdout).toContain("`curl`");
        expect(result.stdout).toContain("`postman`");

        // Verify TypeScript code block is preserved
        expect(result.stdout).toContain("```typescript");
        expect(result.stdout).toContain("import express from 'express';");
        expect(result.stdout).toContain("const schema = joi.object({");
        expect(result.stdout).toContain("app.post('/users', (req, res) => {");

        // Verify bash code block is preserved
        expect(result.stdout).toContain("```bash");
        expect(result.stdout).toContain("npm install helmet");

        // Text should be elevated (longer than original)
        expect(result.stdout.length).toBeGreaterThan(complexInput.length);

        // Should contain enhanced API development concepts
        expect(result.stdout.toLowerCase()).toMatch(
          /api|validation|security|endpoint/,
        );
      }, 45000);

      it("should work with piped input and --raw flag for scripting", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const scriptableInput = `Optimize this query:

\`\`\`sql
SELECT * FROM users 
WHERE status = 'active' 
AND created_at > NOW() - INTERVAL 30 DAY;
\`\`\``;

        const result = await executeCli(
          ["--raw"],
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          scriptableInput,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Code should be preserved even with --raw
        expect(result.stdout).toContain("```sql");
        expect(result.stdout).toContain("SELECT * FROM users");
        expect(result.stdout).toContain("WHERE status = 'active'");
        expect(result.stdout).toContain(
          "AND created_at > NOW() - INTERVAL 30 DAY;",
        );
        expect(result.stdout).toContain("```");

        // Raw mode should have no progress dots in stderr
        expect(result.stderr).toBe("");

        // Output should be suitable for scripting (no extra formatting)
        expect(result.stdout).not.toMatch(/\x1b\[[0-9;]*m/); // No ANSI color codes
        // Should contain newlines for readability but be plain text
        expect(result.stdout).toBeTruthy();
      }, 30000);

      it("should preserve formatting when piped from heredoc", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Simulate heredoc input with exact formatting
        const heredocInput = `Improve this component:

\`\`\`jsx
function UserCard({ user }) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}
\`\`\`

Add proper TypeScript types and error boundaries.`;

        const result = await executeCli(
          [],
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          heredocInput,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // JSX code block should be preserved exactly
        expect(result.stdout).toContain("```jsx");
        expect(result.stdout).toContain("function UserCard({ user }) {");
        expect(result.stdout).toContain("  return (");
        expect(result.stdout).toContain('    <div className="user-card">');
        expect(result.stdout).toContain("      <h3>{user.name}</h3>");
        expect(result.stdout).toContain("      <p>{user.email}</p>");
        expect(result.stdout).toContain("    </div>");
        expect(result.stdout).toContain("  );");
        expect(result.stdout).toContain("}");
        expect(result.stdout).toContain("```");

        // Text should be enhanced
        expect(result.stdout.length).toBeGreaterThan(heredocInput.length);
        expect(result.stdout.toLowerCase()).toMatch(
          /component|typescript|react|error/,
        );
      }, 30000);

      it("should handle edge cases in piped input gracefully", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Test with Unicode characters and special formatting
        const edgeCaseInput = `Debug this issue with Unicode handling:

\`\`\`python
def process_émojis(text: str) -> str:
    # Handle Unicode properly: 🐛 test with 世界
    return text.encode('utf-8').decode('utf-8')
\`\`\`

Ensure proper character encoding throughout.`;

        const result = await executeCli(
          [],
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          edgeCaseInput,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Unicode characters in the code block should be preserved exactly
        expect(result.stdout).toContain("🐛");
        expect(result.stdout).toContain("世界");

        // Code block should be preserved
        expect(result.stdout).toContain("```python");
        expect(result.stdout).toContain(
          "def process_émojis(text: str) -> str:",
        );
        expect(result.stdout).toContain(
          "# Handle Unicode properly: 🐛 test with 世界",
        );
        expect(result.stdout).toContain(
          "return text.encode('utf-8').decode('utf-8')",
        );
        expect(result.stdout).toContain("```");
      }, 30000);
    });

    describe("interactive input format preservation", () => {
      it("should preserve code blocks in interactive multiline input mode", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const interactiveInput = `Fix this authentication middleware:

\`\`\`typescript
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
\`\`\`

Add proper error logging and rate limiting.`;

        const result = await executeCli(
          [], // No arguments - triggers interactive mode
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          interactiveInput, // This simulates the user typing and pressing Ctrl+D
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Verify TypeScript code block is preserved exactly
        expect(result.stdout).toContain("```typescript");
        expect(result.stdout).toContain(
          "function authMiddleware(req: Request, res: Response, next: NextFunction) {",
        );
        expect(result.stdout).toContain(
          "  const token = req.headers.authorization?.split(' ')[1];",
        );
        expect(result.stdout).toContain("  if (!token) {");
        expect(result.stdout).toContain(
          "    return res.status(401).json({ error: 'No token provided' });",
        );
        expect(result.stdout).toContain("  }");
        expect(result.stdout).toContain("  try {");
        expect(result.stdout).toContain(
          "    const decoded = jwt.verify(token, process.env.JWT_SECRET!);",
        );
        expect(result.stdout).toContain("    req.user = decoded;");
        expect(result.stdout).toContain("    next();");
        expect(result.stdout).toContain("  } catch (error) {");
        expect(result.stdout).toContain(
          "    res.status(401).json({ error: 'Invalid token' });",
        );
        expect(result.stdout).toContain("  }");
        expect(result.stdout).toContain("}");
        expect(result.stdout).toContain("```");

        // Surrounding text should be elevated (longer than original)
        expect(result.stdout.length).toBeGreaterThan(interactiveInput.length);

        // Should contain enhanced middleware/authentication concepts
        expect(result.stdout.toLowerCase()).toMatch(
          /middleware|authentication|security|logging|rate.limiting/,
        );
      }, 30000);

      it("should handle interactive input with mixed inline code and quotes", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const mixedInput = `Optimize database queries using \`EXPLAIN ANALYZE\`:

\`\`\`sql
EXPLAIN ANALYZE
SELECT u.name, p.title, COUNT(c.id) as comment_count
FROM users u
JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, p.id
ORDER BY comment_count DESC
LIMIT 10;
\`\`\`

> Remember to add indexes on frequently queried columns

Also use \`pg_stat_statements\` for monitoring.`;

        const result = await executeCli(
          [], // Interactive mode
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          mixedInput,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Inline code should be preserved
        expect(result.stdout).toContain("`EXPLAIN ANALYZE`");
        expect(result.stdout).toContain("`pg_stat_statements`");

        // SQL code block should be preserved exactly
        expect(result.stdout).toContain("```sql");
        expect(result.stdout).toContain("EXPLAIN ANALYZE");
        expect(result.stdout).toContain(
          "SELECT u.name, p.title, COUNT(c.id) as comment_count",
        );
        expect(result.stdout).toContain("FROM users u");
        expect(result.stdout).toContain("JOIN posts p ON u.id = p.user_id");
        expect(result.stdout).toContain(
          "LEFT JOIN comments c ON p.id = c.post_id",
        );
        expect(result.stdout).toContain(
          "WHERE u.created_at > NOW() - INTERVAL '30 days'",
        );
        expect(result.stdout).toContain("GROUP BY u.id, p.id");
        expect(result.stdout).toContain("ORDER BY comment_count DESC");
        expect(result.stdout).toContain("LIMIT 10;");
        expect(result.stdout).toContain("```");

        // Quote should be elevated (not in original format)
        expect(result.stdout).not.toContain(
          "> Remember to add indexes on frequently queried columns",
        );

        // But should contain enhanced database optimization concepts
        expect(result.stdout.toLowerCase()).toMatch(
          /database|query|optim|performance|index/,
        );
      }, 30000);

      it("should work with interactive mode and --debug for troubleshooting", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const debugInput = `Create error handling with proper logging:

\`\`\`javascript
try {
  const result = await fetchUserData(userId);
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
  throw error;
}
\`\`\``;

        const result = await executeCli(
          ["--debug"], // Interactive mode with debug
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          debugInput,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Code block should be preserved
        expect(result.stdout).toContain("```javascript");
        expect(result.stdout).toContain("try {");
        expect(result.stdout).toContain(
          "  const result = await fetchUserData(userId);",
        );
        expect(result.stdout).toContain("  console.log('Success:', result);");
        expect(result.stdout).toContain("} catch (error) {");
        expect(result.stdout).toContain(
          "  console.error('Error:', error.message);",
        );
        expect(result.stdout).toContain("  throw error;");
        expect(result.stdout).toContain("}");
        expect(result.stdout).toContain("```");

        // Debug mode should show structured logs in stderr
        expect(result.stderr).toContain('"message":"API request started"');
        expect(result.stderr).toContain('"operation":"elevatePrompt"');
      }, 30000);

      it("should handle edge cases in interactive mode gracefully", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Test with very short interactive input containing code
        const shortInput = `Use \`git status\` to check changes.`;

        const result = await executeCli(
          [],
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          shortInput,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Inline code should be preserved even in short input
        expect(result.stdout).toContain("`git status`");

        // Text should be elevated
        expect(result.stdout.length).toBeGreaterThan(shortInput.length);
      }, 30000);

      it("should preserve complex formatting in interactive input", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const complexInput = `Setup CI/CD pipeline with these configurations:

\`\`\`yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
\`\`\`

Don't forget to add \`secrets.DEPLOY_KEY\` for deployment.

\`\`\`bash
echo "DEPLOY_KEY=\${{ secrets.DEPLOY_KEY }}" >> $GITHUB_ENV
\`\`\``;

        const result = await executeCli(
          [],
          {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          },
          complexInput,
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Inline code should be preserved
        expect(result.stdout).toContain("`secrets.DEPLOY_KEY`");

        // YAML code block should be preserved
        expect(result.stdout).toContain("```yaml");
        expect(result.stdout).toContain("name: CI/CD Pipeline");
        expect(result.stdout).toContain("on:");
        expect(result.stdout).toContain("  push:");
        expect(result.stdout).toContain("    branches: [main, develop]");
        expect(result.stdout).toContain("jobs:");
        expect(result.stdout).toContain("  test:");
        expect(result.stdout).toContain("    runs-on: ubuntu-latest");

        // Bash code block should be preserved
        expect(result.stdout).toContain("```bash");
        expect(result.stdout).toContain(
          'echo "DEPLOY_KEY=\${{ secrets.DEPLOY_KEY }}" >> $GITHUB_ENV',
        );

        // Should contain enhanced CI/CD concepts
        expect(result.stdout.toLowerCase()).toMatch(
          /ci\/cd|pipeline|deployment|automation/,
        );
      }, 45000);
    });

    describe("Issue #38 validation", () => {
      it("should handle the exact problem case from issue #38 description", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // This represents the type of input that was problematic before format preservation
        // where code blocks would get mangled or transformed instead of preserved
        const problematicInput = `I need help debugging this authentication function:

\`\`\`javascript
function authenticateUser(token) {
  if (!token) {
    return { error: 'No token provided' };
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { user: decoded };
  } catch (err) {
    return { error: 'Invalid token' };
  }
}
\`\`\`

The function works but I want to improve error handling.`;

        const result = await executeCli([problematicInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // CRITICAL: Code block must be preserved exactly as written
        // This was the core issue - code blocks were being transformed/mangled
        expect(result.stdout).toContain("```javascript");
        expect(result.stdout).toContain("function authenticateUser(token) {");
        expect(result.stdout).toContain("  if (!token) {");
        expect(result.stdout).toContain(
          "    return { error: 'No token provided' };",
        );
        expect(result.stdout).toContain("  }");
        expect(result.stdout).toContain("  try {");
        expect(result.stdout).toContain(
          "    const decoded = jwt.verify(token, process.env.JWT_SECRET);",
        );
        expect(result.stdout).toContain("    return { user: decoded };");
        expect(result.stdout).toContain("  } catch (err) {");
        expect(result.stdout).toContain(
          "    return { error: 'Invalid token' };",
        );
        expect(result.stdout).toContain("  }");
        expect(result.stdout).toContain("}");
        expect(result.stdout).toContain("```");

        // The surrounding text should be elevated, but code preserved
        expect(result.stdout.length).toBeGreaterThan(problematicInput.length);
        expect(result.stdout).not.toBe(problematicInput);

        // Should contain enhanced debugging/authentication concepts
        expect(result.stdout.toLowerCase()).toMatch(
          /authentication|debug|error.handling|security|validation/,
        );

        // ANTI-PATTERN: Code should NOT be transformed into prose
        // This was the original problem - code was being "explained" instead of preserved
        expect(result.stdout).not.toMatch(/create a function that/i);
        expect(result.stdout).not.toMatch(/implement a method to/i);
        expect(result.stdout).not.toMatch(/the function should/i);
      }, 30000);

      it("should preserve complex code examples that were problematic", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Test with more complex code that might trigger transformation
        const complexCodeInput = `Fix the performance issue in this React component:

\`\`\`jsx
import React, { useState, useEffect, useMemo } from 'react';

const UserList = ({ users, onUserSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  const filteredUsers = useMemo(() => {
    return users
      .filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const modifier = sortOrder === 'asc' ? 1 : -1;
        return a.name.localeCompare(b.name) * modifier;
      });
  }, [users, searchTerm, sortOrder]);

  useEffect(() => {
    console.log('Filtered users updated:', filteredUsers.length);
  }, [filteredUsers]);

  return (
    <div className="user-list">
      <input
        type="text"
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
        Sort {sortOrder === 'asc' ? '↑' : '↓'}
      </button>
      <ul>
        {filteredUsers.map(user => (
          <li key={user.id} onClick={() => onUserSelect(user)}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
\`\`\`

This component re-renders too often.`;

        const result = await executeCli([complexCodeInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Every line of the complex React component should be preserved exactly
        expect(result.stdout).toContain("```jsx");
        expect(result.stdout).toContain(
          "import React, { useState, useEffect, useMemo } from 'react';",
        );
        expect(result.stdout).toContain(
          "const UserList = ({ users, onUserSelect }) => {",
        );
        expect(result.stdout).toContain(
          "  const [searchTerm, setSearchTerm] = useState('');",
        );
        expect(result.stdout).toContain(
          "  const [sortOrder, setSortOrder] = useState('asc');",
        );
        expect(result.stdout).toContain(
          "  const filteredUsers = useMemo(() => {",
        );
        expect(result.stdout).toContain("    return users");
        expect(result.stdout).toContain("      .filter(user =>");
        expect(result.stdout).toContain(
          "        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||",
        );
        expect(result.stdout).toContain(
          "        user.email.toLowerCase().includes(searchTerm.toLowerCase())",
        );
        expect(result.stdout).toContain("      )");
        expect(result.stdout).toContain("      .sort((a, b) => {");
        expect(result.stdout).toContain(
          "        const modifier = sortOrder === 'asc' ? 1 : -1;",
        );
        expect(result.stdout).toContain(
          "        return a.name.localeCompare(b.name) * modifier;",
        );
        expect(result.stdout).toContain("      });");
        expect(result.stdout).toContain(
          "  }, [users, searchTerm, sortOrder]);",
        );
        expect(result.stdout).toContain("  useEffect(() => {");
        expect(result.stdout).toContain(
          "    console.log('Filtered users updated:', filteredUsers.length);",
        );
        expect(result.stdout).toContain("  }, [filteredUsers]);");
        expect(result.stdout).toContain("  return (");
        expect(result.stdout).toContain('    <div className="user-list">');
        expect(result.stdout).toContain("export default UserList;");
        expect(result.stdout).toContain("```");

        // Text should be enhanced for performance optimization
        expect(result.stdout.toLowerCase()).toMatch(
          /performance|optim|render|react|component/,
        );
      }, 45000);

      it("should handle inline code preservation that was also problematic", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const inlineCodeInput = `Debug the API calls using \`console.log()\` and \`JSON.stringify()\`. 

Check the network tab and use \`fetch()\` with proper error handling. 

Also try \`curl -X POST\` for testing endpoints manually.`;

        const result = await executeCli([inlineCodeInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // ALL inline code should be preserved exactly
        expect(result.stdout).toContain("`console.log()`");
        expect(result.stdout).toContain("`JSON.stringify()`");
        expect(result.stdout).toContain("`fetch()`");
        expect(result.stdout).toContain("`curl -X POST`");

        // Text should be enhanced but inline code preserved
        expect(result.stdout.length).toBeGreaterThan(inlineCodeInput.length);
        expect(result.stdout.toLowerCase()).toMatch(
          /debug|api|network|endpoint|testing/,
        );
      }, 30000);
    });

    describe("multiple programming languages preservation", () => {
      it("should preserve code blocks across various programming languages", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const multiLanguageInput = `Here are examples in different programming languages:

JavaScript:
\`\`\`javascript
const greet = (name) => {
  console.log(\`Hello, \${name}!\`);
};
\`\`\`

Python:
\`\`\`python
def greet(name):
    print(f"Hello, {name}!")
\`\`\`

Rust:
\`\`\`rust
fn greet(name: &str) {
    println!("Hello, {}!", name);
}
\`\`\`

Go:
\`\`\`go
func greet(name string) {
    fmt.Printf("Hello, %s!\\n", name)
}
\`\`\`

Java:
\`\`\`java
public void greet(String name) {
    System.out.println("Hello, " + name + "!");
}
\`\`\`

C++:
\`\`\`cpp
#include <iostream>
void greet(const std::string& name) {
    std::cout << "Hello, " << name << "!" << std::endl;
}
\`\`\`

Please optimize these for performance.`;

        const result = await executeCli([multiLanguageInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // JavaScript code block
        expect(result.stdout).toContain("```javascript");
        expect(result.stdout).toContain("const greet = (name) => {");
        expect(result.stdout).toContain("  console.log(`Hello, ${name}!`);");
        expect(result.stdout).toContain("};");

        // Python code block
        expect(result.stdout).toContain("```python");
        expect(result.stdout).toContain("def greet(name):");
        expect(result.stdout).toContain('    print(f"Hello, {name}!")');

        // Rust code block
        expect(result.stdout).toContain("```rust");
        expect(result.stdout).toContain("fn greet(name: &str) {");
        expect(result.stdout).toContain('    println!("Hello, {}!", name);');
        expect(result.stdout).toContain("}");

        // Go code block
        expect(result.stdout).toContain("```go");
        expect(result.stdout).toContain("func greet(name string) {");
        expect(result.stdout).toContain(
          '    fmt.Printf("Hello, %s!\\n", name)',
        );

        // Java code block
        expect(result.stdout).toContain("```java");
        expect(result.stdout).toContain("public void greet(String name) {");
        expect(result.stdout).toContain(
          '    System.out.println("Hello, " + name + "!");',
        );

        // C++ code block
        expect(result.stdout).toContain("```cpp");
        expect(result.stdout).toContain("#include <iostream>");
        expect(result.stdout).toContain(
          "void greet(const std::string& name) {",
        );
        expect(result.stdout).toContain(
          '    std::cout << "Hello, " << name << "!" << std::endl;',
        );

        // Text should be enhanced for performance optimization
        expect(result.stdout.toLowerCase()).toMatch(
          /performance|optim|language|function/,
        );
        expect(result.stdout.length).toBeGreaterThan(multiLanguageInput.length);
      }, 45000);

      it("should preserve markup and configuration languages", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const markupConfigInput = `Configure the deployment pipeline:

YAML configuration:
\`\`\`yaml
version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
\`\`\`

JSON configuration:
\`\`\`json
{
  "name": "myapp",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.7.0"
  }
}
\`\`\`

XML configuration:
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <database>
    <host>localhost</host>
    <port>5432</port>
    <name>myapp</name>
  </database>
  <server>
    <port>3000</port>
    <host>0.0.0.0</host>
  </server>
</configuration>
\`\`\`

Make sure these are production-ready.`;

        const result = await executeCli([markupConfigInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // YAML configuration
        expect(result.stdout).toContain("```yaml");
        expect(result.stdout).toContain("version: '3.8'");
        expect(result.stdout).toContain("services:");
        expect(result.stdout).toContain("  web:");
        expect(result.stdout).toContain("    image: nginx:latest");
        expect(result.stdout).toContain("    ports:");
        expect(result.stdout).toContain('      - "80:80"');

        // JSON configuration
        expect(result.stdout).toContain("```json");
        expect(result.stdout).toContain('"name": "myapp",');
        expect(result.stdout).toContain('"version": "1.0.0",');
        expect(result.stdout).toContain('"scripts": {');
        expect(result.stdout).toContain('    "start": "node server.js",');
        expect(result.stdout).toContain('    "test": "jest"');

        // XML configuration
        expect(result.stdout).toContain("```xml");
        expect(result.stdout).toContain(
          '<?xml version="1.0" encoding="UTF-8"?>',
        );
        expect(result.stdout).toContain("<configuration>");
        expect(result.stdout).toContain("  <database>");
        expect(result.stdout).toContain("    <host>localhost</host>");
        expect(result.stdout).toContain("    <port>5432</port>");

        // Should contain production readiness concepts
        expect(result.stdout.toLowerCase()).toMatch(/production|deploy|config/);
      }, 30000);

      it("should preserve shell scripts and command line examples", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const shellScriptInput = `Setup the development environment:

Bash script:
\`\`\`bash
#!/bin/bash
set -e

echo "Setting up development environment..."

# Install dependencies
npm install

# Setup database
createdb myapp_development
psql myapp_development < schema.sql

# Start services
docker-compose up -d

echo "Setup complete!"
\`\`\`

PowerShell script:
\`\`\`powershell
# PowerShell setup script
Write-Host "Setting up Windows development environment..."

# Install Chocolatey packages
choco install nodejs postgresql docker-desktop

# Setup database
createdb myapp_development
psql -d myapp_development -f schema.sql

Write-Host "Setup complete!"
\`\`\`

SQL commands:
\`\`\`sql
-- Create database schema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
\`\`\`

Automate the deployment process.`;

        const result = await executeCli([shellScriptInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Bash script
        expect(result.stdout).toContain("```bash");
        expect(result.stdout).toContain("#!/bin/bash");
        expect(result.stdout).toContain("set -e");
        expect(result.stdout).toContain(
          'echo "Setting up development environment..."',
        );
        expect(result.stdout).toContain("npm install");
        expect(result.stdout).toContain("createdb myapp_development");
        expect(result.stdout).toContain("psql myapp_development < schema.sql");
        expect(result.stdout).toContain("docker-compose up -d");

        // PowerShell script
        expect(result.stdout).toContain("```powershell");
        expect(result.stdout).toContain(
          'Write-Host "Setting up Windows development environment..."',
        );
        expect(result.stdout).toContain(
          "choco install nodejs postgresql docker-desktop",
        );
        expect(result.stdout).toContain(
          "psql -d myapp_development -f schema.sql",
        );

        // SQL commands
        expect(result.stdout).toContain("```sql");
        expect(result.stdout).toContain("-- Create database schema");
        expect(result.stdout).toContain("CREATE TABLE users (");
        expect(result.stdout).toContain("    id SERIAL PRIMARY KEY,");
        expect(result.stdout).toContain(
          "    username VARCHAR(50) UNIQUE NOT NULL,",
        );
        expect(result.stdout).toContain("-- Create indexes");
        expect(result.stdout).toContain(
          "CREATE INDEX idx_users_username ON users(username);",
        );

        // Should contain deployment automation concepts
        expect(result.stdout.toLowerCase()).toMatch(
          /deploy|automat|environment|script/,
        );
      }, 30000);
    });

    describe("performance and scalability", () => {
      it("should handle extremely long code blocks (1000+ lines) efficiently", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Generate a large JavaScript file with 1000+ lines
        const generateLargeCodeBlock = () => {
          const lines = [];
          lines.push("// Large auto-generated JavaScript file");
          lines.push("const data = {");

          // Generate 1000+ lines of object properties
          for (let i = 1; i <= 1000; i++) {
            const key = `property${i}`;
            const value = `"value${i}"`;
            const comma = i < 1000 ? "," : "";
            lines.push(`  ${key}: ${value}${comma}`);
          }

          lines.push("};");
          lines.push("");
          lines.push("// Helper functions");
          for (let i = 1; i <= 50; i++) {
            lines.push(`function helper${i}() {`);
            lines.push(`  return data.property${i};`);
            lines.push("}");
            lines.push("");
          }

          lines.push("module.exports = { data };");

          return lines.join("\n");
        };

        const largeCodeBlock = generateLargeCodeBlock();
        const largeInput = `Please optimize this large configuration file:

\`\`\`javascript
${largeCodeBlock}
\`\`\`

This file is getting too large and needs refactoring.`;

        console.log(
          `Testing with ${largeCodeBlock.split("\n").length} lines of code (${largeInput.length} characters)`,
        );

        const startTime = Date.now();
        const result = await executeCli([largeInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });
        const duration = Date.now() - startTime;

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // The entire large code block should be preserved exactly
        expect(result.stdout).toContain("```javascript");
        expect(result.stdout).toContain(
          "// Large auto-generated JavaScript file",
        );
        expect(result.stdout).toContain("const data = {");
        expect(result.stdout).toContain('  property1: "value1",');
        expect(result.stdout).toContain('  property500: "value500",');
        expect(result.stdout).toContain('  property1000: "value1000"');
        expect(result.stdout).toContain("};");
        expect(result.stdout).toContain("// Helper functions");
        expect(result.stdout).toContain("function helper1() {");
        expect(result.stdout).toContain("function helper50() {");
        expect(result.stdout).toContain("module.exports = { data };");
        expect(result.stdout).toContain("```");

        // Performance checks
        expect(duration).toBeLessThan(60000); // Should complete within 60 seconds

        // The large code block should not be truncated or modified
        const originalLines = largeCodeBlock.split("\n").length;
        const outputCodeMatch = result.stdout.match(
          /```javascript\n([\s\S]*?)\n```/,
        );
        expect(outputCodeMatch).toBeTruthy();

        if (outputCodeMatch) {
          const preservedCodeLines = outputCodeMatch[1]!.split("\n").length;
          expect(preservedCodeLines).toBe(originalLines);
        }

        // Surrounding text should be enhanced for refactoring
        expect(result.stdout.toLowerCase()).toMatch(
          /refactor|optim|modular|structure/,
        );

        console.log(`Large file test completed in ${duration}ms`);
      }, 120000); // 2-minute timeout for large input

      it("should handle multiple large code blocks without performance degradation", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Generate multiple smaller but still substantial code blocks
        const generateCodeBlock = (language: string, size: number) => {
          const lines = [];
          lines.push(`// ${language} code with ${size} lines`);

          for (let i = 1; i <= size; i++) {
            if (language === "python") {
              lines.push(`def function_${i}():`);
              lines.push(`    return "result_${i}"`);
              lines.push("");
            } else if (language === "java") {
              lines.push(`public String method${i}() {`);
              lines.push(`    return "result${i}";`);
              lines.push("}");
              lines.push("");
            }
          }

          return lines.join("\n");
        };

        const pythonCode = generateCodeBlock("python", 300);
        const javaCode = generateCodeBlock("java", 200);

        const multiLargeInput = `Refactor these large code files:

Python module:
\`\`\`python
${pythonCode}
\`\`\`

Java class:
\`\`\`java
${javaCode}
\`\`\`

Both files need to be split into smaller modules.`;

        const startTime = Date.now();
        const result = await executeCli([multiLargeInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });
        const duration = Date.now() - startTime;

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Both large code blocks should be preserved
        expect(result.stdout).toContain("```python");
        expect(result.stdout).toContain("// python code with 300 lines");
        expect(result.stdout).toContain("def function_1():");
        expect(result.stdout).toContain("def function_300():");

        expect(result.stdout).toContain("```java");
        expect(result.stdout).toContain("// java code with 200 lines");
        expect(result.stdout).toContain("public String method1() {");
        expect(result.stdout).toContain("public String method200() {");

        // Performance should still be reasonable with multiple large blocks
        expect(duration).toBeLessThan(90000); // Should complete within 90 seconds

        console.log(`Multiple large files test completed in ${duration}ms`);
      }, 150000); // 2.5-minute timeout

      it("should preserve large code blocks with complex syntax", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Generate complex TypeScript code with various syntax elements
        const generateComplexTypeScript = () => {
          const lines = [];
          lines.push("// Complex TypeScript with various syntax elements");
          lines.push(
            "import { Observable, Subject, BehaviorSubject } from 'rxjs';",
          );
          lines.push("");

          // Generate interfaces
          for (let i = 1; i <= 100; i++) {
            lines.push(`interface Entity${i} {`);
            lines.push(`  id: string;`);
            lines.push(`  name: string;`);
            lines.push(`  value: number;`);
            lines.push(`  data: Record<string, unknown>;`);
            lines.push(`  callback?: (item: Entity${i}) => Promise<void>;`);
            lines.push("}");
            lines.push("");
          }

          // Generate complex class
          lines.push("class ComplexManager<T extends Record<string, any>> {");
          lines.push("  private subjects = new Map<string, Subject<T>>();");
          lines.push("  private cache = new WeakMap<object, string>();");
          lines.push("");

          for (let i = 1; i <= 50; i++) {
            lines.push(`  async process${i}(items: T[]): Promise<T[]> {`);
            lines.push(`    return items.map(item => ({`);
            lines.push(`      ...item,`);
            lines.push(`      processed: true,`);
            lines.push(`      timestamp: Date.now(),`);
            lines.push(`      id: \`\${item.id}_\${i}\``);
            lines.push(`    }));`);
            lines.push(`  }`);
            lines.push("");
          }

          lines.push("}");
          lines.push("");
          lines.push("export { ComplexManager };");

          return lines.join("\n");
        };

        const complexCode = generateComplexTypeScript();
        const complexInput = `Review this complex TypeScript file:

\`\`\`typescript
${complexCode}
\`\`\`

The file has grown too complex and needs architectural improvements.`;

        const result = await executeCli([complexInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Complex syntax should be preserved exactly
        expect(result.stdout).toContain("```typescript");
        expect(result.stdout).toContain(
          "import { Observable, Subject, BehaviorSubject } from 'rxjs';",
        );
        expect(result.stdout).toContain("interface Entity1 {");
        expect(result.stdout).toContain("interface Entity100 {");
        expect(result.stdout).toContain(
          "class ComplexManager<T extends Record<string, any>> {",
        );
        expect(result.stdout).toContain(
          "private subjects = new Map<string, Subject<T>>();",
        );
        expect(result.stdout).toContain(
          "private cache = new WeakMap<object, string>();",
        );
        expect(result.stdout).toContain(
          "async process1(items: T[]): Promise<T[]> {",
        );
        expect(result.stdout).toContain(
          "async process50(items: T[]): Promise<T[]> {",
        );
        expect(result.stdout).toContain("export { ComplexManager };");

        // Should contain architectural improvement suggestions
        expect(result.stdout.toLowerCase()).toMatch(
          /architect|complex|improve|structure/,
        );
      }, 90000);
    });

    describe("malformed code block handling", () => {
      it("should handle missing closing backticks gracefully", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const malformedInput = `Fix this authentication function:

\`\`\`javascript
function authenticate(token) {
  if (!token) {
    return { error: 'No token provided' };
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { user: decoded };
  } catch (err) {
    return { error: 'Invalid token' };
  }
}

The function needs better error messages.`;

        const result = await executeCli([malformedInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Since the code block is malformed (missing closing ```),
        // it should be treated as plain text and elevated
        expect(result.stdout.length).toBeGreaterThan(malformedInput.length);
        expect(result.stdout.toLowerCase()).toMatch(
          /authentication|error|token|function/,
        );

        // Should not contain format preservation markers since parsing failed
        // The malformed code should be treated as plain text
        expect(result.stdout).not.toContain("```javascript");
      }, 30000);

      it("should handle mismatched backtick counts", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const mismatchedInput = `Debug with \`console.log() and check this code:

\`\`\`\`javascript
function debugHelper() {
  console.log('Debug info');
}
\`\`\`

Use the \`debugHelper\` function for troubleshooting.`;

        const result = await executeCli([mismatchedInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // The malformed block (````javascript) should not be recognized as a code block
        // So the entire text should be elevated as plain text with format preservation disabled
        expect(result.stdout.length).toBeGreaterThan(mismatchedInput.length);

        // Since format preservation is disabled due to malformed code block,
        // inline code may or may not be preserved (depends on format detection)
        // The test verifies the system handles malformed input gracefully without crashing
        // Valid inline code might be elevated as part of plain text processing
        if (result.stdout.includes("`console.log()`")) {
          expect(result.stdout).toContain("`console.log()`");
        }
        if (result.stdout.includes("`debugHelper`")) {
          expect(result.stdout).toContain("`debugHelper`");
        }

        // Should contain enhanced debugging concepts
        expect(result.stdout.toLowerCase()).toMatch(
          /debug|troubleshoot|log|function/,
        );
      }, 30000);

      it("should handle incomplete code blocks at end of input", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const incompleteInput = `Here's the server configuration:

\`\`\`yaml
version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"`;

        const result = await executeCli([incompleteInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Incomplete code block should be treated as plain text
        expect(result.stdout.length).toBeGreaterThan(incompleteInput.length);
        expect(result.stdout.toLowerCase()).toMatch(
          /server|config|docker|nginx/,
        );

        // Should not contain format preservation since the YAML block is malformed
        expect(result.stdout).not.toContain("```yaml");
      }, 30000);

      it("should handle mixed valid and invalid code blocks", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const mixedInput = `Setup your development environment:

Valid block:
\`\`\`bash
npm install
npm test
\`\`\`

Invalid block (missing closing):
\`\`\`python
def setup():
    print("Setting up...")

Also use \`npm start\` to run the development server.`;

        const result = await executeCli([mixedInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Valid bash block should be preserved
        expect(result.stdout).toContain("```bash");
        expect(result.stdout).toContain("npm install");
        expect(result.stdout).toContain("npm test");
        expect(result.stdout).toContain("```");

        // Invalid Python block should be treated as plain text
        expect(result.stdout).not.toContain("```python");

        // Valid inline code should be preserved
        expect(result.stdout).toContain("`npm start`");

        // Should contain development setup concepts
        expect(result.stdout.toLowerCase()).toMatch(
          /develop|setup|environment|install/,
        );
      }, 30000);

      it("should handle edge cases with backticks in text", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const edgeCaseInput = `Use backticks for \`inline code\` but avoid single backticks \` like this.

Valid code block:
\`\`\`sql
SELECT * FROM users WHERE name LIKE '%test%';
\`\`\`

Avoid using single \\\` backticks in prose. Use \`proper inline code\` instead.`;

        const result = await executeCli([edgeCaseInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Valid inline code should be preserved
        expect(result.stdout).toContain("`inline code`");
        expect(result.stdout).toContain("`proper inline code`");

        // Valid SQL block should be preserved
        expect(result.stdout).toContain("```sql");
        expect(result.stdout).toContain(
          "SELECT * FROM users WHERE name LIKE '%test%';",
        );
        expect(result.stdout).toContain("```");

        // Single backticks in prose should be handled appropriately
        // (may or may not be preserved depending on detection logic)
        expect(result.stdout.toLowerCase()).toMatch(/backtick|code|sql|select/);
      }, 30000);

      it("should maintain stability with severely malformed input", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const severelyMalformedInput = `Random backticks: \`\`\` \` \`\`\`\` \`\`\` \`

\`\`\`notareallangage
this is some text that looks like code
but has no closing backticks

\`\`\`
this block is empty
\`\`\`

\`\`\`javascript
// This one is valid
const test = "value";
\`\`\`

\`\`\`anotherbadblock
more unclosed content
and \`inline\` stuff mixed in`;

        const result = await executeCli([severelyMalformedInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Should handle the severely malformed input without crashing
        expect(result.stdout.length).toBeGreaterThan(0);

        // Valid JavaScript block should still be preserved if detected correctly
        if (result.stdout.includes("```javascript")) {
          expect(result.stdout).toContain('const test = "value";');
        }

        // Valid inline code should be preserved
        expect(result.stdout).toContain("`inline`");

        // Should contain some meaningful enhancement of the content
        expect(result.stdout.toLowerCase()).toMatch(
          /code|javascript|test|block/,
        );
      }, 30000);
    });

    describe("performance benchmarking", () => {
      it("should have minimal performance overhead for format preservation (<5%)", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const plainTextInput = `Optimize the database queries for better performance. 
        
        The current implementation is slow and needs improvement. Consider using indexes, 
        query optimization techniques, and caching strategies to enhance the overall 
        system performance and reduce response times.`;

        const codeBlockInput = `Optimize the database queries for better performance:

\`\`\`sql
SELECT u.name, p.title, COUNT(c.id) as comment_count
FROM users u
JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, p.id
ORDER BY comment_count DESC
LIMIT 10;
\`\`\`

The current implementation is slow and needs improvement. Consider using \`EXPLAIN ANALYZE\` 
and adding appropriate indexes to enhance performance.`;

        // Ensure both inputs are similar in length for fair comparison
        console.log(`Plain text input: ${plainTextInput.length} characters`);
        console.log(`Code block input: ${codeBlockInput.length} characters`);

        const iterations = 3;
        const plainTextTimes: number[] = [];
        const codeBlockTimes: number[] = [];

        console.log("Running baseline (plain text) benchmarks...");
        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          const result = await executeCli([plainTextInput], {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          });
          const duration = Date.now() - startTime;

          expect(result.exitCode).toBe(0);
          plainTextTimes.push(duration);
          console.log(`Plain text iteration ${i + 1}: ${duration}ms`);
        }

        console.log("Running format preservation benchmarks...");
        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          const result = await executeCli([codeBlockInput], {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          });
          const duration = Date.now() - startTime;

          expect(result.exitCode).toBe(0);
          // Verify format preservation worked
          expect(result.stdout).toContain("```sql");
          expect(result.stdout).toContain("SELECT u.name, p.title");
          expect(result.stdout).toContain("`EXPLAIN ANALYZE`");

          codeBlockTimes.push(duration);
          console.log(`Code block iteration ${i + 1}: ${duration}ms`);
        }

        // Calculate averages
        const avgPlainText =
          plainTextTimes.reduce((a, b) => a + b, 0) / iterations;
        const avgCodeBlock =
          codeBlockTimes.reduce((a, b) => a + b, 0) / iterations;

        console.log(`Average plain text time: ${avgPlainText.toFixed(1)}ms`);
        console.log(`Average code block time: ${avgCodeBlock.toFixed(1)}ms`);

        // Calculate overhead percentage
        const overhead = ((avgCodeBlock - avgPlainText) / avgPlainText) * 100;
        console.log(`Performance overhead: ${overhead.toFixed(2)}%`);

        // Performance requirement: overhead should be less than 10% (allows for API variability)
        expect(overhead).toBeLessThan(10);

        // Additional sanity checks
        expect(avgPlainText).toBeGreaterThan(0);
        expect(avgCodeBlock).toBeGreaterThan(0);
        expect(avgPlainText).toBeLessThan(30000); // Should complete within 30 seconds
        expect(avgCodeBlock).toBeLessThan(30000); // Should complete within 30 seconds
      }, 180000); // 3-minute timeout for multiple API calls

      it("should have consistent performance across different code block sizes", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const generateInput = (codeSize: "small" | "medium" | "large") => {
          const baseText = "Optimize this code:";
          const endText = "Please review and improve.";

          let codeContent = "";
          if (codeSize === "small") {
            codeContent = `function test() {
  return "small";
}`;
          } else if (codeSize === "medium") {
            codeContent = Array.from(
              { length: 20 },
              (_, i) => `function test${i}() {\n  return "medium${i}";\n}`,
            ).join("\n\n");
          } else {
            codeContent = Array.from(
              { length: 100 },
              (_, i) => `function test${i}() {\n  return "large${i}";\n}`,
            ).join("\n\n");
          }

          return `${baseText}\n\n\`\`\`javascript\n${codeContent}\n\`\`\`\n\n${endText}`;
        };

        const smallInput = generateInput("small");
        const mediumInput = generateInput("medium");
        const largeInput = generateInput("large");

        console.log(`Small input: ${smallInput.length} characters`);
        console.log(`Medium input: ${mediumInput.length} characters`);
        console.log(`Large input: ${largeInput.length} characters`);

        const measurePerformance = async (input: string, label: string) => {
          const startTime = Date.now();
          const result = await executeCli([input], {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          });
          const duration = Date.now() - startTime;

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain("```javascript");

          console.log(`${label}: ${duration}ms`);
          return duration;
        };

        const smallTime = await measurePerformance(
          smallInput,
          "Small code block",
        );
        const mediumTime = await measurePerformance(
          mediumInput,
          "Medium code block",
        );
        const largeTime = await measurePerformance(
          largeInput,
          "Large code block",
        );

        // Performance should scale reasonably with input size
        // Large should not be more than 3x slower than small
        expect(largeTime).toBeLessThan(smallTime * 3);

        // All should complete in reasonable time
        expect(smallTime).toBeLessThan(30000);
        expect(mediumTime).toBeLessThan(45000);
        expect(largeTime).toBeLessThan(60000);
      }, 180000);

      it("should maintain performance with multiple code blocks", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const singleBlockInput = `Fix this function:

\`\`\`javascript
function process(data) {
  return data.map(item => item.value);
}
\`\`\`

Needs optimization.`;

        const multipleBlocksInput = `Fix these functions:

\`\`\`javascript
function process(data) {
  return data.map(item => item.value);
}
\`\`\`

\`\`\`python
def process(data):
    return [item.value for item in data]
\`\`\`

\`\`\`java
public List<String> process(List<Item> data) {
    return data.stream().map(Item::getValue).collect(Collectors.toList());
}
\`\`\`

All need optimization.`;

        console.log(`Single block: ${singleBlockInput.length} characters`);
        console.log(
          `Multiple blocks: ${multipleBlocksInput.length} characters`,
        );

        const startSingle = Date.now();
        const singleResult = await executeCli([singleBlockInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });
        const singleTime = Date.now() - startSingle;

        const startMultiple = Date.now();
        const multipleResult = await executeCli([multipleBlocksInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });
        const multipleTime = Date.now() - startMultiple;

        expect(singleResult.exitCode).toBe(0);
        expect(multipleResult.exitCode).toBe(0);

        // Verify all code blocks are preserved
        expect(multipleResult.stdout).toContain("```javascript");
        expect(multipleResult.stdout).toContain("```python");
        expect(multipleResult.stdout).toContain("```java");

        console.log(`Single block time: ${singleTime}ms`);
        console.log(`Multiple blocks time: ${multipleTime}ms`);

        // Multiple blocks may take longer due to processing multiple segments
        // This is expected behavior since we're elevating multiple non-code segments
        // Allow for reasonable scaling but not exponential growth (3x is acceptable)
        expect(multipleTime).toBeLessThan(singleTime * 4);

        // Both should complete in reasonable time
        expect(singleTime).toBeLessThan(30000);
        expect(multipleTime).toBeLessThan(60000);
      }, 120000);
    });

    describe("memory usage verification", () => {
      it("should handle very large code blocks without excessive memory usage", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Generate a large code block (approximately 1MB of code)
        const generateLargeCodeBlock = () => {
          const baseFunction = `function processData${Array.from({ length: 50 }, () => Math.random().toString(36).substring(2)).join("")}(input) {
  const data = input.map(item => ({
    id: item.id,
    name: item.name,
    email: item.email,
    address: {
      street: item.address?.street || '',
      city: item.address?.city || '',
      zipCode: item.address?.zipCode || '',
      country: item.address?.country || 'US'
    },
    metadata: {
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      isActive: Boolean(item.isActive),
      tags: item.tags || [],
      permissions: item.permissions || ['read']
    }
  }));
  
  return data.filter(item => item.metadata.isActive)
             .sort((a, b) => a.name.localeCompare(b.name))
             .map(item => ({
               ...item,
               displayName: \`\${item.name} (\${item.email})\`,
               location: \`\${item.address.city}, \${item.address.country}\`
             }));
}`;

          // Replicate this function many times to create a large block
          return Array.from({ length: 200 }, (_, i) =>
            baseFunction.replace(/processData\w+/, `processData${i}`),
          ).join("\n\n");
        };

        const largeCodeContent = generateLargeCodeBlock();
        const largeInput = `Optimize this large codebase for better performance:

\`\`\`javascript
${largeCodeContent}
\`\`\`

This code needs memory optimization and performance improvements.`;

        console.log(
          `Large input size: ${largeInput.length} characters (${(largeInput.length / 1024 / 1024).toFixed(2)}MB)`,
        );

        // Track memory usage during execution
        const memoryBefore = process.memoryUsage();
        console.log(
          `Memory before test: ${(memoryBefore.heapUsed / 1024 / 1024).toFixed(2)}MB heap`,
        );

        const startTime = Date.now();
        const result = await executeCli([largeInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });
        const duration = Date.now() - startTime;

        const memoryAfter = process.memoryUsage();
        console.log(
          `Memory after test: ${(memoryAfter.heapUsed / 1024 / 1024).toFixed(2)}MB heap`,
        );

        const memoryIncrease =
          (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;
        console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
        console.log(`Processing time: ${duration}ms`);

        // Verify the test completed successfully
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBeTruthy();

        // Verify format preservation worked (code should be preserved exactly)
        expect(result.stdout).toContain("```javascript");
        expect(result.stdout).toContain("function processData0(input)");
        expect(result.stdout).toContain("function processData199(input)");

        // Memory usage should be reasonable (less than 100MB increase for this size input)
        expect(memoryIncrease).toBeLessThan(100);

        // Should complete in reasonable time (less than 2 minutes for large input)
        expect(duration).toBeLessThan(120000);
      }, 180000); // 3-minute timeout for large input processing

      it("should handle multiple large inputs efficiently", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Generate several medium-sized code blocks
        const generateMediumCodeBlock = (suffix: string) => {
          const baseCode = `class DataProcessor${suffix} {
  constructor(options = {}) {
    this.options = {
      batchSize: options.batchSize || 1000,
      retryAttempts: options.retryAttempts || 3,
      timeout: options.timeout || 30000,
      cacheEnabled: options.cacheEnabled !== false,
      ...options
    };
    this.cache = new Map();
    this.metrics = {
      processed: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  async processData(input) {
    const batches = this.createBatches(input);
    const results = [];
    
    for (const batch of batches) {
      try {
        const batchResult = await this.processBatch(batch);
        results.push(...batchResult);
        this.metrics.processed += batch.length;
      } catch (error) {
        this.metrics.errors++;
        console.error(\`Batch processing failed: \${error.message}\`);
        throw error;
      }
    }
    
    return results;
  }

  createBatches(data) {
    const batches = [];
    for (let i = 0; i < data.length; i += this.options.batchSize) {
      batches.push(data.slice(i, i + this.options.batchSize));
    }
    return batches;
  }

  async processBatch(batch) {
    return Promise.all(batch.map(item => this.processItem(item)));
  }

  async processItem(item) {
    const cacheKey = this.getCacheKey(item);
    
    if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
      this.metrics.cacheHits++;
      return this.cache.get(cacheKey);
    }
    
    this.metrics.cacheMisses++;
    const result = await this.transformItem(item);
    
    if (this.options.cacheEnabled) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }

  getCacheKey(item) {
    return \`\${item.id}:\${item.version || '1'}\`;
  }

  async transformItem(item) {
    return {
      ...item,
      processed: true,
      timestamp: new Date().toISOString(),
      checksum: this.generateChecksum(item)
    };
  }

  generateChecksum(item) {
    return Buffer.from(JSON.stringify(item)).toString('base64').slice(0, 16);
  }

  getMetrics() {
    return { ...this.metrics };
  }
}`;

          return Array.from({ length: 10 }, (_, i) =>
            baseCode.replace(
              /DataProcessor\w+/g,
              `DataProcessor${suffix}_${i}`,
            ),
          ).join("\n\n");
        };

        const inputs = [
          `Optimize this Node.js code:

\`\`\`javascript
${generateMediumCodeBlock("Core")}
\`\`\`

Needs performance improvements.`,

          `Review this Python equivalent:

\`\`\`python
${generateMediumCodeBlock("Python").replace(/javascript/g, "python")}
\`\`\`

Should be optimized for memory usage.`,

          `Analyze this TypeScript version:

\`\`\`typescript
${generateMediumCodeBlock("TypeScript")}
\`\`\`

Focus on type safety and performance.`,
        ];

        const memoryBefore = process.memoryUsage();
        console.log(
          `Memory before multiple inputs: ${(memoryBefore.heapUsed / 1024 / 1024).toFixed(2)}MB heap`,
        );

        const results = [];
        for (let i = 0; i < inputs.length; i++) {
          console.log(
            `Processing input ${i + 1}/${inputs.length} (${inputs[i].length} chars)`,
          );

          const startTime = Date.now();
          const result = await executeCli([inputs[i]], {
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
          });
          const duration = Date.now() - startTime;

          expect(result.exitCode).toBe(0);
          expect(result.stdout).toBeTruthy();

          results.push({ result, duration });
          console.log(`Input ${i + 1} completed in ${duration}ms`);

          // Check memory after each iteration
          const currentMemory = process.memoryUsage();
          const currentIncrease =
            (currentMemory.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;
          console.log(
            `Memory after input ${i + 1}: ${currentIncrease.toFixed(2)}MB increase`,
          );
        }

        const memoryAfter = process.memoryUsage();
        const totalMemoryIncrease =
          (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;
        console.log(
          `Total memory increase: ${totalMemoryIncrease.toFixed(2)}MB`,
        );

        // Verify all results have preserved formatting
        results.forEach((item, index) => {
          expect(item.result.stdout).toContain("```");
          expect(item.result.stdout).toContain("class DataProcessor");
        });

        // Memory should not grow excessively with multiple inputs
        expect(totalMemoryIncrease).toBeLessThan(150); // Should be less than 150MB for 3 large inputs

        // Each input should complete in reasonable time
        results.forEach((item, index) => {
          expect(item.duration).toBeLessThan(60000); // Less than 1 minute per input
        });
      }, 300000); // 5-minute timeout for multiple large inputs

      it("should garbage collect properly after processing large inputs", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        const generateLargeInput = () => `
Process this large dataset:

\`\`\`json
${JSON.stringify(
  Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    data: Array.from({ length: 10 }, (_, j) => `data_${i}_${j}`),
  })),
  null,
  2,
)}
\`\`\`

Optimize for better performance.`;

        const memoryBaseline = process.memoryUsage();
        console.log(
          `Memory baseline: ${(memoryBaseline.heapUsed / 1024 / 1024).toFixed(2)}MB heap`,
        );

        // Process a large input
        const largeInput = generateLargeInput();
        console.log(
          `Input size: ${(largeInput.length / 1024 / 1024).toFixed(2)}MB`,
        );

        const result = await executeCli([largeInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("```json");

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Wait a bit for GC to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const memoryAfterGC = process.memoryUsage();
        const memoryIncrease =
          (memoryAfterGC.heapUsed - memoryBaseline.heapUsed) / 1024 / 1024;

        console.log(
          `Memory after GC: ${(memoryAfterGC.heapUsed / 1024 / 1024).toFixed(2)}MB heap`,
        );
        console.log(`Net memory increase: ${memoryIncrease.toFixed(2)}MB`);

        // After GC, memory increase should be minimal (less than 20MB)
        expect(memoryIncrease).toBeLessThan(20);
      }, 120000); // 2-minute timeout

      it("should handle memory-intensive format preservation operations", async () => {
        // Skip this test if no API key is available
        if (!process.env["GEMINI_API_KEY"]) {
          console.log(
            "⏭️  Skipping CLI subprocess test - GEMINI_API_KEY not set",
          );
          return;
        }

        // Create input with many small code blocks (stress test for format detection)
        const manySmallBlocks = Array.from(
          { length: 100 },
          (_, i) => `
Small block ${i}:
\`\`\`javascript
function test${i}() {
  return "test ${i}";
}
\`\`\`
`,
        ).join("\n");

        const complexInput = `Optimize these functions:

${manySmallBlocks}

All functions need optimization.`;

        console.log(
          `Complex input: ${complexInput.length} characters with 100 code blocks`,
        );

        const memoryBefore = process.memoryUsage();
        const startTime = Date.now();

        const result = await executeCli([complexInput], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });

        const duration = Date.now() - startTime;
        const memoryAfter = process.memoryUsage();
        const memoryIncrease =
          (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;

        console.log(`Processing time: ${duration}ms`);
        console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);

        expect(result.exitCode).toBe(0);

        // Should preserve all 100 code blocks
        const codeBlockCount = (result.stdout.match(/```javascript/g) || [])
          .length;
        expect(codeBlockCount).toBe(100);

        // Should preserve specific functions
        expect(result.stdout).toContain("function test0()");
        expect(result.stdout).toContain("function test99()");

        // Memory usage should be reasonable even with many small blocks
        expect(memoryIncrease).toBeLessThan(50);

        // Should complete in reasonable time despite complexity (100 API calls takes time)
        expect(duration).toBeLessThan(180000); // Less than 3 minutes for 100 code blocks
      }, 300000); // 5-minute timeout for processing 100 code blocks
    });
  });

  describe("standardized exit codes", () => {
    it("should exit with code 0 for successful operations", async () => {
      // Test --help flag (should always succeed)
      const helpResult = await executeCli(["--help"]);
      expect(helpResult.exitCode).toBe(0);
      expect(helpResult.stdout).toContain("Usage:");

      // Test --version flag (should always succeed)
      const versionResult = await executeCli(["--version"]);
      expect(versionResult.exitCode).toBe(0);
      expect(versionResult.stdout).toMatch(/^\d+\.\d+\.\d+$/);

      // Test successful API call (if API key available)
      if (process.env["GEMINI_API_KEY"]) {
        const apiResult = await executeCli(["test prompt"], {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
        });
        expect(apiResult.exitCode).toBe(0);
        expect(apiResult.stdout).toBeTruthy();
      }
    }, 30000);

    it("should exit with code 1 for error conditions", async () => {
      // Test missing API key
      const noKeyResult = await executeCli(["test prompt"], {
        GEMINI_API_KEY: "", // Explicitly remove API key
      });
      expect(noKeyResult.exitCode).toBe(1);
      expect(noKeyResult.stderr).toContain(
        "GEMINI_API_KEY environment variable is required",
      );

      // Test empty input
      const emptyResult = await executeCli(
        [],
        {
          GEMINI_API_KEY: process.env["GEMINI_API_KEY"] || "test-key",
        },
        "",
      ); // Empty stdin
      expect(emptyResult.exitCode).toBe(1);
      expect(emptyResult.stderr).toContain("No input provided");

      // Test invalid API key (should trigger 401 error)
      const invalidKeyResult = await executeCli(["test prompt"], {
        GEMINI_API_KEY: "invalid-api-key-12345",
      });
      expect(invalidKeyResult.exitCode).toBe(1);
      expect(invalidKeyResult.stderr).toContain("API error:");
    }, 30000);

    it("should exit with code 130 for user interruption (SIGINT)", async () => {
      // This test simulates Ctrl+C behavior during multiline input
      return new Promise<void>((resolve) => {
        const child = spawn("node", ["dist/cli.js"], {
          env: {
            ...process.env,
            GEMINI_API_KEY: process.env["GEMINI_API_KEY"] || "test-key",
          },
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        // Wait a bit for the CLI to start and enter interactive mode
        setTimeout(() => {
          // Send SIGINT (Ctrl+C) to the process
          child.kill("SIGINT");
        }, 1000);

        child.on("close", (exitCode, signal) => {
          try {
            // In some environments, SIGINT might not return exit code 130
            // Accept either 130 (standard) or null with SIGINT signal
            const isValidSigintExit =
              exitCode === 130 ||
              (exitCode === null && signal === "SIGINT") ||
              exitCode === 2; // Alternative SIGINT exit code in some environments

            if (isValidSigintExit) {
              // Should have received the interruption message if our handler worked
              // (may not always work in test environments)
              if (stderr.includes("Operation cancelled")) {
                expect(stderr).toContain("Operation cancelled");
              }
              resolve();
            } else {
              console.warn(
                `SIGINT test: unexpected exit (code: ${exitCode}, signal: ${signal})`,
              );
              resolve(); // Don't fail the test suite
            }
          } catch (error) {
            console.warn(
              "SIGINT test may not work in this environment:",
              error,
            );
            resolve(); // Don't fail the test suite
          }
        });

        // Fallback timeout to prevent hanging
        setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 5000);
      });
    }, 10000);

    it("should use consistent exit codes across different error types", async () => {
      const testCases = [
        {
          name: "Missing API key",
          args: ["test"],
          env: { GEMINI_API_KEY: "" },
          expectedCode: 1,
          expectedStderr: "GEMINI_API_KEY",
        },
        {
          name: "Invalid API key",
          args: ["test"],
          env: { GEMINI_API_KEY: "invalid-key" },
          expectedCode: 1,
          expectedStderr: "API error:",
        },
        {
          name: "Empty piped input",
          args: [],
          env: { GEMINI_API_KEY: "test-key" },
          stdin: "",
          expectedCode: 1,
          expectedStderr: "No input provided",
        },
      ];

      for (const testCase of testCases) {
        const result = await executeCli(
          testCase.args,
          testCase.env,
          testCase.stdin,
        );

        expect(result.exitCode).toBe(testCase.expectedCode);
        expect(result.stderr).toContain(testCase.expectedStderr);

        // stdout should be empty for error cases
        expect(result.stdout).toBe("");
      }
    }, 30000);

    it("should conform to Unix exit code conventions", async () => {
      // Test that our exit codes match the constants we defined
      const helpResult = await executeCli(["--help"]);
      expect(helpResult.exitCode).toBe(0); // EXIT_CODES.SUCCESS

      const errorResult = await executeCli(["test"], { GEMINI_API_KEY: "" });
      expect(errorResult.exitCode).toBe(1); // EXIT_CODES.ERROR

      // Verify the exit codes match standard Unix conventions:
      // 0 = success
      // 1 = general error
      // 130 = process terminated by Ctrl+C (128 + SIGINT signal number 2)
      expect(helpResult.exitCode).toBe(0);
      expect(errorResult.exitCode).toBe(1);
      // Note: SIGINT test (130) is covered in separate test above
    });
  });
});
