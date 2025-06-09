import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: [
      "node_modules",
      "dist",
      "coverage",
      "**/*.d.ts",
      "**/index.ts", // Pure re-export files
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*"],
      exclude: [
        "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        "src/**/*.d.ts",
        "**/index.ts", // Pure re-export files
      ],
      // Collect coverage from all files, even if not imported in tests
      all: true,
      // Coverage thresholds - configured for different architectural layers
      thresholds: {
        // Global thresholds (will be enforced as more tests are added)
        // Currently set to achievable levels, will be raised as coverage improves
        global: {
          branches: 80,
          functions: 80,
          lines: 40, // Current baseline to prevent regression
          statements: 40, // Current baseline to prevent regression
        },
        // Specific file thresholds for critical core logic (already at 100%)
        "src/core/promptProcessor.ts": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        "src/core/promptValidator.ts": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        "src/core/promptEnhancer.ts": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        "src/core/apiClient.ts": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        // Infrastructure adapters should maintain good coverage
        "src/adapters/": {
          branches: 75,
          functions: 90,
          lines: 75,
          statements: 75,
        },
      },
    },
    // Reporter configuration for better test output
    reporters: ["default"],
    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
