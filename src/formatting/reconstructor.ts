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

    // Add newline between elevated text and code blocks for proper formatting
    if (
      nextSegment &&
      segment.elevated !== undefined && // Current segment was elevated
      nextSegment.formatting.type === "codeblock" && // Next segment is a code block
      !reconstructedSegment.endsWith("\n")
    ) {
      // Current doesn't end with newline
      result.push("\n");
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
