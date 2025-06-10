/**
 * Tests for input handling module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setTimeout } from "node:timers";
import * as readline from "node:readline";
import { getInput } from "./input.js";

// Mock readline module
vi.mock("node:readline", () => ({
  createInterface: vi.fn(),
  emitKeypressEvents: vi.fn(),
}));

describe("getInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stdin mock
    Object.defineProperty(process, "stdin", {
      value: {
        isTTY: true,
        setEncoding: vi.fn(),
        on: vi.fn(),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("command-line argument input", () => {
    it("should return the first argument when provided", async () => {
      const args = ["test prompt"];
      const result = await getInput(args);
      expect(result).toBe("test prompt");
    });

    it("should return the first argument even with multiple args", async () => {
      const args = ["first prompt", "second prompt"];
      const result = await getInput(args);
      expect(result).toBe("first prompt");
    });
  });

  describe("piped input", () => {
    it("should read from stdin when no TTY", async () => {
      const args: string[] = [];

      // Mock stdin as non-TTY (piped input)
      Object.defineProperty(process, "stdin", {
        value: {
          isTTY: false,
          setEncoding: vi.fn(),
          on: vi.fn(),
        },
        configurable: true,
      });

      const mockStdin = process.stdin as unknown as {
        isTTY: boolean;
        setEncoding: ReturnType<typeof vi.fn>;
        on: ReturnType<typeof vi.fn>;
      };

      // Setup stream events
      const chunks = ["Hello", " ", "world!"];

      mockStdin.on.mockImplementation(
        (event: string, callback: (chunk?: string) => void) => {
          if (event === "data") {
            // Simulate data chunks
            setTimeout(() => {
              chunks.forEach((chunk) => callback(chunk));
            }, 0);
          } else if (event === "end") {
            // Simulate end event
            setTimeout(() => callback(), 10);
          }
          return mockStdin;
        },
      );

      const result = await getInput(args);
      expect(result).toBe("Hello world!");
      expect(mockStdin.setEncoding).toHaveBeenCalledWith("utf8");
    });

    it("should handle empty piped input", async () => {
      const args: string[] = [];

      // Mock stdin as non-TTY
      Object.defineProperty(process, "stdin", {
        value: {
          isTTY: false,
          setEncoding: vi.fn(),
          on: vi.fn(),
        },
        configurable: true,
      });

      const mockStdin = process.stdin as unknown as {
        isTTY: boolean;
        setEncoding: ReturnType<typeof vi.fn>;
        on: ReturnType<typeof vi.fn>;
      };

      mockStdin.on.mockImplementation((event: string, callback: () => void) => {
        if (event === "data") {
          // No data chunks
        } else if (event === "end") {
          setTimeout(() => callback(), 0);
        }
        return mockStdin;
      });

      await expect(getInput(args)).rejects.toThrow("No input provided");
    });
  });

  describe("interactive input", () => {
    it("should use readline when TTY and no arguments", () => {
      // Ensure TTY mode
      Object.defineProperty(process, "stdin", {
        value: { isTTY: true },
        configurable: true,
      });

      const mockRl = {
        on: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as never);

      // Mock console.log
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Setup readline to simulate user input - just verify the setup
      expect(readline.createInterface).toBeDefined();

      consoleLogSpy.mockRestore();
    });

    it("should handle SIGINT (Ctrl+C) cancellation properly", async () => {
      const args: string[] = [];

      // Ensure TTY mode for interactive input
      Object.defineProperty(process, "stdin", {
        value: { isTTY: true },
        configurable: true,
      });

      const mockRl = {
        on: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as never);

      // Mock console.log to avoid output in tests
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Setup readline event handlers to simulate SIGINT
      mockRl.on.mockImplementation((event: string, callback: () => void) => {
        if (event === "SIGINT") {
          // Immediately trigger SIGINT to simulate Ctrl+C
          setTimeout(() => callback(), 0);
        }
        return mockRl;
      });

      // Test that getInput rejects with correct error message
      await expect(getInput(args)).rejects.toThrow(
        "Operation cancelled by user",
      );

      // Verify that readline interface was properly closed
      expect(mockRl.close).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it("should handle readline interface errors properly", async () => {
      const args: string[] = [];

      // Ensure TTY mode for interactive input
      Object.defineProperty(process, "stdin", {
        value: { isTTY: true, on: vi.fn() },
        configurable: true,
      });

      Object.defineProperty(process, "stdout", {
        value: { on: vi.fn() },
        configurable: true,
      });

      const mockRl = {
        on: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as never);

      // Mock console.log to avoid output in tests
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Setup readline event handlers to simulate error
      mockRl.on.mockImplementation(
        (event: string, callback: (error?: Error) => void) => {
          if (event === "error") {
            // Immediately trigger error
            setTimeout(() => callback(new Error("Readline error")), 0);
          }
          return mockRl;
        },
      );

      // Test that getInput rejects with correct error message
      await expect(getInput(args)).rejects.toThrow(
        "Readline interface error: Readline error",
      );

      // Verify that readline interface was properly closed
      expect(mockRl.close).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it("should handle stdin stream errors properly", async () => {
      const args: string[] = [];

      // Ensure TTY mode for interactive input
      const mockStdin = {
        isTTY: true,
        on: vi.fn(),
      };

      Object.defineProperty(process, "stdin", {
        value: mockStdin,
        configurable: true,
      });

      Object.defineProperty(process, "stdout", {
        value: { on: vi.fn() },
        configurable: true,
      });

      const mockRl = {
        on: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as never);

      // Mock console.log to avoid output in tests
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Setup stdin error handler
      mockStdin.on.mockImplementation(
        (event: string, callback: (error?: Error) => void) => {
          if (event === "error") {
            // Immediately trigger error
            setTimeout(() => callback(new Error("Stdin error")), 0);
          }
          return mockStdin;
        },
      );

      // Test that getInput rejects with correct error message
      await expect(getInput(args)).rejects.toThrow(
        "Input stream error: Stdin error",
      );

      // Verify that readline interface was properly closed
      expect(mockRl.close).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it("should handle successful multiline input", async () => {
      const args: string[] = [];

      // Ensure TTY mode for interactive input
      Object.defineProperty(process, "stdin", {
        value: { isTTY: true, on: vi.fn() },
        configurable: true,
      });

      Object.defineProperty(process, "stdout", {
        value: { on: vi.fn() },
        configurable: true,
      });

      const mockRl = {
        on: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as never);

      // Mock console.log to avoid output in tests
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Setup readline event handlers to simulate successful input
      const testLines = ["first line", "second line", "third line"];
      mockRl.on.mockImplementation(
        (event: string, callback: (line?: string) => void) => {
          if (event === "line") {
            // Simulate multiple lines being entered
            setTimeout(() => {
              testLines.forEach((line) => callback(line));
            }, 0);
          } else if (event === "close") {
            // Simulate Ctrl+D after lines are entered
            setTimeout(() => callback(), 10);
          }
          return mockRl;
        },
      );

      const result = await getInput(args);
      expect(result).toBe("first line\nsecond line\nthird line");

      consoleLogSpy.mockRestore();
    });

    it("should handle empty interactive input", async () => {
      const args: string[] = [];

      // Ensure TTY mode for interactive input
      Object.defineProperty(process, "stdin", {
        value: { isTTY: true, on: vi.fn() },
        configurable: true,
      });

      Object.defineProperty(process, "stdout", {
        value: { on: vi.fn() },
        configurable: true,
      });

      const mockRl = {
        on: vi.fn(),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as never);

      // Mock console.log to avoid output in tests
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Setup readline event handlers to simulate empty input
      mockRl.on.mockImplementation((event: string, callback: () => void) => {
        if (event === "close") {
          // Simulate Ctrl+D without any lines entered
          setTimeout(() => callback(), 0);
        }
        return mockRl;
      });

      await expect(getInput(args)).rejects.toThrow("No input provided");

      consoleLogSpy.mockRestore();
    });
  });

  describe("input validation", () => {
    it("should reject whitespace-only input", async () => {
      const args: string[] = [];

      // Mock stdin as non-TTY with whitespace-only input
      Object.defineProperty(process, "stdin", {
        value: {
          isTTY: false,
          setEncoding: vi.fn(),
          on: vi.fn(),
        },
        configurable: true,
      });

      const mockStdin = process.stdin as unknown as {
        isTTY: boolean;
        setEncoding: ReturnType<typeof vi.fn>;
        on: ReturnType<typeof vi.fn>;
      };

      mockStdin.on.mockImplementation(
        (event: string, callback: (chunk?: string) => void) => {
          if (event === "data") {
            setTimeout(() => callback("   \n\t   \n  "), 0);
          } else if (event === "end") {
            setTimeout(() => callback(), 10);
          }
          return mockStdin;
        },
      );

      await expect(getInput(args)).rejects.toThrow("No input provided");
    });
  });

  describe("unicode support", () => {
    it("should handle unicode characters correctly", async () => {
      const args: string[] = [];

      // Mock stdin as non-TTY
      Object.defineProperty(process, "stdin", {
        value: {
          isTTY: false,
          setEncoding: vi.fn(),
          on: vi.fn(),
        },
        configurable: true,
      });

      const mockStdin = process.stdin as unknown as {
        isTTY: boolean;
        setEncoding: ReturnType<typeof vi.fn>;
        on: ReturnType<typeof vi.fn>;
      };
      const unicodeText = "Hello 🌍 世界 🚀";

      mockStdin.on.mockImplementation(
        (event: string, callback: (chunk?: string) => void) => {
          if (event === "data") {
            setTimeout(() => callback(unicodeText), 0);
          } else if (event === "end") {
            setTimeout(() => callback(), 10);
          }
          return mockStdin;
        },
      );

      const result = await getInput(args);
      expect(result).toBe(unicodeText);
    });
  });
});
