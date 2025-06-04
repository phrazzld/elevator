/**
 * Console output formatter adapter implementation.
 *
 * This adapter implements the OutputFormatter interface using chalk for
 * terminal styling and ora for progress indicators, following hexagonal
 * architecture principles.
 */

import chalk from "chalk";
import ora, { type Ora } from "ora";

import {
  type OutputFormatter,
  type FormattedContent,
  type ProgressIndicator,
  type FormatOptions,
  type FormatterError,
  createFormatterError,
} from "../core/formatter";
import { success, failure, type Result } from "../core/promptProcessor";

/**
 * Internal progress indicator state with ora instance.
 */
interface InternalProgressIndicator {
  readonly id: string;
  readonly message: string;
  readonly stage: "thinking" | "processing" | "complete";
  readonly active: boolean;
  readonly progress?: number;
  readonly spinner: Ora;
}

/**
 * Track if cleanup handlers have been registered globally.
 */
let cleanupHandlersRegistered = false;
const formatters = new Set<ConsoleFormatter>();

/**
 * Console formatter implementation using chalk and ora.
 */
export class ConsoleFormatter implements OutputFormatter {
  private activeIndicators: Map<string, InternalProgressIndicator>;
  private indicatorIdCounter: number;
  private readonly isColorEnabled: boolean;
  private readonly isTTY: boolean;

  constructor() {
    this.activeIndicators = new Map();
    this.indicatorIdCounter = 0;
    this.isTTY = process.stdout.isTTY ?? false;
    this.isColorEnabled = this.detectColorSupport();

    // Track this instance
    formatters.add(this);

    // Register cleanup on process exit (only once globally)
    this.registerCleanupHandlers();
  }

  /**
   * Register cleanup handlers for process exit.
   */
  private registerCleanupHandlers(): void {
    if (this.isTTY && !cleanupHandlersRegistered) {
      cleanupHandlersRegistered = true;
      const cleanup = () => {
        formatters.forEach((formatter) => {
          formatter.cleanup();
        });
      };
      process.on("exit", cleanup);
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    }
  }

  /**
   * Detect if color output should be enabled.
   */
  private detectColorSupport(): boolean {
    // Respect NO_COLOR environment variable
    if (process.env["NO_COLOR"] === "1" || process.env["NO_COLOR"] === "true") {
      return false;
    }

    // Respect FORCE_COLOR environment variable
    if (
      process.env["FORCE_COLOR"] === "1" ||
      process.env["FORCE_COLOR"] === "true"
    ) {
      return true;
    }

    // Default to TTY detection
    return this.isTTY;
  }

  /**
   * Format content for display output.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async formatContent(
    content: string,
    options?: FormatOptions,
  ): Promise<Result<FormattedContent, FormatterError>> {
    try {
      // Validate input
      if (content === null || content === undefined) {
        return failure(
          createFormatterError(
            "INVALID_CONTENT",
            "Content cannot be null or undefined",
            { originalContent: String(content), ...(options && { options }) },
          ),
        );
      }

      const text = String(content);
      const isRaw = options?.mode === "raw";
      const isStyled =
        !isRaw && options?.enableStyling !== false && this.isColorEnabled;

      return success({
        text,
        metadata: {
          styled: isStyled,
          mode: isRaw ? "raw" : "formatted",
          contentType: "content",
        },
      });
    } catch (error) {
      return failure(
        createFormatterError(
          "FORMAT_ERROR",
          error instanceof Error ? error.message : "Failed to format content",
          { originalContent: String(content), ...(options && { options }) },
        ),
      );
    }
  }

  /**
   * Format error messages for user-friendly display.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async formatError(
    error: unknown,
    options?: FormatOptions,
  ): Promise<Result<FormattedContent, FormatterError>> {
    try {
      let errorMessage: string;
      let stackTrace: string | undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        stackTrace = error.stack;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        errorMessage = "Unknown error occurred";
      }

      // Format the error message
      let formattedText: string;
      const isRaw = options?.mode === "raw";
      const isStyled =
        !isRaw && options?.enableStyling !== false && this.isColorEnabled;

      if (isRaw || !isStyled) {
        formattedText = `Error: ${errorMessage}`;
      } else {
        formattedText = chalk.red(`Error: ${errorMessage}`);
      }

      // Include stack trace if available and not in raw mode
      if (stackTrace && options?.mode !== "raw" && isStyled) {
        const stackLines = stackTrace.split("\n").slice(1); // Skip first line (error message)
        const formattedStack = stackLines
          .map((line) => chalk.gray(line))
          .join("\n");
        formattedText += "\n" + formattedStack;
      } else if (stackTrace && options?.mode !== "raw") {
        // No styling but include stack trace
        formattedText += "\n" + stackTrace.split("\n").slice(1).join("\n");
      }

      return success({
        text: formattedText,
        metadata: {
          styled: isStyled,
          mode: isRaw ? "raw" : "formatted",
          contentType: "error",
        },
      });
    } catch {
      return failure(
        createFormatterError("FORMAT_ERROR", "Failed to format error", {
          originalContent: String(error),
          ...(options && { options }),
        }),
      );
    }
  }

  /**
   * Create and manage progress indicators.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async createProgress(
    message: string,
    options?: FormatOptions,
  ): Promise<Result<ProgressIndicator, FormatterError>> {
    try {
      // Generate unique ID
      const id = `progress-${++this.indicatorIdCounter}`;

      // Don't create spinners in non-TTY environments or raw mode
      if (!this.isTTY || options?.mode === "raw") {
        // Create internal indicator without spinner for raw mode
        const indicator: InternalProgressIndicator = {
          id,
          message,
          stage: "thinking",
          active: false,
          spinner: null as unknown as Ora, // No spinner in raw mode
        };

        // Track indicator even in raw mode for update/complete operations
        this.activeIndicators.set(id, indicator);

        return success({
          message: indicator.message,
          stage: indicator.stage,
          active: indicator.active,
        });
      }

      // Create ora spinner for normal mode
      const spinner = ora({
        text: message,
        spinner: "dots",
      });
      spinner.start();

      // Create internal indicator
      const indicator: InternalProgressIndicator = {
        id,
        message,
        stage: "thinking",
        active: true,
        spinner,
      };

      // Track indicator
      this.activeIndicators.set(id, indicator);

      // Return public indicator (without internal fields)
      return success({
        message: indicator.message,
        stage: indicator.stage,
        active: indicator.active,
      });
    } catch {
      return failure(
        createFormatterError(
          "FORMAT_ERROR",
          "Failed to create progress indicator",
          { originalContent: message, ...(options && { options }) },
        ),
      );
    }
  }

  /**
   * Update an existing progress indicator.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async updateProgress(
    indicator: ProgressIndicator,
    update: Partial<Pick<ProgressIndicator, "message" | "stage" | "progress">>,
  ): Promise<Result<ProgressIndicator, FormatterError>> {
    try {
      // Find the internal indicator
      const internalIndicator = this.findIndicatorByPublic(indicator);
      if (!internalIndicator) {
        return failure(
          createFormatterError(
            "INVALID_CONTENT",
            "Progress indicator not found or already completed",
          ),
        );
      }

      // Update the spinner text (only if spinner exists - not in raw mode)
      if (internalIndicator.spinner && update.message !== undefined) {
        internalIndicator.spinner.text = update.message;
      }

      // Update spinner based on stage (only if spinner exists - not in raw mode)
      if (internalIndicator.spinner && update.stage === "complete") {
        internalIndicator.spinner.succeed();
      }

      // Create updated indicator
      const updatedIndicator: InternalProgressIndicator = {
        ...internalIndicator,
        message: update.message ?? internalIndicator.message,
        stage: update.stage ?? internalIndicator.stage,
        ...(update.progress !== undefined && { progress: update.progress }),
      };

      // Update in map
      this.activeIndicators.set(internalIndicator.id, updatedIndicator);

      // Return public indicator
      const publicIndicator: ProgressIndicator =
        updatedIndicator.progress !== undefined
          ? {
              message: updatedIndicator.message,
              stage: updatedIndicator.stage,
              active: updatedIndicator.active,
              progress: updatedIndicator.progress,
            }
          : {
              message: updatedIndicator.message,
              stage: updatedIndicator.stage,
              active: updatedIndicator.active,
            };

      return success(publicIndicator);
    } catch {
      return failure(
        createFormatterError(
          "FORMAT_ERROR",
          "Failed to update progress indicator",
        ),
      );
    }
  }

  /**
   * Complete and hide a progress indicator.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async completeProgress(
    indicator: ProgressIndicator,
  ): Promise<Result<void, FormatterError>> {
    try {
      // Find the internal indicator
      const internalIndicator = this.findIndicatorByPublic(indicator);
      if (!internalIndicator) {
        // Already completed or not found
        return success(undefined);
      }

      // Stop the spinner (only if spinner exists - not in raw mode)
      if (internalIndicator.spinner) {
        internalIndicator.spinner.stop();
      }

      // Remove from active indicators
      this.activeIndicators.delete(internalIndicator.id);

      return success(undefined);
    } catch {
      return failure(
        createFormatterError(
          "FORMAT_ERROR",
          "Failed to complete progress indicator",
        ),
      );
    }
  }

  /**
   * Format content optimized for streaming output.
   *
   * When streaming mode is enabled (default), progress indicators are temporarily
   * paused during chunk output to prevent visual conflicts. When streaming mode
   * is disabled, chunks are formatted without interrupting progress indicators.
   */
  async formatStreamChunk(
    contentChunk: string,
    options?: FormatOptions,
  ): Promise<Result<FormattedContent, FormatterError>> {
    try {
      // Determine if we should pause spinners based on streaming option
      // Default to true for backward compatibility
      const shouldPauseSpinners = options?.streaming !== false;

      if (shouldPauseSpinners) {
        // For streaming, we need to clear any active spinners temporarily
        this.pauseAllSpinners();
      }

      // Format the chunk (minimal processing for performance)
      const result = await this.formatContent(contentChunk, options);

      if (shouldPauseSpinners) {
        // Resume spinners after output
        this.resumeAllSpinners();
      }

      return result;
    } catch {
      return failure(
        createFormatterError("FORMAT_ERROR", "Failed to format stream chunk", {
          originalContent: contentChunk,
          ...(options && { options }),
        }),
      );
    }
  }

  /**
   * Find internal indicator by public indicator properties.
   */
  private findIndicatorByPublic(
    indicator: ProgressIndicator,
  ): InternalProgressIndicator | undefined {
    const indicators = Array.from(this.activeIndicators.values());
    return indicators.find(
      (internal) =>
        internal.message === indicator.message &&
        internal.stage === indicator.stage &&
        internal.active === indicator.active,
    );
  }

  /**
   * Pause all active spinners (for streaming output).
   */
  private pauseAllSpinners(): void {
    this.activeIndicators.forEach((indicator) => {
      // Only pause spinner if it exists (not in raw mode)
      if (indicator.spinner && indicator.spinner.isSpinning) {
        indicator.spinner.stop();
      }
    });
  }

  /**
   * Resume all paused spinners.
   */
  private resumeAllSpinners(): void {
    this.activeIndicators.forEach((indicator) => {
      // Only resume spinner if it exists (not in raw mode)
      if (
        indicator.spinner &&
        !indicator.spinner.isSpinning &&
        indicator.active
      ) {
        indicator.spinner.start();
      }
    });
  }

  /**
   * Clean up all active indicators (for process exit).
   */
  public cleanup(): void {
    this.activeIndicators.forEach((indicator) => {
      // Only stop spinner if it exists (not in raw mode)
      if (indicator.spinner) {
        indicator.spinner.stop();
      }
    });
    this.activeIndicators.clear();
  }
}
