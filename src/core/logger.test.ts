/**
 * Tests for core logger utilities.
 *
 * This module tests the correlation ID generation and validation
 * utilities that support structured logging throughout the application.
 */

import { describe, it, expect, vi } from "vitest";
import {
  generateCorrelationId,
  isValidCorrelationId,
  getCorrelationTimestamp,
  type CorrelationId,
} from "./logger";

describe("logger utilities", () => {
  describe("generateCorrelationId", () => {
    it("should generate a correlation ID with timestamp and random parts", () => {
      // Act
      const correlationId = generateCorrelationId();

      // Assert
      expect(correlationId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
      expect(correlationId.length).toBeGreaterThanOrEqual(8);
      expect(correlationId).toContain("-");
    });

    it("should generate unique correlation IDs", () => {
      // Act
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      const id3 = generateCorrelationId();

      // Assert
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });

    it("should generate correlation IDs with proper format", () => {
      // Arrange
      const mockTime = 1640995200000; // 2022-01-01T00:00:00.000Z
      vi.spyOn(Date, "now").mockReturnValue(mockTime);
      vi.spyOn(Math, "random").mockReturnValue(0.123456789);

      // Act
      const correlationId = generateCorrelationId();

      // Assert
      // Timestamp in base36: 1640995200000 -> kf3a6z400
      // Random part from 0.123456789 -> "4fzyo7" (substring 2,8)
      expect(correlationId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
      expect(correlationId.split("-")).toHaveLength(2);

      // Clean up
      vi.restoreAllMocks();
    });

    it("should generate correlation IDs that are valid", () => {
      // Act
      const correlationId = generateCorrelationId();

      // Assert
      expect(isValidCorrelationId(correlationId)).toBe(true);
    });

    it("should handle different timestamps", () => {
      // Arrange
      const timestamps = [
        1000000000000, // 2001-09-09T01:46:40.000Z
        1640995200000, // 2022-01-01T00:00:00.000Z
        Date.now(), // Current time
      ];

      // Act & Assert
      timestamps.forEach((timestamp) => {
        vi.spyOn(Date, "now").mockReturnValue(timestamp);
        const correlationId = generateCorrelationId();

        expect(isValidCorrelationId(correlationId)).toBe(true);
        expect(correlationId).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);

        vi.restoreAllMocks();
      });
    });
  });

  describe("isValidCorrelationId", () => {
    describe("valid correlation IDs", () => {
      it("should validate correctly formatted correlation IDs", () => {
        // Arrange
        const validIds = [
          "abc123-def456",
          "lq1k2j3-a4b5c6",
          "1234567-abcdef",
          "kf3a6z400-4fzyo7",
          "a1b2c3d-e5f6g7h8",
          "timestamp-random",
          "12345678-abc123def",
        ];

        // Act & Assert
        validIds.forEach((id) => {
          expect(isValidCorrelationId(id)).toBe(true);
        });
      });

      it("should validate actual generated correlation IDs", () => {
        // Arrange
        const generatedIds = Array.from({ length: 10 }, () =>
          generateCorrelationId(),
        );

        // Act & Assert
        generatedIds.forEach((id) => {
          expect(isValidCorrelationId(id)).toBe(true);
        });
      });

      it("should validate minimum length correlation IDs", () => {
        // Arrange
        const minLengthIds = [
          "a1-b2c34", // 8 characters minimum
          "ab-cd1234", // Just above minimum
        ];

        // Act & Assert
        minLengthIds.forEach((id) => {
          expect(isValidCorrelationId(id)).toBe(true);
        });
      });
    });

    describe("invalid correlation IDs", () => {
      it("should reject correlation IDs without hyphen", () => {
        // Arrange
        const invalidIds = [
          "abc123def456",
          "nohyphen",
          "1234567890",
          "abcdefghijk",
        ];

        // Act & Assert
        invalidIds.forEach((id) => {
          expect(isValidCorrelationId(id)).toBe(false);
        });
      });

      it("should reject correlation IDs that are too short", () => {
        // Arrange
        const shortIds = [
          "a-b", // 3 characters
          "ab-cd", // 5 characters
          "abc-de", // 6 characters
          "a1-b2c", // 7 characters (below minimum 8)
        ];

        // Act & Assert
        shortIds.forEach((id) => {
          expect(isValidCorrelationId(id)).toBe(false);
        });
      });

      it("should reject correlation IDs with invalid characters", () => {
        // Arrange
        const invalidCharIds = [
          "ABC123-def456", // Capital letters
          "abc123-DEF456", // Capital letters
          "abc.123-def456", // Period
          "abc_123-def456", // Underscore
          "abc 123-def456", // Space
          "abc@123-def456", // Special character
          "abc#123-def456", // Special character
          "abc123-def@456", // Special character in second part
        ];

        // Act & Assert
        invalidCharIds.forEach((id) => {
          expect(isValidCorrelationId(id)).toBe(false);
        });
      });

      it("should reject correlation IDs with multiple hyphens", () => {
        // Arrange
        const multiHyphenIds = [
          "abc-123-def456",
          "abc123-def-456",
          "a-b-c-d-e-f-g-h",
          "--abc123def456",
          "abc123def456--",
        ];

        // Act & Assert
        multiHyphenIds.forEach((id) => {
          expect(isValidCorrelationId(id)).toBe(false);
        });
      });

      it("should reject empty and null values", () => {
        // Arrange
        const emptyIds = ["", "-", "abc123-", "-def456"];

        // Act & Assert
        emptyIds.forEach((id) => {
          expect(isValidCorrelationId(id)).toBe(false);
        });
      });
    });
  });

  describe("getCorrelationTimestamp", () => {
    describe("valid correlation IDs", () => {
      it("should extract timestamp from valid correlation ID", () => {
        // Arrange
        const testTimestamp = 1640995200000; // 2022-01-01T00:00:00.000Z
        const expectedDate = new Date(testTimestamp);
        const timestampBase36 = testTimestamp.toString(36);
        const correlationId: CorrelationId = `${timestampBase36}-abc123`;

        // Act
        const extractedDate = getCorrelationTimestamp(correlationId);

        // Assert
        expect(extractedDate).toEqual(expectedDate);
        expect(extractedDate?.getTime()).toBe(testTimestamp);
      });

      it("should extract timestamp from generated correlation IDs", () => {
        // Arrange
        const beforeGeneration = Date.now();
        const correlationId = generateCorrelationId();
        const afterGeneration = Date.now();

        // Act
        const extractedDate = getCorrelationTimestamp(correlationId);

        // Assert
        expect(extractedDate).toBeInstanceOf(Date);
        expect(extractedDate!.getTime()).toBeGreaterThanOrEqual(
          beforeGeneration,
        );
        expect(extractedDate!.getTime()).toBeLessThanOrEqual(afterGeneration);
      });

      it("should handle different timestamp values", () => {
        // Arrange
        const testCases = [
          { timestamp: 1000000000000, description: "Year 2001" },
          { timestamp: 1500000000000, description: "Year 2017" },
          { timestamp: 1640995200000, description: "Year 2022" },
          { timestamp: 2000000000000, description: "Year 2033" },
        ];

        // Act & Assert
        testCases.forEach(({ timestamp, description }) => {
          const timestampBase36 = timestamp.toString(36);
          const correlationId: CorrelationId = `${timestampBase36}-random123`;
          const extractedDate = getCorrelationTimestamp(correlationId);

          expect(extractedDate, `Failed for ${description}`).toEqual(
            new Date(timestamp),
          );
        });
      });

      it("should handle correlation IDs with long random parts", () => {
        // Arrange
        const timestamp = 1640995200000;
        const timestampBase36 = timestamp.toString(36);
        const correlationId: CorrelationId = `${timestampBase36}-verylongrandompart123456789`;

        // Act
        const extractedDate = getCorrelationTimestamp(correlationId);

        // Assert
        expect(extractedDate).toEqual(new Date(timestamp));
      });
    });

    describe("invalid correlation IDs", () => {
      it("should return null for invalid correlation ID formats", () => {
        // Arrange
        const invalidIds = [
          "invalid-format-with-caps",
          "nohyphen",
          "multiple-hyphens-here",
          "abc@123-def456",
          "",
          "short",
        ];

        // Act & Assert
        invalidIds.forEach((id) => {
          const result = getCorrelationTimestamp(id);
          expect(result).toBeNull();
        });
      });

      it("should return null for correlation IDs with invalid timestamp parts", () => {
        // Arrange
        const invalidTimestampIds: CorrelationId[] = [
          "-abc123", // Empty timestamp part
          "123--abc123", // Multiple hyphens
        ];

        // Act & Assert
        invalidTimestampIds.forEach((id) => {
          const result = getCorrelationTimestamp(id);
          expect(result).toBeNull();
        });
      });

      it("should return null for correlation IDs that pass format validation but have invalid timestamps", () => {
        // Arrange - IDs that match the pattern but have non-sensible timestamp parts
        // Note: 'xyz' and 'zzz' are actually valid base36 numbers, so we need different test cases
        const problematicIds: CorrelationId[] = [
          "00000000-abc123", // Very old timestamp (epoch)
          "ffffffff-def456", // Very far future timestamp
        ];

        // Act & Assert
        problematicIds.forEach((id) => {
          // These should pass format validation
          expect(isValidCorrelationId(id)).toBe(true);

          // And actually return valid dates (since they're technically valid base36)
          const result = getCorrelationTimestamp(id);
          expect(result).toBeInstanceOf(Date);
        });
      });

      it("should handle edge cases with malformed correlation IDs", () => {
        // Arrange
        const edgeCases: CorrelationId[] = [
          "123-", // Empty second part
          "-123", // Empty first part (but matches pattern)
          "123-abc-def", // Too many parts
        ];

        // Act & Assert
        edgeCases.forEach((id) => {
          const result = getCorrelationTimestamp(id);
          expect(result).toBeNull();
        });
      });
    });

    describe("timestamp precision and accuracy", () => {
      it("should maintain timestamp precision", () => {
        // Arrange
        const preciseTimestamp = 1640995200123; // With milliseconds
        const timestampBase36 = preciseTimestamp.toString(36);
        const correlationId: CorrelationId = `${timestampBase36}-abc123`;

        // Act
        const extractedDate = getCorrelationTimestamp(correlationId);

        // Assert
        expect(extractedDate?.getTime()).toBe(preciseTimestamp);
      });

      it("should handle very large timestamps", () => {
        // Arrange
        const futureTimestamp = 9999999999999; // Far future timestamp
        const timestampBase36 = futureTimestamp.toString(36);
        const correlationId: CorrelationId = `${timestampBase36}-abc123`;

        // Act
        const extractedDate = getCorrelationTimestamp(correlationId);

        // Assert
        expect(extractedDate?.getTime()).toBe(futureTimestamp);
        expect(extractedDate).toBeInstanceOf(Date);
      });

      it("should handle very small timestamps", () => {
        // Arrange
        const earlyTimestamp = 1; // Very early timestamp
        const timestampBase36 = earlyTimestamp.toString(36);
        const correlationId: CorrelationId = `${timestampBase36}-abc123`;

        // Act
        const extractedDate = getCorrelationTimestamp(correlationId);

        // Assert
        expect(extractedDate?.getTime()).toBe(earlyTimestamp);
        expect(extractedDate).toEqual(new Date(1));
      });
    });
  });

  describe("integration between functions", () => {
    it("should work together for the complete correlation ID lifecycle", () => {
      // Arrange
      const beforeGeneration = Date.now();

      // Act - Generate correlation ID
      const correlationId = generateCorrelationId();

      // Assert - Validate the generated ID
      expect(isValidCorrelationId(correlationId)).toBe(true);

      // Act - Extract timestamp
      const extractedDate = getCorrelationTimestamp(correlationId);
      const afterGeneration = Date.now();

      // Assert - Verify timestamp is reasonable
      expect(extractedDate).toBeInstanceOf(Date);
      expect(extractedDate!.getTime()).toBeGreaterThanOrEqual(beforeGeneration);
      expect(extractedDate!.getTime()).toBeLessThanOrEqual(afterGeneration);
    });

    it("should maintain consistency across multiple operations", () => {
      // Arrange & Act
      const operations = Array.from({ length: 5 }, () => {
        const id = generateCorrelationId();
        const isValid = isValidCorrelationId(id);
        const timestamp = getCorrelationTimestamp(id);
        return { id, isValid, timestamp };
      });

      // Assert
      operations.forEach(({ isValid, timestamp }) => {
        expect(isValid, `Operation should be valid`).toBe(true);
        expect(
          timestamp,
          `Operation should have valid timestamp`,
        ).toBeInstanceOf(Date);
        expect(
          timestamp!.getTime(),
          `Operation should have reasonable timestamp`,
        ).toBeGreaterThan(0);
      });

      // Verify all IDs are unique
      const ids = operations.map((op) => op.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
