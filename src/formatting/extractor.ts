/**
 * Content extraction functions for splitting text into segments for selective elevation.
 */

import type { FormattingInfo, FormattedSegment } from "./types.js";

/**
 * Extract segments from text based on formatting information.
 *
 * @param _text - The original text to segment
 * @param _formatting - Array of formatting information
 * @returns Array of formatted segments for processing
 */
export function extractSegments(
  text: string,
  formatting: FormattingInfo[],
): FormattedSegment[] {
  // Handle edge cases
  if (!text || typeof text !== "string") {
    return [];
  }

  if (!formatting || formatting.length === 0) {
    // No formatting - return single plain text segment
    return [createPlainSegment(text, 0)];
  }

  // Extract indices for splitting
  const indices = formatting.map((f) => ({
    start: f.startIndex,
    end: f.endIndex,
  }));

  // Split text into segments
  const textSegments = splitTextByIndices(text, indices);

  // Create formatted segments by mapping text segments to their types
  const result: FormattedSegment[] = [];
  let currentTextIndex = 0;
  let formattingIndex = 0;

  // Sort formatting by startIndex to ensure proper matching
  const sortedFormatting = [...formatting].sort(
    (a, b) => a.startIndex - b.startIndex,
  );

  for (const segment of textSegments) {
    const segmentStart = currentTextIndex;
    const segmentEnd = currentTextIndex + segment.length;

    // Check if this segment matches a formatting boundary
    let matchedFormatting: FormattingInfo | null = null;

    // Look for formatting that matches this segment's position
    for (let i = formattingIndex; i < sortedFormatting.length; i++) {
      const fmt = sortedFormatting[i]!;
      if (fmt.startIndex === segmentStart && fmt.endIndex === segmentEnd) {
        matchedFormatting = fmt;
        formattingIndex = i + 1; // Move to next formatting for efficiency
        break;
      }
    }

    if (matchedFormatting) {
      // This is a formatted segment
      result.push(createFormattedSegment(matchedFormatting));
    } else {
      // This is a plain text segment
      result.push(createPlainSegment(segment, segmentStart));
    }

    currentTextIndex = segmentEnd;
  }

  return result;
}

/**
 * Split text by formatting boundaries.
 *
 * @param text - The text to split
 * @param indices - Array of start/end indices for formatting
 * @returns Array of text segments
 */
export function splitTextByIndices(
  text: string,
  indices: Array<{ start: number; end: number }>,
): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  if (!indices || indices.length === 0) {
    return [text];
  }

  // Filter and sort valid indices
  const validIndices = indices
    .filter(
      ({ start, end }) =>
        start >= 0 && end > start && start < text.length && end <= text.length,
    )
    .sort((a, b) => a.start - b.start);

  if (validIndices.length === 0) {
    return [text];
  }

  const segments: string[] = [];
  let currentPos = 0;

  for (const { start, end } of validIndices) {
    // Skip if this boundary starts before our current position (handle overlaps)
    if (start < currentPos) {
      continue;
    }

    // Add plain text before this formatting boundary (if any)
    if (currentPos < start) {
      segments.push(text.slice(currentPos, start));
    }

    // Add the formatted segment
    segments.push(text.slice(start, end));
    currentPos = end;
  }

  // Add remaining plain text after the last boundary (if any)
  if (currentPos < text.length) {
    segments.push(text.slice(currentPos));
  }

  return segments;
}

/**
 * Create a plain text segment.
 *
 * @param text - The plain text content
 * @param startIndex - Starting index in original text
 * @returns Formatted segment for plain text
 */
export function createPlainSegment(
  text: string,
  startIndex: number,
): FormattedSegment {
  // TODO: Implement plain segment creation
  return {
    formatting: {
      type: "plain",
      marker: "",
      content: text,
      originalText: text,
      startIndex,
      endIndex: startIndex + text.length,
    },
  };
}

/**
 * Create a formatted segment with preservation marking.
 *
 * @param formatting - The formatting information
 * @returns Formatted segment with appropriate preservation settings
 */
export function createFormattedSegment(
  formatting: FormattingInfo,
): FormattedSegment {
  // TODO: Implement formatted segment creation
  return {
    formatting,
  };
}
