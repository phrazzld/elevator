/**
 * Type definitions for text formatting detection and preservation.
 */

/**
 * Information about a detected formatting element in text.
 */
export interface FormattingInfo {
  /** The type of formatting detected */
  type: "codeblock" | "quote" | "plain";

  /** The marker that identifies this formatting (e.g., '```', '>', '"') */
  marker: string;

  /** Programming language specified for code blocks (e.g., 'typescript', 'python') */
  language?: string;

  /** The content inside the formatting markers */
  content: string;

  /** The complete original text including markers */
  originalText: string;

  /** Starting character index in the original text */
  startIndex: number;

  /** Ending character index in the original text */
  endIndex: number;
}

/**
 * A text segment with associated formatting information and optional elevated content.
 */
export interface FormattedSegment {
  /** Formatting information for this segment */
  formatting: FormattingInfo;

  /** Elevated version of the content (undefined for segments to preserve as-is) */
  elevated?: string;
}
