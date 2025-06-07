/**
 * Security validation utilities for elevator CLI.
 *
 * This module provides security-focused validation functions that ensure
 * proper authentication and secure operation of the application.
 * Following hexagonal architecture, it provides core security logic
 * that can be used by various adapters and services.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AppConfig } from "../config";
import {
  createSecurityError,
  createApplicationError,
  type SecurityError,
  type ApplicationError,
} from "./errors";

/**
 * Result type for API key validation operations.
 */
export type ApiKeyValidationResult =
  | { success: true }
  | { success: false; error: SecurityError | ApplicationError };

/**
 * Validates that an API key is functional by making a lightweight test request
 * to the Gemini API. This ensures the key is not only present and formatted
 * correctly, but also actually works.
 *
 * @param apiKey The API key to validate
 * @param modelId The model ID to use for validation
 * @param timeoutMs Request timeout in milliseconds
 * @returns Promise resolving to validation result
 */
export async function validateApiKeyFunctionality(
  apiKey: string,
  modelId: string,
  timeoutMs: number = 10000,
): Promise<ApiKeyValidationResult> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });

    // Create a minimal test request to validate the API key
    const testPrompt = "Test";

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = globalThis.setTimeout(() => {
        reject(new Error(`API key validation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      // Ensure timer is used to avoid linting warnings
      return timer;
    });

    // Race the API call against timeout
    const validationPromise = model.generateContent({
      contents: [{ role: "user", parts: [{ text: testPrompt }] }],
      generationConfig: {
        maxOutputTokens: 1, // Minimal response to reduce cost
        temperature: 0,
      },
    });

    await Promise.race([validationPromise, timeoutPromise]);

    return { success: true };
  } catch (error) {
    // Handle specific Gemini API errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // API key invalid or expired
      if (
        errorMessage.includes("api key") ||
        errorMessage.includes("invalid key") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("authentication")
      ) {
        return {
          success: false,
          error: createSecurityError(
            "INVALID_API_KEY",
            "The provided GEMINI_API_KEY is invalid or expired. " +
              "Please verify your API key at: https://aistudio.google.com/app/apikey",
            {
              originalError: {
                message: error.message,
                name: error.name,
              },
            },
          ),
        };
      }

      // Quota exceeded
      if (
        errorMessage.includes("quota") ||
        errorMessage.includes("limit") ||
        errorMessage.includes("rate")
      ) {
        return {
          success: false,
          error: createSecurityError(
            "INVALID_API_KEY",
            "API key quota exceeded or rate limited. " +
              "Check your quota at: https://aistudio.google.com/app/apikey",
            {
              originalError: {
                message: error.message,
                name: error.name,
              },
            },
          ),
        };
      }

      // Timeout
      if (errorMessage.includes("timeout")) {
        return {
          success: false,
          error: createApplicationError(
            "SERVICE_UNAVAILABLE",
            "API key validation timed out. The Gemini API may be unavailable. " +
              "Please check your internet connection and try again.",
            {
              originalError: {
                message: error.message,
                name: error.name,
              },
            },
          ),
        };
      }

      // Network or connection errors
      if (
        errorMessage.includes("network") ||
        errorMessage.includes("connection") ||
        errorMessage.includes("fetch")
      ) {
        return {
          success: false,
          error: createApplicationError(
            "SERVICE_UNAVAILABLE",
            "Unable to connect to Gemini API for validation. " +
              "Please check your internet connection and try again.",
            {
              originalError: {
                message: error.message,
                name: error.name,
              },
            },
          ),
        };
      }

      // Generic API error
      return {
        success: false,
        error: createApplicationError(
          "UNEXPECTED_ERROR",
          `API key validation failed: ${error.message}. ` +
            "Please verify your API key and try again.",
          {
            originalError: {
              message: error.message,
              name: error.name,
            },
          },
        ),
      };
    }

    // Unknown error type
    return {
      success: false,
      error: createApplicationError(
        "UNEXPECTED_ERROR",
        `Unexpected error during API key validation: ${String(error)}`,
        {
          originalError: { message: String(error) },
        },
      ),
    };
  }
}

/**
 * Performs comprehensive startup security validation for the application.
 * This includes validating API key functionality and other security checks.
 *
 * @param config Application configuration
 * @returns Promise resolving to validation result
 */
export async function validateStartupSecurity(
  config: AppConfig,
): Promise<ApiKeyValidationResult> {
  // Validate API key functionality
  const apiKeyResult = await validateApiKeyFunctionality(
    config.api.apiKey,
    config.api.modelId,
    config.api.timeoutMs,
  );

  if (!apiKeyResult.success) {
    return apiKeyResult;
  }

  // Additional security validations can be added here in the future
  // such as checking for secure environment, validating permissions, etc.

  return { success: true };
}

/**
 * Sanitizes user input to prevent injection attacks and ensure safe processing.
 * This function removes or escapes potentially dangerous characters and patterns.
 *
 * @param input Raw user input string
 * @returns Sanitized input string safe for API calls
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== "string") {
    throw new Error("Input must be a string for sanitization");
  }

  // Remove null bytes and control characters (except newlines and tabs)
  // eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Trim excessive whitespace but preserve intentional formatting
  sanitized = sanitized.replace(/^\s+|\s+$/g, ""); // Trim start/end
  sanitized = sanitized.replace(/\s{3,}/g, "  "); // Reduce multiple spaces to double

  // Limit input length to prevent DoS
  const maxLength = 10000; // 10KB limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates that sensitive data is not accidentally included in user input.
 * This helps prevent credential leakage through prompts.
 *
 * @param input User input to validate
 * @returns true if input appears safe, false if potentially sensitive
 */
export function validateInputSafety(input: string): boolean {
  const sensitivePatterns = [
    // API keys (various formats)
    /[a-zA-Z0-9]{20,}/g, // Long alphanumeric strings
    /sk-[a-zA-Z0-9]{32,}/g, // OpenAI-style keys
    /AIza[a-zA-Z0-9]{35}/g, // Google API keys

    // Environment variable patterns
    /(?:api[_-]?key|secret|token|password)\s*[=:]\s*[^\s]+/gi,

    // Base64 encoded data (potentially sensitive)
    /[A-Za-z0-9+/]{50,}={0,2}/g,

    // JWT tokens
    /ey[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/g,
  ];

  return !sensitivePatterns.some((pattern) => pattern.test(input));
}
