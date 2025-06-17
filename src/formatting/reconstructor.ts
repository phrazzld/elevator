/**
 * Text reconstruction functions for reassembling elevated content with preserved formatting.
 */

import type { FormattedSegment } from "./types.js";

/**
 * Reconstruct text from formatted segments.
 *
 * @param segments - Array of formatted segments with optional elevated content
 * @returns Reconstructed text with preserved formatting
 */
export function reconstructText(segments: FormattedSegment[]): string {
  // Handle edge cases
  if (!segments || segments.length === 0) {
    return "";
  }

  // Intelligently reconstruct segments with proper spacing
  const result: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!; // Safe because i < segments.length
    const nextSegment = segments[i + 1];
    const reconstructedSegment = reconstructSegment(segment);

    result.push(reconstructedSegment);

    // Add newline spacing for proper formatting between different segment types
    if (nextSegment) {
      const needsNewline =
        // Case 1: Elevated text before code block (not inline code)
        (segment.elevated !== undefined &&
          nextSegment.formatting.type === "codeblock" &&
          nextSegment.formatting.marker === "```" &&
          !reconstructedSegment.endsWith("\n")) ||
        // Case 2: Code block (not inline code) before text that IS elevated
        (segment.formatting.type === "codeblock" &&
          segment.formatting.marker === "```" &&
          nextSegment.elevated !== undefined &&
          !reconstructedSegment.endsWith("\n"));

      if (needsNewline) {
        result.push("\n");
      }
    }
  }

  return result.join("");
}

/**
 * Reconstruct a single segment with appropriate formatting.
 *
 * @param _segment - The segment to reconstruct
 * @returns Reconstructed text for this segment
 */
export function reconstructSegment(segment: FormattedSegment): string {
  // If segment has elevated content, use it instead of original
  if (segment.elevated !== undefined) {
    return segment.elevated;
  }

  // Otherwise, use the original text to preserve formatting
  return segment.formatting.originalText;
}
