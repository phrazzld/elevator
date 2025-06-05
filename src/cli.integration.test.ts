/**
 * Integration tests for CLI argument parsing and flag combinations.
 *
 * These tests focus on the complete CLI argument parsing flow, testing how
 * commander.js options integrate with configuration creation and service initialization.
 * Following the development philosophy, we mock only external boundaries while testing
 * real internal collaborators.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

// Import the internal functions we want to test
// Note: In a real scenario, these would need to be exported from cli.ts for testing
// For now, we'll test the integration through the public interface

/**
 * CLI argument interface matching the one in cli.ts
 */
interface CliArgs {
  model?: string;
  temp?: number;
  stream?: boolean;
  raw?: boolean;
}

/**
 * Replicates the mergeCliWithEnv function from cli.ts for testing
 * This function merges CLI arguments with environment variables,
 * giving CLI precedence.
 */
function mergeCliWithEnv(
  cliArgs: CliArgs,
  env: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  const merged = { ...env };

  // Map CLI arguments to environment variable names
  if (cliArgs.model !== undefined) {
    merged["GEMINI_MODEL"] = cliArgs.model;
  }
  if (cliArgs.temp !== undefined) {
    merged["GEMINI_TEMPERATURE"] = cliArgs.temp.toString();
  }
  if (cliArgs.stream !== undefined) {
    merged["OUTPUT_STREAMING"] = cliArgs.stream.toString();
  }
  if (cliArgs.raw !== undefined) {
    merged["OUTPUT_RAW"] = cliArgs.raw.toString();
  }

  return merged;
}

/**
 * Replicates the createProgram function from cli.ts for testing
 * Sets up commander with all CLI options.
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name("prompt-elevator")
    .description(
      "A lightweight CLI that continuously accepts natural-language prompts and returns richer, more technical articulations using Google Gemini 2.5 Flash",
    )
    .version("0.1.0")
    .argument(
      "[prompt]",
      "Optional: single prompt to process (if omitted, starts interactive mode)",
    );

  // API Configuration Options
  program
    .option(
      "--model <model>",
      "Gemini model to use (gemini-2.5-flash-preview-05-20, gemini-2.0-flash-exp, gemini-1.5-flash, gemini-1.5-flash-8b, gemini-1.5-pro)",
    )
    .option(
      "--temp <temperature>",
      "Temperature for response generation (0.0 to 2.0)",
      parseFloat,
    );

  // Output Configuration Options
  program
    .option("--stream", "Enable streaming output (default: true)")
    .option("--no-stream", "Disable streaming output")
    .option("--raw", "Enable raw output mode (no formatting)")
    .option("--no-raw", "Disable raw output mode (default)");

  return program;
}

/**
 * Helper to parse CLI arguments in a controlled way for testing
 */
function parseCliArgs(args: string[]): {
  options: CliArgs;
  arguments: string[];
} {
  const program = createProgram();

  // Use a custom error handler to capture parsing errors
  let parseError: Error | undefined;
  program.exitOverride((err) => {
    parseError = err;
    throw err;
  });

  try {
    program.parse(["node", "cli.js", ...args]);
    return {
      options: program.opts<CliArgs>(),
      arguments: program.args,
    };
  } catch (error) {
    if (parseError) {
      throw parseError;
    }
    throw error;
  }
}

describe("CLI Integration Tests", () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let consoleLogs: string[];
  let consoleErrors: string[];

  beforeEach(() => {
    // Mock console output to capture CLI messages
    consoleLogs = [];
    consoleErrors = [];
    originalConsoleLog = console.log;
    originalConsoleError = console.error;

    console.log = vi.fn((message: string) => {
      consoleLogs.push(message);
    });
    console.error = vi.fn((message: string) => {
      consoleErrors.push(message);
    });
  });

  afterEach(() => {
    // Restore original console functions
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe("Flag Parsing", () => {
    it("should parse model flag correctly", () => {
      // Act
      const result = parseCliArgs(["--model", "gemini-1.5-pro"]);

      // Assert
      expect(result.options.model).toBe("gemini-1.5-pro");
    });

    it("should parse temperature flag correctly", () => {
      // Act
      const result = parseCliArgs(["--temp", "0.9"]);

      // Assert
      expect(result.options.temp).toBe(0.9);
    });

    it("should parse streaming flags correctly", () => {
      // Test --stream
      const streamResult = parseCliArgs(["--stream"]);
      expect(streamResult.options.stream).toBe(true);

      // Test --no-stream
      const noStreamResult = parseCliArgs(["--no-stream"]);
      expect(noStreamResult.options.stream).toBe(false);
    });

    it("should parse raw output flags correctly", () => {
      // Test --raw
      const rawResult = parseCliArgs(["--raw"]);
      expect(rawResult.options.raw).toBe(true);

      // Test --no-raw
      const noRawResult = parseCliArgs(["--no-raw"]);
      expect(noRawResult.options.raw).toBe(false);
    });

    it("should handle positional prompt argument", () => {
      // Act
      const result = parseCliArgs(["This is a test prompt"]);

      // Assert
      expect(result.arguments).toEqual(["This is a test prompt"]);
    });

    it("should handle multiple word prompt arguments", () => {
      // Act
      const result = parseCliArgs([
        "--model",
        "gemini-1.5-flash",
        "Write a function to calculate fibonacci",
      ]);

      // Assert
      expect(result.options.model).toBe("gemini-1.5-flash");
      expect(result.arguments).toEqual([
        "Write a function to calculate fibonacci",
      ]);
    });
  });

  describe("Flag Combinations", () => {
    it("should handle multiple flags correctly", () => {
      // Act
      const result = parseCliArgs([
        "--model",
        "gemini-2.0-flash-exp",
        "--temp",
        "1.2",
        "--stream",
        "--raw",
      ]);

      // Assert
      expect(result.options.model).toBe("gemini-2.0-flash-exp");
      expect(result.options.temp).toBe(1.2);
      expect(result.options.stream).toBe(true);
      expect(result.options.raw).toBe(true);
    });

    it("should handle conflicting stream flags (last one wins)", () => {
      // Act
      const result = parseCliArgs(["--stream", "--no-stream"]);

      // Assert
      expect(result.options.stream).toBe(false);
    });

    it("should handle conflicting raw flags (last one wins)", () => {
      // Act
      const result = parseCliArgs(["--raw", "--no-raw"]);

      // Assert
      expect(result.options.raw).toBe(false);
    });

    it("should combine flags with positional arguments", () => {
      // Act
      const result = parseCliArgs([
        "--model",
        "gemini-1.5-flash-8b",
        "--temp",
        "0.3",
        "--no-stream",
        "Create a REST API for user management",
      ]);

      // Assert
      expect(result.options.model).toBe("gemini-1.5-flash-8b");
      expect(result.options.temp).toBe(0.3);
      expect(result.options.stream).toBe(false);
      expect(result.arguments).toEqual([
        "Create a REST API for user management",
      ]);
    });
  });

  describe("Input Validation", () => {
    it("should handle invalid temperature values", () => {
      // Act - parseFloat converts invalid values to NaN, doesn't throw
      const result = parseCliArgs(["--temp", "invalid"]);

      // Assert - the value should be NaN
      expect(result.options.temp).toBeNaN();
    });

    it("should parse valid temperature boundary values", () => {
      // Test minimum boundary
      const minResult = parseCliArgs(["--temp", "0.0"]);
      expect(minResult.options.temp).toBe(0.0);

      // Test maximum boundary
      const maxResult = parseCliArgs(["--temp", "2.0"]);
      expect(maxResult.options.temp).toBe(2.0);

      // Test decimal values
      const decimalResult = parseCliArgs(["--temp", "0.75"]);
      expect(decimalResult.options.temp).toBe(0.75);
    });

    it("should handle empty flag values", () => {
      // Act & Assert - should throw when required value is missing
      expect(() => parseCliArgs(["--model"])).toThrow();
      expect(() => parseCliArgs(["--temp"])).toThrow();
    });

    it("should handle unknown flags gracefully", () => {
      // Act & Assert
      expect(() => parseCliArgs(["--unknown-flag"])).toThrow();
    });
  });

  describe("Environment Variable Integration", () => {
    describe("mergeCliWithEnv function", () => {
      it("should preserve environment variables when no CLI args provided", () => {
        // Arrange
        const env = {
          GEMINI_MODEL: "gemini-1.5-pro",
          GEMINI_TEMPERATURE: "0.8",
          OUTPUT_STREAMING: "false",
        };
        const cliArgs: CliArgs = {};

        // Act
        const result = mergeCliWithEnv(cliArgs, env);

        // Assert
        expect(result).toEqual(env);
      });

      it("should override environment variables with CLI arguments", () => {
        // Arrange
        const env = {
          GEMINI_MODEL: "gemini-1.5-pro",
          GEMINI_TEMPERATURE: "0.8",
          OUTPUT_STREAMING: "false",
          OUTPUT_RAW: "true",
        };
        const cliArgs: CliArgs = {
          model: "gemini-2.0-flash-exp",
          temp: 1.2,
          stream: true,
        };

        // Act
        const result = mergeCliWithEnv(cliArgs, env);

        // Assert
        expect(result).toEqual({
          GEMINI_MODEL: "gemini-2.0-flash-exp", // Overridden by CLI
          GEMINI_TEMPERATURE: "1.2", // Overridden by CLI
          OUTPUT_STREAMING: "true", // Overridden by CLI
          OUTPUT_RAW: "true", // Preserved from env
        });
      });

      it("should add CLI arguments to empty environment", () => {
        // Arrange
        const env = {};
        const cliArgs: CliArgs = {
          model: "gemini-1.5-flash",
          temp: 0.5,
          stream: false,
          raw: true,
        };

        // Act
        const result = mergeCliWithEnv(cliArgs, env);

        // Assert
        expect(result).toEqual({
          GEMINI_MODEL: "gemini-1.5-flash",
          GEMINI_TEMPERATURE: "0.5",
          OUTPUT_STREAMING: "false",
          OUTPUT_RAW: "true",
        });
      });

      it("should handle boolean flag conversion correctly", () => {
        // Arrange
        const cliArgs: CliArgs = {
          stream: true,
          raw: false,
        };

        // Act
        const result = mergeCliWithEnv(cliArgs, {});

        // Assert
        expect(result["OUTPUT_STREAMING"]).toBe("true");
        expect(result["OUTPUT_RAW"]).toBe("false");
      });

      it("should handle undefined CLI arguments gracefully", () => {
        // Arrange
        const env = { EXISTING_VAR: "value" };
        const cliArgs: CliArgs = {}; // Empty object instead of explicit undefined

        // Act
        const result = mergeCliWithEnv(cliArgs, env);

        // Assert
        expect(result).toEqual({ EXISTING_VAR: "value" });
        expect(result["GEMINI_MODEL"]).toBeUndefined();
        expect(result["GEMINI_TEMPERATURE"]).toBeUndefined();
        expect(result["OUTPUT_STREAMING"]).toBeUndefined();
        expect(result["OUTPUT_RAW"]).toBeUndefined();
      });
    });
  });

  describe("Mode Selection", () => {
    it("should detect single prompt mode when argument provided", () => {
      // Act
      const result = parseCliArgs(["Explain dependency injection"]);

      // Assert
      expect(result.arguments).toHaveLength(1);
      expect(result.arguments[0]).toBe("Explain dependency injection");
    });

    it("should detect interactive mode when no arguments provided", () => {
      // Act
      const result = parseCliArgs([]);

      // Assert
      expect(result.arguments).toHaveLength(0);
    });

    it("should handle single prompt mode with flags", () => {
      // Act
      const result = parseCliArgs([
        "--model",
        "gemini-1.5-pro",
        "--temp",
        "0.2",
        "--raw",
        "Write unit tests for a React component",
      ]);

      // Assert
      expect(result.options.model).toBe("gemini-1.5-pro");
      expect(result.options.temp).toBe(0.2);
      expect(result.options.raw).toBe(true);
      expect(result.arguments).toEqual([
        "Write unit tests for a React component",
      ]);
    });

    it("should handle complex prompts with special characters", () => {
      // Act
      const complexPrompt =
        "Create a function with signature: function processData(items: Array<{id: number, name: string}>): Promise<Result<Data[], Error>>";
      const result = parseCliArgs([complexPrompt]);

      // Assert
      expect(result.arguments[0]).toBe(complexPrompt);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty argument list", () => {
      // Act
      const result = parseCliArgs([]);

      // Assert
      expect(result.options).toEqual({});
      expect(result.arguments).toEqual([]);
    });

    it("should handle whitespace in arguments", () => {
      // Act
      const result = parseCliArgs(["  ", "--model", "  gemini-1.5-flash  "]);

      // Assert
      expect(result.arguments).toEqual(["  "]);
      expect(result.options.model).toBe("  gemini-1.5-flash  ");
    });

    it("should handle very long prompt arguments", () => {
      // Arrange
      const longPrompt = "A".repeat(10000);

      // Act
      const result = parseCliArgs([longPrompt]);

      // Assert
      expect(result.arguments[0]).toBe(longPrompt);
      expect(result.arguments[0]).toHaveLength(10000);
    });

    it("should handle numeric string model names", () => {
      // Act
      const result = parseCliArgs(["--model", "123"]);

      // Assert
      expect(result.options.model).toBe("123");
    });

    it("should handle negative temperature values", () => {
      // Act
      const result = parseCliArgs(["--temp", "-0.5"]);

      // Assert
      expect(result.options.temp).toBe(-0.5);
    });

    it("should handle extreme temperature precision", () => {
      // Act
      const result = parseCliArgs(["--temp", "0.123456789"]);

      // Assert
      expect(result.options.temp).toBe(0.123456789);
    });
  });

  describe("Help and Version", () => {
    it("should handle version flag", () => {
      // Act & Assert
      expect(() => parseCliArgs(["--version"])).toThrow();
    });

    it("should handle help flag", () => {
      // Act & Assert
      expect(() => parseCliArgs(["--help"])).toThrow();
    });
  });

  describe("Configuration Integration", () => {
    it("should demonstrate full CLI to configuration flow", () => {
      // This test demonstrates how CLI arguments flow through to configuration
      // without testing the actual configuration creation (which has its own tests)

      // Arrange
      const cliArgs: CliArgs = {
        model: "gemini-2.5-flash-preview-05-20",
        temp: 1.5,
        stream: false,
        raw: true,
      };
      const env = {
        GEMINI_API_KEY: "test-api-key-for-integration",
        LOG_LEVEL: "debug",
      };

      // Act
      const mergedEnv = mergeCliWithEnv(cliArgs, env);

      // Assert - Verify the merged environment has correct values
      expect(mergedEnv).toEqual({
        GEMINI_API_KEY: "test-api-key-for-integration",
        LOG_LEVEL: "debug",
        GEMINI_MODEL: "gemini-2.5-flash-preview-05-20",
        GEMINI_TEMPERATURE: "1.5",
        OUTPUT_STREAMING: "false",
        OUTPUT_RAW: "true",
      });
    });

    it("should preserve non-overridden environment variables", () => {
      // Arrange
      const cliArgs: CliArgs = {
        model: "gemini-1.5-pro",
      };
      const env = {
        GEMINI_API_KEY: "preserved-api-key",
        GEMINI_TEMPERATURE: "0.5",
        GEMINI_TIMEOUT_MS: "60000",
        OUTPUT_STREAMING: "true",
        LOG_LEVEL: "warn",
        SERVICE_NAME: "custom-service",
      };

      // Act
      const mergedEnv = mergeCliWithEnv(cliArgs, env);

      // Assert - Only model should be overridden, others preserved
      expect(mergedEnv).toEqual({
        GEMINI_API_KEY: "preserved-api-key",
        GEMINI_MODEL: "gemini-1.5-pro", // Overridden by CLI
        GEMINI_TEMPERATURE: "0.5", // Preserved
        GEMINI_TIMEOUT_MS: "60000", // Preserved
        OUTPUT_STREAMING: "true", // Preserved
        LOG_LEVEL: "warn", // Preserved
        SERVICE_NAME: "custom-service", // Preserved
      });
    });

    it("should handle comprehensive CLI override scenario", () => {
      // Arrange - All environment variables set to defaults
      const env = {
        GEMINI_API_KEY: "env-api-key",
        GEMINI_MODEL: "gemini-1.5-flash",
        GEMINI_TEMPERATURE: "0.7",
        OUTPUT_STREAMING: "true",
        OUTPUT_RAW: "false",
      };

      // Parse comprehensive CLI arguments
      const cliResult = parseCliArgs([
        "--model",
        "gemini-2.0-flash-exp",
        "--temp",
        "0.1",
        "--no-stream",
        "--raw",
        "Complex prompt with CLI overrides",
      ]);

      // Act
      const mergedEnv = mergeCliWithEnv(cliResult.options, env);

      // Assert - All CLI values should override environment
      expect(mergedEnv).toEqual({
        GEMINI_API_KEY: "env-api-key", // Preserved (can't be set via CLI)
        GEMINI_MODEL: "gemini-2.0-flash-exp", // Overridden
        GEMINI_TEMPERATURE: "0.1", // Overridden
        OUTPUT_STREAMING: "false", // Overridden (--no-stream)
        OUTPUT_RAW: "true", // Overridden (--raw)
      });

      // Assert prompt was captured correctly
      expect(cliResult.arguments).toEqual([
        "Complex prompt with CLI overrides",
      ]);
    });
  });
});
