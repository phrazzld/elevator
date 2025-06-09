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
 * @returns Promise resolving to execution result
 */
async function executeCli(
  args: string[],
  env: Record<string, string> = {},
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

  it("should exit with code 1 when prompt is empty", async () => {
    const result = await executeCli([""], {
      GEMINI_API_KEY: process.env["GEMINI_API_KEY"] || "test-key",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Prompt is required");
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
});
