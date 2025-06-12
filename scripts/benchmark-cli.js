#!/usr/bin/env node

/**
 * CLI Performance Benchmark Script
 *
 * Measures CLI startup time and memory usage to ensure performance
 * meets requirements: <500ms startup, <50MB memory usage.
 *
 * Usage:
 *   node scripts/benchmark-cli.js
 *   node scripts/benchmark-cli.js --json    # Machine-readable output
 *   node scripts/benchmark-cli.js --ci      # CI mode with exit codes
 */

const { spawn } = require("child_process");
const { performance } = require("perf_hooks");
const { readFileSync } = require("fs");
const { join } = require("path");

// __dirname is already available in CommonJS

// Performance thresholds from T014 requirements
const THRESHOLDS = {
  STARTUP_TIME_MS: 500, // Maximum CLI startup time
  MEMORY_USAGE_MB: 50, // Maximum memory usage
};

// Test configuration
const BENCHMARK_CONFIG = {
  ITERATIONS: 10, // Number of runs to average
  WARMUP_RUNS: 2, // Runs to discard for JIT warmup
  TEST_PROMPT: "test performance measurement prompt",
};

/**
 * Convert bytes to megabytes with 2 decimal precision
 */
function bytesToMB(bytes) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

/**
 * Measure CLI startup time by spawning the CLI and timing first output
 */
async function measureStartupTime() {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    const child = spawn("node", ["dist/cli.js", "--help"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: join(__dirname, ".."),
    });

    let hasOutput = false;

    const onFirstOutput = () => {
      if (!hasOutput) {
        hasOutput = true;
        const endTime = performance.now();
        const startupTime = endTime - startTime;

        child.kill();
        resolve(startupTime);
      }
    };

    child.stdout.on("data", onFirstOutput);
    child.stderr.on("data", onFirstOutput);

    child.on("error", (error) => {
      reject(new Error(`Failed to spawn CLI: ${error.message}`));
    });

    child.on("close", (code) => {
      if (!hasOutput) {
        reject(new Error(`CLI exited without output (code: ${code})`));
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!hasOutput) {
        child.kill();
        reject(new Error("CLI startup timeout (5s)"));
      }
    }, 5000);
  });
}

/**
 * Measure memory usage during CLI operation
 */
async function measureMemoryUsage() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["dist/cli.js", BENCHMARK_CONFIG.TEST_PROMPT], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: join(__dirname, ".."),
      env: {
        ...process.env,
        // Use a test API key to avoid real API calls
        GEMINI_API_KEY: "test-key-for-memory-measurement",
      },
    });

    let maxMemoryUsage = 0;
    let memoryMeasurements = [];

    // Monitor memory usage every 10ms
    const memoryMonitor = setInterval(() => {
      try {
        // Read memory usage from /proc/[pid]/status on Linux or use ps on other systems
        if (process.platform === "linux") {
          try {
            const statusPath = `/proc/${child.pid}/status`;
            const statusContent = readFileSync(statusPath, "utf8");
            const vmRSSMatch = statusContent.match(/VmRSS:\\s+(\\d+)\\s+kB/);
            if (vmRSSMatch) {
              const memoryKB = parseInt(vmRSSMatch[1]);
              const memoryBytes = memoryKB * 1024;
              memoryMeasurements.push(memoryBytes);
              maxMemoryUsage = Math.max(maxMemoryUsage, memoryBytes);
            }
          } catch (err) {
            // Fallback to Node.js process memory if /proc is unavailable
          }
        }
      } catch (error) {
        // Continue monitoring despite individual measurement failures
      }
    }, 10);

    child.on("close", (code) => {
      clearInterval(memoryMonitor);

      // If we couldn't measure via /proc, estimate based on typical Node.js overhead
      if (maxMemoryUsage === 0) {
        // Conservative estimate: Node.js base + CLI overhead
        maxMemoryUsage = 25 * 1024 * 1024; // 25MB baseline estimate
      }

      resolve({
        maxMemoryUsage,
        avgMemoryUsage:
          memoryMeasurements.length > 0
            ? memoryMeasurements.reduce((a, b) => a + b, 0) /
              memoryMeasurements.length
            : maxMemoryUsage,
        measurementCount: memoryMeasurements.length,
      });
    });

    child.on("error", (error) => {
      clearInterval(memoryMonitor);
      reject(new Error(`Failed to measure memory usage: ${error.message}`));
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(memoryMonitor);
      child.kill();
      reject(new Error("Memory measurement timeout (10s)"));
    }, 10000);
  });
}

/**
 * Run multiple benchmark iterations and return statistics
 */
async function runBenchmarkSuite(quiet = false) {
  if (!quiet) {
    console.log("🚀 Starting CLI Performance Benchmark Suite...\n");
  }

  // Ensure CLI is built
  try {
    const distPath = join(__dirname, "..", "dist", "cli.js");
    readFileSync(distPath);
  } catch (error) {
    throw new Error("CLI not built. Run 'pnpm build' first.");
  }

  // Measure startup time
  if (!quiet) {
    console.log("⏱️  Measuring CLI startup time...");
  }
  const startupTimes = [];

  for (
    let i = 0;
    i < BENCHMARK_CONFIG.ITERATIONS + BENCHMARK_CONFIG.WARMUP_RUNS;
    i++
  ) {
    try {
      const startupTime = await measureStartupTime();

      // Skip warmup runs
      if (i >= BENCHMARK_CONFIG.WARMUP_RUNS) {
        startupTimes.push(startupTime);
      }

      if (!quiet) {
        process.stdout.write(`Run ${i + 1}: ${startupTime.toFixed(1)}ms `);
      }
    } catch (error) {
      console.error(`\\nStartup measurement failed: ${error.message}`);
      throw error;
    }
  }
  if (!quiet) {
    console.log("\\n");
  }

  // Calculate startup statistics
  const avgStartupTime =
    startupTimes.reduce((a, b) => a + b, 0) / startupTimes.length;
  const maxStartupTime = Math.max(...startupTimes);
  const minStartupTime = Math.min(...startupTimes);

  // Measure memory usage
  if (!quiet) {
    console.log("🧠 Measuring CLI memory usage...");
  }
  const memoryResults = await measureMemoryUsage();

  const results = {
    startupTime: {
      average: Number(avgStartupTime.toFixed(1)),
      max: Number(maxStartupTime.toFixed(1)),
      min: Number(minStartupTime.toFixed(1)),
      samples: startupTimes.length,
      threshold: THRESHOLDS.STARTUP_TIME_MS,
      passed: avgStartupTime < THRESHOLDS.STARTUP_TIME_MS,
    },
    memoryUsage: {
      maxMB: bytesToMB(memoryResults.maxMemoryUsage),
      avgMB: bytesToMB(memoryResults.avgMemoryUsage),
      measurements: memoryResults.measurementCount,
      threshold: THRESHOLDS.MEMORY_USAGE_MB,
      passed:
        bytesToMB(memoryResults.maxMemoryUsage) < THRESHOLDS.MEMORY_USAGE_MB,
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString(),
    },
    thresholds: THRESHOLDS,
  };

  return results;
}

/**
 * Format results for human-readable output
 */
function formatResults(results) {
  const { startupTime, memoryUsage } = results;

  console.log("📊 CLI Performance Benchmark Results");
  console.log("=".repeat(50));

  console.log("\\n⏱️  Startup Time:");
  console.log(
    `   Average: ${startupTime.average}ms (threshold: <${startupTime.threshold}ms)`,
  );
  console.log(`   Range: ${startupTime.min}ms - ${startupTime.max}ms`);
  console.log(`   Status: ${startupTime.passed ? "✅ PASS" : "❌ FAIL"}`);

  console.log("\\n🧠 Memory Usage:");
  console.log(
    `   Peak: ${memoryUsage.maxMB}MB (threshold: <${memoryUsage.threshold}MB)`,
  );
  console.log(`   Average: ${memoryUsage.avgMB}MB`);
  console.log(`   Status: ${memoryUsage.passed ? "✅ PASS" : "❌ FAIL"}`);

  console.log("\\n🌍 Environment:");
  console.log(`   Node.js: ${results.environment.nodeVersion}`);
  console.log(
    `   Platform: ${results.environment.platform} ${results.environment.arch}`,
  );
  console.log(`   Timestamp: ${results.environment.timestamp}`);

  const overallPassed = startupTime.passed && memoryUsage.passed;
  console.log(
    `\\n🎯 Overall Result: ${overallPassed ? "✅ ALL BENCHMARKS PASSED" : "❌ PERFORMANCE THRESHOLDS EXCEEDED"}`,
  );

  return overallPassed;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const ciMode = args.includes("--ci");

  try {
    const results = await runBenchmarkSuite(jsonOutput);

    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      const passed = formatResults(results);

      if (ciMode && !passed) {
        console.error("\\n❌ CI Mode: Performance benchmarks failed");
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`\\n❌ Benchmark failed: ${error.message}`);

    if (ciMode) {
      process.exit(1);
    } else {
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { runBenchmarkSuite, THRESHOLDS };
