/**
 * Tests for content extraction functions.
 */

import { describe, test, expect } from "vitest";
import {
  splitTextByIndices,
  createPlainSegment,
  createFormattedSegment,
  extractSegments,
} from "./extractor.js";
import type { FormattingInfo } from "./types.js";

describe("splitTextByIndices", () => {
  test("handles empty text", () => {
    const result = splitTextByIndices("", []);
    expect(result).toEqual([]);
  });

  test("handles null/undefined text", () => {
    expect(splitTextByIndices(null as unknown as string, [])).toEqual([]);
    expect(splitTextByIndices(undefined as unknown as string, [])).toEqual([]);
  });

  test("handles text with no indices", () => {
    const text = "Hello world";
    const result = splitTextByIndices(text, []);
    expect(result).toEqual(["Hello world"]);
  });

  test("handles text with null/undefined indices", () => {
    const text = "Hello world";
    expect(
      splitTextByIndices(
        text,
        null as unknown as { start: number; end: number }[],
      ),
    ).toEqual(["Hello world"]);
    expect(
      splitTextByIndices(
        text,
        undefined as unknown as { start: number; end: number }[],
      ),
    ).toEqual(["Hello world"]);
  });

  test("splits text with single formatting boundary", () => {
    const text = "Hello `code` world";
    const indices = [{ start: 6, end: 12 }]; // `code`

    const result = splitTextByIndices(text, indices);

    expect(result).toEqual([
      "Hello ", // before
      "`code`", // formatted
      " world", // after
    ]);
  });

  test("splits text with formatting at beginning", () => {
    const text = "`code` and text";
    const indices = [{ start: 0, end: 6 }];

    const result = splitTextByIndices(text, indices);

    expect(result).toEqual([
      "`code`", // formatted
      " and text", // after
    ]);
  });

  test("splits text with formatting at end", () => {
    const text = "Text and `code`";
    const indices = [{ start: 9, end: 15 }];

    const result = splitTextByIndices(text, indices);

    expect(result).toEqual([
      "Text and ", // before
      "`code`", // formatted
    ]);
  });

  test("splits text with multiple non-overlapping boundaries", () => {
    const text = "Start `inline` middle `more` end";
    const indices = [
      { start: 6, end: 14 }, // `inline`
      { start: 22, end: 28 }, // `more`
    ];

    const result = splitTextByIndices(text, indices);

    expect(result).toEqual([
      "Start ", // before first
      "`inline`", // first formatted
      " middle ", // between
      "`more`", // second formatted
      " end", // after last
    ]);
  });

  test("splits text with adjacent boundaries", () => {
    const text = "`first``second`";
    const indices = [
      { start: 0, end: 7 }, // `first`
      { start: 7, end: 15 }, // `second`
    ];

    const result = splitTextByIndices(text, indices);

    expect(result).toEqual([
      "`first`", // first formatted
      "`second`", // second formatted
    ]);
  });

  test("sorts indices by start position", () => {
    const text = "Text `second` and `first` end";
    const indices = [
      { start: 18, end: 25 }, // `first` (comes second in array)
      { start: 5, end: 13 }, // `second` (comes first in array)
    ];

    const result = splitTextByIndices(text, indices);

    expect(result).toEqual([
      "Text ", // before first
      "`second`", // first formatted (by position)
      " and ", // between
      "`first`", // second formatted (by position)
      " end", // after last
    ]);
  });

  test("handles boundaries with same start position", () => {
    const text = "Text `code` end";
    const indices = [
      { start: 5, end: 11 }, // `code`
      { start: 5, end: 11 }, // duplicate (will be skipped due to overlap logic)
    ];

    const result = splitTextByIndices(text, indices);

    // Duplicate boundaries are skipped to avoid processing the same segment twice
    expect(result).toEqual([
      "Text ", // before
      "`code`", // first occurrence only
      " end", // after
    ]);
  });

  test("handles invalid boundaries gracefully", () => {
    const text = "Hello world";
    const indices = [
      { start: 20, end: 25 }, // beyond text length
      { start: 3, end: 3 }, // zero-length
      { start: 8, end: 5 }, // end before start
    ];

    const result = splitTextByIndices(text, indices);

    // Should only include valid segments
    expect(result).toEqual(["Hello world"]);
  });

  test("handles complex real-world example", () => {
    const text =
      "Use `console.log()` for debugging.\n> Remember to check logs\nAlso `JSON.stringify()`.";

    const indices = [
      { start: 4, end: 19 }, // `console.log()`
      { start: 35, end: 59 }, // > Remember to check logs (fixed: don't include newline)
      { start: 65, end: 83 }, // `JSON.stringify()`
    ];

    const result = splitTextByIndices(text, indices);

    expect(result).toEqual([
      "Use ", // 0-3
      "`console.log()`", // 4-18
      " for debugging.\n", // 19-34
      "> Remember to check logs", // 35-58
      "\nAlso ", // 59-64
      "`JSON.stringify()`", // 65-82
      ".", // 83
    ]);
  });

  test("handles entire text as single boundary", () => {
    const text = "`entire text`";
    const indices = [{ start: 0, end: 13 }];

    const result = splitTextByIndices(text, indices);

    expect(result).toEqual(["`entire text`"]);
  });

  test("handles overlapping boundaries by skipping later overlaps", () => {
    const text = "Text `overlapping code` end";
    const indices = [
      { start: 5, end: 18 }, // "`overlapping " (includes space)
      { start: 12, end: 23 }, // "apping code`" (overlaps, should be skipped)
    ];

    const result = splitTextByIndices(text, indices);

    // Second boundary is skipped because it starts before the first boundary ends
    expect(result).toEqual([
      "Text ", // 0-4
      "`overlapping ", // 5-17 (first boundary: includes space at end)
      "code` end", // 18-end (remaining text after first boundary)
    ]);
  });
});

describe("createPlainSegment", () => {
  test("creates basic plain text segment", () => {
    const text = "Hello world";
    const startIndex = 0;

    const result = createPlainSegment(text, startIndex);

    expect(result.formatting.type).toBe("plain");
    expect(result.formatting.marker).toBe("");
    expect(result.formatting.content).toBe("Hello world");
    expect(result.formatting.originalText).toBe("Hello world");
    expect(result.formatting.startIndex).toBe(0);
    expect(result.formatting.endIndex).toBe(11);
    expect(result.elevated).toBeUndefined();
  });

  test("creates plain text segment with custom start index", () => {
    const text = "middle part";
    const startIndex = 10;

    const result = createPlainSegment(text, startIndex);

    expect(result.formatting.type).toBe("plain");
    expect(result.formatting.marker).toBe("");
    expect(result.formatting.content).toBe("middle part");
    expect(result.formatting.originalText).toBe("middle part");
    expect(result.formatting.startIndex).toBe(10);
    expect(result.formatting.endIndex).toBe(21);
  });

  test("handles empty text", () => {
    const text = "";
    const startIndex = 5;

    const result = createPlainSegment(text, startIndex);

    expect(result.formatting.type).toBe("plain");
    expect(result.formatting.marker).toBe("");
    expect(result.formatting.content).toBe("");
    expect(result.formatting.originalText).toBe("");
    expect(result.formatting.startIndex).toBe(5);
    expect(result.formatting.endIndex).toBe(5);
  });

  test("handles text with special characters", () => {
    const text = "Text with\nnewlines\tand tabs!";
    const startIndex = 20;

    const result = createPlainSegment(text, startIndex);

    expect(result.formatting.type).toBe("plain");
    expect(result.formatting.content).toBe("Text with\nnewlines\tand tabs!");
    expect(result.formatting.startIndex).toBe(20);
    expect(result.formatting.endIndex).toBe(20 + text.length);
  });

  test("handles single character", () => {
    const text = "x";
    const startIndex = 100;

    const result = createPlainSegment(text, startIndex);

    expect(result.formatting.type).toBe("plain");
    expect(result.formatting.content).toBe("x");
    expect(result.formatting.startIndex).toBe(100);
    expect(result.formatting.endIndex).toBe(101);
  });

  test("handles text with formatting-like characters", () => {
    const text = "Text with `backticks` and > symbols";
    const startIndex = 0;

    const result = createPlainSegment(text, startIndex);

    expect(result.formatting.type).toBe("plain");
    expect(result.formatting.content).toBe(
      "Text with `backticks` and > symbols",
    );
    expect(result.formatting.originalText).toBe(
      "Text with `backticks` and > symbols",
    );
    expect(result.formatting.startIndex).toBe(0);
    expect(result.formatting.endIndex).toBe(35);
  });
});

describe("createFormattedSegment", () => {
  test("creates segment for code block", () => {
    const formatting = {
      type: "codeblock" as const,
      marker: "```",
      language: "javascript",
      content: 'console.log("hello");',
      originalText: '```javascript\nconsole.log("hello");\n```',
      startIndex: 10,
      endIndex: 50,
    };

    const result = createFormattedSegment(formatting);

    expect(result.formatting).toBe(formatting);
    expect(result.elevated).toBeUndefined();
  });

  test("creates segment for inline code", () => {
    const formatting = {
      type: "codeblock" as const,
      marker: "`",
      content: "console.log()",
      originalText: "`console.log()`",
      startIndex: 5,
      endIndex: 20,
    };

    const result = createFormattedSegment(formatting);

    expect(result.formatting).toBe(formatting);
    expect(result.elevated).toBeUndefined();
  });

  test("creates segment for block quote", () => {
    const formatting = {
      type: "quote" as const,
      marker: ">",
      content: "This is a quoted line",
      originalText: "> This is a quoted line",
      startIndex: 0,
      endIndex: 23,
    };

    const result = createFormattedSegment(formatting);

    expect(result.formatting).toBe(formatting);
    expect(result.elevated).toBeUndefined();
  });

  test("creates segment for nested block quote", () => {
    const formatting = {
      type: "quote" as const,
      marker: ">>",
      content: "Nested quote content",
      originalText: ">> Nested quote content",
      startIndex: 15,
      endIndex: 38,
    };

    const result = createFormattedSegment(formatting);

    expect(result.formatting).toBe(formatting);
    expect(result.elevated).toBeUndefined();
  });

  test("creates segment for plain text", () => {
    const formatting = {
      type: "plain" as const,
      marker: "",
      content: "Regular text content",
      originalText: "Regular text content",
      startIndex: 25,
      endIndex: 45,
    };

    const result = createFormattedSegment(formatting);

    expect(result.formatting).toBe(formatting);
    expect(result.elevated).toBeUndefined();
  });

  test("creates segment with empty content", () => {
    const formatting = {
      type: "quote" as const,
      marker: ">",
      content: "",
      originalText: ">",
      startIndex: 10,
      endIndex: 11,
    };

    const result = createFormattedSegment(formatting);

    expect(result.formatting).toBe(formatting);
    expect(result.elevated).toBeUndefined();
  });

  test("preserves all formatting properties", () => {
    const formatting = {
      type: "codeblock" as const,
      marker: "```",
      language: "typescript",
      content: "interface User {\n  name: string;\n}",
      originalText: "```typescript\ninterface User {\n  name: string;\n}\n```",
      startIndex: 50,
      endIndex: 100,
    };

    const result = createFormattedSegment(formatting);

    expect(result.formatting.type).toBe("codeblock");
    expect(result.formatting.marker).toBe("```");
    expect(result.formatting.language).toBe("typescript");
    expect(result.formatting.content).toBe(
      "interface User {\n  name: string;\n}",
    );
    expect(result.formatting.originalText).toBe(
      "```typescript\ninterface User {\n  name: string;\n}\n```",
    );
    expect(result.formatting.startIndex).toBe(50);
    expect(result.formatting.endIndex).toBe(100);
  });
});

describe("extractSegments", () => {
  test("handles empty text", () => {
    const result = extractSegments("", []);
    expect(result).toEqual([]);
  });

  test("handles null/undefined text", () => {
    expect(extractSegments(null as unknown as string, [])).toEqual([]);
    expect(extractSegments(undefined as unknown as string, [])).toEqual([]);
  });

  test("handles plain text with no formatting", () => {
    const text = "This is plain text";
    const result = extractSegments(text, []);

    expect(result).toHaveLength(1);
    expect(result[0]!.formatting.type).toBe("plain");
    expect(result[0]!.formatting.content).toBe(text);
    expect(result[0]!.formatting.startIndex).toBe(0);
    expect(result[0]!.formatting.endIndex).toBe(18);
  });

  test("handles text with null/undefined formatting", () => {
    const text = "Plain text";
    expect(
      extractSegments(text, null as unknown as FormattingInfo[]),
    ).toHaveLength(1);
    expect(
      extractSegments(text, undefined as unknown as FormattingInfo[]),
    ).toHaveLength(1);
  });

  test("extracts single code block", () => {
    const text = "Use `console.log()` for debugging";
    const formatting: FormattingInfo[] = [
      {
        type: "codeblock",
        marker: "`",
        content: "console.log()",
        originalText: "`console.log()`",
        startIndex: 4,
        endIndex: 19,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(3);

    // First segment: "Use "
    expect(result[0]!.formatting.type).toBe("plain");
    expect(result[0]!.formatting.content).toBe("Use ");
    expect(result[0]!.formatting.startIndex).toBe(0);

    // Second segment: "`console.log()`"
    expect(result[1]!.formatting.type).toBe("codeblock");
    expect(result[1]!.formatting.content).toBe("console.log()");
    expect(result[1]!.formatting.marker).toBe("`");

    // Third segment: " for debugging"
    expect(result[2]!.formatting.type).toBe("plain");
    expect(result[2]!.formatting.content).toBe(" for debugging");
  });

  test("extracts single block quote", () => {
    const text = "Here's a note:\n> Remember this\nDone.";
    const formatting: FormattingInfo[] = [
      {
        type: "quote",
        marker: ">",
        content: "Remember this",
        originalText: "> Remember this",
        startIndex: 15,
        endIndex: 30,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(3);

    // Check quote segment
    const quoteSegment = result.find((s) => s.formatting.type === "quote");
    expect(quoteSegment).toBeDefined();
    expect(quoteSegment!.formatting.content).toBe("Remember this");
    expect(quoteSegment!.formatting.marker).toBe(">");
  });

  test("extracts multiple mixed formatting types", () => {
    const text =
      "Use `console.log()` for debugging.\n> Remember to check logs\nAlso try `JSON.stringify()`.";
    const formatting: FormattingInfo[] = [
      {
        type: "codeblock",
        marker: "`",
        content: "console.log()",
        originalText: "`console.log()`",
        startIndex: 4,
        endIndex: 19,
      },
      {
        type: "quote",
        marker: ">",
        content: "Remember to check logs",
        originalText: "> Remember to check logs",
        startIndex: 35,
        endIndex: 59,
      },
      {
        type: "codeblock",
        marker: "`",
        content: "JSON.stringify()",
        originalText: "`JSON.stringify()`",
        startIndex: 69,
        endIndex: 87,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(7);

    // Verify we have the right mix of types
    const plainSegments = result.filter((s) => s.formatting.type === "plain");
    const codeSegments = result.filter(
      (s) => s.formatting.type === "codeblock",
    );
    const quoteSegments = result.filter((s) => s.formatting.type === "quote");

    expect(plainSegments).toHaveLength(4);
    expect(codeSegments).toHaveLength(2);
    expect(quoteSegments).toHaveLength(1);
  });

  test("extracts code block at beginning of text", () => {
    const text = "`code` and text";
    const formatting: FormattingInfo[] = [
      {
        type: "codeblock",
        marker: "`",
        content: "code",
        originalText: "`code`",
        startIndex: 0,
        endIndex: 6,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(2);
    expect(result[0]!.formatting.type).toBe("codeblock");
    expect(result[1]!.formatting.type).toBe("plain");
  });

  test("extracts code block at end of text", () => {
    const text = "Text and `code`";
    const formatting: FormattingInfo[] = [
      {
        type: "codeblock",
        marker: "`",
        content: "code",
        originalText: "`code`",
        startIndex: 9,
        endIndex: 15,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(2);
    expect(result[0]!.formatting.type).toBe("plain");
    expect(result[1]!.formatting.type).toBe("codeblock");
  });

  test("extracts adjacent formatting segments", () => {
    const text = "`first``second`";
    const formatting: FormattingInfo[] = [
      {
        type: "codeblock",
        marker: "`",
        content: "first",
        originalText: "`first`",
        startIndex: 0,
        endIndex: 7,
      },
      {
        type: "codeblock",
        marker: "`",
        content: "second",
        originalText: "`second`",
        startIndex: 7,
        endIndex: 15,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(2);
    expect(result[0]!.formatting.type).toBe("codeblock");
    expect(result[0]!.formatting.content).toBe("first");
    expect(result[1]!.formatting.type).toBe("codeblock");
    expect(result[1]!.formatting.content).toBe("second");
  });

  test("handles entire text as single formatted segment", () => {
    const text = "`entire text`";
    const formatting: FormattingInfo[] = [
      {
        type: "codeblock",
        marker: "`",
        content: "entire text",
        originalText: "`entire text`",
        startIndex: 0,
        endIndex: 13,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(1);
    expect(result[0]!.formatting.type).toBe("codeblock");
    expect(result[0]!.formatting.content).toBe("entire text");
  });

  test("preserves whitespace between segments", () => {
    const text = "Start `code` middle `more` end";
    const formatting: FormattingInfo[] = [
      {
        type: "codeblock",
        marker: "`",
        content: "code",
        originalText: "`code`",
        startIndex: 6,
        endIndex: 12,
      },
      {
        type: "codeblock",
        marker: "`",
        content: "more",
        originalText: "`more`",
        startIndex: 20,
        endIndex: 26,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(5);

    // Check whitespace preservation
    expect(result[0]!.formatting.content).toBe("Start ");
    expect(result[2]!.formatting.content).toBe(" middle ");
    expect(result[4]!.formatting.content).toBe(" end");
  });

  test("handles unordered formatting input", () => {
    const text = "Text `second` and `first` end";
    const formatting: FormattingInfo[] = [
      {
        type: "codeblock",
        marker: "`",
        content: "first",
        originalText: "`first`",
        startIndex: 18,
        endIndex: 25,
      },
      {
        type: "codeblock",
        marker: "`",
        content: "second",
        originalText: "`second`",
        startIndex: 5,
        endIndex: 13,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(5);

    // Should be processed in correct order regardless of input order
    expect(result[1]!.formatting.content).toBe("second");
    expect(result[3]!.formatting.content).toBe("first");
  });

  test("creates segments with correct indices", () => {
    const text = "Hello `world` test";
    const formatting: FormattingInfo[] = [
      {
        type: "codeblock",
        marker: "`",
        content: "world",
        originalText: "`world`",
        startIndex: 6,
        endIndex: 13,
      },
    ];

    const result = extractSegments(text, formatting);

    expect(result).toHaveLength(3);

    // Check start indices are correct
    expect(result[0]!.formatting.startIndex).toBe(0);
    expect(result[1]!.formatting.startIndex).toBe(6);
    expect(result[2]!.formatting.startIndex).toBe(13);

    // Check end indices are correct
    expect(result[0]!.formatting.endIndex).toBe(6);
    expect(result[1]!.formatting.endIndex).toBe(13);
    expect(result[2]!.formatting.endIndex).toBe(18);
  });
});
