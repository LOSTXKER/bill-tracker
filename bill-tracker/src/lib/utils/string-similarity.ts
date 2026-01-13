/**
 * String Similarity Utilities
 * General-purpose string matching functions for fuzzy matching
 */

/**
 * Tokenize a name into words for comparison
 */
export function tokenizeName(name: string): string[] {
  return name.split(/\s+/).filter(token => token.length > 1);
}

/**
 * Calculate Levenshtein-based string similarity
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 || len2 === 0) return 0;

  // Levenshtein distance using dynamic programming
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);

  return 1 - distance / maxLen;
}

/**
 * Calculate token-based similarity (good for partial matches and reordered words)
 * Returns a value between 0 and 1
 */
export function calculateTokenSimilarity(str1: string, str2: string): number {
  const tokens1 = tokenizeName(str1);
  const tokens2 = tokenizeName(str2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  let matchedTokens = 0;

  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      // Check for exact match or high similarity
      if (t1 === t2 || (t1.length > 3 && t2.length > 3 && calculateLevenshteinSimilarity(t1, t2) > 0.8)) {
        matchedTokens++;
        break;
      }
    }
  }

  // Score based on proportion of matched tokens
  const minTokens = Math.min(tokens1.length, tokens2.length);
  return matchedTokens / minTokens;
}

/**
 * Calculate string similarity using multiple methods
 * Returns the highest score from: exact, contains, token, and Levenshtein
 * 
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 || len2 === 0) return 0;

  // Method 1: Contains check (one is substring of other)
  if (str1.includes(str2) || str2.includes(str1)) {
    const minLen = Math.min(len1, len2);
    const maxLen = Math.max(len1, len2);
    // Score based on how much overlap there is
    return 0.8 + (0.2 * minLen / maxLen);
  }

  // Method 2: Token-based similarity (good for reordered words)
  const tokenSim = calculateTokenSimilarity(str1, str2);

  // Method 3: Levenshtein similarity
  const levenSim = calculateLevenshteinSimilarity(str1, str2);

  // Return the higher score
  return Math.max(tokenSim, levenSim);
}
