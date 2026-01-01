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
  const message: FlexMessage = {
    type: 'flex',
    altText: 'ยินดีต้อนรับสู่ SlipSync!',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🧾 SlipSync',
            size: 'xl',
            weight: 'bold',
            color: '#10B981',
          },
          {
            type: 'text',
            text: 'ระบบจัดการสลิปอัจฉริยะ',
            size: 'sm',
            color: '#94A3B8',
            margin: 'sm',
          },
        ],
        backgroundColor: '#0F172A',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'Group ID ของคุณคือ:',
            size: 'sm',
            color: '#94A3B8',
          },
          {
            type: 'text',
            text: groupId,
            size: 'md',
            weight: 'bold',
            color: '#10B981',
            margin: 'sm',
            wrap: true,
          },
          {
            type: 'separator',
            margin: 'xl',
          },
          {
            type: 'text',
            text: '📋 วิธีใช้งาน',
            size: 'md',
            weight: 'bold',
            color: '#FFFFFF',
            margin: 'xl',
          },
          {
            type: 'text',
            text: '1. คัดลอก Group ID ด้านบน',
            size: 'sm',
            color: '#CBD5E1',
            margin: 'md',
            wrap: true,
          },
          {
            type: 'text',
            text: '2. ไปที่ SlipSync > ตั้งค่า > Line',
            size: 'sm',
            color: '#CBD5E1',
            margin: 'sm',
            wrap: true,
          },
          {
            type: 'text',
            text: '3. วาง Group ID แล้วบันทึก',
            size: 'sm',
            color: '#CBD5E1',
            margin: 'sm',
            wrap: true,
          },
          {
            type: 'separator',
            margin: 'xl',
          },
          {
            type: 'text',
            text: '💡 พิมพ์ !groupid เพื่อดู Group ID อีกครั้ง',
            size: 'xs',
            color: '#64748B',
            margin: 'xl',
            wrap: true,
          },
        ],
        backgroundColor: '#1E293B',
        paddingAll: '20px',
      },
    },
  };

  return lineClient.pushMessage(groupId, message);
}

// Send group ID message
export async function sendGroupIdMessage(groupId: string, replyToken: string) {
  const message: FlexMessage = {
    type: 'flex',
    altText: `Group ID: ${groupId}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🔑 Group ID',
            size: 'md',
            weight: 'bold',
            color: '#10B981',
          },
          {
            type: 'text',
            text: groupId,
            size: 'sm',
            color: '#FFFFFF',
            margin: 'md',
            wrap: true,
          },
          {
            type: 'text',
            text: 'คัดลอก ID นี้ไปวางในหน้าตั้งค่า SlipSync',
            size: 'xs',
            color: '#64748B',
            margin: 'lg',
            wrap: true,
          },
        ],
        backgroundColor: '#1E293B',
        paddingAll: '20px',
      },
    },
  };

  return lineClient.replyMessage(replyToken, message);
}
