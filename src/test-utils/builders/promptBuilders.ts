/**
 * Test data builders for prompt-related domain types.
 *
 * These builders provide fluent APIs for creating prompt objects with sensible defaults
 * and easy customization for testing scenarios.
 */

import type {
  RawPrompt,
  ValidatedPrompt,
  EnhancedPrompt,
  PromptMetadata,
  ProcessingOptions,
} from "../../core/promptProcessor";

/**
 * Builder for PromptMetadata objects.
 */
export class PromptMetadataBuilder {
  private timestamp = new Date("2024-01-01T12:00:00.000Z");
  private userId?: string;
  private sessionId?: string;
  private context?: Record<string, unknown>;

  withTimestamp(timestamp: Date): this {
    this.timestamp = timestamp;
    return this;
  }

  withUserId(userId: string): this {
    this.userId = userId;
    return this;
  }

  withSessionId(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  withContext(context: Record<string, unknown>): this {
    this.context = context;
    return this;
  }

  withCurrentTimestamp(): this {
    this.timestamp = new Date();
    return this;
  }

  build(): PromptMetadata {
    const metadata: PromptMetadata = {
      timestamp: this.timestamp,
    };

    if (this.userId !== undefined) {
      (metadata as { userId: string }).userId = this.userId;
    }

    if (this.sessionId !== undefined) {
      (metadata as { sessionId: string }).sessionId = this.sessionId;
    }

    if (this.context !== undefined) {
      (metadata as { context: Record<string, unknown> }).context = this.context;
    }

    return metadata;
  }
}

/**
 * Builder for RawPrompt objects.
 */
export class RawPromptBuilder {
  private id = "prompt_1704110400000_test123";
  private content = "Test prompt content";
  private metadataBuilder = new PromptMetadataBuilder();

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withContent(content: string): this {
    this.content = content;
    return this;
  }

  withMetadata(metadata: PromptMetadata): this {
    this.metadataBuilder = new PromptMetadataBuilder().withTimestamp(
      metadata.timestamp,
    );

    if (metadata.userId) {
      this.metadataBuilder.withUserId(metadata.userId);
    }

    if (metadata.sessionId) {
      this.metadataBuilder.withSessionId(metadata.sessionId);
    }

    if (metadata.context) {
      this.metadataBuilder.withContext(metadata.context);
    }

    return this;
  }

  withUserId(userId: string): this {
    this.metadataBuilder.withUserId(userId);
    return this;
  }

  withSessionId(sessionId: string): this {
    this.metadataBuilder.withSessionId(sessionId);
    return this;
  }

  withContext(context: Record<string, unknown>): this {
    this.metadataBuilder.withContext(context);
    return this;
  }

  withTimestamp(timestamp: Date): this {
    this.metadataBuilder.withTimestamp(timestamp);
    return this;
  }

  withCurrentTimestamp(): this {
    this.metadataBuilder.withCurrentTimestamp();
    return this;
  }

  withUniqueId(): this {
    this.id = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return this;
  }

  build(): RawPrompt {
    return {
      id: this.id,
      content: this.content,
      metadata: this.metadataBuilder.build(),
    };
  }
}

/**
 * Builder for ValidatedPrompt objects.
 */
export class ValidatedPromptBuilder {
  private id = "prompt_1704110400000_test123";
  private content = "Test prompt content";
  private metadataBuilder = new PromptMetadataBuilder();
  private validatedAt = new Date("2024-01-01T12:00:01.000Z");
  private rules: readonly string[] = ["empty", "length", "content"];

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withContent(content: string): this {
    this.content = content;
    return this;
  }

  withMetadata(metadata: PromptMetadata): this {
    this.metadataBuilder = new PromptMetadataBuilder().withTimestamp(
      metadata.timestamp,
    );

    if (metadata.userId) {
      this.metadataBuilder.withUserId(metadata.userId);
    }

    if (metadata.sessionId) {
      this.metadataBuilder.withSessionId(metadata.sessionId);
    }

    if (metadata.context) {
      this.metadataBuilder.withContext(metadata.context);
    }

    return this;
  }

  withUserId(userId: string): this {
    this.metadataBuilder.withUserId(userId);
    return this;
  }

  withSessionId(sessionId: string): this {
    this.metadataBuilder.withSessionId(sessionId);
    return this;
  }

  withContext(context: Record<string, unknown>): this {
    this.metadataBuilder.withContext(context);
    return this;
  }

  withTimestamp(timestamp: Date): this {
    this.metadataBuilder.withTimestamp(timestamp);
    return this;
  }

  withValidatedAt(validatedAt: Date): this {
    this.validatedAt = validatedAt;
    return this;
  }

  withRules(rules: readonly string[]): this {
    this.rules = rules;
    return this;
  }

  withCurrentTimestamps(): this {
    const now = new Date();
    this.metadataBuilder.withTimestamp(now);
    this.validatedAt = new Date(now.getTime() + 1000); // 1 second later
    return this;
  }

  withUniqueId(): this {
    this.id = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return this;
  }

  fromRawPrompt(rawPrompt: RawPrompt): this {
    this.id = rawPrompt.id;
    this.content = rawPrompt.content;
    this.withMetadata(rawPrompt.metadata);
    return this;
  }

  build(): ValidatedPrompt {
    return {
      id: this.id,
      content: this.content,
      metadata: this.metadataBuilder.build(),
      validatedAt: this.validatedAt,
      rules: this.rules,
    };
  }
}

/**
 * Builder for EnhancedPrompt objects.
 */
export class EnhancedPromptBuilder {
  private id = "prompt_1704110400000_test123";
  private content = "Enhanced test prompt content with technical improvements";
  private metadataBuilder = new PromptMetadataBuilder();
  private originalContent = "Test prompt content";
  private enhancedAt = new Date("2024-01-01T12:00:02.000Z");
  private enhancements: readonly string[] = [
    "clarity",
    "specificity",
    "context",
  ];

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withContent(content: string): this {
    this.content = content;
    return this;
  }

  withMetadata(metadata: PromptMetadata): this {
    this.metadataBuilder = new PromptMetadataBuilder().withTimestamp(
      metadata.timestamp,
    );

    if (metadata.userId) {
      this.metadataBuilder.withUserId(metadata.userId);
    }

    if (metadata.sessionId) {
      this.metadataBuilder.withSessionId(metadata.sessionId);
    }

    if (metadata.context) {
      this.metadataBuilder.withContext(metadata.context);
    }

    return this;
  }

  withUserId(userId: string): this {
    this.metadataBuilder.withUserId(userId);
    return this;
  }

  withSessionId(sessionId: string): this {
    this.metadataBuilder.withSessionId(sessionId);
    return this;
  }

  withContext(context: Record<string, unknown>): this {
    this.metadataBuilder.withContext(context);
    return this;
  }

  withTimestamp(timestamp: Date): this {
    this.metadataBuilder.withTimestamp(timestamp);
    return this;
  }

  withOriginalContent(originalContent: string): this {
    this.originalContent = originalContent;
    return this;
  }

  withEnhancedAt(enhancedAt: Date): this {
    this.enhancedAt = enhancedAt;
    return this;
  }

  withEnhancements(enhancements: readonly string[]): this {
    this.enhancements = enhancements;
    return this;
  }

  withCurrentTimestamps(): this {
    const now = new Date();
    this.metadataBuilder.withTimestamp(now);
    this.enhancedAt = new Date(now.getTime() + 2000); // 2 seconds later
    return this;
  }

  withUniqueId(): this {
    this.id = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return this;
  }

  fromValidatedPrompt(validatedPrompt: ValidatedPrompt): this {
    this.id = validatedPrompt.id;
    this.originalContent = validatedPrompt.content;
    this.withMetadata(validatedPrompt.metadata);
    return this;
  }

  fromRawPrompt(rawPrompt: RawPrompt): this {
    this.id = rawPrompt.id;
    this.originalContent = rawPrompt.content;
    this.withMetadata(rawPrompt.metadata);
    return this;
  }

  build(): EnhancedPrompt {
    return {
      id: this.id,
      content: this.content,
      metadata: this.metadataBuilder.build(),
      originalContent: this.originalContent,
      enhancedAt: this.enhancedAt,
      enhancements: this.enhancements,
    };
  }
}

/**
 * Builder for ProcessingOptions objects.
 */
export class ProcessingOptionsBuilder {
  private maxLength?: number;
  private minLength?: number;
  private enableEnhancement?: boolean;
  private customRules?: readonly string[];

  withMaxLength(maxLength: number): this {
    this.maxLength = maxLength;
    return this;
  }

  withMinLength(minLength: number): this {
    this.minLength = minLength;
    return this;
  }

  withEnhancement(enabled: boolean): this {
    this.enableEnhancement = enabled;
    return this;
  }

  withCustomRules(rules: readonly string[]): this {
    this.customRules = rules;
    return this;
  }

  withStrictLimits(): this {
    this.maxLength = 1000;
    this.minLength = 10;
    return this;
  }

  withLenientLimits(): this {
    this.maxLength = 10000;
    this.minLength = 1;
    return this;
  }

  build(): ProcessingOptions {
    const options: ProcessingOptions = {};

    if (this.maxLength !== undefined) {
      (options as { maxLength: number }).maxLength = this.maxLength;
    }

    if (this.minLength !== undefined) {
      (options as { minLength: number }).minLength = this.minLength;
    }

    if (this.enableEnhancement !== undefined) {
      (options as { enableEnhancement: boolean }).enableEnhancement =
        this.enableEnhancement;
    }

    if (this.customRules !== undefined) {
      (options as { customRules: readonly string[] }).customRules =
        this.customRules;
    }

    return options;
  }
}

/**
 * Convenience functions for common test scenarios.
 */

/**
 * Creates a minimal valid raw prompt for basic testing.
 */
export function createTestRawPrompt(content = "Test prompt"): RawPrompt {
  return new RawPromptBuilder().withContent(content).build();
}

/**
 * Creates a minimal valid validated prompt for basic testing.
 */
export function createTestValidatedPrompt(
  content = "Test prompt",
): ValidatedPrompt {
  return new ValidatedPromptBuilder().withContent(content).build();
}

/**
 * Creates a minimal valid enhanced prompt for basic testing.
 */
export function createTestEnhancedPrompt(
  content = "Enhanced test prompt",
): EnhancedPrompt {
  return new EnhancedPromptBuilder().withContent(content).build();
}

/**
 * Creates a prompt chain (raw -> validated -> enhanced) with consistent IDs.
 */
export function createPromptChain(content = "Test prompt"): {
  raw: RawPrompt;
  validated: ValidatedPrompt;
  enhanced: EnhancedPrompt;
} {
  const raw = createTestRawPrompt(content);
  const validated = new ValidatedPromptBuilder().fromRawPrompt(raw).build();
  const enhanced = new EnhancedPromptBuilder()
    .fromValidatedPrompt(validated)
    .build();

  return { raw, validated, enhanced };
}
