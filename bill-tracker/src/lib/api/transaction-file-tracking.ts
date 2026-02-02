/**
 * File Change Tracking for Transactions
 * Extracted from transaction-routes.ts for better modularity
 * Tracks which files were added, removed, or changed during transaction updates
 */

export interface FileChangeResult {
  addedFiles: string[];
  removedFiles: string[];
  changedFields: string[];
}

/**
 * Track file changes between old and new transaction data
 */
export function trackFileChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fileFields: string[]
): FileChangeResult {
  const addedFiles: string[] = [];
  const removedFiles: string[] = [];
  const changedFields: string[] = [];

  for (const field of fileFields) {
    const oldUrls = (oldData[field] as string[]) || [];
    const newUrls = (newData[field] as string[]) || [];

    // Find added files
    for (const url of newUrls) {
      if (!oldUrls.includes(url)) {
        addedFiles.push(url);
      }
    }

    // Find removed files
    for (const url of oldUrls) {
      if (!newUrls.includes(url)) {
        removedFiles.push(url);
      }
    }

    // Track if field changed
    if (JSON.stringify(oldUrls.sort()) !== JSON.stringify(newUrls.sort())) {
      changedFields.push(field);
    }
  }

  return { addedFiles, removedFiles, changedFields };
}
