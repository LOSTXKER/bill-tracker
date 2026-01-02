// File upload security utilities

// Allowed file types
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  ...ALLOWED_IMAGE_TYPES,
];

// Max file sizes
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Magic bytes for file type verification
const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file type by checking magic bytes
 */
export async function validateFileType(
  file: File,
  allowedTypes: string[]
): Promise<FileValidationResult> {
  // Check MIME type first
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `ไฟล์ประเภท ${file.type} ไม่รองรับ`,
    };
  }

  // Read first 8 bytes to check magic numbers
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check if file signature matches claimed type
  const signatures = FILE_SIGNATURES[file.type];
  if (signatures) {
    const isValid = signatures.some((sig) =>
      sig.every((byte, i) => bytes[i] === byte)
    );
    if (!isValid) {
      return {
        valid: false,
        error: "ไฟล์ไม่ตรงกับประเภทที่ระบุ",
      };
    }
  }

  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  maxSize: number
): FileValidationResult {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `ไฟล์มีขนาดเกิน ${maxSizeMB} MB`,
    };
  }
  return { valid: true };
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split(/[/\\]/).pop() || filename;
  
  // Remove special characters except dots, dashes, and underscores
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 255);

  // Ensure file has an extension
  if (!sanitized.includes(".")) {
    return `${sanitized}.file`;
  }

  return sanitized;
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(
  originalFilename: string,
  prefix?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = sanitizeFilename(originalFilename);
  const extension = sanitized.split(".").pop() || "file";
  const baseName = sanitized.replace(`.${extension}`, "").substring(0, 50);

  const parts = [prefix, baseName, `${timestamp}-${random}`]
    .filter(Boolean)
    .join("_");

  return `${parts}.${extension}`;
}

/**
 * Full validation for image uploads
 */
export async function validateImageUpload(file: File): Promise<FileValidationResult> {
  const sizeResult = validateFileSize(file, MAX_IMAGE_SIZE);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  const typeResult = await validateFileType(file, ALLOWED_IMAGE_TYPES);
  if (!typeResult.valid) {
    return typeResult;
  }

  return { valid: true };
}

/**
 * Full validation for document uploads
 */
export async function validateDocumentUpload(file: File): Promise<FileValidationResult> {
  const sizeResult = validateFileSize(file, MAX_DOCUMENT_SIZE);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  const typeResult = await validateFileType(file, ALLOWED_DOCUMENT_TYPES);
  if (!typeResult.valid) {
    return typeResult;
  }

  return { valid: true };
}

/**
 * Get storage path for different file types
 */
export function getStoragePath(
  companyCode: string,
  type: "slips" | "invoices" | "wht-certs" | "bills",
  filename: string
): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  return `${companyCode}/${type}/${year}/${month}/${filename}`;
}
