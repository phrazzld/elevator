/**
 * Test data builders for formatter-related types.
 *
 * These builders provide fluent APIs for creating formatter objects with sensible defaults
 * and easy customization for testing different formatting scenarios.
 */

import type {
  FormattedContent,
  ProgressIndicator,
  FormatOptions,
  FormatterError,
} from "../../core/formatter";

/**
 * Builder for FormattedContent objects.
 */
export class FormattedContentBuilder {
  private text = "Formatted test content";
  private metadata: FormattedContent["metadata"] = {
    styled: true,
    mode: "formatted",
    contentType: "content",
  };

  withText(text: string): this {
    this.text = text;
    return this;
  }

  withMetadata(metadata: FormattedContent["metadata"]): this {
    this.metadata = metadata;
    return this;
  }

  withStyled(styled: boolean): this {
    this.metadata = { ...this.metadata, styled };
    return this;
  }

  withMode(mode: FormattedContent["metadata"]["mode"]): this {
    this.metadata = { ...this.metadata, mode };
    return this;
  }

  withContentType(
    contentType: FormattedContent["metadata"]["contentType"],
  ): this {
    this.metadata = { ...this.metadata, contentType };
    return this;
  }

  asRawContent(): this {
    this.metadata = { styled: false, mode: "raw", contentType: "content" };
    return this;
  }

  asFormattedContent(): this {
    this.metadata = { styled: true, mode: "formatted", contentType: "content" };
    return this;
  }

  asErrorContent(): this {
    this.text = "Error: Something went wrong";
    this.metadata = { styled: true, mode: "formatted", contentType: "error" };
    return this;
  }

  asProgressContent(): this {
    this.text = "Processing...";
    this.metadata = {
      styled: true,
      mode: "formatted",
      contentType: "progress",
    };
    return this;
  }

  asSystemContent(): this {
    this.text = "System message";
    this.metadata = { styled: true, mode: "formatted", contentType: "system" };
    return this;
  }

  withColors(): this {
    this.text = "\x1b[32mGreen text\x1b[0m"; // ANSI green color
    this.metadata = { styled: true, mode: "formatted", contentType: "content" };
    return this;
  }

  withLongContent(): this {
    this.text =
      "This is a very long piece of content that would wrap across multiple lines in a terminal and might need special handling for formatting and display purposes.".repeat(
        3,
      );
    return this;
  }

  build(): FormattedContent {
    return {
      text: this.text,
      metadata: this.metadata,
    };
  }
}

/**
 * Builder for ProgressIndicator objects.
 */
export class ProgressIndicatorBuilder {
  private message = "Processing...";
  private stage: ProgressIndicator["stage"] = "thinking";
  private active = true;
  private progress?: number;

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withStage(stage: ProgressIndicator["stage"]): this {
    this.stage = stage;
    return this;
  }

  withActive(active: boolean): this {
    this.active = active;
    return this;
  }

  withProgress(progress: number): this {
    this.progress = progress;
    return this;
  }

  withoutProgress(): this {
    this.progress = undefined;
    return this;
  }

  asThinking(): this {
    this.message = "Thinking...";
    this.stage = "thinking";
    this.active = true;
    return this.withoutProgress();
  }

  asProcessing(): this {
    this.message = "Processing request...";
    this.stage = "processing";
    this.active = true;
    this.progress = 50;
    return this;
  }

  asComplete(): this {
    this.message = "Complete";
    this.stage = "complete";
    this.active = false;
    this.progress = 100;
    return this;
  }

  asInactive(): this {
    this.active = false;
    return this;
  }

  withCustomProgress(progress: number, message?: string): this {
    this.progress = progress;
    if (message) {
      this.message = message;
    }
    return this;
  }

  build(): ProgressIndicator {
    if (this.progress !== undefined) {
      return {
        message: this.message,
        stage: this.stage,
        active: this.active,
        progress: this.progress,
      };
    }

    return {
      message: this.message,
      stage: this.stage,
      active: this.active,
    };
  }
}

/**
 * Builder for FormatOptions objects.
 */
export class FormatOptionsBuilder {
  private enableStyling?: boolean;
  private mode?: FormatOptions["mode"];
  private streaming?: boolean;
  private style?: FormatOptions["style"];

  withEnableStyling(enableStyling: boolean): this {
    this.enableStyling = enableStyling;
    return this;
  }

  withMode(mode: FormatOptions["mode"]): this {
    this.mode = mode;
    return this;
  }

  withStreaming(streaming: boolean): this {
    this.streaming = streaming;
    return this;
  }

  withStyle(style: FormatOptions["style"]): this {
    this.style = style;
    return this;
  }

  withAccentColor(accent: string): this {
    this.style = { ...this.style, accent };
    return this;
  }

  withErrorColor(error: string): this {
    this.style = { ...this.style, error };
    return this;
  }

  withSuccessColor(success: string): this {
    this.style = { ...this.style, success };
    return this;
  }

  withWarningColor(warning: string): this {
    this.style = { ...this.style, warning };
    return this;
  }

  asRawMode(): this {
    this.mode = "raw";
    this.enableStyling = false;
    this.streaming = false;
    return this;
  }

  asFormattedMode(): this {
    this.mode = "formatted";
    this.enableStyling = true;
    this.streaming = true;
    return this;
  }

  asStreamingMode(): this {
    this.streaming = true;
    this.mode = "formatted";
    return this;
  }

  asBatchMode(): this {
    this.streaming = false;
    this.mode = "formatted";
    return this;
  }

  withDefaultColors(): this {
    this.style = {
      accent: "#00ff00",
      error: "#ff0000",
      success: "#00ff00",
      warning: "#ffff00",
    };
    return this;
  }

  withMinimalOptions(): this {
    this.enableStyling = false;
    this.mode = "raw";
    this.streaming = false;
    return this;
  }

  withFullOptions(): this {
    this.enableStyling = true;
    this.mode = "formatted";
    this.streaming = true;
    this.withDefaultColors();
    return this;
  }

  build(): FormatOptions {
    const options: FormatOptions = {};

    if (this.enableStyling !== undefined) {
      (options as { enableStyling: boolean }).enableStyling =
        this.enableStyling;
    }

    if (this.mode !== undefined) {
      (options as { mode: FormatOptions["mode"] }).mode = this.mode;
    }

    if (this.streaming !== undefined) {
      (options as { streaming: boolean }).streaming = this.streaming;
    }

    if (this.style !== undefined) {
      (options as { style: FormatOptions["style"] }).style = this.style;
    }

    return options;
  }
}

/**
 * Builder for FormatterError objects.
 */
export class FormatterErrorBuilder {
  private code: FormatterError["code"] = "FORMAT_ERROR";
  private message = "Formatting operation failed";
  private details?: FormatterError["details"];

  withCode(code: FormatterError["code"]): this {
    this.code = code;
    return this;
  }

  withMessage(message: string): this {
    this.message = message;
    return this;
  }

  withDetails(details: FormatterError["details"]): this {
    this.details = details;
    return this;
  }

  withOriginalContent(originalContent: string): this {
    this.details = { ...this.details, originalContent };
    return this;
  }

  withOptions(options: FormatOptions): this {
    this.details = { ...this.details, options };
    return this;
  }

  asFormatError(): this {
    this.code = "FORMAT_ERROR";
    this.message = "Failed to format content";
    this.details = { originalContent: "test content" };
    return this;
  }

  asInvalidContentError(): this {
    this.code = "INVALID_CONTENT";
    this.message = "Content is invalid for formatting";
    this.details = {}; // No originalContent for invalid content
    return this;
  }

  asUnknownError(): this {
    this.code = "UNKNOWN_ERROR";
    this.message = "An unknown formatting error occurred";
    return this;
  }

  build(): FormatterError {
    const error: FormatterError = {
      type: "formatter",
      code: this.code,
      message: this.message,
    };

    if (this.details !== undefined) {
      (error as { details: FormatterError["details"] }).details = this.details;
    }

    return error;
  }
}

/**
 * Convenience functions for common test scenarios.
 */

/**
 * Creates basic formatted content for testing.
 */
export function createTestFormattedContent(
  text = "Test content",
): FormattedContent {
  return new FormattedContentBuilder().withText(text).build();
}

/**
 * Creates an active progress indicator for testing.
 */
export function createTestProgressIndicator(): ProgressIndicator {
  return new ProgressIndicatorBuilder().asThinking().build();
}

/**
 * Creates default format options for testing.
 */
export function createTestFormatOptions(): FormatOptions {
  return new FormatOptionsBuilder().asFormattedMode().build();
}

/**
 * Creates a collection of formatted content for different content types.
 */
export function createFormattedContentSuite() {
  return {
    content: new FormattedContentBuilder().asFormattedContent().build(),
    error: new FormattedContentBuilder().asErrorContent().build(),
    progress: new FormattedContentBuilder().asProgressContent().build(),
    system: new FormattedContentBuilder().asSystemContent().build(),
    raw: new FormattedContentBuilder().asRawContent().build(),
  };
}

/**
 * Creates a progress sequence showing different stages.
 */
export function createProgressSequence(): ProgressIndicator[] {
  return [
    new ProgressIndicatorBuilder().asThinking().build(),
    new ProgressIndicatorBuilder().asProcessing().withProgress(25).build(),
    new ProgressIndicatorBuilder().asProcessing().withProgress(50).build(),
    new ProgressIndicatorBuilder().asProcessing().withProgress(75).build(),
    new ProgressIndicatorBuilder().asComplete().build(),
  ];
}
