/**
 * AI JSON Response Parser
 * Utility to parse JSON responses from AI models that may include markdown formatting
 */

/**
 * Parse AI JSON response, handling common issues:
 * - Markdown code blocks (```json ... ```)
 * - undefined values (not valid JSON)
 * - Trailing/leading whitespace
 * 
 * @param raw Raw response string from AI model
 * @returns Parsed JSON object
 * @throws Error if JSON parsing fails
 */
export function parseAIJsonResponse<T = unknown>(raw: string): T {
  let text = raw.trim();

  // Remove markdown code blocks if present
  if (text.startsWith("```")) {
    text = text
      .replace(/```json?\n?/g, "")
      .replace(/```\n?$/g, "");
  }

  // Fix invalid JSON: replace undefined with null
  text = text.replace(/:\s*undefined\b/g, ": null");

  return JSON.parse(text);
}

/**
 * Safely parse AI JSON response, returning null on failure
 * 
 * @param raw Raw response string from AI model
 * @param onError Optional error handler
 * @returns Parsed JSON object or null if parsing fails
 */
export function safeParseAIJsonResponse<T = unknown>(
  raw: string,
  onError?: (error: Error, rawText: string) => void
): T | null {
  try {
    return parseAIJsonResponse<T>(raw);
  } catch (error) {
    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)), raw);
    }
    return null;
  }
}
