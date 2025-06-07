/**
 * REPL (Read-Eval-Print Loop) implementation for elevator CLI.
 *
 * This module provides an interactive command-line interface that accepts
 * natural language prompts and returns enhanced responses using the Gemini API.
 * Following hexagonal architecture, it depends on core services through
 * dependency injection.
 */

import * as readline from "readline";
import { type ServiceContainer } from "../dependencyInjection";
import {
  createRawPrompt,
  isOk,
  type EnhancedPrompt,
} from "../core/promptProcessor";
import { type FormatOptions } from "../core/formatter";
import { sanitizeUserInput, validateInputSafety } from "../core/security";
import { type LoggerFactory, type Logger } from "../core/logger";

/**
 * Configuration options for the REPL.
 */
export interface REPLOptions {
  /** Prompt string to display to users */
  readonly prompt?: string;

  /** Welcome message to display on startup */
  readonly welcomeMessage?: string;

  /** Goodbye message to display on exit */
  readonly goodbyeMessage?: string;

  /** Output formatting options */
  readonly formatOptions?: FormatOptions;

  /** Enable debug mode with additional logging */
  readonly debug?: boolean;

  /** Logger factory for creating contextual loggers */
  readonly loggerFactory?: LoggerFactory;
}

/**
 * Special commands that the REPL handles directly.
 */
export enum SpecialCommand {
  EXIT = "exit",
  QUIT = "quit",
  HELP = "help",
  CLEAR = "clear",
}

/**
 * Result of parsing user input to determine command type.
 */
export type CommandParseResult =
  | { type: "special"; command: SpecialCommand }
  | { type: "prompt"; content: string };

/**
 * Interface for the REPL (Read-Eval-Print Loop).
 * Provides interactive command-line interface for prompt processing.
 */
export interface REPL {
  /**
   * Starts the interactive REPL loop.
   * This method will block until the user exits the REPL.
   *
   * @returns Promise that resolves when the REPL is closed
   */
  start(): Promise<void>;

  /**
   * Stops the REPL gracefully.
   * This will close the readline interface and cleanup resources.
   */
  stop(): void;
}

/**
 * Default implementation of the REPL interface.
 * Uses Node.js readline for interactive input and integrates with
 * the prompt processing pipeline through dependency injection.
 */
export class InteractiveREPL implements REPL {
  private readline: readline.Interface | undefined;
  private isRunning = false;
  private logger: Logger;

  constructor(
    private readonly services: ServiceContainer,
    private readonly options: REPLOptions = {},
  ) {
    // Create logger for REPL operations
    const loggerFactory = options.loggerFactory || services.loggerFactory;
    this.logger = loggerFactory.createRootLogger({
      component: "repl",
      operation: "session",
    });
  }

  /**
   * Starts the interactive REPL loop.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("REPL is already running");
    }

    this.logger.info("Starting REPL session", {
      sessionId: this.logger.getCorrelationId(),
    });

    this.isRunning = true;
    this.setupReadline();
    await this.displayWelcome();

    return new Promise((resolve) => {
      // Set up the promise resolver for when REPL exits
      this.setupExitHandler(resolve);
      this.promptUser();
    });
  }

  /**
   * Stops the REPL gracefully.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Display goodbye message without blocking
    void this.displayGoodbye().catch(() => {
      console.log("👋 Goodbye! Thank you for using elevator.");
    });

    if (this.readline) {
      this.readline.close();
      this.readline = undefined;
    }
  }

  /**
   * Sets up the readline interface with proper configuration.
   */
  private setupReadline(): void {
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.options.prompt || "prompt> ",
    });

    // Handle Ctrl+C gracefully
    this.readline.on("SIGINT", () => {
      this.handleCtrlC();
    });

    // Handle line input
    this.readline.on("line", (input: string) => {
      void this.handleUserInput(input.trim());
    });
  }

  /**
   * Sets up exit handler for graceful shutdown.
   */
  private setupExitHandler(resolve: () => void): void {
    if (!this.readline) {
      throw new Error("Readline not initialized");
    }

    this.readline.on("close", () => {
      resolve();
    });
  }

  /**
   * Displays welcome message to the user.
   */
  private async displayWelcome(): Promise<void> {
    const welcomeMessage =
      this.options.welcomeMessage ||
      "🚀 Welcome to elevator! Enter your prompts below. Type 'help' for commands or 'exit' to quit.";

    const result = await this.services.formatter.formatContent(
      welcomeMessage,
      this.options.formatOptions,
    );

    if (isOk(result)) {
      console.log(result.value.text);
      console.log(); // Empty line for spacing
    } else {
      console.log(welcomeMessage); // Fallback to unformatted
    }
  }

  /**
   * Displays goodbye message to the user.
   */
  private async displayGoodbye(): Promise<void> {
    const goodbyeMessage =
      this.options.goodbyeMessage ||
      "👋 Goodbye! Thank you for using elevator.";

    const result = await this.services.formatter.formatContent(
      goodbyeMessage,
      this.options.formatOptions,
    );

    console.log();
    if (isOk(result)) {
      console.log(result.value.text);
    } else {
      console.log(goodbyeMessage); // Fallback to unformatted
    }
  }

  /**
   * Prompts the user for input.
   */
  private promptUser(): void {
    if (!this.isRunning || !this.readline) {
      return;
    }

    this.readline.prompt();
  }

  /**
   * Handles user input by parsing and processing it.
   */
  private async handleUserInput(input: string): Promise<void> {
    if (!input) {
      this.promptUser();
      return;
    }

    const parseResult = this.parseCommand(input);

    if (parseResult.type === "special") {
      await this.handleSpecialCommand(parseResult.command);
    } else {
      await this.handlePrompt(parseResult.content);
    }

    this.promptUser();
  }

  /**
   * Parses user input to determine if it's a special command or regular prompt.
   */
  private parseCommand(input: string): CommandParseResult {
    const lowerInput = input.toLowerCase();

    // Check for special commands
    if (lowerInput === "exit" || lowerInput === "quit") {
      return { type: "special", command: SpecialCommand.EXIT };
    }
    if (lowerInput === "help") {
      return { type: "special", command: SpecialCommand.HELP };
    }
    if (lowerInput === "clear") {
      return { type: "special", command: SpecialCommand.CLEAR };
    }

    // Regular prompt
    return { type: "prompt", content: input };
  }

  /**
   * Handles special commands like exit, help, etc.
   */
  private async handleSpecialCommand(command: SpecialCommand): Promise<void> {
    switch (command) {
      case SpecialCommand.EXIT:
        this.stop();
        break;

      case SpecialCommand.HELP:
        await this.displayHelp();
        break;

      case SpecialCommand.CLEAR:
        await this.clearScreen();
        break;

      default: {
        const error = `Unknown special command: ${command}`;
        await this.displayError(error);
        break;
      }
    }
  }

  /**
   * Handles regular prompts by processing them through the pipeline.
   */
  private async handlePrompt(content: string): Promise<void> {
    // Create a new logger with fresh correlation ID for this user interaction
    const loggerFactory =
      this.options.loggerFactory || this.services.loggerFactory;
    const requestLogger = loggerFactory.createRootLogger({
      component: "repl",
      operation: "prompt_processing",
      sessionId: this.logger.getCorrelationId(),
    });

    try {
      requestLogger.info("Processing user prompt", {
        promptLength: content.length,
        hasContent: content.trim().length > 0,
      });

      // Sanitize user input to prevent injection attacks
      const sanitizedContent = sanitizeUserInput(content);

      // Validate input safety to prevent credential leakage
      if (!validateInputSafety(sanitizedContent)) {
        requestLogger.warn(
          "User input contains potentially sensitive information",
          {
            inputLength: content.length,
            sanitizedLength: sanitizedContent.length,
          },
        );

        await this.displayError(
          "Input contains potentially sensitive information (API keys, tokens, etc.). " +
            "Please remove any credentials from your prompt and try again.",
        );
        return;
      }

      requestLogger.debug("User input validated and sanitized", {
        originalLength: content.length,
        sanitizedLength: sanitizedContent.length,
      });

      // Create raw prompt with sanitized content
      const rawPrompt = createRawPrompt(sanitizedContent);

      // Process through the pipeline
      requestLogger.debug("Sending prompt to processing service");
      const result =
        await this.services.promptProcessingService.processPrompt(rawPrompt);

      if (isOk(result)) {
        requestLogger.info("Prompt processed successfully", {
          enhancedContentLength: result.value.content.length,
          processingTimeMs: Date.now() - Date.now(), // TODO: Add proper timing
        });

        await this.displayEnhancedPrompt(result.value);
      } else {
        const errorMessage = (result as { error: { message: string } }).error
          .message;
        requestLogger.error("Prompt processing failed", undefined, {
          errorMessage,
        });

        await this.displayError(`Prompt processing failed: ${errorMessage}`);
      }
    } catch (error) {
      requestLogger.error(
        "Unexpected error during prompt processing",
        error as Error,
        {
          errorType: error instanceof Error ? error.name : "unknown",
        },
      );

      await this.displayError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Displays an enhanced prompt result to the user.
   */
  private async displayEnhancedPrompt(enhanced: EnhancedPrompt): Promise<void> {
    const result = await this.services.formatter.formatContent(
      enhanced.content,
      this.options.formatOptions,
    );

    console.log();
    if (isOk(result)) {
      console.log(result.value.text);
    } else {
      console.log(enhanced.content); // Fallback to unformatted
    }
    console.log();
  }

  /**
   * Displays an error message to the user.
   */
  private async displayError(message: string): Promise<void> {
    const result = await this.services.formatter.formatError(
      new Error(message),
      this.options.formatOptions,
    );

    console.log();
    if (isOk(result)) {
      console.log(result.value.text);
    } else {
      console.log(`Error: ${message}`); // Fallback to simple formatting
    }
    console.log();
  }

  /**
   * Displays help information.
   */
  private async displayHelp(): Promise<void> {
    const helpText = `
Available commands:
  help     - Show this help message
  clear    - Clear the screen
  exit     - Exit the REPL
  quit     - Exit the REPL

Usage:
  Simply type your natural language prompt and press Enter.
  The prompt will be enhanced and returned using Google Gemini.

Examples:
  > Write a function to calculate fibonacci numbers
  > Explain how React hooks work
  > Create a REST API endpoint for user authentication
`;

    const result = await this.services.formatter.formatContent(
      helpText.trim(),
      this.options.formatOptions,
    );

    console.log();
    if (isOk(result)) {
      console.log(result.value.text);
    } else {
      console.log(helpText.trim()); // Fallback to unformatted
    }
    console.log();
  }

  /**
   * Clears the terminal screen.
   */
  private async clearScreen(): Promise<void> {
    console.clear();
    await this.displayWelcome();
  }

  /**
   * Handles Ctrl+C input gracefully.
   */
  private handleCtrlC(): void {
    console.log();
    console.log("^C");
    this.stop();
  }
}
