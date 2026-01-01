# SlipSync Deployment Guide

## 🚀 Deploy to Vercel

### ขั้นตอนที่ 1: เชื่อมต่อ GitHub กับ Vercel

1. ไปที่ [vercel.com](https://vercel.com)
2. Login ด้วย GitHub account
3. กด **Add New Project**
4. เลือก repository: `LOSTXKER/account-CEO`
5. กด **Import**

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

ใน Vercel Dashboard → Project Settings → Environment Variables

เพิ่มตัวแปรเหล่านี้:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Prisma Database
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# AI - Gemini
GEMINI_API_KEY=your-gemini-api-key

# LINE Integration
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
```

### ขั้นตอนที่ 3: Deploy

1. กด **Deploy**
2. รอประมาณ 1-2 นาที
3. ได้ URL เช่น: `https://account-ceo.vercel.app`

### ขั้นตอนที่ 4: ตั้งค่า LINE Webhook

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. เลือก Channel
3. Tab **Messaging API**
4. Webhook URL: `https://account-ceo.vercel.app/api/line/webhook`
5. กด **Verify** → ควรได้ Success ✅

### ขั้นตอนที่ 5: รัน Database Migration

หลัง deploy แล้ว ต้องรัน SQL ใน Supabase:

```sql
-- 1. Run schema (ถ้ายังไม่ได้รัน)
-- ใช้ supabase/schema.sql

-- 2. Add LINE columns
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS line_group_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS line_notifications BOOLEAN DEFAULT FALSE;

-- 3. Create storage bucket (ถ้ายังไม่ได้สร้าง)
-- ใช้ supabase/storage.sql
```

---

## ✅ เสร็จแล้ว!

เว็บของคุณพร้อมใช้งานที่: `https://account-ceo.vercel.app`

### 🔄 Update Code

```bash
git add .
git commit -m "your message"
git push
```

Vercel จะ deploy อัตโนมัติทุกครั้งที่ push! 🎉
