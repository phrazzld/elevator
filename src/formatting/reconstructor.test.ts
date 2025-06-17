/**
 * Tests for text reconstruction functions.
 */

import { describe, test, expect } from "vitest";
import { reconstructSegment, reconstructText } from "./reconstructor.js";
import type { FormattedSegment } from "./types.js";

describe("reconstructSegment", () => {
  test("uses elevated content when available", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "quote",
        marker: ">",
        content: "Remember to check logs",
        originalText: "> Remember to check logs",
        startIndex: 10,
        endIndex: 34,
      },
      elevated:
        "Make sure to verify the application logs for debugging information",
    };

    const result = reconstructSegment(segment);

    expect(result).toBe(
      "Make sure to verify the application logs for debugging information",
    );
  });

  test("uses original text when no elevated content", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "codeblock",
        marker: "`",
        content: "console.log()",
        originalText: "`console.log()`",
        startIndex: 5,
        endIndex: 20,
      },
    };

    const result = reconstructSegment(segment);

    expect(result).toBe("`console.log()`");
  });

  test("uses original text for plain text segments", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "plain",
        marker: "",
        content: "Hello world",
        originalText: "Hello world",
        startIndex: 0,
        endIndex: 11,
      },
    };

    const result = reconstructSegment(segment);

    expect(result).toBe("Hello world");
  });

  test("preserves code blocks with complex content", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "codeblock",
        marker: "```",
        language: "javascript",
        content: 'function test() {\n  return "hello";\n}',
        originalText:
          '```javascript\nfunction test() {\n  return "hello";\n}\n```',
        startIndex: 0,
        endIndex: 50,
      },
    };

    const result = reconstructSegment(segment);

    expect(result).toBe(
      '```javascript\nfunction test() {\n  return "hello";\n}\n```',
    );
  });

  test("uses elevated content even for code blocks if provided", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "codeblock",
        marker: "`",
        content: "console.log()",
        originalText: "`console.log()`",
        startIndex: 5,
        endIndex: 20,
      },
      elevated: "use the console.log() function",
    };

    const result = reconstructSegment(segment);

    expect(result).toBe("use the console.log() function");
  });

  test("handles empty elevated content", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "quote",
        marker: ">",
        content: "Original content",
        originalText: "> Original content",
        startIndex: 0,
        endIndex: 18,
      },
      elevated: "",
    };

    const result = reconstructSegment(segment);

    expect(result).toBe("");
  });

  test("handles nested block quotes", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "quote",
        marker: ">>",
        content: "Nested quote content",
        originalText: ">> Nested quote content",
        startIndex: 5,
        endIndex: 28,
      },
    };

    const result = reconstructSegment(segment);

    expect(result).toBe(">> Nested quote content");
  });

  test("preserves whitespace in original text", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "plain",
        marker: "",
        content: "  spaces  and\ttabs  ",
        originalText: "  spaces  and\ttabs  ",
        startIndex: 10,
        endIndex: 30,
      },
    };

    const result = reconstructSegment(segment);

    expect(result).toBe("  spaces  and\ttabs  ");
  });

  test("handles multiline elevated content", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "quote",
        marker: ">",
        content: "Line 1\nLine 2",
        originalText: "> Line 1\n> Line 2",
        startIndex: 0,
        endIndex: 17,
      },
      elevated: "Elevated line 1\nElevated line 2\nAdditional elevated line",
    };

    const result = reconstructSegment(segment);

    expect(result).toBe(
      "Elevated line 1\nElevated line 2\nAdditional elevated line",
    );
  });

  test("handles special characters in elevated content", () => {
    const segment: FormattedSegment = {
      formatting: {
        type: "quote",
        marker: ">",
        content: "Simple quote",
        originalText: "> Simple quote",
        startIndex: 0,
        endIndex: 14,
      },
      elevated: "Elevated content with émojis 🚀 and speciäl chars!",
    };

    const result = reconstructSegment(segment);

    expect(result).toBe("Elevated content with émojis 🚀 and speciäl chars!");
  });
});

describe("reconstructText", () => {
  test("handles empty segments array", () => {
    const result = reconstructText([]);
    expect(result).toBe("");
  });

  test("handles null/undefined segments", () => {
    expect(reconstructText(null as unknown as FormattedSegment[])).toBe("");
    expect(reconstructText(undefined as unknown as FormattedSegment[])).toBe(
      "",
    );
  });

  test("reconstructs single segment", () => {
    const segments: FormattedSegment[] = [
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "Hello world",
          originalText: "Hello world",
          startIndex: 0,
          endIndex: 11,
        },
      },
    ];

    const result = reconstructText(segments);

    expect(result).toBe("Hello world");
  });

  test("reconstructs text with mixed preserved and elevated segments", () => {
    const segments: FormattedSegment[] = [
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "Use ",
          originalText: "Use ",
          startIndex: 0,
          endIndex: 4,
        },
      },
      {
        formatting: {
          type: "codeblock",
          marker: "`",
          content: "console.log()",
          originalText: "`console.log()`",
          startIndex: 4,
          endIndex: 19,
        },
      },
      {
        formatting: {
          type: "plain",
          marker: "",
          content: " for debugging.\n",
          originalText: " for debugging.\n",
          startIndex: 19,
          endIndex: 35,
        },
      },
      {
        formatting: {
          type: "quote",
          marker: ">",
          content: "Remember to check logs",
          originalText: "> Remember to check logs",
          startIndex: 35,
          endIndex: 59,
        },
        elevated: "Make sure to verify application logs for troubleshooting",
      },
    ];

    const result = reconstructText(segments);

    expect(result).toBe(
      "Use `console.log()` for debugging.\nMake sure to verify application logs for troubleshooting",
    );
  });

  test("maintains exact spacing between segments", () => {
    const segments: FormattedSegment[] = [
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "Start",
          originalText: "Start",
          startIndex: 0,
          endIndex: 5,
        },
      },
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "   ",
          originalText: "   ",
          startIndex: 5,
          endIndex: 8,
        },
      },
      {
        formatting: {
          type: "codeblock",
          marker: "`",
          content: "code",
          originalText: "`code`",
          startIndex: 8,
          endIndex: 14,
        },
      },
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "\t\n  end",
          originalText: "\t\n  end",
          startIndex: 14,
          endIndex: 21,
        },
      },
    ];

    const result = reconstructText(segments);

    expect(result).toBe("Start   `code`\t\n  end");
  });

  test("reconstructs text with all code blocks preserved", () => {
    const segments: FormattedSegment[] = [
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "Use ",
          originalText: "Use ",
          startIndex: 0,
          endIndex: 4,
        },
      },
      {
        formatting: {
          type: "codeblock",
          marker: "`",
          content: "console.log()",
          originalText: "`console.log()`",
          startIndex: 4,
          endIndex: 19,
        },
      },
      {
        formatting: {
          type: "plain",
          marker: "",
          content: " and ",
          originalText: " and ",
          startIndex: 19,
          endIndex: 24,
        },
      },
      {
        formatting: {
          type: "codeblock",
          marker: "`",
          content: "JSON.stringify()",
          originalText: "`JSON.stringify()`",
          startIndex: 24,
          endIndex: 42,
        },
      },
    ];

    const result = reconstructText(segments);

    expect(result).toBe("Use `console.log()` and `JSON.stringify()`");
  });

  test("reconstructs text with all quotes elevated", () => {
    const segments: FormattedSegment[] = [
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "Note:\n",
          originalText: "Note:\n",
          startIndex: 0,
          endIndex: 6,
        },
      },
      {
        formatting: {
          type: "quote",
          marker: ">",
          content: "First important point",
          originalText: "> First important point",
          startIndex: 6,
          endIndex: 29,
        },
        elevated: "Primary consideration",
      },
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "\nAlso:\n",
          originalText: "\nAlso:\n",
          startIndex: 29,
          endIndex: 36,
        },
      },
      {
        formatting: {
          type: "quote",
          marker: ">",
          content: "Second important point",
          originalText: "> Second important point",
          startIndex: 36,
          endIndex: 60,
        },
        elevated: "Secondary consideration",
      },
    ];

    const result = reconstructText(segments);

    expect(result).toBe(
      "Note:\nPrimary consideration\nAlso:\nSecondary consideration",
    );
  });

  test("handles empty segments gracefully", () => {
    const segments: FormattedSegment[] = [
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "",
          originalText: "",
          startIndex: 0,
          endIndex: 0,
        },
      },
      {
        formatting: {
          type: "quote",
          marker: ">",
          content: "Content",
          originalText: "> Content",
          startIndex: 0,
          endIndex: 9,
        },
        elevated: "",
      },
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "End",
          originalText: "End",
          startIndex: 9,
          endIndex: 12,
        },
      },
    ];

    const result = reconstructText(segments);

    expect(result).toBe("End");
  });

  test("preserves multiline code blocks", () => {
    const segments: FormattedSegment[] = [
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "Example:\n",
          originalText: "Example:\n",
          startIndex: 0,
          endIndex: 9,
        },
      },
      {
        formatting: {
          type: "codeblock",
          marker: "```",
          language: "javascript",
          content:
            'function test() {\n  console.log("hello");\n  return true;\n}',
          originalText:
            '```javascript\nfunction test() {\n  console.log("hello");\n  return true;\n}\n```',
          startIndex: 9,
          endIndex: 75,
        },
      },
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "\nThat was the example.",
          originalText: "\nThat was the example.",
          startIndex: 75,
          endIndex: 96,
        },
      },
    ];

    const result = reconstructText(segments);

    const expected =
      'Example:\n```javascript\nfunction test() {\n  console.log("hello");\n  return true;\n}\n```\nThat was the example.';
    expect(result).toBe(expected);
  });

  test("handles complex mixed formatting correctly", () => {
    const segments: FormattedSegment[] = [
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "Debug with ",
          originalText: "Debug with ",
          startIndex: 0,
          endIndex: 11,
        },
      },
      {
        formatting: {
          type: "codeblock",
          marker: "`",
          content: "console.log()",
          originalText: "`console.log()`",
          startIndex: 11,
          endIndex: 26,
        },
      },
      {
        formatting: {
          type: "plain",
          marker: "",
          content: ".\n",
          originalText: ".\n",
          startIndex: 26,
          endIndex: 28,
        },
      },
      {
        formatting: {
          type: "quote",
          marker: ">",
          content: "Important: Check logs regularly",
          originalText: "> Important: Check logs regularly",
          startIndex: 28,
          endIndex: 61,
        },
        elevated:
          "Critical reminder: Monitor application logs consistently for optimal troubleshooting",
      },
      {
        formatting: {
          type: "plain",
          marker: "",
          content: "\nAlso use ",
          originalText: "\nAlso use ",
          startIndex: 61,
          endIndex: 70,
        },
      },
      {
        formatting: {
          type: "codeblock",
          marker: "`",
          content: "JSON.stringify()",
          originalText: "`JSON.stringify()`",
          startIndex: 70,
          endIndex: 88,
        },
      },
    ];

    const result = reconstructText(segments);

    const expected =
      "Debug with `console.log()`.\nCritical reminder: Monitor application logs consistently for optimal troubleshooting\nAlso use `JSON.stringify()`";
    expect(result).toBe(expected);
  });
});
