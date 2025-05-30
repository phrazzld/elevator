/**
 * Core prompt processing interfaces and types.
 *
 * This module defines the foundational contracts for prompt processing in the
 * elevator CLI application. It follows hexagonal architecture principles,
 * ensuring the core domain logic is completely separated from infrastructure concerns.
 */

/**
 * Generic Result type for operations that can fail.
 * Provides explicit error handling without exceptions.
 */
export type Result<T, E> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

/**
 * Creates a successful Result.
 */
export function success<T, E>(value: T): Result<T, E> {
  return { success: true, value };
}

/**
 * Creates a failed Result.
 */
export function failure<T, E>(error: E): Result<T, E> {
  return { success: false, error };
}

/**
 * Type guard to check if Result is successful.
 */
export function isOk<T, E>(
  result: Result<T, E>,
): result is { success: true; value: T } {
  return result.success;
}

/**
 * Type guard to check if Result is an error.
 */
export function isErr<T, E>(
  result: Result<T, E>,
): result is { success: false; error: E } {
  return !result.success;
}

/**
 * Metadata associated with a prompt throughout processing.
 */
export interface PromptMetadata {
  /** When the prompt was created */
  readonly timestamp: Date;

  /** Optional user or session identifier */
  readonly userId?: string;

  /** Optional session context */
  readonly sessionId?: string;

  /** Additional context data */
  readonly context?: Record<string, unknown>;
}

/**
 * Raw prompt from user input before any processing.
 */
export interface RawPrompt {
  /** Unique identifier for this prompt */
  readonly id: string;

  /** The raw user input */
  readonly content: string;

  /** Associated metadata */
  readonly metadata: PromptMetadata;
}

/**
 * Prompt after successful validation.
 */
export interface ValidatedPrompt {
  /** Unique identifier for this prompt */
  readonly id: string;

  /** The validated content */
  readonly content: string;

  /** Associated metadata */
  readonly metadata: PromptMetadata;

  /** When validation occurred */
  readonly validatedAt: Date;

  /** Validation rules that were applied */
  readonly rules: readonly string[];
}

/**
 * Prompt after enhancement for optimal API performance.
 */
export interface EnhancedPrompt {
  /** Unique identifier for this prompt */
  readonly id: string;

  /** The enhanced content optimized for API calls */
  readonly content: string;

  /** Associated metadata */
  readonly metadata: PromptMetadata;

  /** Original content before enhancement */
  readonly originalContent: string;

  /** When enhancement occurred */
  readonly enhancedAt: Date;

  /** Types of enhancements applied */
  readonly enhancements: readonly string[];
}

/**
 * Validation error codes for specific failure scenarios.
 */
export type ValidationErrorCode =
  | "EMPTY_PROMPT"
  | "TOO_LONG"
  | "TOO_SHORT"
  | "INVALID_CHARACTERS"
  | "MALFORMED_CONTENT"
  | "UNSAFE_CONTENT";

/**
 * Processing error codes for different processing failures.
 */
export type ProcessingErrorCode =
  | "ENHANCEMENT_FAILED"
  | "PROCESSING_TIMEOUT"
  | "INVALID_STATE"
  | "CONFIGURATION_ERROR";

/**
 * Processing stage where an error occurred.
 */
export type ProcessingStage = "validation" | "enhancement" | "preparation";

/**
 * Error that occurs during prompt validation.
 */
export interface PromptValidationError {
  readonly type: "validation";
  readonly code: ValidationErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Error that occurs during prompt processing.
 */
export interface PromptProcessingError {
  readonly type: "processing";
  readonly code: ProcessingErrorCode;
  readonly message: string;
  readonly stage: ProcessingStage;
  readonly details?: Record<string, unknown>;
}

/**
 * Union of all possible prompt processing errors.
 */
export type PromptError = PromptValidationError | PromptProcessingError;

/**
 * Configuration options for prompt processing.
 */
export interface ProcessingOptions {
  /** Maximum allowed prompt length */
  readonly maxLength?: number;

  /** Minimum required prompt length */
  readonly minLength?: number;

  /** Enable content enhancement */
  readonly enableEnhancement?: boolean;

  /** Custom validation rules to apply */
  readonly customRules?: readonly string[];
}

/**
 * Interface for prompt validation logic.
 * Implementations must be pure functions.
 */
export interface PromptValidator {
  /**
   * Validates a raw prompt according to configured rules.
   *
   * @param prompt The raw prompt to validate
   * @param options Optional processing configuration
   * @returns Result containing validated prompt or validation error
   */
  validate(
    prompt: RawPrompt,
    options?: ProcessingOptions,
  ): Result<ValidatedPrompt, PromptValidationError>;
}

/**
 * Interface for prompt enhancement logic.
 * Implementations must be pure functions.
 */
export interface PromptEnhancer {
  /**
   * Enhances a validated prompt for optimal API performance.
   *
   * @param prompt The validated prompt to enhance
   * @param options Optional processing configuration
   * @returns Result containing enhanced prompt or processing error
   */
  enhance(
    prompt: ValidatedPrompt,
    options?: ProcessingOptions,
  ): Result<EnhancedPrompt, PromptProcessingError>;
}

/**
 * Main service interface for prompt processing.
 * Orchestrates the complete validation and enhancement pipeline.
 */
export interface PromptProcessingService {
  /**
   * Processes a raw prompt through the complete pipeline.
   *
   * @param prompt The raw prompt to process
   * @param options Optional processing configuration
   * @returns Promise resolving to enhanced prompt or error
   */
  processPrompt(
    prompt: RawPrompt,
    options?: ProcessingOptions,
  ): Promise<Result<EnhancedPrompt, PromptError>>;
}

/**
 * Creates a new RawPrompt with generated ID and timestamp.
 *
 * @param content The user input content
 * @param metadata Optional additional metadata
 * @returns Immutable RawPrompt object
 */
export function createRawPrompt(
  content: string,
  metadata: Partial<PromptMetadata> = {},
): RawPrompt {
  return {
    id: generatePromptId(),
    content,
    metadata: {
      timestamp: new Date(),
      ...metadata,
    },
  };
}

/**
 * Generates a unique identifier for prompts.
 * Using timestamp + random for simplicity and uniqueness.
 */
function generatePromptId(): string {
  return `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Type guard to check if an error is a validation error.
 */
export function isValidationError(
  error: PromptError,
): error is PromptValidationError {
  return error.type === "validation";
}

/**
 * Type guard to check if an error is a processing error.
 */
export function isProcessingError(
  error: PromptError,
): error is PromptProcessingError {
  return error.type === "processing";
}

/**
 * Helper to create validation errors.
 */
export function createValidationError(
  code: ValidationErrorCode,
  message: string,
  details?: Record<string, unknown>,
): PromptValidationError {
  const error: PromptValidationError = {
    type: "validation",
    code,
    message,
  };

  if (details !== undefined) {
    return { ...error, details };
  }

  return error;
}

/**
 * Helper to create processing errors.
 */
export function createProcessingError(
  code: ProcessingErrorCode,
  message: string,
  stage: ProcessingStage,
  details?: Record<string, unknown>,
): PromptProcessingError {
  const error: PromptProcessingError = {
    type: "processing",
    code,
    message,
    stage,
  };

  if (details !== undefined) {
    return { ...error, details };
  }

  return error;
}
