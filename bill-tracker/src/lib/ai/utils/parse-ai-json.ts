/**
 * AI JSON Response Parser
 * Utility to parse JSON responses from AI models that may include markdown formatting
 */

/**
 * Parse AI JSON response, handling common issues:
 * - Markdown code blocks (```json ... ```)
 * - Text before/after the JSON block
 * - Trailing commas
 * - Single-quoted property names/values
 * - undefined values (not valid JSON)
 * - JS-style comments
 */
export function parseAIJsonResponse<T = unknown>(raw: string): T {
  let text = raw.trim();

  // Extract JSON from markdown code blocks (handles ```json or ``` with surrounding text)
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  // If no code block, try to extract the outermost { ... } or [ ... ]
  if (!codeBlockMatch) {
    const firstBrace = text.indexOf("{");
    const firstBracket = text.indexOf("[");
    const start =
      firstBrace === -1
        ? firstBracket
        : firstBracket === -1
          ? firstBrace
          : Math.min(firstBrace, firstBracket);
    if (start > 0) {
      text = text.slice(start);
    }
    // Trim trailing non-JSON text after last } or ]
    const lastBrace = text.lastIndexOf("}");
    const lastBracket = text.lastIndexOf("]");
    const end = Math.max(lastBrace, lastBracket);
    if (end !== -1 && end < text.length - 1) {
      text = text.slice(0, end + 1);
    }
  }

  // Remove single-line comments (// ...)
  text = text.replace(/\/\/[^\n]*/g, "");

  // Remove multi-line comments (/* ... */)
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");

  // Fix invalid JSON: replace undefined with null
  text = text.replace(/:\s*undefined\b/g, ": null");

  // Remove trailing commas before } or ]
  text = text.replace(/,\s*([}\]])/g, "$1");

  // Try parsing as-is first
  try {
    return JSON.parse(text);
  } catch {
    // Fall through to recovery attempts
  }

  // Replace single-quoted keys/values with double-quoted
  // This is a simplistic approach that handles the most common cases
  const singleToDouble = text.replace(
    /(?<=[:,\[\{]\s*)'([^']*?)'/g,
    '"$1"'
  );
  try {
    return JSON.parse(singleToDouble);
  } catch {
    // Fall through
  }

  // Last resort: throw with helpful context
  throw new SyntaxError(
    `Failed to parse AI JSON response. Preview: ${text.slice(0, 200)}...`
  );
}

/**
 * Safely parse AI JSON response, returning null on failure
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
