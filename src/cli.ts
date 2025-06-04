#!/usr/bin/env node

/**
 * prompt-elevator CLI entry point
 * A lightweight CLI that accepts natural-language prompts and returns
 * richer, more technical articulations using Google Gemini 2.5 Flash
 */

import { Command } from "commander";
import {
  createAppConfig,
  ConfigurationError,
  type AppConfig,
} from "./config.js";

/**
 * CLI argument interface matching configuration options
 */
interface CliArgs {
  model?: string;
  temp?: number;
  stream?: boolean;
  raw?: boolean;
}

/**
 * Merges CLI arguments with environment variables, giving CLI precedence.
 * This maintains the pure function approach of createAppConfig while allowing
 * CLI arguments to override environment variable defaults.
 *
 * @param cliArgs - Parsed CLI arguments
 * @param env - Environment variables (defaults to process.env)
 * @returns Merged environment-like object for configuration creation
 */
function mergeCliWithEnv(
  cliArgs: CliArgs,
  env: Record<string, string | undefined> = process.env,
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
 * Sets up and configures the commander CLI program with all available options.
 *
 * @returns Configured commander program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name("prompt-elevator")
    .description(
      "A lightweight CLI that continuously accepts natural-language prompts and returns richer, more technical articulations using Google Gemini 2.5 Flash",
    )
    .version("0.1.0");

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
 * Main CLI entry point. Parses arguments, creates configuration, and starts the application.
 */
function main(): void {
  try {
    const program = createProgram();
    program.parse();

    const options = program.opts<CliArgs>();

    // Merge CLI arguments with environment variables
    const mergedEnv = mergeCliWithEnv(options);

    // Create configuration using existing pure function
    const config: AppConfig = createAppConfig(mergedEnv);

    console.log("Configuration loaded successfully:");
    console.log(`Model: ${config.api.modelId}`);
    console.log(`Temperature: ${config.api.temperature}`);
    console.log(`Streaming: ${config.output.streaming}`);
    console.log(`Raw mode: ${config.output.raw}`);
    console.log("\n🚀 REPL implementation coming next!");
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(`Configuration Error: ${error.message}`);
      process.exit(1);
    } else {
      console.error(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  }
}

// Execute main function - this is always the CLI entry point
try {
  main();
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
}
