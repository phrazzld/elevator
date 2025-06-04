/**
 * Core output formatting interfaces and types.
 *
 * This module defines the contracts for output formatting as defined by the core domain.
 * Following hexagonal architecture, these interfaces are owned by the core and implemented
 * by infrastructure adapters.
 */

import { type Result } from "./promptProcessor";

/**
 * Configuration options for output formatting.
 */
export interface FormatOptions {
  /** Whether to apply colors and styling */
  readonly enableStyling?: boolean;

  /**
   * Output mode preference:
   * - "formatted": Apply colors, styling, and interactive elements (default)
   * - "raw": Plain text output with no colors, styling, or progress indicators
   */
  readonly mode?: "formatted" | "raw";

  /** Whether output should be optimized for streaming */
  readonly streaming?: boolean;

  /** Custom styling preferences */
  readonly style?: {
    readonly accent?: string;
    readonly error?: string;
    readonly success?: string;
    readonly warning?: string;
  };
}

/**
 * Formatted content ready for display.
 */
export interface FormattedContent {
  /** The formatted text content */
  readonly text: string;

  /** Metadata about the formatting applied */
  readonly metadata: {
    /** Whether styling was applied */
    readonly styled: boolean;
    /** Output mode used */
    readonly mode: "formatted" | "raw";
    /** Content type for appropriate handling */
    readonly contentType: "content" | "error" | "progress" | "system";
  };
}

/**
 * Progress indicator state and display information.
 */
export interface ProgressIndicator {
  /** Current progress message */
  readonly message: string;

  /** Progress stage indicator */
  readonly stage: "thinking" | "processing" | "complete";

  /** Whether the progress indicator is currently active */
  readonly active: boolean;

  /** Estimated completion percentage (0-100) if available */
  readonly progress?: number;
}

/**
 * Error information for formatting failures.
 */
export interface FormatterError {
  readonly type: "formatter";
  readonly code: "FORMAT_ERROR" | "INVALID_CONTENT" | "UNKNOWN_ERROR";
  readonly message: string;
  readonly details?: {
    readonly originalContent?: string;
    readonly options?: FormatOptions;
  };
}

/**
 * Core interface for output formatting.
 * Defined by the core domain and implemented by infrastructure adapters.
 */
export interface OutputFormatter {
  /**
   * Format content for display output.
   *
   * @param content The content to format
   * @param options Optional formatting configuration
   * @returns Promise resolving to formatted content or error
   */
  formatContent(
    content: string,
    options?: FormatOptions,
  ): Promise<Result<FormattedContent, FormatterError>>;

  /**
   * Format error messages for user-friendly display.
   *
   * @param error The error to format
   * @param options Optional formatting configuration
   * @returns Promise resolving to formatted error content or error
   */
  formatError(
    error: unknown,
    options?: FormatOptions,
  ): Promise<Result<FormattedContent, FormatterError>>;

  /**
   * Create and manage progress indicators.
   *
   * @param message Initial progress message
   * @param options Optional formatting configuration
   * @returns Promise resolving to progress indicator or error
   */
  createProgress(
    message: string,
    options?: FormatOptions,
  ): Promise<Result<ProgressIndicator, FormatterError>>;

  /**
   * Update an existing progress indicator.
   *
   * @param indicator The progress indicator to update
   * @param update Partial update to apply
   * @returns Promise resolving to updated progress indicator or error
   */
  updateProgress(
    indicator: ProgressIndicator,
    update: Partial<Pick<ProgressIndicator, "message" | "stage" | "progress">>,
  ): Promise<Result<ProgressIndicator, FormatterError>>;

  /**
   * Complete and hide a progress indicator.
   *
   * @param indicator The progress indicator to complete
   * @returns Promise resolving to success or error
   */
  completeProgress(
    indicator: ProgressIndicator,
  ): Promise<Result<void, FormatterError>>;

  /**
   * Format content optimized for streaming output.
   *
   * @param contentChunk Partial content chunk from streaming
   * @param options Optional formatting configuration
   * @returns Promise resolving to formatted chunk or error
   */
  formatStreamChunk(
    contentChunk: string,
    options?: FormatOptions,
  ): Promise<Result<FormattedContent, FormatterError>>;
}

/**
 * Helper to create formatter errors.
 */
export function createFormatterError(
  code: FormatterError["code"],
  message: string,
  details?: FormatterError["details"],
): FormatterError {
  const error: FormatterError = {
    type: "formatter",
    code,
    message,
  };

  if (details !== undefined) {
    return { ...error, details };
  }

  return error;
}

/**
 * Type guard to check if an error is a formatter error.
 */
export function isFormatterError(error: unknown): error is FormatterError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "formatter"
  );
}
