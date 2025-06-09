#!/usr/bin/env node

/**
 * elevator CLI entry point
 * A lightweight CLI that accepts natural-language prompts and returns
 * richer, more technical articulations using Google Gemini 2.5 Flash
 *
 * Simplified version using direct API calls instead of complex dependency injection.
 */

import { Command } from "commander";
import { elevatePrompt } from "./api.js";
import { InteractiveREPL, type REPLOptions } from "./repl/repl.js";

// Legacy imports for REPL mode (will be removed when REPL is eliminated)
import {
  createAppConfig,
  ConfigurationError,
  type AppConfig,
} from "./config.js";
import { createValidatedServiceContainer } from "./dependencyInjection.js";
import { validateStartupSecurity } from "./core/security.js";
import { toUserFriendlyError } from "./core/errors.js";

/**
 * CLI argument interface (simplified)
 */
interface CliArgs {
  raw?: boolean;
}

/**
 * Handle single prompt processing using direct API call.
 * Simplified version that bypasses complex service container.
 *
 * @param prompt - The user's prompt to elevate
 */
export async function handleSinglePrompt(prompt: string): Promise<void> {
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

    // Output result (simple format for now)
    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error(
      "❌ Error processing prompt:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

/**
 * Merges CLI arguments with environment variables for REPL mode.
 * Simplified version that only handles raw output option.
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

  // Map CLI arguments to environment variable names (simplified)
  if (cliArgs.raw !== undefined) {
    merged["OUTPUT_RAW"] = cliArgs.raw.toString();
  }

  return merged;
}

/**
 * Sets up and configures the simplified commander CLI program.
 *
 * @returns Configured commander program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name("elevator")
    .description(
      "A lightweight CLI that continuously accepts natural-language prompts and returns richer, more technical articulations using Google Gemini 2.5 Flash",
    )
    .version("0.1.0")
    .argument(
      "[prompt]",
      "Optional: single prompt to process (if omitted, starts interactive mode)",
    );

  // Simplified options (only what's actually used)
  program
    .option("--raw", "Enable raw output mode (no formatting)")
    .option("--no-raw", "Disable raw output mode (default)");

  return program;
}

/**
 * Main CLI entry point. Simplified version with direct API calls for single prompts.
 */
async function main(): Promise<void> {
  try {
    const program = createProgram();
    program.parse();

    const options = program.opts<CliArgs>();
    const args = program.args;
    const singlePrompt = args[0];

    // Handle single prompt mode vs interactive REPL
    if (singlePrompt) {
      // Single prompt mode - simplified direct API call
      await handleSinglePrompt(singlePrompt);
    } else {
      // Interactive REPL mode - keep complex logic for now (will be removed in future)
      console.log("🔐 Validating API key and security settings...");

      // Use legacy complex configuration for REPL mode only
      const mergedEnv = mergeCliWithEnv(options);
      let config: AppConfig = createAppConfig(mergedEnv);

      const securityResult = await validateStartupSecurity(config);

      if (securityResult.success === false) {
        const userFriendlyError = toUserFriendlyError(securityResult.error);
        console.error(
          `\n❌ ${userFriendlyError.title}: ${userFriendlyError.message}`,
        );

        if (
          userFriendlyError.suggestions &&
          userFriendlyError.suggestions.length > 0
        ) {
          console.error("\n💡 Suggestions:");
          userFriendlyError.suggestions.forEach((suggestion) => {
            console.error(`   • ${suggestion}`);
          });
        }

        process.exit(1);
      }

      console.log("✅ API key validated successfully");

      // Create and wire all application services (for REPL only)
      const services = createValidatedServiceContainer(config);

      console.log("✅ Configuration and security validation complete");
      console.log(`   Model: ${config.api.modelId}`);
      console.log(`   Temperature: ${config.api.temperature}`);
      console.log(`   Streaming: ${config.output.streaming}`);
      console.log(`   Raw mode: ${config.output.raw}`);
      console.log("\n🔧 Services initialized:");
      console.log("   ✓ Prompt processing pipeline");
      console.log("   ✓ Gemini API client");
      console.log("   ✓ Console formatter");
      console.log("   ✓ Structured logging");

      // Interactive REPL mode
      console.log("\n🚀 Starting interactive REPL...");
      console.log();

      // Create and start the REPL
      const replOptions: REPLOptions = {
        formatOptions: {
          mode: config.output.raw ? "raw" : "formatted",
          streaming: config.output.streaming,
        },
        loggerFactory: services.loggerFactory,
      };

      const repl = new InteractiveREPL(services, replOptions);
      await repl.start();
    }
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

// Execute main function only if this file is run directly (not imported)
// Check if this module is the main entry point
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
