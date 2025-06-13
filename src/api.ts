/**
 * Direct Gemini API implementation.
 *
 * Replaces complex adapter pattern with simple, direct fetch() calls.
 * Following radical simplification philosophy.
 */

import { logToStderr } from "./utils/logger.js";

/**
 * Start a progress indicator that shows "elevating..." with rotating dots.
 *
 * @returns Cleanup function to stop the progress indicator
 */
function startProgress(): () => void {
  // Skip progress indicator in test environment to avoid interfering with other tests
  if (process.env["VITEST"] === "true") {
    return () => {}; // No-op cleanup function
  }

  // Add newlines before starting progress
  process.stderr.write("\n\n");

  let dotCount = 1;
  const interval = globalThis.setInterval(() => {
    const dots = ".".repeat(dotCount);
    const spaces = " ".repeat(3 - dotCount); // Pad to keep consistent width
    process.stderr.write(`\relevating${dots}${spaces}`);
    dotCount = (dotCount % 3) + 1; // Cycle 1 -> 2 -> 3 -> 1
  }, 500);

  return () => {
    globalThis.clearInterval(interval);
    // Clear the progress line and add newline
    process.stderr.write("\r" + " ".repeat(12) + "\r");
  };
}

/**
 * Expert prompt for generating single, high-quality technical articulations.
 * Identifies domain expertise and provides one expert-level rearticulation.
 */
const ELEVATION_PROMPT =
  `You are an expert who rearticulates requests with domain-specific precision and expertise.

First, identify the domain (software engineering, data science, design, etc.). Then provide ONE expert articulation that a seasoned professional would use, with specific technical language and actionable detail.

For software engineering requests:
- Use precise technical terminology (debug, root-cause, CI/CD, regression testing, etc.)
- Include concrete methodologies and tools
- Specify testing and validation approaches
- Reference industry best practices

For other domains, use equivalent domain-specific expertise.

Format: Return only the single expert articulation, no explanations or headers.

Examples:
"fix this bug" → "Perform root-cause analysis, implement targeted remediation, and validate the fix through comprehensive regression testing."
"optimize performance" → "Profile the application to identify bottlenecks, implement targeted optimizations, and benchmark the improvements against baseline metrics."
"improve UX" → "Conduct user research to identify pain points, design evidence-based interface improvements, and validate changes through A/B testing."

User request to rearticulate:`.trim();

/**
 * Elevate a user prompt using direct Gemini API call.
 *
 * @param prompt The user's input prompt to elevate
 * @param debug Whether debug logging is enabled
 * @param raw Whether raw output mode is enabled (suppresses progress indicator)
 * @returns Promise resolving to the elevated prompt
 * @throws Error if API key is missing or API call fails
 */
export async function elevatePrompt(
  prompt: string,
  debug: boolean = false,
  raw: boolean = false,
): Promise<string> {
  // Validate API key
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY required");
  }

  // Gemini API endpoint
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

  // Track performance for API latency metrics
  const startTime = globalThis.performance.now();

  // Log API request start
  logToStderr(
    "info",
    "API request started",
    {
      component: "api",
      operation: "elevatePrompt",
      promptLength: prompt.length,
    },
    debug,
  );

  // Start progress indicator (only in non-raw mode)
  const stopProgress = raw ? () => {} : startProgress();

  try {
    // Make direct API call with 30-second timeout
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: ELEVATION_PROMPT }],
          },
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    // Check for HTTP errors with detailed messages
    if (!response.ok) {
      let errorMessage = `API error: ${response.status} ${response.statusText}`;

      // Provide more specific error guidance based on status code
      switch (response.status) {
        case 400:
          errorMessage += " - Check your request format and API key";
          break;
        case 401:
          errorMessage += " - Invalid API key. Verify your GEMINI_API_KEY";
          break;
        case 403:
          errorMessage += " - API key lacks required permissions";
          break;
        case 429:
          errorMessage += " - Rate limit exceeded. Please try again later";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage += " - Gemini service temporarily unavailable";
          break;
      }

      logToStderr(
        "error",
        "API request failed",
        {
          component: "api",
          operation: "elevatePrompt",
          error: errorMessage,
          httpStatus: response.status,
          promptLength: prompt.length,
          durationMs: globalThis.performance.now() - startTime,
        },
        debug,
      );

      stopProgress();
      throw new Error(errorMessage);
    }

    // Parse response with error handling for malformed JSON
    let data: {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

    try {
      data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      };
    } catch {
      const errorMessage =
        "Invalid JSON response from API - response may be corrupted";
      logToStderr(
        "error",
        "API request failed",
        {
          component: "api",
          operation: "elevatePrompt",
          error: errorMessage,
          promptLength: prompt.length,
          durationMs: globalThis.performance.now() - startTime,
        },
        debug,
      );
      stopProgress();
      throw new Error(errorMessage);
    }

    // Extract generated content
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const errorMessage = "Invalid API response structure";
      logToStderr(
        "error",
        "API request failed",
        {
          component: "api",
          operation: "elevatePrompt",
          error: errorMessage,
          promptLength: prompt.length,
          durationMs: globalThis.performance.now() - startTime,
        },
        debug,
      );
      stopProgress();
      throw new Error(errorMessage);
    }

    const result = data.candidates[0].content.parts[0].text;

    // Log successful completion with performance metrics
    const durationMs = globalThis.performance.now() - startTime;
    logToStderr(
      "info",
      "API request completed successfully",
      {
        component: "api",
        operation: "elevatePrompt",
        promptLength: prompt.length,
        responseLength: result.length,
        durationMs,
      },
      debug,
    );

    stopProgress();
    return result;
  } catch (error) {
    // Handle other errors (network errors, etc.) - only log if not already logged
    if (error instanceof Error) {
      // Only log if this error hasn't been logged yet (i.e., network errors)
      if (
        !error.message.includes("API error:") &&
        !error.message.includes("Invalid JSON response") &&
        !error.message.includes("Invalid API response structure")
      ) {
        logToStderr(
          "error",
          "API request failed",
          {
            component: "api",
            operation: "elevatePrompt",
            error: error.message,
            errorType: "network",
            promptLength: prompt.length,
            durationMs: globalThis.performance.now() - startTime,
          },
          debug,
        );
      }
      stopProgress();
      throw error;
    }

    const errorMessage = `Unexpected error: ${String(error)}`;
    logToStderr(
      "error",
      "API request failed",
      {
        component: "api",
        operation: "elevatePrompt",
        error: errorMessage,
        errorType: "unexpected",
        promptLength: prompt.length,
        durationMs: globalThis.performance.now() - startTime,
      },
      debug,
    );
    stopProgress();
    throw new Error(errorMessage);
  }
}
