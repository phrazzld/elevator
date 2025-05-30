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
  createValidationError,
  createProcessingError,
  isValidationError,
  isProcessingError,
  type PromptValidator,
  type PromptEnhancer,
  type PromptProcessingService,
  type PromptError,
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
  describe("createRawPrompt", () => {
    it("should create RawPrompt with required properties", () => {
      const prompt = createRawPrompt("Hello world");

      expect(prompt.content).toBe("Hello world");
      expect(prompt.metadata.timestamp).toBeInstanceOf(Date);
      expect(typeof prompt.id).toBe("string");
      expect(prompt.id.length).toBeGreaterThan(0);
      expect(prompt.id).toMatch(/^prompt_\d+_[a-z0-9]+$/);
    });

    it("should generate unique IDs", () => {
      const prompt1 = createRawPrompt("test1");
      const prompt2 = createRawPrompt("test2");

      expect(prompt1.id).not.toBe(prompt2.id);
    });

    it("should merge provided metadata", () => {
      const customTimestamp = new Date("2024-01-01");
      const prompt = createRawPrompt("Hello world", {
        timestamp: customTimestamp,
        userId: "user123",
        sessionId: "session456",
        context: { source: "api" },
      });

      expect(prompt.metadata.timestamp).toBe(customTimestamp);
      expect(prompt.metadata.userId).toBe("user123");
      expect(prompt.metadata.sessionId).toBe("session456");
      expect(prompt.metadata.context).toEqual({ source: "api" });
    });

    it("should use current timestamp when not provided", () => {
      const beforeCreate = new Date();
      const prompt = createRawPrompt("test");
      const afterCreate = new Date();

      expect(prompt.metadata.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime(),
      );
      expect(prompt.metadata.timestamp.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime(),
      );
    });

    it("should handle partial metadata", () => {
      const prompt = createRawPrompt("test", { userId: "user123" });

      expect(prompt.metadata.userId).toBe("user123");
      expect(prompt.metadata.timestamp).toBeInstanceOf(Date);
      expect(prompt.metadata.sessionId).toBeUndefined();
      expect(prompt.metadata.context).toBeUndefined();
    });

    it("should handle empty metadata", () => {
      const prompt = createRawPrompt("test", {});

      expect(prompt.metadata.timestamp).toBeInstanceOf(Date);
      expect(prompt.metadata.userId).toBeUndefined();
      expect(prompt.metadata.sessionId).toBeUndefined();
      expect(prompt.metadata.context).toBeUndefined();
    });

    it("should handle empty content", () => {
      const emptyPrompt = createRawPrompt("");
      expect(emptyPrompt.content).toBe("");
    });

    it("should handle very long content", () => {
      const longContent = "a".repeat(10000);
      const prompt = createRawPrompt(longContent);
      expect(prompt.content).toBe(longContent);
      expect(prompt.content.length).toBe(10000);
    });

    it("should handle special characters in content", () => {
      const specialContent = "Hello\n\t世界🌍!@#$%^&*()";
      const prompt = createRawPrompt(specialContent);
      expect(prompt.content).toBe(specialContent);
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

describe("Error Creation Utilities", () => {
  describe("createValidationError", () => {
    it("should create validation error without details", () => {
      const error = createValidationError(
        "EMPTY_PROMPT",
        "Prompt cannot be empty",
      );

      expect(error).toEqual({
        type: "validation",
        code: "EMPTY_PROMPT",
        message: "Prompt cannot be empty",
      });
      expect(error.details).toBeUndefined();
    });

    it("should create validation error with details", () => {
      const details = { minLength: 5, actualLength: 3 };
      const error = createValidationError(
        "TOO_SHORT",
        "Prompt is too short",
        details,
      );

      expect(error).toEqual({
        type: "validation",
        code: "TOO_SHORT",
        message: "Prompt is too short",
        details,
      });
    });

    it("should handle empty details object", () => {
      const error = createValidationError(
        "INVALID_CHARACTERS",
        "Invalid characters found",
        {},
      );

      expect(error.details).toEqual({});
    });

    it("should create errors with all validation codes", () => {
      const codes = [
        "EMPTY_PROMPT",
        "TOO_LONG",
        "TOO_SHORT",
        "INVALID_CHARACTERS",
        "MALFORMED_CONTENT",
        "UNSAFE_CONTENT",
      ] as const;

      codes.forEach((code) => {
        const error = createValidationError(code, `Error for ${code}`);
        expect(error.code).toBe(code);
        expect(error.type).toBe("validation");
      });
    });
  });

  describe("createProcessingError", () => {
    it("should create processing error without details", () => {
      const error = createProcessingError(
        "ENHANCEMENT_FAILED",
        "Enhancement failed",
        "enhancement",
      );

      expect(error).toEqual({
        type: "processing",
        code: "ENHANCEMENT_FAILED",
        message: "Enhancement failed",
        stage: "enhancement",
      });
      expect(error.details).toBeUndefined();
    });

    it("should create processing error with details", () => {
      const details = { reason: "timeout", duration: 5000 };
      const error = createProcessingError(
        "PROCESSING_TIMEOUT",
        "Processing timed out",
        "validation",
        details,
      );

      expect(error).toEqual({
        type: "processing",
        code: "PROCESSING_TIMEOUT",
        message: "Processing timed out",
        stage: "validation",
        details,
      });
    });

    it("should handle all processing stages", () => {
      const stages = ["validation", "enhancement", "preparation"] as const;

      stages.forEach((stage) => {
        const error = createProcessingError(
          "INVALID_STATE",
          `Error at ${stage}`,
          stage,
        );
        expect(error.stage).toBe(stage);
      });
    });

    it("should create errors with all processing codes", () => {
      const codes = [
        "ENHANCEMENT_FAILED",
        "PROCESSING_TIMEOUT",
        "INVALID_STATE",
        "CONFIGURATION_ERROR",
      ] as const;

      codes.forEach((code) => {
        const error = createProcessingError(
          code,
          `Error for ${code}`,
          "validation",
        );
        expect(error.code).toBe(code);
        expect(error.type).toBe("processing");
      });
    });
  });
});

describe("Type Guards", () => {
  describe("isValidationError", () => {
    it("should return true for validation errors", () => {
      const error: PromptError = {
        type: "validation",
        code: "EMPTY_PROMPT",
        message: "Empty",
      };

      expect(isValidationError(error)).toBe(true);
    });

    it("should return false for processing errors", () => {
      const error: PromptError = {
        type: "processing",
        code: "ENHANCEMENT_FAILED",
        message: "Failed",
        stage: "enhancement",
      };

      expect(isValidationError(error)).toBe(false);
    });

    it("should narrow type correctly", () => {
      const error: PromptError = createValidationError("TOO_LONG", "Too long", {
        maxLength: 100,
      });

      if (isValidationError(error)) {
        // TypeScript should know this is PromptValidationError
        expect(error.code).toBe("TOO_LONG");
        expect(error.type).toBe("validation");
        // stage property should not exist on validation errors
        expect("stage" in error).toBe(false);
      }
    });
  });

  describe("isProcessingError", () => {
    it("should return true for processing errors", () => {
      const error: PromptError = {
        type: "processing",
        code: "INVALID_STATE",
        message: "Invalid",
        stage: "preparation",
      };

      expect(isProcessingError(error)).toBe(true);
    });

    it("should return false for validation errors", () => {
      const error: PromptError = {
        type: "validation",
        code: "MALFORMED_CONTENT",
        message: "Malformed",
      };

      expect(isProcessingError(error)).toBe(false);
    });

    it("should narrow type correctly", () => {
      const error: PromptError = createProcessingError(
        "CONFIGURATION_ERROR",
        "Config error",
        "validation",
        { config: "missing" },
      );

      if (isProcessingError(error)) {
        // TypeScript should know this is PromptProcessingError
        expect(error.code).toBe("CONFIGURATION_ERROR");
        expect(error.type).toBe("processing");
        expect(error.stage).toBe("validation");
      }
    });
  });

  it("should handle type guards in combination", () => {
    const errors: PromptError[] = [
      createValidationError("EMPTY_PROMPT", "Empty"),
      createProcessingError("ENHANCEMENT_FAILED", "Failed", "enhancement"),
    ];

    const validationErrors = errors.filter(isValidationError);
    const processingErrors = errors.filter(isProcessingError);

    expect(validationErrors).toHaveLength(1);
    expect(processingErrors).toHaveLength(1);
    expect(validationErrors[0]?.code).toBe("EMPTY_PROMPT");
    expect(processingErrors[0]?.code).toBe("ENHANCEMENT_FAILED");
  });
});
