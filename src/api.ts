/**
 * Direct Gemini API implementation.
 *
 * Replaces complex adapter pattern with simple, direct fetch() calls.
 * Following radical simplification philosophy.
 */

/**
 * Create a structured log entry with timestamp, level, and message.
 *
 * @param level Log level (info, error)
 * @param message Log message
 * @param metadata Additional metadata to include
 */
function logStructured(
  level: "info" | "error",
  message: string,
  metadata: Record<string, unknown> = {},
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  };

  if (level === "error") {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Enhanced CRISP-based elevation prompt for transforming user requests.
 * Uses proven prompt engineering techniques including structured formatting,
 * few-shot examples, and explicit output constraints.
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
 * Elevate a user prompt using direct Gemini API call.
 *
 * @param prompt The user's input prompt to elevate
 * @returns Promise resolving to the elevated prompt
 * @throws Error if API key is missing or API call fails
 */
export async function elevatePrompt(prompt: string): Promise<string> {
  // Validate API key
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY required");
  }

  // Gemini API endpoint
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

  // Log API request start
  logStructured("info", "API request started", {
    component: "api",
    operation: "elevatePrompt",
    promptLength: prompt.length,
  });

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
      signal: AbortSignal.timeout(30000), // 30-second timeout
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

      logStructured("error", "API request failed", {
        component: "api",
        operation: "elevatePrompt",
        error: errorMessage,
        httpStatus: response.status,
        promptLength: prompt.length,
      });

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
      logStructured("error", "API request failed", {
        component: "api",
        operation: "elevatePrompt",
        error: errorMessage,
        promptLength: prompt.length,
      });
      throw new Error(errorMessage);
    }

    // Extract generated content
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const errorMessage = "Invalid API response structure";
      logStructured("error", "API request failed", {
        component: "api",
        operation: "elevatePrompt",
        error: errorMessage,
        promptLength: prompt.length,
      });
      throw new Error(errorMessage);
    }

    const result = data.candidates[0].content.parts[0].text;

    // Log successful completion
    logStructured("info", "API request completed successfully", {
      component: "api",
      operation: "elevatePrompt",
      promptLength: prompt.length,
      responseLength: result.length,
    });

    return result;
  } catch (error) {
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === "TimeoutError") {
      const errorMessage = "Request timeout - API call exceeded 30 seconds";
      logStructured("error", "API request failed", {
        component: "api",
        operation: "elevatePrompt",
        error: errorMessage,
        errorType: "timeout",
        promptLength: prompt.length,
      });
      throw new Error(errorMessage);
    }

    // Handle AbortError (also related to timeout in some environments)
    if (error instanceof Error && error.name === "AbortError") {
      const errorMessage = "Request timeout - API call exceeded 30 seconds";
      logStructured("error", "API request failed", {
        component: "api",
        operation: "elevatePrompt",
        error: errorMessage,
        errorType: "abort",
        promptLength: prompt.length,
      });
      throw new Error(errorMessage);
    }

    // Handle other errors (network errors, etc.) - only log if not already logged
    if (error instanceof Error) {
      // Only log if this error hasn't been logged yet (i.e., network errors)
      if (
        !error.message.includes("API error:") &&
        !error.message.includes("Invalid JSON response") &&
        !error.message.includes("Invalid API response structure")
      ) {
        logStructured("error", "API request failed", {
          component: "api",
          operation: "elevatePrompt",
          error: error.message,
          errorType: "network",
          promptLength: prompt.length,
        });
      }
      throw error;
    }

    const errorMessage = `Unexpected error: ${String(error)}`;
    logStructured("error", "API request failed", {
      component: "api",
      operation: "elevatePrompt",
      error: errorMessage,
      errorType: "unexpected",
      promptLength: prompt.length,
    });
    throw new Error(errorMessage);
  }
}
