import { describe, it, expect } from "vitest";
import {
  createRawPrompt,
  isOk,
  isErr,
  type ProcessingOptions,
} from "./promptProcessor";
import { DefaultPromptValidator } from "./promptValidator";

describe("DefaultPromptValidator", () => {
  const validator = new DefaultPromptValidator();

  describe("validate", () => {
    it("should validate a valid prompt", () => {
      const prompt = createRawPrompt("This is a valid prompt");
      const result = validator.validate(prompt);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.content).toBe("This is a valid prompt");
        expect(result.value.id).toBe(prompt.id);
        expect(result.value.metadata).toEqual(prompt.metadata);
        expect(result.value.validatedAt).toBeInstanceOf(Date);
        expect(result.value.rules).toContain("empty");
        expect(result.value.rules).toContain("length");
        expect(result.value.rules).toContain("content");
      }
    });

    describe("empty prompt validation", () => {
      it("should reject empty prompt", () => {
        const prompt = createRawPrompt("");
        const result = validator.validate(prompt);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("EMPTY_PROMPT");
          expect(result.error.message).toContain("empty");
        }
      });

      it("should reject whitespace-only prompt", () => {
        const prompt = createRawPrompt("   \t\n  ");
        const result = validator.validate(prompt);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("EMPTY_PROMPT");
        }
      });
    });

    describe("length validation", () => {
      it("should reject prompt shorter than minimum length", () => {
        const prompt = createRawPrompt("ab");
        const result = validator.validate(prompt);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("TOO_SHORT");
          expect(result.error.message).toContain("at least 3 characters");
          expect(result.error.details).toEqual({
            minLength: 3,
            actualLength: 2,
          });
        }
      });

      it("should accept prompt exactly at minimum length", () => {
        const prompt = createRawPrompt("abc");
        const result = validator.validate(prompt);

        expect(isOk(result)).toBe(true);
      });

      it("should reject prompt longer than maximum length", () => {
        const longPrompt = "a".repeat(10001);
        const prompt = createRawPrompt(longPrompt);
        const result = validator.validate(prompt);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("TOO_LONG");
          expect(result.error.message).toContain("10000 characters");
          expect(result.error.details).toEqual({
            maxLength: 10000,
            actualLength: 10001,
          });
        }
      });

      it("should accept prompt exactly at maximum length", () => {
        const longPrompt = "a".repeat(10000);
        const prompt = createRawPrompt(longPrompt);
        const result = validator.validate(prompt);

        expect(isOk(result)).toBe(true);
      });
    });

    describe("custom length options", () => {
      it("should use custom minimum length", () => {
        const prompt = createRawPrompt("hello");
        const options: ProcessingOptions = { minLength: 10 };
        const result = validator.validate(prompt, options);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("TOO_SHORT");
          expect(result.error.details?.["minLength"]).toBe(10);
        }
      });

      it("should use custom maximum length", () => {
        const prompt = createRawPrompt("hello world");
        const options: ProcessingOptions = { maxLength: 5 };
        const result = validator.validate(prompt, options);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.code).toBe("TOO_LONG");
          expect(result.error.details?.["maxLength"]).toBe(5);
        }
      });
    });

    describe("content validation", () => {
      it("should trim whitespace before validation", () => {
        const prompt = createRawPrompt("  valid prompt  ");
        const result = validator.validate(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("valid prompt");
        }
      });

      it("should handle prompts with newlines and tabs", () => {
        const prompt = createRawPrompt("Line 1\nLine 2\tTabbed");
        const result = validator.validate(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("Line 1\nLine 2\tTabbed");
        }
      });

      it("should handle unicode characters", () => {
        const prompt = createRawPrompt("Hello 世界 🌍");
        const result = validator.validate(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.content).toBe("Hello 世界 🌍");
        }
      });
    });

    describe("validation rules tracking", () => {
      it("should track all applied validation rules", () => {
        const prompt = createRawPrompt("Test prompt");
        const result = validator.validate(prompt);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.rules).toEqual(["empty", "length", "content"]);
        }
      });

      it("should include custom rules when provided", () => {
        const prompt = createRawPrompt("Test prompt");
        const options: ProcessingOptions = { customRules: ["rule1", "rule2"] };
        const result = validator.validate(prompt, options);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.rules).toContain("empty");
          expect(result.value.rules).toContain("length");
          expect(result.value.rules).toContain("content");
          expect(result.value.rules).toContain("rule1");
          expect(result.value.rules).toContain("rule2");
        }
      });
    });
  });
});
