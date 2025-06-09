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

/**
 * CLI argument interface (simplified)
 */
interface CliArgs {
  raw?: boolean;
}

/**
 * Handle prompt processing using direct API call.
 *
 * @param prompt - The user's prompt to elevate
 * @param options - CLI options
 */
async function processPrompt(prompt: string, options: CliArgs): Promise<void> {
  // Validate API key
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY environment variable is required");
    console.error("");
    console.error(
      "💡 Get your API key from: https://aistudio.google.com/app/apikey",
    );
    console.error('   Then set it with: export GEMINI_API_KEY="your-key-here"');
    process.exit(1);
  }

  try {
    // Make direct API call
    const result = await elevatePrompt(prompt);

    // Output result
    if (options.raw) {
      console.log(result);
    } else {
      console.log("✨ Enhanced prompt:");
      console.log(result);
    }
  } catch (error) {
    console.error(
      "❌ Error processing prompt:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

/**
 * Sets up and configures the commander CLI program.
 *
 * @returns Configured commander program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name("elevator")
    .description(
      "A lightweight CLI that accepts natural-language prompts and returns richer, more technical articulations using Google Gemini 2.5 Flash",
    )
    .version("0.1.0")
    .argument("<prompt>", "Prompt to process and elevate");

  // Output options
  program
    .option("--raw", "Enable raw output mode (no formatting)")
    .option("--no-raw", "Disable raw output mode (default)");

  return program;
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  try {
    const program = createProgram();
    program.parse();

    const options = program.opts<CliArgs>();
    const args = program.args;
    const prompt = args[0];

    if (!prompt || prompt.trim() === "") {
      console.error("❌ Error: Prompt is required");
      console.error("Usage: elevator <prompt>");
      process.exit(1);
    }

    await processPrompt(prompt, options);
  } catch (error) {
    console.error(
      `❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

// Execute main function only if this file is run directly (not imported)
// Check if this module is the main entry point
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
