/**
 * LINE Bot Types
 * Shared interfaces for LINE webhook events and messages
 */

// =============================================================================
// Webhook Event Types
// =============================================================================

export interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  timestamp: number;
  message?: {
    type: string;
    id: string;
    text?: string;
    contentProvider?: {
      type: string;
    };
  };
  mode?: string;
}

export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

// =============================================================================
// Message Types
// =============================================================================

export interface LineTextMessage {
  type: "text";
  text: string;
}

export interface LineImageMessage {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
}

export type LineMessage = LineTextMessage | LineImageMessage;

// =============================================================================
// Company Config Type
// =============================================================================

export interface LineCompanyConfig {
  id: string;
  name: string;
  lineChannelSecret: string;
  lineChannelAccessToken: string;
  lineGroupId?: string | null;
}

// =============================================================================
// Handler Context
// =============================================================================

export interface LineHandlerContext {
  event: LineWebhookEvent;
  company: LineCompanyConfig;
  channelAccessToken: string;
}
