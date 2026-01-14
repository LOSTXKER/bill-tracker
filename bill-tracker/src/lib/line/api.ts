/**
 * LINE Bot API Helper Functions
 * Low-level functions for interacting with LINE Messaging API
 */

import crypto from "crypto";
import type { LineMessage } from "./types";

const LINE_API_URL = "https://api.line.me/v2/bot/message";
const LINE_CONTENT_URL = "https://api-data.line.me/v2/bot/message";

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verify LINE webhook signature
 */
export function verifySignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

// =============================================================================
// Message Sending
// =============================================================================

/**
 * Send reply message to LINE (must be called within 30 seconds of receiving event)
 */
export async function replyToLine(
  replyToken: string,
  messages: LineMessage[],
  channelAccessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`${LINE_API_URL}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("LINE reply error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to reply to LINE:", error);
    return false;
  }
}

/**
 * Push message to LINE (for after reply token expires)
 */
export async function pushMessageToLine(
  to: string,
  messages: LineMessage[],
  channelAccessToken: string
): Promise<boolean> {
  if (!to) return false;

  try {
    const response = await fetch(`${LINE_API_URL}/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("LINE push error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to push to LINE:", error);
    return false;
  }
}

// =============================================================================
// Content Download
// =============================================================================

/**
 * Download image content from LINE
 */
export async function downloadLineImage(
  messageId: string,
  channelAccessToken: string
): Promise<Buffer | null> {
  try {
    const response = await fetch(
      `${LINE_CONTENT_URL}/${messageId}/content`,
      {
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to download LINE image:", response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error downloading LINE image:", error);
    return null;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a simple text message
 */
export function createTextMessage(text: string): LineMessage {
  return { type: "text", text };
}

/**
 * Format currency for Thai Baht display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
