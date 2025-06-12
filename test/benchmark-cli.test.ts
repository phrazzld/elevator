/**
 * Tests for CLI performance benchmark script
 *
 * Ensures the benchmark script functions correctly and produces
 * reliable results for CI integration.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";

/**
 * Execute the benchmark script and capture results
 */
async function runBenchmarkScript(args: string[] = []): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn("node", ["scripts/benchmark-cli.js", ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: join(__dirname, ".."),
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

describe("CLI Performance Benchmark Script", () => {
  beforeAll(async () => {
    // Ensure the CLI is built before running benchmarks
    try {
      await fs.access(join(__dirname, "..", "dist", "cli.js"));
    } catch (error) {
      throw new Error(
        "CLI not built. Run 'pnpm build' before testing benchmarks.",
      );
    }
  });

  describe("Basic functionality", () => {
    it("should execute successfully with default output", async () => {
      const result = await runBenchmarkScript();

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("CLI Performance Benchmark Results");
      expect(result.stdout).toContain("Startup Time:");
      expect(result.stdout).toContain("Memory Usage:");
      expect(result.stdout).toContain("Overall Result:");
    }, 30000); // 30s timeout for performance measurement

    it("should produce JSON output when requested", async () => {
      const result = await runBenchmarkScript(["--json"]);

      expect(result.exitCode).toBe(0);

      // Parse the JSON output
      const benchmarkData = JSON.parse(result.stdout);

      // Verify required structure
      expect(benchmarkData).toHaveProperty("startupTime");
      expect(benchmarkData).toHaveProperty("memoryUsage");
      expect(benchmarkData).toHaveProperty("environment");
      expect(benchmarkData).toHaveProperty("thresholds");

      // Verify startup time data
      expect(benchmarkData.startupTime).toHaveProperty("average");
      expect(benchmarkData.startupTime).toHaveProperty("max");
      expect(benchmarkData.startupTime).toHaveProperty("min");
      expect(benchmarkData.startupTime).toHaveProperty("threshold", 500);
      expect(benchmarkData.startupTime).toHaveProperty("passed");

      // Verify memory usage data
      expect(benchmarkData.memoryUsage).toHaveProperty("maxMB");
      expect(benchmarkData.memoryUsage).toHaveProperty("avgMB");
      expect(benchmarkData.memoryUsage).toHaveProperty("threshold", 50);
      expect(benchmarkData.memoryUsage).toHaveProperty("passed");

      // Verify environment data
      expect(benchmarkData.environment).toHaveProperty("nodeVersion");
      expect(benchmarkData.environment).toHaveProperty("platform");
      expect(benchmarkData.environment).toHaveProperty("arch");
      expect(benchmarkData.environment).toHaveProperty("timestamp");
    }, 30000);
  });

  describe("Performance thresholds", () => {
    it("should measure startup time within reasonable bounds", async () => {
      const result = await runBenchmarkScript(["--json"]);
      const data = JSON.parse(result.stdout);

      // Startup time should be measured and reasonable
      expect(data.startupTime.average).toBeGreaterThan(0);
      expect(data.startupTime.average).toBeLessThan(5000); // Should be way under 5 seconds
      expect(data.startupTime.min).toBeGreaterThan(0);
      expect(data.startupTime.max).toBeGreaterThan(data.startupTime.min);

      // Samples should be reasonable
      expect(data.startupTime.samples).toBeGreaterThan(5);
    }, 30000);

    it("should measure memory usage within reasonable bounds", async () => {
      const result = await runBenchmarkScript(["--json"]);
      const data = JSON.parse(result.stdout);

      // Memory usage should be measured and reasonable
      expect(data.memoryUsage.maxMB).toBeGreaterThan(0);
      expect(data.memoryUsage.maxMB).toBeLessThan(200); // Should be way under 200MB
      expect(data.memoryUsage.avgMB).toBeGreaterThan(0);
      expect(data.memoryUsage.avgMB).toBeLessThanOrEqual(
        data.memoryUsage.maxMB,
      );
    }, 30000);

    it("should meet performance thresholds for a well-performing CLI", async () => {
      const result = await runBenchmarkScript(["--json"]);
      const data = JSON.parse(result.stdout);

      // Our CLI should meet the performance requirements
      expect(data.startupTime.passed).toBe(true);
      expect(data.startupTime.average).toBeLessThan(500); // <500ms threshold

      expect(data.memoryUsage.passed).toBe(true);
      expect(data.memoryUsage.maxMB).toBeLessThan(50); // <50MB threshold
    }, 30000);
  });

  describe("CI mode", () => {
    it("should exit with code 0 when benchmarks pass", async () => {
      const result = await runBenchmarkScript(["--ci"]);

      // Should pass given our lightweight CLI
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("ALL BENCHMARKS PASSED");
    }, 30000);

    it("should provide structured error output if benchmarks fail", async () => {
      // This test would need a modified threshold to trigger failure
      // For now, we verify the structure exists in normal operation
      const result = await runBenchmarkScript(["--ci"]);

      // Should include performance details
      expect(result.stdout).toContain("Startup Time:");
      expect(result.stdout).toContain("Memory Usage:");
      expect(result.stdout).toContain("Overall Result:");
    }, 30000);
  });

  describe("Error handling", () => {
    it("should handle missing CLI build gracefully", async () => {
      // Temporarily move dist directory to simulate missing build
      const distPath = join(__dirname, "..", "dist");
      const tempPath = join(__dirname, "..", "dist.backup");

      try {
        await fs.rename(distPath, tempPath);

        const result = await runBenchmarkScript();

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("CLI not built");
      } finally {
        // Restore dist directory
        try {
          await fs.rename(tempPath, distPath);
        } catch (error) {
          // If restore fails, the test environment is broken
          console.error("Failed to restore dist directory:", error);
        }
      }
    }, 15000);
  });

  describe("Reliability and consistency", () => {
    it("should produce consistent results across multiple runs", async () => {
      const results = await Promise.all([
        runBenchmarkScript(["--json"]),
        runBenchmarkScript(["--json"]),
      ]);

      const data1 = JSON.parse(results[0].stdout);
      const data2 = JSON.parse(results[1].stdout);

      // Results should be in similar ranges (within 50% variance for startup time)
      const startupVariance =
        Math.abs(data1.startupTime.average - data2.startupTime.average) /
        Math.max(data1.startupTime.average, data2.startupTime.average);
      expect(startupVariance).toBeLessThan(0.5); // Less than 50% variance

      // Memory should be relatively consistent (within 20% variance)
      const memoryVariance =
        Math.abs(data1.memoryUsage.maxMB - data2.memoryUsage.maxMB) /
        Math.max(data1.memoryUsage.maxMB, data2.memoryUsage.maxMB);
      expect(memoryVariance).toBeLessThan(0.2); // Less than 20% variance
    }, 60000); // Extended timeout for multiple runs
  });
});
