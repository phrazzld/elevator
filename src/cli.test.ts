/**
 * Unit tests for CLI module core functions.
 *
 * These tests focus on the pure functions within the CLI module,
 * while integration tests in cli.integration.test.ts cover the full CLI workflow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processPrompt, createProgram, main, CliArgs } from "./cli.js";

// Mock external dependencies
vi.mock("./api.js", () => ({
  elevatePrompt: vi.fn(),
}));

vi.mock("./input.js", () => ({
  getInput: vi.fn(),
}));

vi.mock("./utils/constants.js", () => ({
  EXIT_CODES: {
    SUCCESS: 0,
    ERROR: 1,
    INTERRUPTED: 130,
  },
}));

interface ConsoleSpy {
  log: ReturnType<typeof vi.spyOn>;
  error: ReturnType<typeof vi.spyOn>;
}

describe("CLI Module - Unit Tests", () => {
  let consoleSpy: ConsoleSpy;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  let originalRequireMain: typeof require.main;
  let originalArgv: string[];

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };

    // Spy on process.exit
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    // Store original values
    originalRequireMain = require.main;
    originalArgv = process.argv;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    require.main = originalRequireMain;
    process.argv = originalArgv;
  });

  describe("processPrompt function", () => {
    it("should output result directly", async () => {
      const { elevatePrompt } = await import("./api.js");
      vi.mocked(elevatePrompt).mockResolvedValue("Enhanced prompt response");

      const options: CliArgs = { raw: false, debug: false };
      await processPrompt("test prompt", options);

      expect(elevatePrompt).toHaveBeenCalledWith("test prompt", false, false);
      expect(consoleSpy.log).toHaveBeenCalledWith("Enhanced prompt response");
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it("should output same result in raw mode", async () => {
      const { elevatePrompt } = await import("./api.js");
      vi.mocked(elevatePrompt).mockResolvedValue("Raw response");

      const options: CliArgs = { raw: true, debug: false };
      await processPrompt("test prompt", options);

      expect(elevatePrompt).toHaveBeenCalledWith("test prompt", false, true);
      expect(consoleSpy.log).toHaveBeenCalledWith("Raw response");
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it("should pass debug flag to elevatePrompt", async () => {
      const { elevatePrompt } = await import("./api.js");
      vi.mocked(elevatePrompt).mockResolvedValue("Debug response");

      const options: CliArgs = { debug: true, raw: false };
      await processPrompt("test prompt", options);

      expect(elevatePrompt).toHaveBeenCalledWith("test prompt", true, false);
      expect(consoleSpy.log).toHaveBeenCalledWith("Debug response");
    });
  });

  describe("createProgram function", () => {
    it("should create commander program with correct configuration", () => {
      const program = createProgram();

      expect(program.name()).toBe("elevator");
      expect(program.description()).toContain("A lightweight CLI");
      expect(program.version()).toBe("0.1.0");
    });

    it("should configure help text with examples", () => {
      const program = createProgram();
      const helpText = program.helpInformation();

      // Check for basic help text sections (addHelpText content isn't included in helpInformation)
      expect(helpText).toContain("Usage:");
      expect(helpText).toContain("A lightweight CLI");
      expect(helpText).toContain("Arguments:");
      expect(helpText).toContain("Options:");
      expect(helpText).toContain("--raw");
      expect(helpText).toContain("--no-raw");
    });

    it("should have raw output options configured", () => {
      const program = createProgram();

      // Set up test arguments for raw option
      process.argv = ["node", "cli.js", "--raw", "test"];
      program.parse();

      const options = program.opts();
      expect(options).toHaveProperty("raw");
    });
  });

  describe("main function - error handling", () => {
    beforeEach(() => {
      // Mock process.argv to prevent commander from interfering
      process.argv = ["node", "cli.js"];
    });

    it("should handle operation cancelled error", async () => {
      const { getInput } = await import("./input.js");
      vi.mocked(getInput).mockRejectedValue(
        new Error("Operation cancelled by user"),
      );

      try {
        await main();
        expect.fail("Should have thrown");
      } catch (error: unknown) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(consoleSpy.error).toHaveBeenCalledWith("❌ Operation cancelled");
      expect(processExitSpy).toHaveBeenCalledWith(130);
    });

    it("should handle missing input error", async () => {
      const { getInput } = await import("./input.js");
      vi.mocked(getInput).mockRejectedValue(new Error("No input provided"));

      try {
        await main();
        expect.fail("Should have thrown");
      } catch (error: unknown) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ Error: No input provided",
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Usage: elevator [prompt] or enter multiline mode without arguments",
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle API key error", async () => {
      const { getInput } = await import("./input.js");
      vi.mocked(getInput).mockRejectedValue(
        new Error("GEMINI_API_KEY required"),
      );

      try {
        await main();
        expect.fail("Should have thrown");
      } catch (error: unknown) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ Error: GEMINI_API_KEY environment variable is required",
      );
      expect(consoleSpy.error).toHaveBeenCalledWith("💡 To get started:");
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "   1. Get your API key from: https://aistudio.google.com/app/apikey",
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle timeout error", async () => {
      const { getInput } = await import("./input.js");
      vi.mocked(getInput).mockRejectedValue(
        new Error("Input timeout occurred"),
      );

      try {
        await main();
        expect.fail("Should have thrown");
      } catch (error: unknown) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ Error: Input timeout - no data received",
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle API error", async () => {
      const { getInput } = await import("./input.js");
      vi.mocked(getInput).mockRejectedValue(
        new Error("API error: 401 Unauthorized"),
      );

      try {
        await main();
        expect.fail("Should have thrown");
      } catch (error: unknown) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ API error: 401 Unauthorized",
      );
      expect(consoleSpy.error).toHaveBeenCalledWith("💡 Check your API key:");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle API error with Invalid API key", async () => {
      const { getInput } = await import("./input.js");
      vi.mocked(getInput).mockRejectedValue(
        new Error("API error: Invalid API key"),
      );

      try {
        await main();
        expect.fail("Should have thrown");
      } catch (error: unknown) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ API error: Invalid API key",
      );
      expect(consoleSpy.error).toHaveBeenCalledWith("💡 Check your API key:");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle generic error", async () => {
      const { getInput } = await import("./input.js");
      vi.mocked(getInput).mockRejectedValue(new Error("Some generic error"));

      try {
        await main();
        expect.fail("Should have thrown");
      } catch (error: unknown) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ Error: Some generic error",
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle non-Error exceptions", async () => {
      const { getInput } = await import("./input.js");
      vi.mocked(getInput).mockRejectedValue("String error");

      try {
        await main();
        expect.fail("Should have thrown");
      } catch (error: unknown) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ Unexpected error: String error",
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("main function - successful execution", () => {
    it("should execute successfully with valid input", async () => {
      const { getInput } = await import("./input.js");
      const { elevatePrompt } = await import("./api.js");

      vi.mocked(getInput).mockResolvedValue("test input");
      vi.mocked(elevatePrompt).mockResolvedValue("enhanced output");

      // Mock process.argv to provide test arguments
      process.argv = ["node", "cli.js", "test"];

      await main();

      expect(getInput).toHaveBeenCalledWith(["test"]);
      expect(elevatePrompt).toHaveBeenCalledWith(
        "test input",
        undefined,
        undefined,
      );
      expect(consoleSpy.log).toHaveBeenCalledWith("enhanced output");
    });

    it("should execute successfully with raw output", async () => {
      const { getInput } = await import("./input.js");
      const { elevatePrompt } = await import("./api.js");

      vi.mocked(getInput).mockResolvedValue("test input");
      vi.mocked(elevatePrompt).mockResolvedValue("raw output");

      // Mock process.argv for raw option
      process.argv = ["node", "cli.js", "--raw", "test"];

      await main();

      expect(getInput).toHaveBeenCalledWith(["test"]);
      expect(elevatePrompt).toHaveBeenCalledWith("test input", undefined, true);
      expect(consoleSpy.log).toHaveBeenCalledWith("raw output");
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it("should execute successfully with debug flag", async () => {
      const { getInput } = await import("./input.js");
      const { elevatePrompt } = await import("./api.js");

      vi.mocked(getInput).mockResolvedValue("test input");
      vi.mocked(elevatePrompt).mockResolvedValue("debug output");

      // Mock process.argv for debug option
      process.argv = ["node", "cli.js", "--debug", "test"];

      await main();

      expect(getInput).toHaveBeenCalledWith(["test"]);
      expect(elevatePrompt).toHaveBeenCalledWith("test input", true, undefined);
      expect(consoleSpy.log).toHaveBeenCalledWith("debug output");
    });
  });
});
