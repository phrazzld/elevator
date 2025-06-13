/**
 * Unit tests for structured stderr logging utility
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logToStderr, type LogLevel, type LogEntry } from "./logger.js";

describe("Logger Utility", () => {
  let stderrWriteSpy: any;

  beforeEach(() => {
    // Spy on stderr.write to capture log output
    stderrWriteSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    // Restore original stderr.write
    vi.restoreAllMocks();
  });

  describe("logToStderr", () => {
    it("should write valid JSON to stderr with newline", () => {
      const level: LogLevel = "info";
      const message = "Test message";
      const metadata = { component: "test", operation: "unit-test" };

      logToStderr(level, message, metadata, true); // Enable debug logging

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);

      const writtenData = stderrWriteSpy.mock.calls[0]![0] as string;
      expect(writtenData).toMatch(/\n$/); // Should end with newline

      const logEntry = JSON.parse(writtenData.trim()) as LogEntry;
      expect(logEntry).toMatchObject({
        level: "info",
        message: "Test message",
        metadata: { component: "test", operation: "unit-test" },
      });
      expect(logEntry.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it("should handle error level logs", () => {
      logToStderr("error", "Error occurred", { errorCode: 500 }, true);

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);

      const writtenData = stderrWriteSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(writtenData.trim()) as LogEntry;

      expect(logEntry.level).toBe("error");
      expect(logEntry.message).toBe("Error occurred");
      expect(logEntry.metadata).toEqual({ errorCode: 500 });
    });

    it("should use empty metadata when not provided", () => {
      logToStderr("info", "Simple message", {}, true);

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);

      const writtenData = stderrWriteSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(writtenData.trim()) as LogEntry;

      expect(logEntry.metadata).toEqual({});
    });

    it("should include all mandatory fields", () => {
      logToStderr("info", "Test", { key: "value" }, true);

      const writtenData = stderrWriteSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(writtenData.trim()) as LogEntry;

      // Verify all mandatory fields are present
      expect(logEntry).toHaveProperty("timestamp");
      expect(logEntry).toHaveProperty("level");
      expect(logEntry).toHaveProperty("message");
      expect(logEntry).toHaveProperty("metadata");

      // Verify types
      expect(typeof logEntry.timestamp).toBe("string");
      expect(typeof logEntry.level).toBe("string");
      expect(typeof logEntry.message).toBe("string");
      expect(typeof logEntry.metadata).toBe("object");
    });

    it("should generate ISO timestamp", () => {
      const beforeTime = new Date();
      logToStderr("info", "Timestamp test", {}, true);
      const afterTime = new Date();

      const writtenData = stderrWriteSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(writtenData.trim()) as LogEntry;

      const logTime = new Date(logEntry.timestamp);
      expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(logTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("should handle complex metadata objects", () => {
      const complexMetadata = {
        nested: { key: "value" },
        array: [1, 2, 3],
        number: 42,
        boolean: true,
        nullValue: null,
      };

      logToStderr("info", "Complex metadata", complexMetadata, true);

      const writtenData = stderrWriteSpy.mock.calls[0]![0] as string;
      const logEntry = JSON.parse(writtenData.trim()) as LogEntry;

      expect(logEntry.metadata).toEqual(complexMetadata);
    });

    it("should output only to stderr, not stdout", () => {
      const stdoutWriteSpy = vi.spyOn(process.stdout, "write");

      logToStderr("info", "Test message", {}, true);

      expect(stderrWriteSpy).toHaveBeenCalledTimes(1);
      expect(stdoutWriteSpy).not.toHaveBeenCalled();

      stdoutWriteSpy.mockRestore();
    });

    it("should produce valid JSON for empty strings and special characters", () => {
      const specialMessage = 'Special chars: \n\t\r"\\';
      const specialMetadata = {
        empty: "",
        quotes: '"quoted"',
        backslash: "\\path\\to\\file",
        unicode: "😀",
      };

      logToStderr("info", specialMessage, specialMetadata, true);

      const writtenData = stderrWriteSpy.mock.calls[0]![0] as string;

      // Should not throw when parsing
      expect(() => JSON.parse(writtenData.trim()) as unknown).not.toThrow();

      const logEntry = JSON.parse(writtenData.trim()) as LogEntry;
      expect(logEntry.message).toBe(specialMessage);
      expect(logEntry.metadata).toEqual(specialMetadata);
    });

    it("should not log when debug is false", () => {
      logToStderr("info", "Test message", {}, false);

      expect(stderrWriteSpy).not.toHaveBeenCalled();
    });

    it("should not log when debug parameter is omitted (defaults to false)", () => {
      logToStderr("info", "Test message", {});

      expect(stderrWriteSpy).not.toHaveBeenCalled();
    });
  });

  describe("Type Exports", () => {
    it("should export LogLevel type correctly", () => {
      // Type test - these should compile without errors
      const validLevels: LogLevel[] = ["info", "error"];
      expect(validLevels).toHaveLength(2);
    });

    it("should export LogEntry interface correctly", () => {
      // Type test - this should compile without errors
      const validLogEntry: LogEntry = {
        timestamp: "2023-01-01T00:00:00.000Z",
        level: "info",
        message: "test",
        metadata: {},
      };
      expect(validLogEntry).toBeDefined();
    });
  });
});
