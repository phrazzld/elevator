/**
 * Application constants and standardized values
 *
 * Contains standardized exit codes and other application-wide constants
 * following Unix conventions for CLI applications.
 */

/**
 * Standardized exit codes for the elevator CLI application
 *
 * These follow Unix conventions where 0 indicates success and non-zero
 * values indicate various types of failures or interruptions.
 */
export const EXIT_CODES = {
  /** Successful operation completion */
  SUCCESS: 0,

  /** General error (invalid input, API failure, etc.) */
  ERROR: 1,

  /** User interrupted operation (Ctrl+C, SIGINT) */
  INTERRUPTED: 130,
} as const;

/**
 * Type for valid exit codes
 */
export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
