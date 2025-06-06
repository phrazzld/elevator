/**
 * Tests for test data builders.
 *
 * These tests ensure that the test data builders create valid objects with correct defaults
 * and that the fluent API works as expected.
 */

import { describe, it, expect } from "vitest";
import { TestDataBuilders } from "./index";
import {
  createTestRawPrompt,
  createTestValidatedPrompt,
  createTestEnhancedPrompt,
  createPromptChain,
} from "./builders/promptBuilders";
import { createTestEnvironment } from "./builders/configBuilders";

describe("Test Data Builders", () => {
  describe("Prompt Builders", () => {
    describe("PromptMetadataBuilder", () => {
      it("should create metadata with default timestamp", () => {
        const metadata = TestDataBuilders.promptMetadata().build();

        expect(metadata.timestamp).toBeInstanceOf(Date);
        expect(metadata.userId).toBeUndefined();
        expect(metadata.sessionId).toBeUndefined();
        expect(metadata.context).toBeUndefined();
      });

      it("should allow customization of all fields", () => {
        const customTimestamp = new Date("2024-06-01");
        const metadata = TestDataBuilders.promptMetadata()
          .withTimestamp(customTimestamp)
          .withUserId("user123")
          .withSessionId("session456")
          .withContext({ source: "test" })
          .build();

        expect(metadata.timestamp).toBe(customTimestamp);
        expect(metadata.userId).toBe("user123");
        expect(metadata.sessionId).toBe("session456");
        expect(metadata.context).toEqual({ source: "test" });
      });

      it("should set current timestamp when requested", () => {
        const before = Date.now();
        const metadata = TestDataBuilders.promptMetadata()
          .withCurrentTimestamp()
          .build();
        const after = Date.now();

        expect(metadata.timestamp.getTime()).toBeGreaterThanOrEqual(before);
        expect(metadata.timestamp.getTime()).toBeLessThanOrEqual(after);
      });
    });

    describe("RawPromptBuilder", () => {
      it("should create valid raw prompt with defaults", () => {
        const prompt = TestDataBuilders.rawPrompt().build();

        expect(prompt.id).toBeTruthy();
        expect(prompt.content).toBe("Test prompt content");
        expect(prompt.metadata).toBeDefined();
        expect(prompt.metadata.timestamp).toBeInstanceOf(Date);
      });

      it("should allow content customization", () => {
        const customContent = "Custom test prompt";
        const prompt = TestDataBuilders.rawPrompt()
          .withContent(customContent)
          .build();

        expect(prompt.content).toBe(customContent);
      });

      it("should generate unique IDs", () => {
        const prompt1 = TestDataBuilders.rawPrompt().withUniqueId().build();
        const prompt2 = TestDataBuilders.rawPrompt().withUniqueId().build();

        expect(prompt1.id).not.toBe(prompt2.id);
        expect(prompt1.id).toMatch(/^prompt_\d+_[a-z0-9]+$/);
        expect(prompt2.id).toMatch(/^prompt_\d+_[a-z0-9]+$/);
      });

      it("should allow metadata customization", () => {
        const prompt = TestDataBuilders.rawPrompt()
          .withUserId("user123")
          .withSessionId("session456")
          .build();

        expect(prompt.metadata.userId).toBe("user123");
        expect(prompt.metadata.sessionId).toBe("session456");
      });
    });

    describe("ValidatedPromptBuilder", () => {
      it("should create valid validated prompt with defaults", () => {
        const prompt = TestDataBuilders.validatedPrompt().build();

        expect(prompt.id).toBeTruthy();
        expect(prompt.content).toBe("Test prompt content");
        expect(prompt.metadata).toBeDefined();
        expect(prompt.validatedAt).toBeInstanceOf(Date);
        expect(prompt.rules).toEqual(["empty", "length", "content"]);
      });

      it("should create from raw prompt", () => {
        const rawPrompt = TestDataBuilders.rawPrompt()
          .withContent("Original content")
          .withUserId("user123")
          .build();

        const validatedPrompt = TestDataBuilders.validatedPrompt()
          .fromRawPrompt(rawPrompt)
          .build();

        expect(validatedPrompt.id).toBe(rawPrompt.id);
        expect(validatedPrompt.content).toBe(rawPrompt.content);
        expect(validatedPrompt.metadata.userId).toBe("user123");
      });

      it("should allow rules customization", () => {
        const customRules = ["custom1", "custom2"];
        const prompt = TestDataBuilders.validatedPrompt()
          .withRules(customRules)
          .build();

        expect(prompt.rules).toEqual(customRules);
      });
    });

    describe("EnhancedPromptBuilder", () => {
      it("should create valid enhanced prompt with defaults", () => {
        const prompt = TestDataBuilders.enhancedPrompt().build();

        expect(prompt.id).toBeTruthy();
        expect(prompt.content).toBe(
          "Enhanced test prompt content with technical improvements",
        );
        expect(prompt.originalContent).toBe("Test prompt content");
        expect(prompt.metadata).toBeDefined();
        expect(prompt.enhancedAt).toBeInstanceOf(Date);
        expect(prompt.enhancements).toEqual([
          "clarity",
          "specificity",
          "context",
        ]);
      });

      it("should create from validated prompt", () => {
        const validatedPrompt = TestDataBuilders.validatedPrompt()
          .withContent("Validated content")
          .build();

        const enhancedPrompt = TestDataBuilders.enhancedPrompt()
          .fromValidatedPrompt(validatedPrompt)
          .build();

        expect(enhancedPrompt.id).toBe(validatedPrompt.id);
        expect(enhancedPrompt.originalContent).toBe(validatedPrompt.content);
      });

      it("should allow enhancement customization", () => {
        const customEnhancements = ["grammar", "style"];
        const prompt = TestDataBuilders.enhancedPrompt()
          .withEnhancements(customEnhancements)
          .build();

        expect(prompt.enhancements).toEqual(customEnhancements);
      });
    });

    describe("ProcessingOptionsBuilder", () => {
      it("should create empty options by default", () => {
        const options = TestDataBuilders.processingOptions().build();

        expect(Object.keys(options)).toHaveLength(0);
      });

      it("should allow all options to be set", () => {
        const options = TestDataBuilders.processingOptions()
          .withMaxLength(1000)
          .withMinLength(10)
          .withEnhancement(true)
          .withCustomRules(["rule1", "rule2"])
          .build();

        expect(options.maxLength).toBe(1000);
        expect(options.minLength).toBe(10);
        expect(options.enableEnhancement).toBe(true);
        expect(options.customRules).toEqual(["rule1", "rule2"]);
      });

      it("should provide convenience methods", () => {
        const strictOptions = TestDataBuilders.processingOptions()
          .withStrictLimits()
          .build();

        expect(strictOptions.maxLength).toBe(1000);
        expect(strictOptions.minLength).toBe(10);

        const lenientOptions = TestDataBuilders.processingOptions()
          .withLenientLimits()
          .build();

        expect(lenientOptions.maxLength).toBe(10000);
        expect(lenientOptions.minLength).toBe(1);
      });
    });
  });

  describe("Configuration Builders", () => {
    describe("ApiConfigBuilder", () => {
      it("should create valid API config with defaults", () => {
        const config = TestDataBuilders.apiConfig().build();

        expect(config.apiKey).toBe("test-api-key-1234567890abcdef");
        expect(config.modelId).toBe("gemini-2.5-flash-preview-05-20");
        expect(config.temperature).toBe(0.7);
        expect(config.timeoutMs).toBe(30000);
        expect(config.maxRetries).toBe(3);
      });

      it("should allow customization of all fields", () => {
        const config = TestDataBuilders.apiConfig()
          .withApiKey("custom-key")
          .withModelId("gemini-1.5-flash")
          .withTemperature(0.5)
          .withTimeoutMs(60000)
          .withMaxRetries(5)
          .build();

        expect(config.apiKey).toBe("custom-key");
        expect(config.modelId).toBe("gemini-1.5-flash");
        expect(config.temperature).toBe(0.5);
        expect(config.timeoutMs).toBe(60000);
        expect(config.maxRetries).toBe(5);
      });

      it("should provide convenience methods", () => {
        const prodConfig = TestDataBuilders.apiConfig()
          .withProductionSettings()
          .build();

        expect(prodConfig.temperature).toBe(0.7);
        expect(prodConfig.timeoutMs).toBe(30000);
        expect(prodConfig.maxRetries).toBe(3);
      });
    });

    describe("AppConfigBuilder", () => {
      it("should create valid app config with defaults", () => {
        const config = TestDataBuilders.appConfig().build();

        expect(config.api).toBeDefined();
        expect(config.output).toBeDefined();
        expect(config.logging).toBeDefined();
        expect(config.api.apiKey).toBeTruthy();
      });

      it("should allow test settings", () => {
        const config = TestDataBuilders.appConfig().withTestSettings().build();

        expect(config.api.apiKey).toBe("test-api-key");
        expect(config.output.raw).toBe(true);
        expect(config.logging.level).toBe("error");
      });

      it("should allow individual field customization", () => {
        const config = TestDataBuilders.appConfig()
          .withApiKey("custom-key")
          .withTemperature(0.9)
          .withLogLevel("debug")
          .build();

        expect(config.api.apiKey).toBe("custom-key");
        expect(config.api.temperature).toBe(0.9);
        expect(config.logging.level).toBe("debug");
      });
    });
  });

  describe("API Builders", () => {
    describe("APIResponseBuilder", () => {
      it("should create valid API response with defaults", () => {
        const response = TestDataBuilders.apiResponse().build();

        expect(response.content).toBe(
          "This is a generated response from the test API.",
        );
        expect(response.model).toBe("gemini-2.5-flash-preview-05-20");
        expect(response.usage.totalTokens).toBe(40);
        expect(response.metadata.finishReason).toBe("stop");
      });

      it("should allow content customization", () => {
        const customContent = "Custom response content";
        const response = TestDataBuilders.apiResponse()
          .withContent(customContent)
          .build();

        expect(response.content).toBe(customContent);
      });

      it("should provide convenience methods", () => {
        const fastResponse = TestDataBuilders.apiResponse()
          .withFastResponse()
          .build();

        expect(fastResponse.metadata.duration).toBe(500);

        const largeResponse = TestDataBuilders.apiResponse()
          .withLargeUsage()
          .build();

        expect(largeResponse.usage.totalTokens).toBe(1500);
      });
    });

    describe("APIErrorBuilder", () => {
      it("should create valid API error with defaults", () => {
        const error = TestDataBuilders.apiError().build();

        expect(error.type).toBe("api");
        expect(error.code).toBe("UNKNOWN_ERROR");
        expect(error.message).toBeTruthy();
      });

      it("should provide specific error types", () => {
        const networkError = TestDataBuilders.apiError()
          .asNetworkError()
          .build();

        expect(networkError.code).toBe("NETWORK_ERROR");
        expect(networkError.details?.retryable).toBe(true);

        const authError = TestDataBuilders.apiError()
          .asAuthenticationError()
          .build();

        expect(authError.code).toBe("AUTHENTICATION_FAILED");
        expect(authError.details?.retryable).toBe(false);
        expect(authError.details?.statusCode).toBe(401);
      });
    });

    describe("APIStreamChunkBuilder", () => {
      it("should create valid stream chunk with defaults", () => {
        const chunk = TestDataBuilders.apiStreamChunk().build();

        expect(chunk.content).toBe("Partial response content ");
        expect(chunk.done).toBe(false);
        expect(chunk.usage).toBeUndefined();
        expect(chunk.metadata).toBeUndefined();
      });

      it("should create final chunk with metadata", () => {
        const finalChunk = TestDataBuilders.apiStreamChunk()
          .asFinalChunk()
          .build();

        expect(finalChunk.done).toBe(true);
        expect(finalChunk.usage).toBeDefined();
        expect(finalChunk.metadata).toBeDefined();
      });
    });
  });

  describe("Error Builders", () => {
    describe("PromptValidationErrorBuilder", () => {
      it("should create valid validation error with defaults", () => {
        const error = TestDataBuilders.promptValidationError().build();

        expect(error.type).toBe("validation");
        expect(error.code).toBe("INVALID_CHARACTERS");
        expect(error.message).toBeTruthy();
      });

      it("should provide specific error types", () => {
        const emptyError = TestDataBuilders.promptValidationError()
          .asEmptyPromptError()
          .build();

        expect(emptyError.code).toBe("EMPTY_PROMPT");
        expect(emptyError.details?.["minLength"]).toBe(1);

        const tooLongError = TestDataBuilders.promptValidationError()
          .asTooLongError()
          .build();

        expect(tooLongError.code).toBe("TOO_LONG");
        expect(tooLongError.details?.["maxLength"]).toBe(1000);
      });
    });

    describe("PromptProcessingErrorBuilder", () => {
      it("should create valid processing error with defaults", () => {
        const error = TestDataBuilders.promptProcessingError().build();

        expect(error.type).toBe("processing");
        expect(error.code).toBe("ENHANCEMENT_FAILED");
        expect(error.stage).toBe("enhancement");
        expect(error.message).toBeTruthy();
      });

      it("should provide specific error types", () => {
        const timeoutError = TestDataBuilders.promptProcessingError()
          .asProcessingTimeoutError()
          .build();

        expect(timeoutError.code).toBe("PROCESSING_TIMEOUT");
        expect(timeoutError.details?.["timeoutMs"]).toBe(30000);
      });
    });
  });

  describe("Formatter Builders", () => {
    describe("FormattedContentBuilder", () => {
      it("should create valid formatted content with defaults", () => {
        const content = TestDataBuilders.formattedContent().build();

        expect(content.text).toBe("Formatted test content");
        expect(content.metadata.styled).toBe(true);
        expect(content.metadata.mode).toBe("formatted");
        expect(content.metadata.contentType).toBe("content");
      });

      it("should provide content type variations", () => {
        const errorContent = TestDataBuilders.formattedContent()
          .asErrorContent()
          .build();

        expect(errorContent.metadata.contentType).toBe("error");
        expect(errorContent.text).toContain("Error:");

        const rawContent = TestDataBuilders.formattedContent()
          .asRawContent()
          .build();

        expect(rawContent.metadata.styled).toBe(false);
        expect(rawContent.metadata.mode).toBe("raw");
      });
    });

    describe("ProgressIndicatorBuilder", () => {
      it("should create valid progress indicator with defaults", () => {
        const progress = TestDataBuilders.progressIndicator().build();

        expect(progress.message).toBe("Processing...");
        expect(progress.stage).toBe("thinking");
        expect(progress.active).toBe(true);
        expect(progress.progress).toBeUndefined();
      });

      it("should provide stage variations", () => {
        const thinking = TestDataBuilders.progressIndicator()
          .asThinking()
          .build();

        expect(thinking.stage).toBe("thinking");
        expect(thinking.active).toBe(true);

        const complete = TestDataBuilders.progressIndicator()
          .asComplete()
          .build();

        expect(complete.stage).toBe("complete");
        expect(complete.active).toBe(false);
        expect(complete.progress).toBe(100);
      });
    });

    describe("FormatOptionsBuilder", () => {
      it("should create empty options by default", () => {
        const options = TestDataBuilders.formatOptions().build();

        expect(Object.keys(options)).toHaveLength(0);
      });

      it("should provide mode variations", () => {
        const rawOptions = TestDataBuilders.formatOptions().asRawMode().build();

        expect(rawOptions.mode).toBe("raw");
        expect(rawOptions.enableStyling).toBe(false);

        const formattedOptions = TestDataBuilders.formatOptions()
          .asFormattedMode()
          .build();

        expect(formattedOptions.mode).toBe("formatted");
        expect(formattedOptions.enableStyling).toBe(true);
      });
    });
  });

  describe("Convenience Functions", () => {
    it("should provide quick creation functions", () => {
      const rawPrompt = createTestRawPrompt("Quick test");
      expect(rawPrompt.content).toBe("Quick test");

      const validatedPrompt = createTestValidatedPrompt("Validated test");
      expect(validatedPrompt.content).toBe("Validated test");

      const enhancedPrompt = createTestEnhancedPrompt("Enhanced test");
      expect(enhancedPrompt.content).toBe("Enhanced test");
    });

    it("should create prompt chains", () => {
      const chain = createPromptChain("Chain test");

      expect(chain.raw.content).toBe("Chain test");
      expect(chain.validated.content).toBe("Chain test");
      expect(chain.enhanced.originalContent).toBe("Chain test");

      // All should have the same ID
      expect(chain.raw.id).toBe(chain.validated.id);
      expect(chain.validated.id).toBe(chain.enhanced.id);
    });

    it("should create test environment from config", () => {
      const config = TestDataBuilders.appConfig()
        .withApiKey("custom-key")
        .withTemperature(0.5)
        .withLogLevel("debug")
        .build();

      const env = createTestEnvironment(config);

      expect(env["GEMINI_API_KEY"]).toBe("test-api-key-1234567890abcdef"); // Default from builder
      expect(env["GEMINI_TEMPERATURE"]).toBe("0.5");
      expect(env["LOG_LEVEL"]).toBe("debug");
    });
  });
});
