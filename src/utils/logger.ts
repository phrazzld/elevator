/**
 * Structured stderr logging utility
 *
 * Provides structured JSON logging to stderr for observability without
 * polluting stdout in pipe operations.
 */

/**
 * Supported log levels
 */
export type LogLevel = "info" | "error";

/**
 * Structure of a log entry written to stderr
 */
export interface LogEntry {
  /** ISO timestamp when the log entry was created */
  timestamp: string;
  /** Log level indicating severity */
  level: LogLevel;
  /** Human-readable log message */
  message: string;
  /** Additional metadata for context */
  metadata: Record<string, unknown>;
}

/**
 * Write a structured log entry to stderr as newline-terminated JSON
 *
 * This function ensures that all application logs go to stderr, keeping
 * stdout clean for pipe operations and actual command output.
 *
 * @param level - Log level (info or error)
 * @param message - Human-readable log message
 * @param metadata - Additional context data
 */
export function logToStderr(
  level: LogLevel,
  message: string,
  metadata: Record<string, unknown> = {},
): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata,
  };

  // Write JSON to stderr with newline termination
  process.stderr.write(JSON.stringify(logEntry) + "\n");
}
