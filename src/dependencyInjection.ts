/**
 * Dependency injection container for prompt-elevator CLI.
 *
 * This module provides factories for creating and wiring together all
 * application services following hexagonal architecture principles.
 * The container ensures proper dependency injection without circular
 * dependencies or tight coupling.
 */

import { type AppConfig } from "./config";

// Core domain services
import { DefaultPromptValidator } from "./core/promptValidator";
import { DefaultPromptEnhancer } from "./core/promptEnhancer";
import { DefaultPromptProcessingService } from "./core/promptProcessingService";
import {
  type PromptValidator,
  type PromptEnhancer,
  type PromptProcessingService,
} from "./core/promptProcessor";

// Infrastructure adapters
import { GoogleGeminiAdapter } from "./adapters/geminiClient";
import { ConsoleFormatter } from "./adapters/consoleFormatter";
import { type GeminiAPIClient } from "./core/apiClient";
import { type OutputFormatter } from "./core/formatter";

/**
 * Container holding all application services with their dependencies properly wired.
 * This provides a single entry point for accessing all services while maintaining
 * clear separation between core domain logic and infrastructure adapters.
 */
export interface ServiceContainer {
  /** Core prompt processing pipeline */
  readonly promptProcessingService: PromptProcessingService;

  /** API client for Gemini integration */
  readonly apiClient: GeminiAPIClient;

  /** Output formatter for console display */
  readonly formatter: OutputFormatter;

  /** Prompt validator */
  readonly validator: PromptValidator;

  /** Prompt enhancer */
  readonly enhancer: PromptEnhancer;
}

/**
 * Creates and wires all application services with proper dependency injection.
 *
 * This factory function ensures:
 * - All dependencies are properly injected
 * - No circular dependencies
 * - Core domain logic depends only on abstractions
 * - Infrastructure adapters implement core interfaces
 * - Configuration is injected into infrastructure only
 *
 * @param config Application configuration
 * @returns Fully wired service container
 */
export function createServiceContainer(config: AppConfig): ServiceContainer {
  // Create core domain services (no external dependencies)
  const validator = new DefaultPromptValidator();
  const enhancer = new DefaultPromptEnhancer();

  // Create infrastructure adapters (depend on configuration)
  const apiClient = new GoogleGeminiAdapter(config.api);
  const formatter = new ConsoleFormatter();

  // Create orchestrating services (depend on core services)
  const promptProcessingService = new DefaultPromptProcessingService(
    validator,
    enhancer,
  );

  return {
    promptProcessingService,
    apiClient,
    formatter,
    validator,
    enhancer,
  };
}

/**
 * Type for accessing specific services from the container.
 * Useful for dependency injection in specific contexts.
 */
export type ServiceType<K extends keyof ServiceContainer> = ServiceContainer[K];

/**
 * Helper function to create a service container with additional validation.
 *
 * @param config Application configuration
 * @throws {Error} When configuration is invalid for service creation
 * @returns Validated service container
 */
export function createValidatedServiceContainer(
  config: AppConfig,
): ServiceContainer {
  try {
    const container = createServiceContainer(config);

    // Basic validation that all services were created
    if (!container.promptProcessingService) {
      throw new Error("Failed to create prompt processing service");
    }
    if (!container.apiClient) {
      throw new Error("Failed to create API client");
    }
    if (!container.formatter) {
      throw new Error("Failed to create output formatter");
    }

    return container;
  } catch (error) {
    throw new Error(
      `Service container creation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
