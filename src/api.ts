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
 * Default elevation prompt for transforming user requests.
 * Extracted from the more complex elevation prompt system.
 */
const ELEVATION_PROMPT = `Transform the user's request into a more sophisticated, technically precise articulation. Output only the elevated request - no headers, explanations, or commentary.

**Transform the request itself**: Take the user's simple prompt and rearticulate it using specific technical language, professional terminology, and structured phrasing.

**Preserve the original intent**: The elevated version must request the same outcome as the original, just expressed with greater technical sophistication.

**Add technical specificity**: Replace vague terms with precise technical concepts, methodologies, and industry-standard terminology.

**Output format**: Provide only the elevated request. No "Original Request:" or "Technically Precise Version:" headers. Just the transformed request itself.

Transform the user's prompt into a technically elevated version that a subject matter expert would use to express the same request.`;

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
