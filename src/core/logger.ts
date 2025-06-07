/**
 * Core logging abstractions for elevator CLI.
 *
 * This module defines the logging interface and utilities that the core
 * business logic depends on, following hexagonal architecture principles.
 * The actual implementation is provided by infrastructure adapters.
 */

import type { LogLevel } from "../config";

/**
 * Unique identifier for tracking requests/operations across the system.
 * Generated once per user interaction and propagated through all related operations.
 */
export type CorrelationId = string;

/**
 * Structured context attached to every log entry.
 * Contains mandatory fields plus optional operation-specific data.
 */
export interface LogContext {
  /** Unique identifier for this request/operation */
  readonly correlationId: CorrelationId;

  /** Name of the service/component generating the log */
  readonly serviceName: string;

  /** Optional additional context data */
  readonly [key: string]: unknown;
}

/**
 * Structured log entry with typed metadata.
 */
export interface LogEntry {
  /** Log level */
  readonly level: LogLevel;

  /** Human-readable log message */
  readonly message: string;

  /** ISO timestamp when log was created */
  readonly timestamp: string;

  /** Structured context data */
  readonly context: LogContext;

  /** Optional error object */
  readonly error?: Error;

  /** Optional additional structured data */
  readonly data?: Record<string, unknown>;
}

/**
 * Core logger interface that business logic depends on.
 * Provides structured logging with correlation tracking.
 */
export interface Logger {
  /**
   * Logs a debug message with context.
   *
   * @param message Human-readable message
   * @param data Optional structured data
   */
  debug(message: string, data?: Record<string, unknown>): void;

  /**
   * Logs an info message with context.
   *
   * @param message Human-readable message
   * @param data Optional structured data
   */
  info(message: string, data?: Record<string, unknown>): void;

  /**
   * Logs a warning message with context.
   *
   * @param message Human-readable message
   * @param data Optional structured data
   */
  warn(message: string, data?: Record<string, unknown>): void;

  /**
   * Logs an error message with context.
   *
   * @param message Human-readable message
   * @param error Optional error object
   * @param data Optional structured data
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void;

  /**
   * Creates a child logger with additional context.
   * The child logger inherits the parent's correlation ID and context,
   * and adds the provided additional context.
   *
   * @param additionalContext Context to add to all log entries from this child
   * @returns New logger instance with combined context
   */
  child(additionalContext: Record<string, unknown>): Logger;

  /**
   * Gets the current correlation ID for this logger.
   *
   * @returns The correlation ID associated with this logger
   */
  getCorrelationId(): CorrelationId;
}

/**
 * Factory interface for creating logger instances.
 * This allows different parts of the system to get properly configured loggers.
 */
export interface LoggerFactory {
  /**
   * Creates a new logger with the given correlation ID and base context.
   *
   * @param correlationId Unique identifier for this request/operation
   * @param baseContext Base context that will be included in all log entries
   * @returns Configured logger instance
   */
  createLogger(
    correlationId: CorrelationId,
    baseContext?: Record<string, unknown>,
  ): Logger;

  /**
   * Creates a new logger with a newly generated correlation ID.
   *
   * @param baseContext Base context that will be included in all log entries
   * @returns Configured logger instance with new correlation ID
   */
  createRootLogger(baseContext?: Record<string, unknown>): Logger;
}

/**
 * Generates a new correlation ID for tracking requests/operations.
 * Uses a combination of timestamp and random values for uniqueness.
 *
 * @returns New correlation ID
 */
export function generateCorrelationId(): CorrelationId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Validates that a correlation ID is in the expected format.
 *
 * @param correlationId The correlation ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidCorrelationId(correlationId: string): boolean {
  // Format: timestamp-random (e.g., "lq1k2j3-a4b5c6")
  const pattern = /^[a-z0-9]+-[a-z0-9]+$/;
  return pattern.test(correlationId) && correlationId.length >= 8;
}

/**
 * Extracts the timestamp from a correlation ID.
 *
 * @param correlationId The correlation ID to parse
 * @returns Date object representing when the correlation ID was created, or null if invalid
 */
export function getCorrelationTimestamp(
  correlationId: CorrelationId,
): Date | null {
  if (!isValidCorrelationId(correlationId)) {
    return null;
  }

  const parts = correlationId.split("-");
  if (parts.length < 2 || !parts[0]) {
    return null;
  }

  const timestampPart = parts[0];
  const timestampMs = parseInt(timestampPart, 36);

  if (isNaN(timestampMs)) {
    return null;
  }

  return new Date(timestampMs);
}
