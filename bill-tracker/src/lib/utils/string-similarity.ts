/**
 * String Similarity Utilities
 * General-purpose string matching functions for fuzzy matching
 */

/**
 * Thai name prefixes that should be stripped for comparison
 */
const THAI_NAME_PREFIXES = [
  // Personal titles
  "น.ส.", "นางสาว", "นาย", "นาง", "ด.ช.", "ด.ญ.", "เด็กชาย", "เด็กหญิง",
  "คุณ", "พระ", "หลวง", "ดร.", "ศ.", "รศ.", "ผศ.", "อ.", "นพ.", "พญ.", "ทพ.", "ทพญ.",
  "ร.ต.", "ร.ท.", "ร.อ.", "พ.ต.", "พ.ท.", "พ.อ.", "พล.ต.", "พล.ท.", "พล.อ.",
  // Company prefixes
  "บริษัท", "บจก.", "บมจ.", "หจก.", "ห้างหุ้นส่วนจำกัด", "ร้าน", "สำนักงาน",
  // English equivalents
  "mr.", "mrs.", "ms.", "miss", "dr.", "prof.",
  "co.,ltd.", "co., ltd.", "ltd.", "inc.", "corp.", "llc",
];

/**
 * Strip common Thai/English name prefixes and suffixes for comparison
 */
export function normalizeThaiName(name: string): string {
  if (!name) return "";
  
  let normalized = name.trim().toLowerCase();
  
  // Remove prefixes
  for (const prefix of THAI_NAME_PREFIXES) {
    const prefixLower = prefix.toLowerCase();
    if (normalized.startsWith(prefixLower)) {
      normalized = normalized.slice(prefixLower.length).trim();
    }
  }
  
  // Remove common suffixes
  const suffixes = ["จำกัด", "(มหาชน)", "มหาชน", "limited", "ltd", "inc", "corp"];
  for (const suffix of suffixes) {
    const suffixLower = suffix.toLowerCase();
    if (normalized.endsWith(suffixLower)) {
      normalized = normalized.slice(0, -suffixLower.length).trim();
    }
  }
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  return normalized;
}

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

/**
 * Calculate similarity between Thai names, ignoring common prefixes
 * Best for matching contact names where titles may differ
 * 
 * @param str1 First name to compare
 * @param str2 Second name to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateThaiNameSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  // Normalize both names (strip prefixes/suffixes)
  const normalized1 = normalizeThaiName(str1);
  const normalized2 = normalizeThaiName(str2);

  // If normalized names are identical, high confidence match
  if (normalized1 === normalized2) return 0.95;

  // Calculate similarity on normalized names
  return calculateStringSimilarity(normalized1, normalized2);
}

/**
 * Find the best matching contact from a list by name
 * Uses Thai name normalization for better matching
 * 
 * @param vendorName The name to search for
 * @param contacts List of contacts to search in
 * @param threshold Minimum similarity score to consider a match (default 0.8)
 * @returns Best matching contact or null
 */
export function findBestMatchingContact<T extends { id: string; name: string }>(
  vendorName: string,
  contacts: T[],
  threshold: number = 0.8
): T | null {
  if (!vendorName || contacts.length === 0) return null;

  let bestMatch: T | null = null;
  let bestScore = threshold;

  for (const contact of contacts) {
    const similarity = calculateThaiNameSimilarity(vendorName, contact.name);
    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = contact;
    }
  }

  return bestMatch;
}
