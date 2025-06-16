/**
 * Text reconstruction functions for reassembling elevated content with preserved formatting.
 */

import type { FormattedSegment } from "./types.js";

/**
 * Reconstruct text from formatted segments.
 *
 * @param _segments - Array of formatted segments with optional elevated content
 * @returns Reconstructed text with preserved formatting
 */
export function reconstructText(segments: FormattedSegment[]): string {
  // Handle edge cases
  if (!segments || segments.length === 0) {
    return "";
  }

  // Reconstruct each segment and join them
  return segments.map((segment) => reconstructSegment(segment)).join("");
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
