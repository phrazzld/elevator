/**
 * Direct Gemini API implementation.
 *
 * Replaces complex adapter pattern with simple, direct fetch() calls.
 * Following radical simplification philosophy.
 */

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

  try {
    // Make direct API call
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

    // Check for HTTP errors
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Parse response
    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

    // Extract generated content
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid API response structure");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    // Handle JSON parsing or network errors
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unexpected error: ${String(error)}`);
  }
}
