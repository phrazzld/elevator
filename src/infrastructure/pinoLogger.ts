/**
 * Pino logger adapter implementation.
 *
 * This adapter implements the core Logger interface using the Pino library,
 * following hexagonal architecture principles. It provides structured JSON
 * logging with correlation ID tracking and contextual child loggers.
 */

import pino, { type Logger as PinoLogger } from "pino";
import type { Logger, LoggerFactory, CorrelationId } from "../core/logger";
import type { LoggingConfig } from "../config";
import { generateCorrelationId } from "../core/logger";

/**
 * Pino-based implementation of the core Logger interface.
 * Provides structured logging with correlation tracking and child logger support.
 */
export class PinoLoggerAdapter implements Logger {
  constructor(
    private readonly pinoLogger: PinoLogger,
    private readonly correlationId: CorrelationId,
    private readonly baseContext: Record<string, unknown> = {},
  ) {}

  debug(message: string, data?: Record<string, unknown>): void {
    this.pinoLogger.debug(this.buildLogData(data), message);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.pinoLogger.info(this.buildLogData(data), message);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.pinoLogger.warn(this.buildLogData(data), message);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    const logData = this.buildLogData(data);
    if (error) {
      logData["err"] = error;
    }
    this.pinoLogger.error(logData, message);
  }

  child(additionalContext: Record<string, unknown>): Logger {
    const mergedContext = { ...this.baseContext, ...additionalContext };
    const childPinoLogger = this.pinoLogger.child(mergedContext);

    return new PinoLoggerAdapter(
      childPinoLogger,
      this.correlationId,
      mergedContext,
    );
  }

  getCorrelationId(): CorrelationId {
    return this.correlationId;
  }

  /**
   * Builds the structured data object for log entries.
   *
   * @param data Optional additional data
   * @returns Combined data object with correlation ID and context
   */
  private buildLogData(
    data?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      correlationId: this.correlationId,
      ...this.baseContext,
      ...data,
    };
  }
}

/**
 * Factory for creating Pino-based logger instances.
 * Configures Pino with the application's logging settings.
 */
export class PinoLoggerFactory implements LoggerFactory {
  private readonly pinoInstance: PinoLogger;

  constructor(config: LoggingConfig) {
    this.pinoInstance = pino({
      level: config.level,
      name: config.serviceName,

      // Always use JSON for structured logging
      // The jsonFormat config controls whether to enable this in different environments

      // Include standard fields
      timestamp: pino.stdTimeFunctions.isoTime,

      // Add service name to all log entries
      base: {
        serviceName: config.serviceName,
      },

      // Configure serializers for better error handling
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
      },
    });
  }

  createLogger(
    correlationId: CorrelationId,
    baseContext?: Record<string, unknown>,
  ): Logger {
    const context = baseContext || {};

    const childPino = this.pinoInstance.child(context);
    return new PinoLoggerAdapter(childPino, correlationId, context);
  }

  createRootLogger(baseContext?: Record<string, unknown>): Logger {
    const correlationId = generateCorrelationId();
    return this.createLogger(correlationId, baseContext);
  }

  /**
   * Gets the underlying Pino instance for advanced use cases.
   * Should be used sparingly and only for infrastructure concerns.
   *
   * @returns The underlying Pino logger instance
   */
  getPinoInstance(): PinoLogger {
    return this.pinoInstance;
  }
}

/**
 * Creates a configured PinoLoggerFactory from application configuration.
 *
 * @param config Logging configuration from the application
 * @returns Configured logger factory
 */
export function createPinoLoggerFactory(config: LoggingConfig): LoggerFactory {
  return new PinoLoggerFactory(config);
}
