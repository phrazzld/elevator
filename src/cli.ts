#!/usr/bin/env node

/**
 * elevator CLI entry point
 * A lightweight CLI that accepts natural-language prompts and returns
 * richer, more technical articulations using Google Gemini 2.5 Flash
 */

import { Command } from "commander";
import {
  createAppConfig,
  ConfigurationError,
  type AppConfig,
} from "./config.js";
import { createValidatedServiceContainer } from "./dependencyInjection.js";
import { InteractiveREPL, type REPLOptions } from "./repl/repl.js";
import { validateStartupSecurity } from "./core/security.js";
import { toUserFriendlyError } from "./core/errors.js";
import { createRawPrompt, isOk, isErr } from "./core/promptProcessor.js";

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
    .name("elevator")
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
 * Main CLI entry point. Parses arguments, creates configuration, and starts the application.
 */
async function main(): Promise<void> {
  try {
    const program = createProgram();
    program.parse();

    const options = program.opts<CliArgs>();
    const args = program.args;
    const singlePrompt = args[0];

    // Merge CLI arguments with environment variables
    const mergedEnv = mergeCliWithEnv(options);

    // Create configuration using existing pure function
    const config: AppConfig = createAppConfig(mergedEnv);

    // Validate security (including API key functionality)
    console.log("🔐 Validating API key and security settings...");
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

    // Create and wire all application services
    const services = createValidatedServiceContainer(config);

    // Create root logger for CLI operations
    const logger = services.loggerFactory.createRootLogger({
      component: "cli",
      operation: "startup",
    });

    logger.info("Application startup initiated", {
      config: {
        model: config.api.modelId,
        temperature: config.api.temperature,
        streaming: config.output.streaming,
        rawMode: config.output.raw,
        logLevel: config.logging.level,
      },
    });

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

    logger.info("Services initialized successfully", {
      correlationId: logger.getCorrelationId(),
    });

    // Handle single prompt mode vs interactive REPL
    if (singlePrompt) {
      // Single prompt mode - process and exit
      console.log("\n🚀 Processing single prompt...");

      const promptLogger = services.loggerFactory.createRootLogger({
        component: "cli",
        operation: "single_prompt",
      });

      try {
        const rawPrompt = createRawPrompt(singlePrompt);
        const result =
          await services.promptProcessingService.processPrompt(rawPrompt);

        if (isErr(result)) {
          const userFriendlyError = toUserFriendlyError(result.error);

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

          promptLogger.error(
            "Single prompt processing failed",
            new Error(result.error.message),
          );

          process.exit(1);
        }

        if (isOk(result)) {
          // Success case
          if (config.output.raw) {
            console.log(result.value.content);
          } else {
            console.log("\n✨ Enhanced prompt:");
            console.log(result.value.content);
          }

          promptLogger.info("Single prompt processed successfully", {
            promptLength: singlePrompt.length,
            resultLength: result.value.content.length,
          });
        }
      } catch (error) {
        const userFriendlyError = toUserFriendlyError(
          error instanceof Error ? error : new Error(String(error)),
        );

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

        promptLogger.error(
          "Single prompt processing failed",
          error instanceof Error ? error : new Error(String(error)),
        );

        process.exit(1);
      }
    } else {
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

// Execute main function - this is always the CLI entry point
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
