# SlipSync LINE Bot Integration

## Bot Information
- Bot ID: `@175ebpyn`
- Add Friend URL: https://line.me/R/ti/p/@175ebpyn

## Webhook URL (for LINE Developers Console)
```
https://account-ceo.vercel.app/api/line/webhook
```

## Environment Variables Required
```env
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
LINE_CHANNEL_SECRET=your-channel-secret
```

## User Instructions

### วิธีเชื่อมต่อ LINE Group

1. **เพิ่ม Bot เป็นเพื่อน**
   - สแกน QR Code หรือค้นหา `@175ebpyn`
   - หรือเปิดลิงก์: https://line.me/R/ti/p/@175ebpyn

2. **เชิญ Bot เข้า Group**
   - สร้าง LINE Group (หรือใช้ที่มีอยู่)
   - เชิญ Bot `@175ebpyn` เข้า Group
   - Bot จะส่ง Welcome Message พร้อม Group ID อัตโนมัติ

3. **ดู Group ID**
   - พิมพ์ `!groupid` ใน Group
   - Bot จะตอบกลับพร้อม Group ID

4. **ตั้งค่าในเว็บ**
   - ไปที่ ตั้งค่า → LINE
   - วาง Group ID
   - เปิด "เปิดการแจ้งเตือน"
   - บันทึก

## Bot Commands
- `!groupid` - แสดง Group ID
- `!group` - แสดง Group ID
- `groupid` - แสดง Group ID

## Features
- ✅ Auto send Group ID when bot joins group
- ✅ Reply with Group ID on command
- ✅ Send receipt notification to group
- ✅ Beautiful Flex Message format
