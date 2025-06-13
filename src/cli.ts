#!/usr/bin/env node

/**
 * elevator CLI entry point
 * A lightweight CLI that accepts natural-language prompts and returns
 * richer, more technical articulations using Google Gemini 2.5 Flash
 *
 * Simplified version using direct API calls only.
 */

import { Command } from "commander";
import { elevatePrompt } from "./api.js";
import { getInput } from "./input.js";
import { EXIT_CODES } from "./utils/constants.js";

/**
 * CLI argument interface (simplified)
 */
export interface CliArgs {
  raw?: boolean;
  debug?: boolean;
}

/**
 * Handle prompt processing using direct API call.
 *
 * @param prompt - The user's prompt to elevate
 * @param options - CLI options
 */
export async function processPrompt(
  prompt: string,
  options: CliArgs,
): Promise<void> {
  // Make direct API call (elevatePrompt will handle API key validation)
  const result = await elevatePrompt(prompt, options.debug, options.raw);

  // Output result
  console.log(result);
}

/**
 * Sets up and configures the commander CLI program.
 *
 * @returns Configured commander program
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name("elevator")
    .description(
      "A lightweight CLI that accepts natural-language prompts and returns richer, more technical articulations using Google Gemini 2.5 Flash",
    )
    .version("0.1.0")
    .argument(
      "[prompt]",
      "Prompt to process and elevate (optional - if not provided, multiline input mode will be used)",
    )
    .addHelpText(
      "after",
      `
Examples:
  Single-line prompts:
    $ elevator "fix this bug"                  # Direct argument
    $ elevator "optimize this function"        # Technical requests

  Multiline interactive mode:
    $ elevator                                 # Enter multiline mode
    # Type multiple lines, press Ctrl+D to submit

  Piped input (great for scripts):
    $ echo "refactor this code" | elevator     # Echo command
    $ cat prompt.txt | elevator               # File contents
    $ elevator < prompt.txt                    # File redirect
    $ printf "Line 1\\nLine 2" | elevator      # Multiline via printf

  Raw output (for scripts):
    $ echo "explain APIs" | elevator --raw     # No formatting
    $ elevator "document this" --raw | tee output.txt

  Heredoc examples:
    $ elevator << 'EOF'
    Please review this code for:
    - Performance issues
    - Security vulnerabilities
    - Best practices
    EOF

Input modes:
  - Direct argument: Single-line prompt as command argument
  - Multiline: Interactive mode for complex prompts (Ctrl+D to submit)
  - Piped: Read from stdin, perfect for automation and scripts`,
    );

  // Output options
  program
    .option("--raw", "Enable raw output mode (no formatting)")
    .option("--no-raw", "Disable raw output mode (default)")
    .option("--debug", "Enable debug logging (shows JSON logs to stderr)");

  return program;
}

/**
 * Main CLI entry point.
 */
export async function main(): Promise<void> {
  try {
    const program = createProgram();
    program.parse();

    const options = program.opts<CliArgs>();
    const args = program.args;

    // Get input from arguments or stdin (multiline mode)
    // If args are provided, uses first argument
    // If no args, enters multiline mode (TTY) or reads piped input (non-TTY)
    const prompt = await getInput(args);

    await processPrompt(prompt, options);
  } catch (error) {
    // Handle input-specific errors with clearer messages
    if (error instanceof Error) {
      if (error.message === "Operation cancelled by user") {
        console.error("❌ Operation cancelled");
        process.exit(EXIT_CODES.INTERRUPTED); // Standard exit code for Ctrl+C
      } else if (error.message === "No input provided") {
        console.error("❌ Error: No input provided");
        console.error(
          "Usage: elevator [prompt] or enter multiline mode without arguments",
        );
      } else if (error.message === "GEMINI_API_KEY required") {
        // Enhanced API key error guidance
        console.error(
          "❌ Error: GEMINI_API_KEY environment variable is required",
        );
        console.error("");
        console.error("💡 To get started:");
        console.error(
          "   1. Get your API key from: https://aistudio.google.com/app/apikey",
        );
        console.error("   2. Set the environment variable:");
        console.error('      export GEMINI_API_KEY="your-key-here"');
        console.error("");
        console.error(
          "📖 For more help, see: https://github.com/phrazzld/elevator#setup",
        );
      } else if (error.message.includes("timeout")) {
        console.error("❌ Error: Input timeout - no data received");
      } else if (error.message.includes("API error:")) {
        // Handle API-related errors (401, 403, etc.)
        console.error(`❌ ${error.message}`);
        if (
          error.message.includes("401") ||
          error.message.includes("Invalid API key")
        ) {
          console.error("");
          console.error("💡 Check your API key:");
          console.error("   1. Verify your GEMINI_API_KEY is correct");
          console.error(
            "   2. Get a new key from: https://aistudio.google.com/app/apikey",
          );
        }
      } else {
        console.error(`❌ Error: ${error.message}`);
      }
    } else {
      console.error(`❌ Unexpected error: ${String(error)}`);
    }
    process.exit(EXIT_CODES.ERROR);
  }
}

// Execute main function only if this file is run directly (not imported)
// Check if this module is the main entry point
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(EXIT_CODES.ERROR);
  });
}
