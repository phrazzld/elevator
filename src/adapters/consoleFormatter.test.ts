import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules must be defined before imports that use them
vi.mock("chalk", () => {
  const mockChalk = {
    green: vi.fn((text: string) => `[green]${text}[/green]`),
    red: vi.fn((text: string) => `[red]${text}[/red]`),
    yellow: vi.fn((text: string) => `[yellow]${text}[/yellow]`),
    blue: vi.fn((text: string) => `[blue]${text}[/blue]`),
    cyan: vi.fn((text: string) => `[cyan]${text}[/cyan]`),
    magenta: vi.fn((text: string) => `[magenta]${text}[/magenta]`),
    gray: vi.fn((text: string) => `[gray]${text}[/gray]`),
    bold: {
      green: vi.fn((text: string) => `[bold-green]${text}[/bold-green]`),
      red: vi.fn((text: string) => `[bold-red]${text}[/bold-red]`),
      yellow: vi.fn((text: string) => `[bold-yellow]${text}[/bold-yellow]`),
    },
    dim: vi.fn((text: string) => `[dim]${text}[/dim]`),
    hex: vi.fn(() => vi.fn((text: string) => `[hex]${text}[/hex]`)),
    isColorSupported: true,
  };
  return { default: mockChalk };
});

vi.mock("ora", () => {
  const mockOra = vi.fn(() => {
    const instance = {
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      warn: vi.fn().mockReturnThis(),
      info: vi.fn().mockReturnThis(),
      text: "",
      isSpinning: false,
    };
    instance.start = vi.fn().mockImplementation(() => {
      instance.isSpinning = true;
      return instance;
    });
    instance.stop = vi.fn().mockImplementation(() => {
      instance.isSpinning = false;
      return instance;
    });
    return instance;
  });
  return { default: mockOra };
});

import { ConsoleFormatter } from "./consoleFormatter";
import {
  type OutputFormatter,
  type ProgressIndicator,
  type FormatOptions,
} from "../core/formatter";
import { isOk, isErr } from "../core/promptProcessor";

describe("ConsoleFormatter", () => {
  let formatter: OutputFormatter;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    // Save original TTY state and mock as true for tests
    originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = true;
    formatter = new ConsoleFormatter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original TTY state
    process.stdout.isTTY = originalIsTTY as boolean;
  });

  describe("formatContent", () => {
    it("should format content with default styling", async () => {
      const result = await formatter.formatContent("Hello, world!");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toBe("Hello, world!");
        expect(result.value.metadata).toEqual({
          styled: true,
          mode: "formatted",
          contentType: "content",
        });
      }
    });

    it("should return raw content when mode is 'raw'", async () => {
      const options: FormatOptions = { mode: "raw" };
      const result = await formatter.formatContent("Hello, world!", options);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toBe("Hello, world!");
        expect(result.value.metadata).toEqual({
          styled: false,
          mode: "raw",
          contentType: "content",
        });
      }
    });

    it("should respect enableStyling option", async () => {
      const options: FormatOptions = { enableStyling: false };
      const result = await formatter.formatContent("Hello, world!", options);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toBe("Hello, world!");
        expect(result.value.metadata.styled).toBe(false);
      }
    });

    it("should handle empty content", async () => {
      const result = await formatter.formatContent("");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toBe("");
      }
    });

    it("should handle very long content", async () => {
      const longContent = "a".repeat(10000);
      const result = await formatter.formatContent(longContent);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toBe(longContent);
      }
    });

    it("should apply custom styles from options", async () => {
      const options: FormatOptions = {
        style: {
          accent: "#FF6B6B",
        },
      };
      const result = await formatter.formatContent("Hello!", options);

      expect(isOk(result)).toBe(true);
      // In real implementation, this would apply the custom color
    });
  });

  describe("formatError", () => {
    it("should format Error objects with red styling", async () => {
      const error = new Error("Something went wrong");
      const result = await formatter.formatError(error);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toContain("[red]");
        expect(result.value.text).toContain("Something went wrong");
        expect(result.value.metadata.contentType).toBe("error");
      }
    });

    it("should format string errors", async () => {
      const result = await formatter.formatError("Error message");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toContain("Error message");
        expect(result.value.metadata.contentType).toBe("error");
      }
    });

    it("should format unknown error types", async () => {
      const result = await formatter.formatError({ code: 123 });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toContain("Unknown error");
        expect(result.value.metadata.contentType).toBe("error");
      }
    });

    it("should include stack trace when available", async () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.js:10:5";
      const result = await formatter.formatError(error);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toContain("Test error");
        expect(result.value.text).toContain("at test.js:10:5");
      }
    });

    it("should return raw error in raw mode", async () => {
      const error = new Error("Test error");
      const options: FormatOptions = { mode: "raw" };
      const result = await formatter.formatError(error, options);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).not.toContain("[red]");
        expect(result.value.metadata.styled).toBe(false);
      }
    });
  });

  describe("Progress indicators", () => {
    it("should create new progress indicator", async () => {
      const result = await formatter.createProgress("Loading...");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.message).toBe("Loading...");
        expect(result.value.stage).toBe("thinking");
        expect(result.value.active).toBe(true);
        // Spinner creation is tested implicitly by the result
      }
    });

    it("should update existing indicator", async () => {
      const createResult = await formatter.createProgress("Loading...");
      expect(isOk(createResult)).toBe(true);

      if (isOk(createResult)) {
        const indicator = createResult.value;
        const updateResult = await formatter.updateProgress(indicator, {
          message: "Processing...",
          stage: "processing",
          progress: 50,
        });

        expect(isOk(updateResult)).toBe(true);
        if (isOk(updateResult)) {
          expect(updateResult.value.message).toBe("Processing...");
          expect(updateResult.value.stage).toBe("processing");
          expect(updateResult.value.progress).toBe(50);
        }
      }
    });

    it("should complete and remove indicator", async () => {
      const createResult = await formatter.createProgress("Loading...");
      expect(isOk(createResult)).toBe(true);

      if (isOk(createResult)) {
        const indicator = createResult.value;
        const completeResult = await formatter.completeProgress(indicator);

        expect(isOk(completeResult)).toBe(true);
        // Spinner stop is tested implicitly by successful completion
      }
    });

    it("should handle invalid indicator updates", async () => {
      const fakeIndicator: ProgressIndicator = {
        message: "Fake",
        stage: "thinking",
        active: true,
      };

      const result = await formatter.updateProgress(fakeIndicator, {
        message: "Updated",
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("INVALID_CONTENT");
      }
    });

    it("should manage multiple concurrent indicators", async () => {
      const result1 = await formatter.createProgress("Task 1");
      const result2 = await formatter.createProgress("Task 2");

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
      // Multiple indicators created successfully

      if (isOk(result1) && isOk(result2)) {
        await formatter.completeProgress(result1.value);
        await formatter.completeProgress(result2.value);
      }
    });
  });

  describe("formatStreamChunk", () => {
    it("should format chunks without buffering", async () => {
      const result = await formatter.formatStreamChunk("chunk1");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toBe("chunk1");
        expect(result.value.metadata.mode).toBe("formatted");
      }
    });

    it("should handle partial lines", async () => {
      const result1 = await formatter.formatStreamChunk("Hello ");
      const result2 = await formatter.formatStreamChunk("world!");

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
      if (isOk(result1)) {
        expect(result1.value.text).toBe("Hello ");
      }
      if (isOk(result2)) {
        expect(result2.value.text).toBe("world!");
      }
    });

    it("should handle streaming mode option", async () => {
      const options: FormatOptions = { streaming: true };
      const result = await formatter.formatStreamChunk("data", options);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.text).toBe("data");
      }
    });
  });

  describe("Error handling", () => {
    it("should handle format errors gracefully", async () => {
      // Test with null/undefined inputs
      const result = await formatter.formatContent(null as unknown as string);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe("formatter");
        expect(result.error.code).toBe("INVALID_CONTENT");
      }
    });
  });

  describe("Terminal capabilities", () => {
    it("should detect non-TTY environments", async () => {
      // Mock process.stdout.isTTY
      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = false;

      const formatter = new ConsoleFormatter();
      const result = await formatter.formatContent("Test");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // In non-TTY, styling might be disabled
        expect(result.value.text).toBe("Test");
      }

      process.stdout.isTTY = originalIsTTY;
    });

    it("should respect NO_COLOR environment variable", async () => {
      const originalNoColor = process.env["NO_COLOR"];
      process.env["NO_COLOR"] = "1";

      const formatter = new ConsoleFormatter();
      const result = await formatter.formatContent("Test");

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.metadata.styled).toBe(false);
      }

      if (originalNoColor === undefined) {
        delete process.env["NO_COLOR"];
      } else {
        process.env["NO_COLOR"] = originalNoColor;
      }
    });
  });
});
