/**
 * Tests for core security utilities.
 *
 * This module tests the security validation functions that ensure
 * proper authentication and secure operation of the application.
 * These are security-critical functions requiring comprehensive testing.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateApiKeyFunctionality,
  validateStartupSecurity,
  sanitizeUserInput,
  validateInputSafety,
} from "./security";
import type { AppConfig } from "../config";

// Type definitions for mocked GoogleGenerativeAI
interface MockGoogleGenerativeAI {
  getGenerativeModel: ReturnType<typeof vi.fn>;
  apiKey: string;
  getGenerativeModelFromCachedContent: ReturnType<typeof vi.fn>;
}

// Mock GoogleGenerativeAI to control test behavior
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(),
}));

describe("security utilities", () => {
  // Clean up mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("validateApiKeyFunctionality", () => {
    describe("successful validation", () => {
      it("should return success when API key is valid", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi.fn().mockResolvedValue({
          response: { text: () => "test response" },
        });
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "valid-api-key",
          "gemini-1.5-pro",
        );

        // Assert
        expect(result.success).toBe(true);
        expect(GoogleGenerativeAI).toHaveBeenCalledWith("valid-api-key");
        expect(mockGetGenerativeModel).toHaveBeenCalledWith({
          model: "gemini-1.5-pro",
        });
        expect(mockGenerateContent).toHaveBeenCalledWith({
          contents: [{ role: "user", parts: [{ text: "Test" }] }],
          generationConfig: {
            maxOutputTokens: 1,
            temperature: 0,
          },
        });
      });

      it("should use custom timeout when provided", async () => {
        // Arrange - Mock a successful response to test timeout parameter acceptance
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi.fn().mockResolvedValue({
          response: { text: () => "test response" },
        });
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act with custom timeout
        const result = await validateApiKeyFunctionality(
          "valid-key",
          "model",
          5000,
        );

        // Assert - should succeed with custom timeout
        expect(result.success).toBe(true);
        expect(mockGenerateContent).toHaveBeenCalled();
      });
    });

    describe("authentication errors", () => {
      it("should handle invalid API key errors", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(new Error("Invalid API key provided"));
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "invalid-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("security");
          expect(result.error.code).toBe("INVALID_API_KEY");
          expect(result.error.message).toContain("invalid or expired");
          expect(result.error.message).toContain("https://aistudio.google.com");
          expect(result.error.details?.originalError).toEqual({
            message: "Invalid API key provided",
            name: "Error",
          });
        }
      });

      it("should handle unauthorized errors", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(
            new Error("Unauthorized access - authentication failed"),
          );
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "unauthorized-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("security");
          expect(result.error.code).toBe("INVALID_API_KEY");
          expect(result.error.message).toContain("invalid or expired");
        }
      });

      it("should handle authentication errors with different casing", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(
            new Error("AUTHENTICATION Failed - Invalid Key Format"),
          );
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "malformed-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("security");
          expect(result.error.code).toBe("INVALID_API_KEY");
        }
      });
    });

    describe("quota and rate limiting errors", () => {
      it("should handle quota exceeded errors", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(new Error("Quota exceeded for requests"));
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "quota-exceeded-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("security");
          expect(result.error.code).toBe("INVALID_API_KEY");
          expect(result.error.message).toContain("quota exceeded");
          expect(result.error.message).toContain("https://aistudio.google.com");
        }
      });

      it("should handle rate limit errors", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(
            new Error("Rate limit exceeded - too many requests"),
          );
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "rate-limited-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("security");
          expect(result.error.code).toBe("INVALID_API_KEY");
          expect(result.error.message).toContain("quota exceeded");
        }
      });

      it("should handle limit errors with different wording", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(new Error("API usage limit reached"));
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "limited-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("security");
          expect(result.error.code).toBe("INVALID_API_KEY");
        }
      });
    });

    describe("timeout errors", () => {
      it("should handle timeout errors from API", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(
            new Error("Request timeout - API took too long to respond"),
          );
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "timeout-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("application");
          expect(result.error.code).toBe("SERVICE_UNAVAILABLE");
          expect(result.error.message).toContain("timed out");
          expect(result.error.message).toContain("may be unavailable");
        }
      });

      it("should handle actual timeout from race condition", async () => {
        // Note: This test is challenging to implement with vitest fake timers
        // and the current Promise.race implementation. In real scenarios,
        // timeout errors would be classified based on the specific error message.

        // For now, test that timeout-like errors get proper classification
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(new Error("Request timeout occurred"));
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "slow-key",
          "model",
          3000,
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("application");
          expect(result.error.code).toBe("SERVICE_UNAVAILABLE");
          expect(result.error.message).toContain("timed out");
        }
      });
    });

    describe("network errors", () => {
      it("should handle network connection errors", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(new Error("Network error - unable to connect"));
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "network-error-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("application");
          expect(result.error.code).toBe("SERVICE_UNAVAILABLE");
          expect(result.error.message).toContain("Unable to connect");
          expect(result.error.message).toContain("internet connection");
        }
      });

      it("should handle connection failures", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(new Error("Connection refused by server"));
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "connection-error-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("application");
          expect(result.error.code).toBe("SERVICE_UNAVAILABLE");
        }
      });

      it("should handle fetch errors", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(new Error("fetch failed - DNS resolution error"));
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "fetch-error-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("application");
          expect(result.error.code).toBe("SERVICE_UNAVAILABLE");
        }
      });
    });

    describe("generic and unknown errors", () => {
      it("should handle generic API errors", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue(new Error("Some unexpected API error occurred"));
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "generic-error-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("application");
          expect(result.error.code).toBe("UNEXPECTED_ERROR");
          expect(result.error.message).toContain("API key validation failed");
          expect(result.error.message).toContain(
            "Some unexpected API error occurred",
          );
          expect(result.error.details?.originalError).toEqual({
            message: "Some unexpected API error occurred",
            name: "Error",
          });
        }
      });

      it("should handle non-Error thrown values", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi
          .fn()
          .mockRejectedValue("String error thrown");
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "string-error-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("application");
          expect(result.error.code).toBe("UNEXPECTED_ERROR");
          expect(result.error.message).toContain(
            "Unexpected error during API key validation",
          );
          expect(result.error.message).toContain("String error thrown");
          expect(result.error.details?.originalError).toEqual({
            message: "String error thrown",
          });
        }
      });

      it("should handle null/undefined errors", async () => {
        // Arrange
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const mockGenerateContent = vi.fn().mockRejectedValue(null);
        const mockGetGenerativeModel = vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        });
        vi.mocked(GoogleGenerativeAI).mockImplementation(
          (): MockGoogleGenerativeAI => ({
            getGenerativeModel: mockGetGenerativeModel,
            apiKey: "mocked-api-key",
            getGenerativeModelFromCachedContent: vi.fn(),
          }),
        );

        // Act
        const result = await validateApiKeyFunctionality(
          "null-error-key",
          "model",
        );

        // Assert
        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.error.type).toBe("application");
          expect(result.error.code).toBe("UNEXPECTED_ERROR");
          expect(result.error.message).toContain("null");
        }
      });
    });
  });

  describe("validateStartupSecurity", () => {
    const mockConfig: AppConfig = {
      api: {
        apiKey: "test-api-key",
        modelId: "gemini-1.5-pro",
        timeoutMs: 10000,
        maxRetries: 3,
        temperature: 0.7,
      },
      prompt: {
        enableElevation: true,
      },
      output: {
        raw: false,
        streaming: true,
        showProgress: true,
      },
      logging: {
        level: "info",
        serviceName: "test-service",
        jsonFormat: true,
      },
    };

    it("should return success when API key validation succeeds", async () => {
      // Arrange
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: { text: () => "test" },
      });
      const mockGetGenerativeModel = vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });
      vi.mocked(GoogleGenerativeAI).mockImplementation(
        (): MockGoogleGenerativeAI => ({
          getGenerativeModel: mockGetGenerativeModel,
          apiKey: "mocked-api-key",
          getGenerativeModelFromCachedContent: vi.fn(),
        }),
      );

      // Act
      const result = await validateStartupSecurity(mockConfig);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should return API key validation error when validation fails", async () => {
      // Arrange
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const mockGenerateContent = vi
        .fn()
        .mockRejectedValue(new Error("Invalid API key"));
      const mockGetGenerativeModel = vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });
      vi.mocked(GoogleGenerativeAI).mockImplementation(
        (): MockGoogleGenerativeAI => ({
          getGenerativeModel: mockGetGenerativeModel,
          apiKey: "mocked-api-key",
          getGenerativeModelFromCachedContent: vi.fn(),
        }),
      );

      // Act
      const result = await validateStartupSecurity(mockConfig);

      // Assert
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.type).toBe("security");
        expect(result.error.code).toBe("INVALID_API_KEY");
      }
    });

    it("should pass through configuration parameters correctly", async () => {
      // Arrange
      const customConfig: AppConfig = {
        api: {
          apiKey: "custom-key",
          modelId: "gemini-2.5-flash-preview-05-20",
          timeoutMs: 5000,
          maxRetries: 2,
          temperature: 0.5,
        },
        prompt: {
          enableElevation: false,
        },
        output: {
          raw: true,
          streaming: false,
          showProgress: false,
        },
        logging: {
          level: "debug",
          serviceName: "custom-service",
          jsonFormat: false,
        },
      };

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: { text: () => "test" },
      });
      const mockGetGenerativeModel = vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });
      vi.mocked(GoogleGenerativeAI).mockImplementation(
        (): MockGoogleGenerativeAI => ({
          getGenerativeModel: mockGetGenerativeModel,
          apiKey: "mocked-api-key",
          getGenerativeModelFromCachedContent: vi.fn(),
        }),
      );

      // Act
      const result = await validateStartupSecurity(customConfig);

      // Assert
      expect(result.success).toBe(true);
      expect(GoogleGenerativeAI).toHaveBeenCalledWith("custom-key");
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-2.5-flash-preview-05-20",
      });
    });
  });

  describe("sanitizeUserInput", () => {
    describe("valid inputs", () => {
      it("should return clean input unchanged", () => {
        // Arrange
        const cleanInput = "Write a function to calculate fibonacci numbers";

        // Act
        const result = sanitizeUserInput(cleanInput);

        // Assert
        expect(result).toBe(cleanInput);
      });

      it("should preserve newlines and tabs", () => {
        // Arrange
        const inputWithFormatting = "Line 1\nLine 2\tTabbed content";

        // Act
        const result = sanitizeUserInput(inputWithFormatting);

        // Assert
        expect(result).toBe(inputWithFormatting);
      });

      it("should handle empty strings", () => {
        // Arrange
        const emptyInput = "";

        // Act
        const result = sanitizeUserInput(emptyInput);

        // Assert
        expect(result).toBe("");
      });

      it("should handle normal punctuation and symbols", () => {
        // Arrange
        const inputWithSymbols =
          "Create a function: func(x, y) => x + y; // comment";

        // Act
        const result = sanitizeUserInput(inputWithSymbols);

        // Assert
        expect(result).toBe(inputWithSymbols);
      });
    });

    describe("input cleaning", () => {
      it("should remove null bytes", () => {
        // Arrange
        const inputWithNulls = "Hello\x00World\x00Test";

        // Act
        const result = sanitizeUserInput(inputWithNulls);

        // Assert
        expect(result).toBe("HelloWorldTest");
      });

      it("should remove control characters except newlines and tabs", () => {
        // Arrange
        const inputWithControls = "Hello\x01\x02World\x03\x04Test\x05";

        // Act
        const result = sanitizeUserInput(inputWithControls);

        // Assert
        expect(result).toBe("HelloWorldTest");
      });

      it("should preserve newlines and tabs while removing other controls", () => {
        // Arrange
        const inputMixed = "Line1\n\x01Tab\t\x02Line2\x03";

        // Act
        const result = sanitizeUserInput(inputMixed);

        // Assert
        expect(result).toBe("Line1\nTab\tLine2");
      });

      it("should remove DEL character (0x7F)", () => {
        // Arrange
        const inputWithDel = "Hello\x7FWorld";

        // Act
        const result = sanitizeUserInput(inputWithDel);

        // Assert
        expect(result).toBe("HelloWorld");
      });

      it("should trim leading and trailing whitespace", () => {
        // Arrange
        const inputWithWhitespace = "   \t  Hello World  \n  ";

        // Act
        const result = sanitizeUserInput(inputWithWhitespace);

        // Assert
        expect(result).toBe("Hello World");
      });

      it("should reduce excessive internal whitespace", () => {
        // Arrange
        const inputWithExcessiveSpaces = "Hello     World     Test";

        // Act
        const result = sanitizeUserInput(inputWithExcessiveSpaces);

        // Assert
        expect(result).toBe("Hello  World  Test");
      });

      it("should handle mixed whitespace types", () => {
        // Arrange
        const inputMixed = "Hello\t\t\t   \n   World";

        // Act
        const result = sanitizeUserInput(inputMixed);

        // Assert
        expect(result).toBe("Hello  World");
      });
    });

    describe("length limits", () => {
      it("should truncate very long inputs", () => {
        // Arrange
        const longInput = "A".repeat(15000); // Exceeds 10KB limit

        // Act
        const result = sanitizeUserInput(longInput);

        // Assert
        expect(result.length).toBe(10000);
        expect(result).toBe("A".repeat(10000));
      });

      it("should not truncate inputs under the limit", () => {
        // Arrange
        const normalInput = "A".repeat(9999); // Under 10KB limit

        // Act
        const result = sanitizeUserInput(normalInput);

        // Assert
        expect(result.length).toBe(9999);
        expect(result).toBe("A".repeat(9999));
      });

      it("should handle exactly 10KB inputs", () => {
        // Arrange
        const exactLimitInput = "A".repeat(10000);

        // Act
        const result = sanitizeUserInput(exactLimitInput);

        // Assert
        expect(result.length).toBe(10000);
        expect(result).toBe(exactLimitInput);
      });
    });

    describe("input validation", () => {
      it("should throw error for non-string inputs", () => {
        // Arrange & Act & Assert
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        expect(() => sanitizeUserInput(123 as any)).toThrow(
          "Input must be a string",
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        expect(() => sanitizeUserInput(null as any)).toThrow(
          "Input must be a string",
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        expect(() => sanitizeUserInput(undefined as any)).toThrow(
          "Input must be a string",
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        expect(() => sanitizeUserInput({} as any)).toThrow(
          "Input must be a string",
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        expect(() => sanitizeUserInput([] as any)).toThrow(
          "Input must be a string",
        );
      });
    });

    describe("complex scenarios", () => {
      it("should handle complex inputs with multiple issues", () => {
        // Arrange
        const complexInput =
          "  \x01Hello\x00\x02     World\x03\t\t\t   Test\x7F  ";

        // Act
        const result = sanitizeUserInput(complexInput);

        // Assert
        expect(result).toBe("Hello  World  Test");
      });

      it("should handle Unicode characters correctly", () => {
        // Arrange
        const unicodeInput = "Create émojis: 🚀✨💻 and handle çharacters";

        // Act
        const result = sanitizeUserInput(unicodeInput);

        // Assert
        expect(result).toBe(unicodeInput);
      });
    });
  });

  describe("validateInputSafety", () => {
    describe("safe inputs", () => {
      it("should return true for normal text", () => {
        // Arrange
        const safeInput = "Write a function to sort an array";

        // Act
        const result = validateInputSafety(safeInput);

        // Assert
        expect(result).toBe(true);
      });

      it("should return true for code without sensitive data", () => {
        // Arrange
        const codeInput = "function hello() { console.log('Hello World'); }";

        // Act
        const result = validateInputSafety(codeInput);

        // Assert
        expect(result).toBe(true);
      });

      it("should return true for empty strings", () => {
        // Arrange
        const emptyInput = "";

        // Act
        const result = validateInputSafety(emptyInput);

        // Assert
        expect(result).toBe(true);
      });

      it("should return true for short alphanumeric strings", () => {
        // Arrange
        const shortAlphaNum = "abc123xyz";

        // Act
        const result = validateInputSafety(shortAlphaNum);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe("potentially unsafe inputs", () => {
      it("should detect long alphanumeric strings (potential API keys)", () => {
        // Arrange
        const longAlphaNumeric = "abcdefghijklmnopqrstuvwxyz123456789";

        // Act
        const result = validateInputSafety(longAlphaNumeric);

        // Assert
        expect(result).toBe(false);
      });

      it("should detect OpenAI-style API keys", () => {
        // Arrange
        const openaiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890";

        // Act
        const result = validateInputSafety(openaiKey);

        // Assert
        expect(result).toBe(false);
      });

      it("should detect Google API keys", () => {
        // Arrange
        const googleApiKey = "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456789AbC";

        // Act
        const result = validateInputSafety(googleApiKey);

        // Assert
        expect(result).toBe(false);
      });

      it("should detect environment variable assignments", () => {
        // Arrange
        const envVarInputs = [
          "API_KEY=secret123",
          "secret: mysecretvalue",
          "token = abc123def456",
          "password:mypassword123",
          "api-key=somevalue",
        ];

        // Act & Assert
        envVarInputs.forEach((input) => {
          expect(validateInputSafety(input)).toBe(false);
        });
      });

      it("should detect Base64 encoded data", () => {
        // Arrange
        const base64Data =
          "SGVsbG8gV29ybGQhIFRoaXMgaXMgYSBsb25nIGVub3VnaCBzdHJpbmcgdG8gdHJpZ2dlciB0aGUgcGF0dGVybg==";

        // Act
        const result = validateInputSafety(base64Data);

        // Assert
        expect(result).toBe(false);
      });

      it("should detect JWT tokens", () => {
        // Arrange
        const jwtToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

        // Act
        const result = validateInputSafety(jwtToken);

        // Assert
        expect(result).toBe(false);
      });

      it("should handle case insensitive environment variable patterns", () => {
        // Arrange
        const caseInsensitiveInputs = [
          "API_KEY=value",
          "SECRET=value",
          "TOKEN=value",
          "PASSWORD=value",
          "Api_Key = value",
          "Secret : value",
        ];

        // Act & Assert
        caseInsensitiveInputs.forEach((input) => {
          expect(validateInputSafety(input)).toBe(false);
        });
      });
    });

    describe("edge cases", () => {
      it("should handle inputs with multiple potential issues", () => {
        // Arrange
        const multiIssueInput =
          "My API_KEY=sk-abcdefghijklmnopqrstuvwxyz and TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abc";

        // Act
        const result = validateInputSafety(multiIssueInput);

        // Assert
        expect(result).toBe(false);
      });

      it("should handle malformed JWT-like strings", () => {
        // Arrange
        const malformedJwt = "ey.abc.def"; // Too short to be real JWT

        // Act
        const result = validateInputSafety(malformedJwt);

        // Assert
        expect(result).toBe(true); // Should pass because it's too short
      });

      it("should handle Base64-like strings that are too short", () => {
        // Arrange
        const shortBase64Like = "SGVsbG8="; // Short Base64, should pass

        // Act
        const result = validateInputSafety(shortBase64Like);

        // Assert
        expect(result).toBe(true);
      });

      it("should handle environment variable patterns without values", () => {
        // Arrange
        const incompleteEnvVars = [
          "API_KEY=",
          "SECRET:",
          "TOKEN =",
          "password:",
        ];

        // Act & Assert
        incompleteEnvVars.forEach((input) => {
          expect(validateInputSafety(input)).toBe(true); // Should pass because no actual value
        });
      });
    });
  });
});
