/**
 * Performance benchmark tests for prompt transformation logic.
 *
 * Measures the execution time of prompt construction operations
 * excluding API calls to track against the <20ms overhead goal.
 */

import { describe, it, expect } from "vitest";

/**
 * Enhanced CRISP-based elevation prompt (copied from api.ts for isolation)
 */
const ELEVATION_PROMPT = `<role>Expert prompt engineer specializing in technical communication</role>

<context>Transform requests using proven CRISP structure (Context, Role, Instructions, Specifics, Parameters)</context>

<instructions>
1. Add specific context and measurable outcomes
2. Replace vague terms with precise technical language
3. Structure with clear sections and constraints
4. Include format specifications when beneficial
5. Specify success criteria and validation methods
</instructions>

<examples>
Input: "help with my code"
Output: "Review this [LANGUAGE] codebase for performance bottlenecks. Focus on: 1) Inefficient algorithms (O(n²)+), 2) Memory leaks, 3) Unnecessary operations. Provide specific line numbers and optimization suggestions. Format: Markdown with code snippets."

Input: "write about AI"
Output: "Create a 1200-word technical analysis of AI applications in [DOMAIN]. Structure: Executive summary (200w), Current state (400w), Emerging trends (400w), Implementation considerations (200w). Target audience: Technical decision-makers. Include 3+ case studies."

Input: "analyze this data"
Output: "Perform statistical analysis on [DATA_TYPE] dataset. Methodology: 1) Descriptive statistics with outlier detection, 2) Trend analysis using [METHOD], 3) Correlation matrix for key variables. Deliverables: Executive summary, detailed findings with visualizations, recommendations with confidence intervals. Format: PDF report with appendices."

Input: "fix my bug"
Output: "Debug [ERROR_TYPE] in [COMPONENT] (line X). Reproduce steps: [STEPS]. Expected vs actual behavior: [COMPARISON]. Provide: 1) Root cause analysis, 2) Fix with explanation, 3) Prevention strategy, 4) Test cases."

Input: "create a design"
Output: "Design [ARTIFACT] for [AUDIENCE]. Requirements: [SPECIFICATIONS]. Constraints: [TECHNICAL/BUSINESS_LIMITS]. Deliverables: 1) Wireframes/mockups, 2) Technical specifications, 3) Implementation timeline, 4) Success metrics. Format: Design system with documentation."
</examples>

<output_constraints>
Output ONLY the transformed prompt. No explanations, headers, or meta-commentary.
</output_constraints>

Transform this request:`;

/**
 * Benchmark the prompt transformation logic (excluding API call).
 * This includes request object construction and JSON serialization.
 *
 * @param userPrompt The user's input prompt
 * @returns Execution time in milliseconds
 */
function benchmarkPromptTransformation(userPrompt: string): number {
  const startTime = Date.now();

  // This mirrors the prompt construction logic from elevatePrompt()
  // but excludes the actual API call
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: ELEVATION_PROMPT }],
      },
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
  };

  // Include JSON serialization as this is part of the overhead
  const serializedBody = JSON.stringify(requestBody);

  // Include basic string operations that happen in the real function
  const promptLength = userPrompt.length;
  const bodyLength = serializedBody.length;

  // Simulate the same string processing that happens in actual usage
  // This prevents compiler optimizations from eliminating our benchmark
  const result = {
    requestBody,
    serializedBody,
    promptLength,
    bodyLength,
  };

  const endTime = Date.now();

  // Ensure the result is used to prevent dead code elimination
  expect(result.promptLength).toBe(userPrompt.length);

  return endTime - startTime;
}

/**
 * Run multiple iterations and return average execution time.
 *
 * @param userPrompt The prompt to benchmark
 * @param iterations Number of iterations to average
 * @returns Average execution time in milliseconds
 */
function measureAverageTime(
  userPrompt: string,
  iterations: number = 1000,
): number {
  const times: number[] = [];

  // Warm up - run a few times to stabilize performance
  for (let i = 0; i < 10; i++) {
    benchmarkPromptTransformation(userPrompt);
  }

  // Actual measurement
  for (let i = 0; i < iterations; i++) {
    times.push(benchmarkPromptTransformation(userPrompt));
  }

  return times.reduce((sum, time) => sum + time, 0) / times.length;
}

/**
 * Test data representing different prompt sizes
 */
const TEST_PROMPTS = {
  short: "fix bug",
  medium:
    "Create a REST API for user management with authentication, validation, and proper error handling",
  long: `
    I need help designing and implementing a comprehensive microservices architecture 
    for an e-commerce platform. The system should include user management, product catalog, 
    inventory tracking, order processing, payment integration, notification services, 
    and analytics. Each service should be independently deployable, use proper database 
    patterns, implement circuit breakers for resilience, include monitoring and logging, 
    support horizontal scaling, and follow security best practices. Please provide 
    detailed architectural decisions, technology recommendations, API design patterns, 
    deployment strategies, and testing approaches for each component.
  `.trim(),
  // Test edge case of very long prompt
  extraLong:
    "a".repeat(5000) +
    " - please help me understand this very long text and provide detailed analysis",
};

describe("Prompt Transformation Performance Benchmarks", () => {
  const PERFORMANCE_GOAL_MS = 20; // Target: <20ms overhead
  const ITERATIONS = 1000;

  describe("Performance Baseline Measurements", () => {
    it("should measure baseline performance for short prompts", () => {
      const avgTime = measureAverageTime(TEST_PROMPTS.short, ITERATIONS);

      console.log(
        `📊 Short prompt (${TEST_PROMPTS.short.length} chars): ${avgTime.toFixed(3)}ms avg`,
      );

      // Document the baseline - this should easily pass
      expect(avgTime).toBeLessThan(PERFORMANCE_GOAL_MS);
    });

    it("should measure baseline performance for medium prompts", () => {
      const avgTime = measureAverageTime(TEST_PROMPTS.medium, ITERATIONS);

      console.log(
        `📊 Medium prompt (${TEST_PROMPTS.medium.length} chars): ${avgTime.toFixed(3)}ms avg`,
      );

      // Medium prompts should still be well under the goal
      expect(avgTime).toBeLessThan(PERFORMANCE_GOAL_MS);
    });

    it("should measure baseline performance for long prompts", () => {
      const avgTime = measureAverageTime(TEST_PROMPTS.long, ITERATIONS);

      console.log(
        `📊 Long prompt (${TEST_PROMPTS.long.length} chars): ${avgTime.toFixed(3)}ms avg`,
      );

      // Long prompts should still meet the performance goal
      expect(avgTime).toBeLessThan(PERFORMANCE_GOAL_MS);
    });

    it("should measure baseline performance for extra long prompts", () => {
      const avgTime = measureAverageTime(TEST_PROMPTS.extraLong, ITERATIONS);

      console.log(
        `📊 Extra long prompt (${TEST_PROMPTS.extraLong.length} chars): ${avgTime.toFixed(3)}ms avg`,
      );

      // Even very long prompts should meet the goal
      expect(avgTime).toBeLessThan(PERFORMANCE_GOAL_MS);
    });
  });

  describe("Performance Characteristics Analysis", () => {
    it("should analyze performance scaling with input size", () => {
      const results = Object.entries(TEST_PROMPTS).map(([size, prompt]) => {
        const avgTime = measureAverageTime(prompt, ITERATIONS);
        return {
          size,
          chars: prompt.length,
          timeMs: avgTime,
          charsPerMs: prompt.length / avgTime,
        };
      });

      console.log("\n📈 Performance Scaling Analysis:");
      console.table(results);

      // Verify that performance scales reasonably with input size
      // Even the largest input should process efficiently
      const largestResult = results.find((r) => r.size === "extraLong");
      expect(largestResult?.timeMs).toBeLessThan(PERFORMANCE_GOAL_MS);

      // Verify we can process a reasonable number of characters per millisecond
      results.forEach((result) => {
        expect(result.charsPerMs).toBeGreaterThan(100); // At least 100 chars/ms
      });
    });

    it("should verify consistent performance across multiple runs", () => {
      const runs = 10;
      const times: number[] = [];

      for (let i = 0; i < runs; i++) {
        times.push(measureAverageTime(TEST_PROMPTS.medium, 100));
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const stdDev = Math.sqrt(
        times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) /
          times.length,
      );

      console.log(
        `📊 Consistency Check - Average: ${avgTime.toFixed(3)}ms, StdDev: ${stdDev.toFixed(3)}ms`,
      );

      // Verify reasonable consistency (coefficient of variation < 150% - very lenient due to micro-benchmark noise)
      const coefficientOfVariation = stdDev / avgTime;
      expect(coefficientOfVariation).toBeLessThan(1.5);

      // All runs should meet the performance goal
      times.forEach((time) => {
        expect(time).toBeLessThan(PERFORMANCE_GOAL_MS);
      });
    });
  });

  describe("Edge Case Performance", () => {
    it("should handle empty prompts efficiently", () => {
      const avgTime = measureAverageTime("", ITERATIONS);

      console.log(`📊 Empty prompt: ${avgTime.toFixed(3)}ms avg`);

      // Empty prompts should be the fastest
      expect(avgTime).toBeLessThan(PERFORMANCE_GOAL_MS / 2);
    });

    it("should handle prompts with special characters efficiently", () => {
      const specialCharsPrompt =
        "Debug: console.log('Hello 🌟 World! 世界'); // Special chars: @#$%^&*()";
      const avgTime = measureAverageTime(specialCharsPrompt, ITERATIONS);

      console.log(
        `📊 Special characters prompt (${specialCharsPrompt.length} chars): ${avgTime.toFixed(3)}ms avg`,
      );

      // Special characters shouldn't significantly impact performance
      expect(avgTime).toBeLessThan(PERFORMANCE_GOAL_MS);
    });
  });
});

describe("Performance Regression Detection", () => {
  it("should document current performance baseline for tracking", () => {
    const PERFORMANCE_GOAL_MS = 20; // Target: <20ms overhead

    const baseline = {
      timestamp: new Date().toISOString(),
      prompts: Object.entries(TEST_PROMPTS).map(([size, prompt]) => ({
        size,
        length: prompt.length,
        avgTimeMs: measureAverageTime(prompt, 100),
      })),
      performanceGoal: PERFORMANCE_GOAL_MS,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    console.log("\n🏁 Performance Baseline Documentation:");
    console.log(JSON.stringify(baseline, null, 2));

    // All measurements should meet the performance goal
    baseline.prompts.forEach((result) => {
      expect(result.avgTimeMs).toBeLessThan(PERFORMANCE_GOAL_MS);
    });

    // Log summary for easy tracking
    const totalAvg =
      baseline.prompts.reduce((sum, p) => sum + p.avgTimeMs, 0) /
      baseline.prompts.length;
    console.log(
      `\n✅ Overall average transformation time: ${totalAvg.toFixed(3)}ms (Goal: <${PERFORMANCE_GOAL_MS}ms)`,
    );
  });
});
