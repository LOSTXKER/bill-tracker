/**
 * Google Gemini API Client
 * Wrapper for Gemini AI models with error handling and retry logic
 */

import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from "@google/generative-ai";

// Initialize Gemini AI client
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Get text generation model (Gemini Pro)
 */
export function getTextModel(modelName: string = "gemini-2.0-flash-exp"): GenerativeModel {
  const client = getGeminiClient();
  return client.getGenerativeModel({ model: modelName });
}

/**
 * Get vision model (Gemini Pro Vision)
 */
export function getVisionModel(modelName: string = "gemini-2.0-flash-exp"): GenerativeModel {
  const client = getGeminiClient();
  return client.getGenerativeModel({ model: modelName });
}

/**
 * Token usage tracking
 */
interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GeminiResponse<T = string> {
  data: T;
  usage?: TokenUsage;
  error?: string;
}

/**
 * Retry configuration
 */
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate text with retry logic
 */
export async function generateText(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    retries?: number;
  }
): Promise<GeminiResponse<string>> {
  const maxRetries = options?.retries ?? MAX_RETRIES;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const model = getTextModel();
      
      const generationConfig = {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
      };

      const result: GenerateContentResult = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      // Extract token usage if available
      const usage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      return {
        data: text,
        usage,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`Gemini API attempt ${attempt + 1} failed:`, error);

      // Don't retry on certain errors
      if (error instanceof Error) {
        if (
          error.message.includes("API key") ||
          error.message.includes("quota") ||
          error.message.includes("permission")
        ) {
          return {
            data: "",
            error: error.message,
          };
        }
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  return {
    data: "",
    error: lastError?.message || "Failed to generate text after retries",
  };
}

/**
 * Fetch image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  
  // Detect mime type from Content-Type header or URL
  let mimeType = response.headers.get("content-type") || "image/jpeg";
  
  // Clean up mime type (remove charset etc)
  mimeType = mimeType.split(";")[0].trim();
  
  // If blob or unknown, try to detect from URL
  if (mimeType === "application/octet-stream" || mimeType.includes("blob")) {
    const ext = url.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      pdf: "application/pdf",
    };
    mimeType = mimeMap[ext || ""] || "image/jpeg";
  }
  
  return { data: base64, mimeType };
}

/**
 * Check if string is a URL
 */
function isUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}

/**
 * Analyze image with text prompt (Vision)
 */
export async function analyzeImage(
  imageData: string | Buffer,
  prompt: string,
  options?: {
    mimeType?: string;
    temperature?: number;
    maxTokens?: number;
    retries?: number;
  }
): Promise<GeminiResponse<string>> {
  const maxRetries = options?.retries ?? MAX_RETRIES;
  let lastError: Error | null = null;

  // Prepare image data (fetch from URL if needed)
  let imageBase64: string;
  let imageMimeType: string = options?.mimeType || "image/jpeg";
  
  try {
    if (Buffer.isBuffer(imageData)) {
      imageBase64 = imageData.toString("base64");
    } else if (typeof imageData === "string") {
      if (isUrl(imageData)) {
        // Fetch image from URL
        const fetched = await fetchImageAsBase64(imageData);
        imageBase64 = fetched.data;
        imageMimeType = options?.mimeType || fetched.mimeType;
      } else if (imageData.startsWith("data:")) {
        // Data URL - extract base64 part
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          imageMimeType = options?.mimeType || matches[1];
          imageBase64 = matches[2];
        } else {
          throw new Error("Invalid data URL format");
        }
      } else {
        // Assume it's already base64
        imageBase64 = imageData;
      }
    } else {
      throw new Error("Invalid image data type");
    }
  } catch (error) {
    console.error("Failed to prepare image data:", error);
    return {
      data: "",
      error: error instanceof Error ? error.message : "Failed to prepare image data",
    };
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const model = getVisionModel();

      const generationConfig = {
        temperature: options?.temperature ?? 0.4,
        maxOutputTokens: options?.maxTokens ?? 2048,
      };

      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: imageMimeType,
        },
      };

      const result: GenerateContentResult = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, imagePart],
          },
        ],
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      // Extract token usage if available
      const usage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      return {
        data: text,
        usage,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`Gemini Vision API attempt ${attempt + 1} failed:`, error);

      // Don't retry on certain errors
      if (error instanceof Error) {
        if (
          error.message.includes("API key") ||
          error.message.includes("quota") ||
          error.message.includes("permission") ||
          error.message.includes("SAFETY")
        ) {
          return {
            data: "",
            error: error.message,
          };
        }
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  return {
    data: "",
    error: lastError?.message || "Failed to analyze image after retries",
  };
}

/**
 * Generate structured JSON output
 */
export async function generateJSON<T = any>(
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    retries?: number;
  }
): Promise<GeminiResponse<T>> {
  const response = await generateText(
    `${prompt}\n\nRespond ONLY with valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Just the raw JSON object.`,
    options
  );

  if (response.error) {
    return {
      data: {} as T,
      error: response.error,
    };
  }

  try {
    // Try to extract JSON from response (in case it's wrapped in markdown)
    let jsonText = response.data.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }

    const data = JSON.parse(jsonText);

    return {
      data,
      usage: response.usage,
    };
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Raw response:", response.data);
    return {
      data: {} as T,
      error: "Failed to parse JSON response from AI",
    };
  }
}

/**
 * Chat with context (multi-turn conversation)
 */
export async function chat(
  messages: Array<{ role: "user" | "model"; content: string }>,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<GeminiResponse<string>> {
  try {
    const model = getTextModel();

    const generationConfig = {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 2048,
    };

    // Convert messages to Gemini format
    const contents = messages.map((msg: typeof messages[number]) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    }));

    const result: GenerateContentResult = await model.generateContent({
      contents,
      generationConfig,
    });

    const response = result.response;
    const text = response.text();

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    return {
      data: text,
      usage,
    };
  } catch (error) {
    console.error("Gemini chat error:", error);
    return {
      data: "",
      error: error instanceof Error ? error.message : "Failed to chat with AI",
    };
  }
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_GEMINI_API_KEY;
}

/**
 * Test Gemini connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  if (!isGeminiConfigured()) {
    return {
      success: false,
      message: "GOOGLE_GEMINI_API_KEY is not configured",
    };
  }

  try {
    const response = await generateText("Say 'Hello' in Thai", {
      maxTokens: 50,
      retries: 1,
    });

    if (response.error) {
      return {
        success: false,
        message: response.error,
      };
    }

    return {
      success: true,
      message: "Gemini API is working correctly",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
