import { Client, TextMessage, FlexMessage } from '@line/bot-sdk';

// LINE Bot Configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

// Create LINE client
export const lineClient = new Client(config);

// Send text message
export async function sendTextMessage(to: string, text: string) {
  const message: TextMessage = {
    type: 'text',
    text,
  };
  
  return lineClient.pushMessage(to, message);
}

// Send receipt notification to group
export async function sendReceiptNotification(
  groupId: string,
  receipt: {
    vendor_name: string;
    total_amount: number;
    category: string;
    uploaded_by: string;
    receipt_date: string;
    view_url: string;
  }
) {
  const message: FlexMessage = {
    type: 'flex',
    altText: `สลิปใหม่: ${receipt.vendor_name} ฿${receipt.total_amount.toLocaleString()}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '🧾 สลิปใหม่',
                size: 'lg',
                weight: 'bold',
                color: '#10B981',
              },
            ],
          },
        ],
        backgroundColor: '#0F172A',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: receipt.vendor_name,
            size: 'xl',
            weight: 'bold',
            color: '#FFFFFF',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'จำนวนเงิน',
                    size: 'sm',
                    color: '#94A3B8',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: `฿${receipt.total_amount.toLocaleString()}`,
                    size: 'sm',
                    color: '#10B981',
                    weight: 'bold',
                    align: 'end',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'หมวดหมู่',
                    size: 'sm',
                    color: '#94A3B8',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: receipt.category,
                    size: 'sm',
                    color: '#FFFFFF',
                    align: 'end',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'วันที่',
                    size: 'sm',
                    color: '#94A3B8',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: receipt.receipt_date,
                    size: 'sm',
                    color: '#FFFFFF',
                    align: 'end',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'อัปโหลดโดย',
                    size: 'sm',
                    color: '#94A3B8',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: receipt.uploaded_by,
                    size: 'sm',
                    color: '#FFFFFF',
                    align: 'end',
                  },
                ],
              },
            ],
          },
        ],
        backgroundColor: '#1E293B',
        paddingAll: '15px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียด',
              uri: receipt.view_url,
            },
            style: 'primary',
            color: '#10B981',
          },
        ],
        backgroundColor: '#1E293B',
        paddingAll: '15px',
      },
    },
  };

  return lineClient.pushMessage(groupId, message);
}

// Send welcome message when bot joins group
export async function sendWelcomeMessage(groupId: string) {
  // Send plain text first (easy to copy)
  const textMessage: TextMessage = {
    type: 'text',
    text: `🎉 ยินดีต้อนรับสู่ SlipSync!\n\n🔑 Group ID ของคุณคือ:\n${groupId}\n\n📋 คัดลอก Group ID ด้านบนไปวางในหน้าตั้งค่า SlipSync\n\n💡 พิมพ์ !groupid เพื่อดู Group ID อีกครั้ง`,
  };

  return lineClient.pushMessage(groupId, textMessage);
}

// Send group ID message
export async function sendGroupIdMessage(groupId: string, replyToken: string) {
  const textMessage: TextMessage = {
    type: 'text',
    text: `🔑 Group ID\n\n${groupId}\n\nคัดลอก ID นี้ไปวางในหน้าตั้งค่า SlipSync`,
  };

  return lineClient.replyMessage(replyToken, textMessage);
}
