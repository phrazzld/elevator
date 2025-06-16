/**
 * Format detection functions for identifying code blocks, quotes, and other formatting.
 */

import type { FormattingInfo } from "./types.js";

/**
 * Detect all formatting elements in the given text.
 *
 * @param text - The text to analyze for formatting
 * @returns Array of formatting information sorted by start index
 */
export function detectFormatting(text: string): FormattingInfo[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Collect formatting information from all detectors
  const allFormatting: FormattingInfo[] = [];

  // Detect code blocks (triple backticks)
  const codeBlocks = detectCodeBlocks(text);
  allFormatting.push(...codeBlocks);

  // Detect inline code (single backticks)
  const inlineCode = detectInlineCode(text);
  allFormatting.push(...inlineCode);

  // Detect block quotes (lines starting with >)
  const blockQuotes = detectBlockQuotes(text);
  allFormatting.push(...blockQuotes);

  // Sort by start index to maintain consistent ordering
  allFormatting.sort((a, b) => a.startIndex - b.startIndex);

  return allFormatting;
}

/**
 * Detect code blocks (triple backticks) in text.
 *
 * @param text - The text to search for code blocks
 * @returns Array of code block formatting information
 */
export function detectCodeBlocks(text: string): FormattingInfo[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  const codeBlocks: FormattingInfo[] = [];

  // Regex to match code blocks with optional language specifier
  // Pattern: ```[language]\n[content]\n```
  const codeBlockRegex = /```([a-zA-Z0-9-]*)\n?([\s\S]*?)\n?```/g;

  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const [fullMatch, language = "", content = ""] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Create formatting info for this code block
    const trimmedLanguage = language.trim();
    const formattingInfo: FormattingInfo = {
      type: "codeblock",
      marker: "```",
      ...(trimmedLanguage && { language: trimmedLanguage }),
      content: content,
      originalText: fullMatch,
      startIndex,
      endIndex,
    };

    codeBlocks.push(formattingInfo);
  }

  return codeBlocks;
}

/**
 * Detect inline code (single backticks) in text.
 *
 * @param text - The text to search for inline code
 * @returns Array of inline code formatting information
 */
export function detectInlineCode(text: string): FormattingInfo[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  // First, find all code blocks to exclude inline codes within them
  const codeBlocks = detectCodeBlocks(text);

  const inlineCodes: FormattingInfo[] = [];

  // Manually search for inline code to properly handle escaped backticks
  let i = 0;
  while (i < text.length) {
    // Look for an opening backtick
    if (text[i] === "`") {
      // Check if this backtick is escaped
      const isEscaped =
        i > 0 && text[i - 1] === "\\" && (i === 1 || text[i - 2] !== "\\");
      if (isEscaped) {
        i++;
        continue;
      }

      // Check if this is part of a code block (adjacent backticks)
      const beforeChar = i > 0 ? text[i - 1] : "";
      if (beforeChar === "`") {
        i++;
        continue;
      }

      // Look for the closing backtick
      let j = i + 1;
      let foundClosing = false;
      while (j < text.length) {
        if (text[j] === "`") {
          // Check if this closing backtick is escaped
          const isClosingEscaped =
            j > 0 && text[j - 1] === "\\" && (j === 1 || text[j - 2] !== "\\");
          if (!isClosingEscaped) {
            foundClosing = true;
            break;
          } else {
            // If the backtick is escaped, treat it as the end of inline code
            // This prevents complex escaping scenarios within inline code
            foundClosing = true;
            // j stays at the position of the escaped backtick
            // The content will include everything up to (but not including) this escaped backtick
            break;
          }
        } else if (text[j] === "\n") {
          // Inline code cannot span multiple lines
          break;
        }
        j++;
      }

      if (foundClosing) {
        const startIndex = i;
        // If we stopped at an escaped backtick, j points to the escaped backtick
        // We want to include everything up to (but not including) the escaped backtick
        const isStoppedAtEscaped =
          j < text.length &&
          text[j] === "`" &&
          j > 0 &&
          text[j - 1] === "\\" &&
          (j === 1 || text[j - 2] !== "\\");

        const endIndex = isStoppedAtEscaped ? j + 1 : j + 1; // Always include the backtick in endIndex
        const content = text.slice(i + 1, j); // Content stops before the escaped backtick
        const fullMatch = text.slice(i, endIndex); // OriginalText includes the escaped backtick

        // Check for adjacent backticks after the closing backtick
        const afterClosing = endIndex < text.length ? text[endIndex] : "";
        if (afterClosing === "`") {
          // Check if this adjacent backtick is escaped
          const isAdjacentEscaped =
            endIndex > 0 &&
            text[endIndex - 1] === "\\" &&
            (endIndex === 1 || text[endIndex - 2] !== "\\");
          if (!isAdjacentEscaped) {
            // This is part of a larger code block, skip it
            i = endIndex;
            continue;
          }
        }

        // Check if this inline code falls within any code block
        const isInsideCodeBlock = codeBlocks.some(
          (block) =>
            startIndex >= block.startIndex && endIndex <= block.endIndex,
        );

        if (!isInsideCodeBlock) {
          // Create formatting info for this inline code
          const formattingInfo: FormattingInfo = {
            type: "codeblock",
            marker: "`",
            content: content,
            originalText: fullMatch,
            startIndex,
            endIndex,
          };

          inlineCodes.push(formattingInfo);
        }

        // Move past this inline code
        i = endIndex;
      } else {
        // No closing backtick found, move on
        i++;
      }
    } else {
      i++;
    }
  }

  return inlineCodes;
}

/**
 * Detect block quotes (lines starting with >) in text.
 *
 * @param text - The text to search for block quotes
 * @returns Array of block quote formatting information
 */
export function detectBlockQuotes(text: string): FormattingInfo[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  const blockQuotes: FormattingInfo[] = [];
  const lines = text.split("\n");
  let currentQuote: {
    startIndex: number;
    lines: string[];
    marker: string;
  } | null = null;

  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Check if line starts with block quote marker (> possibly after whitespace)
    const quoteMatch = line.match(/^(\s*)(>+)(\s?)(.*)/);

    if (quoteMatch) {
      const [, , markers] = quoteMatch;
      if (!markers) continue;
      const lineStartIndex = currentIndex;

      if (currentQuote && currentQuote.marker === markers) {
        // Continue existing block quote
        currentQuote.lines.push(line);
      } else {
        // End previous quote if it exists
        if (currentQuote) {
          const quoteText = currentQuote.lines.join("\n");
          const quoteContent = currentQuote.lines
            .map((l) => l.replace(/^\s*>+\s?/, ""))
            .join("\n");

          blockQuotes.push({
            type: "quote",
            marker: currentQuote.marker,
            content: quoteContent,
            originalText: quoteText,
            startIndex: currentQuote.startIndex,
            endIndex: currentIndex - 1, // -1 to not include the newline
          });
        }

        // Start new block quote
        currentQuote = {
          startIndex: lineStartIndex,
          lines: [line],
          marker: markers,
        };
      }
    } else {
      // End current quote if line doesn't start with >
      if (currentQuote) {
        const quoteText = currentQuote.lines.join("\n");
        const quoteContent = currentQuote.lines
          .map((l) => l.replace(/^\s*>+\s?/, ""))
          .join("\n");

        blockQuotes.push({
          type: "quote",
          marker: currentQuote.marker,
          content: quoteContent,
          originalText: quoteText,
          startIndex: currentQuote.startIndex,
          endIndex: currentIndex - 1, // -1 to not include the newline
        });

        currentQuote = null;
      }
    }

    // Move index to start of next line
    currentIndex += (line?.length ?? 0) + 1; // +1 for newline
  }

  // Handle any remaining quote at end of text
  if (currentQuote) {
    const quoteText = currentQuote.lines.join("\n");
    const quoteContent = currentQuote.lines
      .map((l) => l.replace(/^\s*>+\s?/, ""))
      .join("\n");

    blockQuotes.push({
      type: "quote",
      marker: currentQuote.marker,
      content: quoteContent,
      originalText: quoteText,
      startIndex: currentQuote.startIndex,
      endIndex: text.length,
    });
  }

  return blockQuotes;
}
