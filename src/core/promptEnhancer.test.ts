import { describe, it, expect } from "vitest";
import {
  createRawPrompt,
  isOk,
  type ValidatedPrompt,
  type ProcessingOptions,
} from "./promptProcessor";
import { DefaultPromptEnhancer } from "./promptEnhancer";

describe("DefaultPromptEnhancer", () => {
  const enhancer = new DefaultPromptEnhancer();

  // Helper to create a validated prompt
  function createValidatedPrompt(content: string): ValidatedPrompt {
    const raw = createRawPrompt(content);
    return {
      id: raw.id,
      content,
      metadata: raw.metadata,
      validatedAt: new Date(),
      rules: ["empty", "length", "content"],
    };
  }

  describe("enhance", () => {
    it("should enhance a valid prompt", () => {
      const prompt = createValidatedPrompt("What is the meaning of life?");
      const result = enhancer.enhance(prompt);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toBe("What is the meaning of life?");
        expect(result.value.id).toBe(prompt.id);
        expect(result.value.metadata).toEqual(prompt.metadata);
        expect(result.value.originalContent).toBe(prompt.content);
        expect(result.value.enhancedAt).toBeInstanceOf(Date);
        expect(result.value.enhancements).toContain("whitespace");
        expect(result.value.enhancements).toContain("clarity");
      }
    });

    describe("whitespace normalization", () => {
      it("should normalize multiple spaces", () => {
        const prompt = createValidatedPrompt("What   is    the   meaning?");
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("What is the meaning?");
          expect(result.value.enhancements).toContain("whitespace");
        }
      });

      it("should normalize multiple newlines", () => {
        const prompt = createValidatedPrompt("Line 1\n\n\nLine 2");
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("Line 1\n\nLine 2");
          expect(result.value.enhancements).toContain("whitespace");
        }
      });

      it("should trim leading and trailing whitespace", () => {
        const prompt = createValidatedPrompt("  Hello world  ");
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("Hello world");
          expect(result.value.enhancements).toContain("whitespace");
        }
      });
    });

    describe("clarity improvements", () => {
      it("should add punctuation to questions without it", () => {
        const prompt = createValidatedPrompt("What is the weather today");
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("What is the weather today?");
          expect(result.value.enhancements).toContain("clarity");
        }
      });

      it("should not duplicate existing punctuation", () => {
        const prompt = createValidatedPrompt("What is the weather today?");
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("What is the weather today?");
        }
      });

      it("should handle multiple sentences", () => {
        const prompt = createValidatedPrompt(
          "Tell me about TypeScript. What are its benefits",
        );
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe(
            "Tell me about TypeScript. What are its benefits?",
          );
          expect(result.value.enhancements).toContain("clarity");
        }
      });
    });

    describe("enhancement options", () => {
      it("should skip enhancement when disabled", () => {
        const prompt = createValidatedPrompt("What   is    the   meaning");
        const options: ProcessingOptions = { enableEnhancement: false };
        const result = enhancer.enhance(prompt, options);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("What   is    the   meaning");
          expect(result.value.enhancements).toEqual([]);
        }
      });
    });

    describe("already optimal prompts", () => {
      it("should handle prompts that need no enhancement", () => {
        const prompt = createValidatedPrompt(
          "Please explain the concept of dependency injection.",
        );
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe(
            "Please explain the concept of dependency injection.",
          );
          // Should still track that enhancement checks were performed
          expect(result.value.enhancements.length).toBeGreaterThan(0);
        }
      });
    });

    describe("enhancement tracking", () => {
      it("should track all applied enhancements", () => {
        const prompt = createValidatedPrompt("What   is   TypeScript");
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.enhancements).toContain("whitespace");
          expect(result.value.enhancements).toContain("clarity");
          expect(result.value.content).toBe("What is TypeScript?");
        }
      });

      it("should preserve original content", () => {
        const originalContent = "What   is   TypeScript";
        const prompt = createValidatedPrompt(originalContent);
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.originalContent).toBe(originalContent);
          expect(result.value.content).not.toBe(originalContent);
        }
      });
    });

    describe("complex enhancement scenarios", () => {
      it("should handle code snippets appropriately", () => {
        const prompt = createValidatedPrompt(
          "Explain this code:\n```\nfunction   add(a,   b)   {\n  return a + b;\n}\n```",
        );
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          // Should preserve code formatting inside code blocks
          expect(result.value.content).toContain("function   add(a,   b)   {");
        }
      });

      it("should handle prompts with special characters", () => {
        const prompt = createValidatedPrompt(
          "What's the difference between != and !==?",
        );
        const result = enhancer.enhance(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe(
            "What's the difference between != and !==?",
          );
        }
      });
    });
  });
});
