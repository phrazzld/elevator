/**
 * Advanced edge case tests for prompt processing.
 *
 * This module tests complex scenarios, security considerations, and edge cases
 * that go beyond the basic functionality covered in the main test files.
 * Focuses on stress testing, malicious input handling, and integration scenarios.
 */

import { describe, it, expect } from "vitest";
import {
  createRawPrompt,
  isOk,
  isErr,
  type ProcessingOptions,
  type PromptMetadata,
} from "./promptProcessor";
import { DefaultPromptValidator } from "./promptValidator";
import { DefaultPromptEnhancer } from "./promptEnhancer";

describe("Prompt Processing - Advanced Edge Cases", () => {
  const validator = new DefaultPromptValidator();
  const enhancer = new DefaultPromptEnhancer();

  describe("Security & Malicious Input", () => {
    describe("injection attacks", () => {
      it("should handle SQL injection patterns safely", () => {
        const maliciousPrompts = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "admin'; SELECT * FROM passwords; --",
        ];

        maliciousPrompts.forEach((prompt) => {
          const rawPrompt = createRawPrompt(prompt);
          const validationResult = validator.validate(rawPrompt);

          if (isOk(validationResult)) {
            const enhancementResult = enhancer.enhance(validationResult.value);
            expect(isOk(enhancementResult)).toBe(true);
            if (isOk(enhancementResult)) {
              // Content should be preserved but sanitized through normal processing
              expect(enhancementResult.value.content).toContain(prompt.trim());
            }
          }
        });
      });

      it("should handle script injection patterns safely", () => {
        const scriptInjections = [
          "<script>alert('xss')</script>",
          "javascript:alert('xss')",
          "<img src='x' onerror='alert(1)'>",
          "${eval('malicious code')}",
        ];

        scriptInjections.forEach((prompt) => {
          const rawPrompt = createRawPrompt(prompt);
          const validationResult = validator.validate(rawPrompt);

          if (isOk(validationResult)) {
            const enhancementResult = enhancer.enhance(validationResult.value);
            expect(isOk(enhancementResult)).toBe(true);
            // Should process without throwing errors
          }
        });
      });

      it("should handle command injection patterns safely", () => {
        const commandInjections = [
          "; rm -rf /",
          "| nc -l 4444",
          "&& cat /etc/passwd",
          "$(whoami)",
          "`ls -la`",
        ];

        commandInjections.forEach((prompt) => {
          const rawPrompt = createRawPrompt(prompt);
          const validationResult = validator.validate(rawPrompt);

          if (isOk(validationResult)) {
            const enhancementResult = enhancer.enhance(validationResult.value);
            expect(isOk(enhancementResult)).toBe(true);
            // Should process without executing commands
          }
        });
      });
    });

    describe("control characters and binary data", () => {
      it("should handle null bytes safely", () => {
        const promptWithNulls = "Hello\x00World\x00Test";
        const rawPrompt = createRawPrompt(promptWithNulls);
        const result = validator.validate(rawPrompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("Hello\x00World\x00Test");
        }
      });

      it("should handle various control characters", () => {
        const controlChars = [
          "Text\x01with\x02control\x03chars",
          "Bell\x07character\x08backspace",
          "Form\x0Cfeed\x0Dcarriage\x0Ereturn",
          "Escape\x1Bsequence\x7Fdelete",
        ];

        controlChars.forEach((prompt) => {
          const rawPrompt = createRawPrompt(prompt);
          const result = validator.validate(rawPrompt);

          expect(isOk(result)).toBe(true);
          if (isOk(result)) {
            const enhancementResult = enhancer.enhance(result.value);
            expect(isOk(enhancementResult)).toBe(true);
          }
        });
      });

      it("should handle unicode normalization edge cases", () => {
        const unicodeEdgeCases = [
          "café vs cafe\u0301", // Combined vs decomposed
          "ﬁle vs file", // Ligatures
          "Ω vs Ω", // Different unicode points for same character
          "𝐀𝐁𝐂 vs ABC", // Mathematical alphanumeric symbols
          "️🏳️‍🌈️", // Complex emoji with modifiers
        ];

        unicodeEdgeCases.forEach((prompt) => {
          const rawPrompt = createRawPrompt(prompt);
          const result = validator.validate(rawPrompt);

          expect(isOk(result)).toBe(true);
          if (isOk(result)) {
            const enhancementResult = enhancer.enhance(result.value);
            expect(isOk(enhancementResult)).toBe(true);
          }
        });
      });
    });

    describe("directory traversal patterns", () => {
      it("should handle path traversal attempts safely", () => {
        const traversalPatterns = [
          "../../../etc/passwd",
          "..\\..\\..\\windows\\system32",
          "%2e%2e%2f%2e%2e%2f%2e%2e%2f",
          "....//....//....//",
        ];

        traversalPatterns.forEach((prompt) => {
          const rawPrompt = createRawPrompt(prompt);
          const result = validator.validate(rawPrompt);

          expect(isOk(result)).toBe(true);
          if (isOk(result)) {
            const enhancementResult = enhancer.enhance(result.value);
            expect(isOk(enhancementResult)).toBe(true);
            // Should preserve content but not interpret as file paths
          }
        });
      });
    });
  });

  describe("Stress Testing & Resource Limits", () => {
    describe("extremely large inputs", () => {
      it("should handle content at maximum boundary", () => {
        const maxContent = "a".repeat(10000);
        const rawPrompt = createRawPrompt(maxContent);
        const result = validator.validate(rawPrompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const enhancementResult = enhancer.enhance(result.value);
          expect(isOk(enhancementResult)).toBe(true);
          if (isOk(enhancementResult)) {
            expect(enhancementResult.value.content.length).toBeLessThanOrEqual(
              10000,
            );
          }
        }
      });

      it("should reject content exceeding maximum length", () => {
        const tooLongContent = "a".repeat(10001);
        const rawPrompt = createRawPrompt(tooLongContent);
        const result = validator.validate(rawPrompt);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("TOO_LONG");
          expect(result.error.message).toContain("10000");
        }
      });

      it("should handle content with excessive whitespace", () => {
        const spacesAndNewlines =
          " ".repeat(1000) + "\n".repeat(1000) + "\t".repeat(1000);
        const rawPrompt = createRawPrompt(spacesAndNewlines);
        const result = validator.validate(rawPrompt);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("EMPTY_PROMPT");
        }
      });

      it("should handle very long lines without newlines", () => {
        const longLine =
          "This is a very long line without any newlines. ".repeat(200);
        const rawPrompt = createRawPrompt(longLine);
        const result = validator.validate(rawPrompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const enhancementResult = enhancer.enhance(result.value);
          expect(isOk(enhancementResult)).toBe(true);
        }
      });
    });

    describe("complex nested structures", () => {
      it("should handle deeply nested code blocks", () => {
        let nestedCode = "```\n";
        for (let i = 0; i < 10; i++) {
          nestedCode += `${"  ".repeat(i)}if (condition${i}) {\n`;
        }
        for (let i = 9; i >= 0; i--) {
          nestedCode += `${"  ".repeat(i)}}\n`;
        }
        nestedCode += "```";

        const rawPrompt = createRawPrompt(nestedCode);
        const result = validator.validate(rawPrompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const enhancementResult = enhancer.enhance(result.value);
          expect(isOk(enhancementResult)).toBe(true);
          if (isOk(enhancementResult)) {
            // Should preserve code block structure
            expect(enhancementResult.value.content).toContain("```");
          }
        }
      });

      it("should handle multiple code blocks with mixed languages", () => {
        const multiLanguageCode = `
Here's some JavaScript:
\`\`\`javascript
function test() { return true; }
\`\`\`

And some Python:
\`\`\`python
def test():
    return True
\`\`\`

And some shell:
\`\`\`bash
echo "Hello World"
\`\`\`
        `.trim();

        const rawPrompt = createRawPrompt(multiLanguageCode);
        const result = validator.validate(rawPrompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const enhancementResult = enhancer.enhance(result.value);
          expect(isOk(enhancementResult)).toBe(true);
          if (isOk(enhancementResult)) {
            // Should preserve all code blocks
            expect(enhancementResult.value.content).toContain("```javascript");
            expect(enhancementResult.value.content).toContain("```python");
            expect(enhancementResult.value.content).toContain("```bash");
          }
        }
      });
    });

    describe("resource exhaustion scenarios", () => {
      it("should handle prompts with excessive regex complexity", () => {
        // Patterns that could cause regex backtracking
        const complexPatterns = [
          "a".repeat(100) + "?" + "b".repeat(100),
          "what ".repeat(50) + "is this",
          "(((((" + "nested".repeat(20) + ")))))",
        ];

        complexPatterns.forEach((prompt) => {
          const rawPrompt = createRawPrompt(prompt);
          const result = validator.validate(rawPrompt);

          expect(isOk(result)).toBe(true);
          if (isOk(result)) {
            const enhancementResult = enhancer.enhance(result.value);
            expect(isOk(enhancementResult)).toBe(true);
          }
        });
      });

      it("should handle prompts with many repeated patterns", () => {
        const repeatedPatterns = [
          "what what what ".repeat(100),
          "can you can you can you ".repeat(100),
          "how do I how do I how do I ".repeat(100),
        ];

        repeatedPatterns.forEach((prompt) => {
          const rawPrompt = createRawPrompt(prompt);
          const result = validator.validate(rawPrompt);

          if (isOk(result)) {
            const enhancementResult = enhancer.enhance(result.value);
            expect(isOk(enhancementResult)).toBe(true);
            if (isOk(enhancementResult)) {
              // Should add question mark to question patterns
              expect(enhancementResult.value.content).toMatch(/\?$/);
            }
          }
        });
      });
    });
  });

  describe("Complex Processing Options Combinations", () => {
    describe("custom validation rules", () => {
      it("should handle custom rules with extreme boundaries", () => {
        const options: ProcessingOptions = {
          minLength: 1,
          maxLength: 5,
          customRules: ["custom-rule-1", "custom-rule-2"],
        };

        const rawPrompt = createRawPrompt("Hi");
        const result = validator.validate(rawPrompt, options);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.rules).toContain("custom-rule-1");
          expect(result.value.rules).toContain("custom-rule-2");
        }
      });

      it("should reject content failing custom length constraints", () => {
        const options: ProcessingOptions = {
          minLength: 100,
          maxLength: 200,
        };

        const rawPrompt = createRawPrompt("Short");
        const result = validator.validate(rawPrompt, options);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("TOO_SHORT");
          expect(result.error.details?.["minLength"]).toBe(100);
        }
      });
    });

    describe("enhancement options edge cases", () => {
      it("should handle enhancement disabled with complex content", () => {
        const complexContent = `
what is the answer    to    life

how   do   I   fix   this

why    does    this    happen
        `.trim();

        const rawPrompt = createRawPrompt(complexContent);
        const result = validator.validate(rawPrompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const enhancementResult = enhancer.enhance(result.value, {
            enableEnhancement: false,
          });

          expect(isOk(enhancementResult)).toBe(true);
          if (isOk(enhancementResult)) {
            // Should not modify content when enhancement is disabled
            expect(enhancementResult.value.content).toBe(complexContent);
            expect(enhancementResult.value.enhancements).toEqual([]);
          }
        }
      });
    });
  });

  describe("Integration Error Propagation", () => {
    describe("complex metadata scenarios", () => {
      it("should handle metadata with circular references safely", () => {
        // Create object with circular reference
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const circularObj: any = { name: "test" };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        circularObj.self = circularObj;

        const metadata: PromptMetadata = {
          timestamp: new Date(),
          userId: "test-user",
          sessionId: "test-session",
          context: {
            correlationId: "test-correlation",
            problematicData: circularObj,
          },
        };

        // Should not throw when creating prompt with circular metadata
        expect(() => {
          const rawPrompt = createRawPrompt("Test content", metadata);
          const result = validator.validate(rawPrompt);

          if (isOk(result)) {
            const enhancementResult = enhancer.enhance(result.value);
            expect(isOk(enhancementResult)).toBe(true);
          }
        }).not.toThrow();
      });

      it("should handle metadata with very deep nesting", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let deepObject: any = {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        let current = deepObject;

        // Create 100 levels of nesting
        for (let i = 0; i < 100; i++) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          current.level = i;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          current.next = {};
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          current = current.next;
        }

        const metadata: PromptMetadata = {
          timestamp: new Date(),
          // @ts-expect-error Testing edge case with deeply nested metadata
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          deepData: deepObject,
        };

        const rawPrompt = createRawPrompt("Test content", metadata);
        const result = validator.validate(rawPrompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const enhancementResult = enhancer.enhance(result.value);
          expect(isOk(enhancementResult)).toBe(true);
        }
      });

      it("should handle metadata with special values", () => {
        const metadata: PromptMetadata = {
          timestamp: new Date(),
          userId: "",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          sessionId: null as any,
          context: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            correlationId: undefined as any,
            specialValues: {
              infinity: Infinity,
              negativeInfinity: -Infinity,
              nan: NaN,
              symbolValue: Symbol("test"),
              functionValue: () => "test",
            },
          },
        };

        const rawPrompt = createRawPrompt("Test content", metadata);
        const result = validator.validate(rawPrompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          const enhancementResult = enhancer.enhance(result.value);
          expect(isOk(enhancementResult)).toBe(true);
        }
      });
    });

    describe("error chaining scenarios", () => {
      it("should maintain error context through processing chain", () => {
        const rawPrompt = createRawPrompt(""); // Empty prompt will fail validation
        const validationResult = validator.validate(rawPrompt);

        expect(isErr(validationResult)).toBe(true);
        if (isErr(validationResult)) {
          expect(validationResult.error.type).toBe("validation");
          expect(validationResult.error.code).toBe("EMPTY_PROMPT");
          expect(validationResult.error.message).toContain("empty");
        }
      });

      it("should handle processing with invalid options gracefully", () => {
        const options: ProcessingOptions = {
          minLength: -1, // Invalid negative length
          maxLength: 0, // Invalid zero length
          // @ts-expect-error Testing edge case with invalid options
          invalidProperty: "should be ignored",
        };

        const rawPrompt = createRawPrompt("Valid content");

        // Should handle invalid options without throwing, but may fail validation
        expect(() => {
          const result = validator.validate(rawPrompt, options);
          // With invalid options (minLength -1, maxLength 0), validation should fail
          expect(isErr(result)).toBe(true);
          if (isErr(result)) {
            expect(result.error.code).toBe("TOO_LONG"); // Content exceeds maxLength of 0
          }
        }).not.toThrow();
      });
    });
  });

  describe("Performance Edge Cases", () => {
    describe("time-sensitive scenarios", () => {
      it("should complete validation within reasonable time for large input", () => {
        const largeContent = "Large content ".repeat(500); // ~7000 characters
        const rawPrompt = createRawPrompt(largeContent);

        const startTime = Date.now();
        const result = validator.validate(rawPrompt);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
        expect(isOk(result)).toBe(true);
      });

      it("should complete enhancement within reasonable time for complex content", () => {
        const complexContent = `
${"what is this ".repeat(100)}
${"how do I fix this ".repeat(100)}
${"why does this happen ".repeat(100)}
        `.trim();

        const rawPrompt = createRawPrompt(complexContent);
        const validationResult = validator.validate(rawPrompt);

        expect(isOk(validationResult)).toBe(true);
        if (isOk(validationResult)) {
          const startTime = Date.now();
          const enhancementResult = enhancer.enhance(validationResult.value);
          const endTime = Date.now();

          expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
          expect(isOk(enhancementResult)).toBe(true);
        }
      });
    });

    describe("memory efficiency scenarios", () => {
      it("should not create excessive intermediate objects", () => {
        const content = "Test content with moderate complexity and length";
        const rawPrompt = createRawPrompt(content);

        // Mock to track object creation (simplified test)
        const originalDate = global.Date;
        let dateCreationCount = 0;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        global.Date = class extends originalDate {
          constructor() {
            super();
            dateCreationCount++;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        const validationResult = validator.validate(rawPrompt);
        if (isOk(validationResult)) {
          enhancer.enhance(validationResult.value);
        }

        global.Date = originalDate;

        // Should not create excessive Date objects
        expect(dateCreationCount).toBeLessThan(10);
      });
    });
  });
});
