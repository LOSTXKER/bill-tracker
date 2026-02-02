/**
 * Get the base URL for the application
 * Handles different environments: production, Vercel preview, and local development
 */

export function getBaseUrl(): string {
  // First priority: explicitly set app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Second priority: Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Fallback: localhost for development
  return "http://localhost:3000";
}

/**
 * Build a full URL path from the base URL
 * @param path - The path to append (should start with /)
 */
export function buildUrl(path: string): string {
  const baseUrl = getBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
