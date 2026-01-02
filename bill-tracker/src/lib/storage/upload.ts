import imageCompression from "browser-image-compression";

export interface UploadOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

export async function compressImage(file: File, options?: UploadOptions): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    ...options,
  };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}

export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = originalName.split(".").pop();
  return `${timestamp}-${random}.${extension}`;
}

export function validateImageFile(file: File): boolean {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    throw new Error("ไฟล์ต้องเป็นรูปภาพเท่านั้น (JPEG, PNG, WebP)");
  }

  if (file.size > maxSize) {
    throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 5MB");
  }

  return true;
}

export async function uploadFile(
  file: File,
  folder: string = "receipts"
): Promise<{ url: string; filename: string }> {
  try {
    // Validate file
    validateImageFile(file);

    // Compress image
    const compressedFile = await compressImage(file);

    // Generate unique filename
    const filename = generateUniqueFilename(file.name);

    // Create form data
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("folder", folder);
    formData.append("filename", filename);

    // Upload to server
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "การอัพโหลดล้มเหลว");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

export async function deleteFile(url: string): Promise<void> {
  try {
    const response = await fetch("/api/upload", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error("การลบไฟล์ล้มเหลว");
    }
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
}
