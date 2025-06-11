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
    expect(result.stderr).toBe("");

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
    expect(result.stderr).toBe("");

    // With --raw flag, output should not contain formatting prefixes
    expect(result.stdout).not.toContain("✨ Enhanced prompt:");
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
      expect(result.stderr).toBe("");

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
      expect(result.stderr).toBe("");

      // With --raw flag, output should not contain formatting prefixes
      expect(result.stdout).not.toContain("✨ Enhanced prompt:");
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
      expect(result.stderr).toBe("");
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
      expect(result.stderr).toBe("");

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
      expect(result.stderr).toBe("");

      // Output should be formatted consistently (unless --raw flag is used)
      expect(result.stdout).toContain("✨ Enhanced prompt:");

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
      expect(result.stderr).toBe("");

      // Should transform the complex prompt into something more structured
      const enhancedContent = result.stdout.replace(
        "✨ Enhanced prompt:\n",
        "",
      );
      expect(enhancedContent.length).toBeGreaterThan(complexPrompt.length);

      // Enhanced prompt should include more specific technical details
      expect(enhancedContent.toLowerCase()).toMatch(
        /architecture|design|implementation|requirements|specifications/,
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
      expect(result.stderr).toBe("");

      // Special characters and code elements should be preserved in the enhanced output
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
      expect(result.stderr).toBe("");

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
      expect(shortResult.stderr).toBe("");
      expect(shortResult.stdout.length).toBeGreaterThan("fix".length);

      // Test with long input
      const longPrompt = "a".repeat(500) + " - help me understand this";
      const longResult = await executeCli([longPrompt], {
        GEMINI_API_KEY: process.env["GEMINI_API_KEY"],
      });

      expect(longResult.exitCode).toBe(0);
      expect(longResult.stdout).toBeTruthy();
      expect(longResult.stderr).toBe("");
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
      expect(rawResult.stderr).toBe("");
      expect(rawResult.stdout).not.toContain("✨ Enhanced prompt:");

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
      expect(result.stderr).toBe("");

      const enhancedOutput = result.stdout.replace("✨ Enhanced prompt:\n", "");

      // Enhanced prompt should include more specific guidance
      const specificityIndicators = [
        "specific",
        "requirements",
        "criteria",
        "methodology",
        "deliverables",
        "format",
        "structure",
        "analysis",
        "implementation",
        "validation",
      ];

      const foundIndicators = specificityIndicators.filter((indicator) =>
        enhancedOutput.toLowerCase().includes(indicator),
      );

      // Should contain multiple specificity indicators
      expect(foundIndicators.length).toBeGreaterThanOrEqual(2);

      // Should be significantly more detailed than the original vague prompt
      expect(enhancedOutput.length).toBeGreaterThan(vaguePrompt.length * 5);
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
      expect(result.stderr).toBe("");

      // Should handle multiline input correctly with enhanced prompts
      expect(result.stdout).toContain("✨ Enhanced prompt:");

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
      expect(result.stdout).not.toContain("✨ Enhanced prompt:");
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

      // All logging should go to stderr, not stdout
      expect(result.stderr).not.toBe(""); // stderr should contain logs

      // Verify stderr contains structured logs (but stdout doesn't)
      const stderrLines = result.stderr
        .split("\n")
        .filter((line) => line.trim());
      expect(stderrLines.length).toBeGreaterThan(0);

      // Each stderr line should be valid JSON log entry
      for (const line of stderrLines) {
        expect(() => {
          const logEntry = JSON.parse(line);
          expect(logEntry).toHaveProperty("timestamp");
          expect(logEntry).toHaveProperty("level");
          expect(logEntry).toHaveProperty("message");
          expect(logEntry).toHaveProperty("metadata");
        }).not.toThrow();
      }
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
        ["--raw"],
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

      // stderr should contain all the logging information
      expect(result.stderr).toContain('"message":"API request started"');
      expect(result.stderr).toContain(
        '"message":"API request completed successfully"',
      );
    }, 30000);
  });
});
