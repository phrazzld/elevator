/**
 * Unit tests for application constants
 */

import { describe, it, expect } from "vitest";
import { EXIT_CODES, type ExitCode } from "./constants.js";

describe("Constants", () => {
  describe("EXIT_CODES", () => {
    it("should export correct exit code values", () => {
      expect(EXIT_CODES.SUCCESS).toBe(0);
      expect(EXIT_CODES.ERROR).toBe(1);
      expect(EXIT_CODES.INTERRUPTED).toBe(130);
    });

    it("should be readonly object", () => {
      // Verify the object is properly typed as const
      expect(typeof EXIT_CODES).toBe("object");
      expect(Object.isFrozen(EXIT_CODES)).toBe(false); // as const doesn't freeze, just makes readonly
    });

    it("should have all required exit codes", () => {
      const expectedKeys = ["SUCCESS", "ERROR", "INTERRUPTED"];
      const actualKeys = Object.keys(EXIT_CODES);

      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
    });

    it("should follow Unix exit code conventions", () => {
      // Success should be 0
      expect(EXIT_CODES.SUCCESS).toBe(0);

      // Error codes should be non-zero
      expect(EXIT_CODES.ERROR).toBeGreaterThan(0);
      expect(EXIT_CODES.INTERRUPTED).toBeGreaterThan(0);

      // INTERRUPTED should be 130 (128 + SIGINT signal number)
      expect(EXIT_CODES.INTERRUPTED).toBe(130);
    });
  });

  describe("ExitCode type", () => {
    it("should accept valid exit code values", () => {
      // Type test - these should compile without errors
      const validCodes: ExitCode[] = [
        EXIT_CODES.SUCCESS,
        EXIT_CODES.ERROR,
        EXIT_CODES.INTERRUPTED,
      ];

      expect(validCodes).toHaveLength(3);
      expect(validCodes).toContain(0);
      expect(validCodes).toContain(1);
      expect(validCodes).toContain(130);
    });
  });
});
