/**
 * LINE Core Messaging
 * 
 * Low-level functions for sending messages via LINE Messaging API.
 */

import { createLogger } from "@/lib/utils/logger";
import type { LineMessage, SendMessageOptions } from "./line-types";
import { maskToken } from "./line-utils";

const log = createLogger("line-core");

const LINE_API_URL = "https://api.line.me/v2/bot/message";

// =============================================================================
// Core Messaging Functions
// =============================================================================

/**
 * Send message via LINE Messaging API (Push Message)
 */
export async function sendLineMessage({
  channelAccessToken,
  to,
  messages,
}: SendMessageOptions): Promise<boolean> {
  if (!channelAccessToken || !to) {
    log.warn("sendLineMessage: Missing channelAccessToken or target (to)");
    return false;
  }

  log.info(`Sending message to: ${maskToken(to)}`);

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
      log.error("LINE Messaging API error", error, { status: response.status });
      return false;
    }

    log.info("Message sent successfully!");
    return true;
  } catch (error) {
    log.error("LINE Messaging API failed", error);
    return false;
  }
}

/**
 * Send simple text message
 */
export async function sendTextMessage(
  channelAccessToken: string,
  to: string,
  text: string
): Promise<boolean> {
  return sendLineMessage({
    channelAccessToken,
    to,
    messages: [{ type: "text", text }],
  });
}

/**
 * Send reply message (for webhook responses)
 */
export async function sendReplyMessage(
  replyToken: string,
  messages: LineMessage[],
  channelAccessToken: string
): Promise<boolean> {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
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
      log.error("LINE reply error", error);
      return false;
    }

    return true;
  } catch (error) {
    log.error("Failed to send reply", error);
    return false;
  }
}

/**
 * Send multicast message to multiple users
 */
export async function sendMulticastMessage(
  channelAccessToken: string,
  to: string[],
  messages: LineMessage[]
): Promise<boolean> {
  if (!channelAccessToken || !to.length) {
    log.warn("sendMulticastMessage: Missing channelAccessToken or recipients");
    return false;
  }

  log.info(`Sending multicast to ${to.length} recipients`);

  try {
    const response = await fetch(`${LINE_API_URL}/multicast`, {
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
      log.error("LINE Multicast API error", error, { status: response.status });
      return false;
    }

    log.info("Multicast sent successfully!");
    return true;
  } catch (error) {
    log.error("LINE Multicast API failed", error);
    return false;
  }
}

/**
 * Send broadcast message to all followers
 */
export async function sendBroadcastMessage(
  channelAccessToken: string,
  messages: LineMessage[]
): Promise<boolean> {
  if (!channelAccessToken) {
    log.warn("sendBroadcastMessage: Missing channelAccessToken");
    return false;
  }

  log.info("Sending broadcast message");

  try {
    const response = await fetch(`${LINE_API_URL}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      log.error("LINE Broadcast API error", error, { status: response.status });
      return false;
    }

    log.info("Broadcast sent successfully!");
    return true;
  } catch (error) {
    log.error("LINE Broadcast API failed", error);
    return false;
  }
}
