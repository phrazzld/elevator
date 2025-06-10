/**
 * Input handling module for elevator CLI
 *
 * Handles multiple input modes:
 * - Command-line arguments (backward compatible)
 * - Piped input (cat file | elevator)
 * - Interactive multiline input (Ctrl+D to submit)
 */

import * as readline from "node:readline";
import { Readable } from "node:stream";
import { setTimeout, clearTimeout } from "node:timers";

/**
 * Get input from command-line arguments or stdin
 *
 * @param args - Command-line arguments
 * @returns Promise resolving to the input string
 * @throws Error if input is empty or invalid
 */
export async function getInput(args: string[]): Promise<string> {
  // If argument provided, return it directly (backward compatibility)
  if (args.length > 0 && args[0]?.trim()) {
    return args[0];
  }

  // Otherwise, read from stdin (multiline mode)
  return readMultilineInput();
}

/**
 * Read multiline input from stdin
 * Detects whether input is piped or interactive
 *
 * @returns Promise resolving to the multiline input
 */
async function readMultilineInput(): Promise<string> {
  // Check if input is piped (non-TTY)
  // When stdin.isTTY is false, input is coming from pipes, files, or redirects
  if (!process.stdin.isTTY) {
    return readStreamToEnd(process.stdin);
  }

  // Interactive multiline input with readline interface
  // User can type multiple lines and press Ctrl+D to submit
  return readInteractiveInput();
}

/**
 * Read all data from a stream until EOF
 * Used for piped input
 *
 * @param stream - The readable stream to read from
 * @returns Promise resolving to the complete stream content
 */
async function readStreamToEnd(stream: Readable): Promise<string> {
  const chunks: string[] = [];

  // Set encoding to handle UTF-8 properly
  stream.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    // Set a timeout to prevent hanging on broken pipes
    const timeout = setTimeout(() => {
      reject(new Error("Input timeout: No data received within 30 seconds"));
    }, 30000);

    stream.on("data", (chunk: string) => {
      chunks.push(chunk);
    });

    stream.on("end", () => {
      clearTimeout(timeout);
      const input = chunks.join("").trim();

      if (!input) {
        reject(new Error("No input provided"));
        return;
      }

      resolve(input);
    });

    stream.on("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to read input: ${error.message}`));
    });
  });
}

/**
 * Read interactive multiline input using readline
 * User can enter multiple lines and submit with Ctrl+D
 *
 * @returns Promise resolving to the multiline input
 */
async function readInteractiveInput(): Promise<string> {
  const lines: string[] = [];

  // Create readline interface with terminal features
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: "", // Empty prompt for clean multiline input appearance
    crlfDelay: Infinity, // Handle different line endings properly
  });

  // Suppress the initial prompt display for clean UX
  if (typeof rl.setPrompt === "function") {
    rl.setPrompt("");
  }

  // Enable keypress events for Ctrl+D detection from any position
  // Only enable in actual runtime (not in tests)
  if (process.stdin && typeof process.stdin.isTTY !== "undefined") {
    readline.emitKeypressEvents(process.stdin);
  }

  // Display instructions
  console.log("Enter your prompt (press Ctrl+D when done):");
  console.log();

  return new Promise((resolve, reject) => {
    let isResolved = false;

    // Ensure cleanup happens exactly once
    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        try {
          rl.close();
        } catch {
          // Interface may already be closed, ignore errors
        }
      }
    };

    // Collect lines normally through readline
    rl.on("line", (line) => {
      lines.push(line);
    });

    // Intercept Ctrl+D before readline processes it (works from any position)
    // Only attach keypress listener in actual runtime (not in tests)
    if (process.stdin && typeof process.stdin.on === "function") {
      process.stdin.on(
        "keypress",
        (_str: string, key: { ctrl?: boolean; name?: string }) => {
          if (key && key.ctrl && key.name === "d" && !isResolved) {
            // Get current line content from readline interface
            // Using type assertion as readline internal interface properties are not exported
            const rlWithLine = rl as unknown as { line?: string };
            const currentLine = rlWithLine.line || "";
            if (currentLine.trim()) {
              lines.push(currentLine);
            }

            const input = lines.join("\n").trim();
            cleanup();

            if (!input) {
              reject(new Error("No input provided"));
            } else {
              resolve(input);
            }
          }
        },
      );
    }

    // Handle normal close events (fallback)
    rl.on("close", () => {
      if (isResolved) return;
      isResolved = true;

      const input = lines.join("\n").trim();

      if (!input) {
        reject(new Error("No input provided"));
        return;
      }

      resolve(input);
    });

    // Handle Ctrl+C (SIGINT)
    rl.on("SIGINT", () => {
      if (isResolved) return;
      isResolved = true;

      console.log("\nOperation cancelled");
      cleanup();
      reject(new Error("Operation cancelled by user"));
    });

    // Handle stream errors that might prevent proper closure
    rl.on("error", (error: Error) => {
      if (isResolved) return;
      isResolved = true;

      cleanup();
      reject(new Error(`Readline interface error: ${error.message}`));
    });

    // Handle errors from underlying input stream (stdin)
    if (process.stdin && typeof process.stdin.on === "function") {
      process.stdin.on("error", (error: Error) => {
        if (isResolved) return;
        isResolved = true;

        cleanup();
        reject(new Error(`Input stream error: ${error.message}`));
      });
    }

    // Handle errors from underlying output stream (stdout)
    if (process.stdout && typeof process.stdout.on === "function") {
      process.stdout.on("error", (error: Error) => {
        if (isResolved) return;
        isResolved = true;

        cleanup();
        reject(new Error(`Output stream error: ${error.message}`));
      });
    }
  });
}
