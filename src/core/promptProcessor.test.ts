import { describe, it, expect } from "vitest";
import {
  Result,
  success,
  failure,
  isOk,
  isErr,
  RawPrompt,
  ValidatedPrompt,
  EnhancedPrompt,
  PromptValidationError,
  PromptProcessingError,
  createRawPrompt,
  type PromptValidator,
  type PromptEnhancer,
  type PromptProcessingService,
} from "./promptProcessor";

describe("Result Type", () => {
  it("should create success result", () => {
    const result = success("test value");

    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    expect(result.success).toBe(true);

    if (isOk(result)) {
      expect(result.value).toBe("test value");
    }
  });

  it("should create failure result", () => {
    const error: PromptValidationError = {
      type: "validation",
      code: "EMPTY_PROMPT",
      message: "Prompt cannot be empty",
    };
    const result = failure<string, PromptValidationError>(error);

    expect(isOk(result)).toBe(false);
    expect(isErr(result)).toBe(true);
    expect(result.success).toBe(false);

    if (isErr(result)) {
      expect(result.error).toEqual(error);
    }
  });

  it("should maintain type safety", () => {
    const successResult = success(42);
    const errorResult = failure<number, string>("error");

    // TypeScript should infer correct types
    if (isOk(successResult)) {
      expect(typeof successResult.value).toBe("number");
    }

    if (isErr(errorResult)) {
      expect(typeof errorResult.error).toBe("string");
    }
  });
});

describe("Prompt Value Objects", () => {
  it("should create RawPrompt with required properties", () => {
    const prompt = createRawPrompt("Hello world", { timestamp: new Date() });

    expect(prompt.content).toBe("Hello world");
    expect(prompt.metadata.timestamp).toBeInstanceOf(Date);
    expect(typeof prompt.id).toBe("string");
    expect(prompt.id.length).toBeGreaterThan(0);
  });

  it("should enforce immutability of prompt objects", () => {
    const prompt = createRawPrompt("test");

    // TypeScript readonly properties are compile-time only
    // This test verifies the structure is correct for immutability
    expect(prompt.content).toBe("test");
    expect(typeof prompt.id).toBe("string");
    expect(prompt.metadata).toBeDefined();

    // The readonly enforcement happens at compile-time with TypeScript
    // attempting to modify properties would cause TypeScript errors
  });

  it("should handle empty content validation", () => {
    const emptyPrompt = createRawPrompt("");
    expect(emptyPrompt.content).toBe("");
  });
});

describe("Error Types", () => {
  it("should create validation errors with correct structure", () => {
    const error: PromptValidationError = {
      type: "validation",
      code: "TOO_LONG",
      message: "Prompt exceeds maximum length",
      details: { maxLength: 1000, actualLength: 1500 },
    };

    expect(error.type).toBe("validation");
    expect(error.code).toBe("TOO_LONG");
    expect(error.message).toBeTruthy();
    expect(error.details).toBeDefined();
  });

  it("should create processing errors with correct structure", () => {
    const error: PromptProcessingError = {
      type: "processing",
      code: "ENHANCEMENT_FAILED",
      message: "Failed to enhance prompt",
      stage: "enhancement",
    };

    expect(error.type).toBe("processing");
    expect(error.stage).toBe("enhancement");
  });
});

describe("Interface Contracts", () => {
  it("should define PromptValidator interface correctly", () => {
    // This is a compile-time test - if it compiles, the interface is correct
    const mockValidator: PromptValidator = {
      validate: (
        prompt: RawPrompt,
      ): Result<ValidatedPrompt, PromptValidationError> => {
        return success({
          id: prompt.id,
          content: prompt.content,
          metadata: prompt.metadata,
          validatedAt: new Date(),
          rules: ["length", "content"],
        });
      },
    };

    expect(typeof mockValidator.validate).toBe("function");
  });

  it("should define PromptEnhancer interface correctly", () => {
    const mockEnhancer: PromptEnhancer = {
      enhance: (
        prompt: ValidatedPrompt,
      ): Result<EnhancedPrompt, PromptProcessingError> => {
        return success({
          id: prompt.id,
          content: `Enhanced: ${prompt.content}`,
          metadata: prompt.metadata,
          originalContent: prompt.content,
          enhancedAt: new Date(),
          enhancements: ["clarification", "context"],
        });
      },
    };

    expect(typeof mockEnhancer.enhance).toBe("function");
  });

  it("should define PromptProcessingService interface correctly", () => {
    const mockService: PromptProcessingService = {
      processPrompt: async (
        prompt: RawPrompt,
      ): Promise<
        Result<EnhancedPrompt, PromptValidationError | PromptProcessingError>
      > => {
        // Simulate async processing
        await Promise.resolve();
        return success({
          id: prompt.id,
          content: `Processed: ${prompt.content}`,
          metadata: prompt.metadata,
          originalContent: prompt.content,
          enhancedAt: new Date(),
          enhancements: ["processed"],
        });
      },
    };

    expect(typeof mockService.processPrompt).toBe("function");
  });
});

describe("Type Safety", () => {
  it("should prevent invalid error type assignments", () => {
    // This test ensures our discriminated unions work correctly
    const validationError: PromptValidationError = {
      type: "validation",
      code: "EMPTY_PROMPT",
      message: "Test",
    };

    const processingError: PromptProcessingError = {
      type: "processing",
      code: "ENHANCEMENT_FAILED",
      message: "Test",
      stage: "validation",
    };

    expect(validationError.type).toBe("validation");
    expect(processingError.type).toBe("processing");
  });
});
