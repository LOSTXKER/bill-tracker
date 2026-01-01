import { NextRequest, NextResponse } from 'next/server';
import { 
  WebhookEvent, 
  validateSignature,
  MessageEvent,
  JoinEvent,
  TextEventMessage,
} from '@line/bot-sdk';
import { sendWelcomeMessage, sendGroupIdMessage } from '@/lib/line';

const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature validation
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';

    // Validate signature
    if (!validateSignature(body, channelSecret, signature)) {
      console.error('Invalid LINE signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const events: WebhookEvent[] = JSON.parse(body).events;

    // Process each event
    for (const event of events) {
      await handleEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LINE webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

async function handleEvent(event: WebhookEvent) {
  // Handle bot joining a group
  if (event.type === 'join') {
    const joinEvent = event as JoinEvent;
    if (joinEvent.source.type === 'group') {
      const groupId = joinEvent.source.groupId;
      console.log('Bot joined group:', groupId);
      await sendWelcomeMessage(groupId);
    }
    return;
  }

  // Handle messages
  if (event.type === 'message') {
    const messageEvent = event as MessageEvent;
    
    // Only process text messages
    if (messageEvent.message.type !== 'text') return;
    
    const textMessage = messageEvent.message as TextEventMessage;
    const text = textMessage.text.toLowerCase().trim();

    // Check for !groupid command
    if (text === '!groupid' || text === '!group' || text === 'groupid') {
      if (messageEvent.source.type === 'group') {
        const groupId = messageEvent.source.groupId;
        if (groupId) {
          await sendGroupIdMessage(groupId, messageEvent.replyToken);
        }
      } else if (messageEvent.source.type === 'room') {
        // Also support rooms
        const roomId = messageEvent.source.roomId;
        if (roomId) {
          await sendGroupIdMessage(roomId, messageEvent.replyToken);
        }
      }
    }
    
    return;
  }
}

// LINE requires GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'LINE Webhook is active' });
}
