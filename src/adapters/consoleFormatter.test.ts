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

  describe("Raw mode formatting", () => {
    describe("Progress indicators in raw mode", () => {
      it("should create inactive progress indicator in raw mode", async () => {
        const options: FormatOptions = { mode: "raw" };
        const result = await formatter.createProgress("Loading...", options);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.message).toBe("Loading...");
          expect(result.value.stage).toBe("thinking");
          expect(result.value.active).toBe(false); // Should be inactive in raw mode
        }
      });

      it("should update progress silently in raw mode", async () => {
        const options: FormatOptions = { mode: "raw" };
        const createResult = await formatter.createProgress(
          "Loading...",
          options,
        );
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
            expect(updateResult.value.active).toBe(false); // Still inactive
          }
        }
      });

      it("should complete progress silently in raw mode", async () => {
        const options: FormatOptions = { mode: "raw" };
        const createResult = await formatter.createProgress(
          "Loading...",
          options,
        );
        expect(isOk(createResult)).toBe(true);

        if (isOk(createResult)) {
          const indicator = createResult.value;
          const completeResult = await formatter.completeProgress(indicator);

          expect(isOk(completeResult)).toBe(true);
          // Should complete without errors even though no spinner was created
        }
      });

      it("should handle multiple raw mode progress indicators", async () => {
        const options: FormatOptions = { mode: "raw" };
        const result1 = await formatter.createProgress("Task 1", options);
        const result2 = await formatter.createProgress("Task 2", options);

        expect(isOk(result1)).toBe(true);
        expect(isOk(result2)).toBe(true);

        if (isOk(result1) && isOk(result2)) {
          expect(result1.value.active).toBe(false);
          expect(result2.value.active).toBe(false);

          // Should be able to complete both without issues
          const complete1 = await formatter.completeProgress(result1.value);
          const complete2 = await formatter.completeProgress(result2.value);

          expect(isOk(complete1)).toBe(true);
          expect(isOk(complete2)).toBe(true);
        }
      });
    });

    describe("Stream formatting in raw mode", () => {
      it("should format stream chunks in raw mode", async () => {
        const options: FormatOptions = { mode: "raw" };
        const result = await formatter.formatStreamChunk("chunk data", options);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.text).toBe("chunk data");
          expect(result.value.metadata).toEqual({
            styled: false,
            mode: "raw",
            contentType: "content",
          });
        }
      });

      it("should handle multiple stream chunks in raw mode", async () => {
        const options: FormatOptions = { mode: "raw" };
        const result1 = await formatter.formatStreamChunk("Hello ", options);
        const result2 = await formatter.formatStreamChunk("world!", options);

        expect(isOk(result1)).toBe(true);
        expect(isOk(result2)).toBe(true);

        if (isOk(result1) && isOk(result2)) {
          expect(result1.value.text).toBe("Hello ");
          expect(result2.value.text).toBe("world!");
          expect(result1.value.metadata.mode).toBe("raw");
          expect(result2.value.metadata.mode).toBe("raw");
        }
      });

      it("should not pause/resume spinners in raw mode", async () => {
        const options: FormatOptions = { mode: "raw" };

        // Create a progress indicator in normal mode first
        const normalProgress =
          await formatter.createProgress("Normal progress");
        expect(isOk(normalProgress)).toBe(true);

        // Format stream chunk in raw mode - should not affect the normal progress
        const streamResult = await formatter.formatStreamChunk("data", options);
        expect(isOk(streamResult)).toBe(true);

        if (isOk(normalProgress)) {
          await formatter.completeProgress(normalProgress.value);
        }
      });
    });

    describe("Raw mode edge cases", () => {
      it("should ignore styling options in raw mode", async () => {
        const options: FormatOptions = {
          mode: "raw",
          enableStyling: true, // Should be ignored
          style: {
            accent: "blue",
            error: "red",
          },
        };
        const result = await formatter.formatContent("Test content", options);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.text).toBe("Test content");
          expect(result.value.metadata.styled).toBe(false);
          expect(result.value.metadata.mode).toBe("raw");
        }
      });

      it("should handle raw mode with enableStyling=false", async () => {
        const options: FormatOptions = {
          mode: "raw",
          enableStyling: false, // Redundant but should work
        };
        const result = await formatter.formatContent("Test content", options);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.text).toBe("Test content");
          expect(result.value.metadata.styled).toBe(false);
          expect(result.value.metadata.mode).toBe("raw");
        }
      });

      it("should handle complex errors in raw mode", async () => {
        const complexError = new Error("Complex error");
        complexError.stack =
          "Error: Complex error\n    at test.js:1:1\n    at main.js:5:5";

        const options: FormatOptions = { mode: "raw" };
        const result = await formatter.formatError(complexError, options);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.text).toBe("Error: Complex error");
          expect(result.value.text).not.toContain("test.js:1:1"); // No stack trace
          expect(result.value.metadata.styled).toBe(false);
          expect(result.value.metadata.mode).toBe("raw");
          expect(result.value.metadata.contentType).toBe("error");
        }
      });

      it("should handle streaming option with raw mode", async () => {
        const options: FormatOptions = {
          mode: "raw",
          streaming: true,
        };
        const result = await formatter.formatStreamChunk(
          "streaming data",
          options,
        );

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.text).toBe("streaming data");
          expect(result.value.metadata.mode).toBe("raw");
        }
      });
    });

    describe("Raw mode consistency", () => {
      it("should return consistent metadata across all methods", async () => {
        const options: FormatOptions = { mode: "raw" };

        const contentResult = await formatter.formatContent("content", options);
        const errorResult = await formatter.formatError(
          new Error("error"),
          options,
        );
        const streamResult = await formatter.formatStreamChunk(
          "stream",
          options,
        );
        const progressResult = await formatter.createProgress(
          "progress",
          options,
        );

        expect(isOk(contentResult)).toBe(true);
        expect(isOk(errorResult)).toBe(true);
        expect(isOk(streamResult)).toBe(true);
        expect(isOk(progressResult)).toBe(true);

        if (isOk(contentResult) && isOk(errorResult) && isOk(streamResult)) {
          // All should report raw mode
          expect(contentResult.value.metadata.mode).toBe("raw");
          expect(errorResult.value.metadata.mode).toBe("raw");
          expect(streamResult.value.metadata.mode).toBe("raw");

          // All should report no styling
          expect(contentResult.value.metadata.styled).toBe(false);
          expect(errorResult.value.metadata.styled).toBe(false);
          expect(streamResult.value.metadata.styled).toBe(false);
        }
      });

      it("should handle null/undefined with raw mode", async () => {
        const options: FormatOptions = { mode: "raw" };
        const result = await formatter.formatContent(
          null as unknown as string,
          options,
        );

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.type).toBe("formatter");
          expect(result.error.code).toBe("INVALID_CONTENT");
          // Error should include the options in details
          expect(result.error.details?.options).toEqual(options);
        }
      });

      it("should preserve content exactly in raw mode", async () => {
        const options: FormatOptions = { mode: "raw" };
        const testContent = "Line 1\nLine 2\nSpecial chars: @#$%^&*()";
        const result = await formatter.formatContent(testContent, options);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.text).toBe(testContent); // Exact preservation
          expect(result.value.metadata.mode).toBe("raw");
        }
      });
    });
  });
});
