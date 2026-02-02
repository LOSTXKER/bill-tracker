# 🚀 Deployment Guide - Vercel

## ⚠️ ปัญหาที่พบบน Vercel

### 1. ❌ อัปโหลดรูปไม่ได้ (500 Internal Server Error)

**สาเหตุ**: Vercel เป็น **Serverless Platform** ที่ไม่มี file system แบบถาวร

- ไฟล์ที่เขียนลง `/public/uploads` จะหายหลัง request จบ
- ไม่สามารถใช้ `fs.writeFile()` ได้ใน production
- ต้องใช้ **External Storage** เช่น Supabase Storage, AWS S3, Cloudinary

**วิธีแก้**: ใช้ **Supabase Storage** (ฟรี 1GB)

👉 อ่านวิธีตั้งค่าที่ [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)

---

## 📋 Checklist ก่อน Deploy

### 1. ✅ Database (Supabase/Neon/Railway)

```bash
# ตั้งค่า DATABASE_URL ใน Vercel
DATABASE_URL="postgresql://..."
```

### 2. ✅ Supabase Storage

```bash
# เพิ่มใน Vercel Environment Variables
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx..."
```

### 3. ✅ Auth Secret

```bash
# Generate ด้วย
openssl rand -base64 32

# เพิ่มใน Vercel
AUTH_SECRET="xxx"
NEXTAUTH_URL="https://your-app.vercel.app"
```

### 4. ✅ Google Gemini AI (Optional)

```bash
GOOGLE_GEMINI_API_KEY="xxx"
```

---

## 🔧 ขั้นตอนการ Deploy

### 1. Push Code ไปยัง GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. เชื่อมต่อกับ Vercel

1. ไปที่ https://vercel.com
2. Import GitHub Repository
3. เลือก project `Bill Tracker`

### 3. ตั้งค่า Environment Variables

ใน Vercel Dashboard > Settings > Environment Variables:

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=xxx
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
GOOGLE_GEMINI_API_KEY=xxx
```

### 4. Deploy!

คลิก **Deploy** และรอสักครู่

---

## 🧪 ทดสอบหลัง Deploy

### ✅ ทดสอบการ Login
- [ ] สามารถ Login ได้
- [ ] สามารถ Register ได้

### ✅ ทดสอบการบันทึกรายการ
- [ ] บันทึกรายจ่ายได้
- [ ] บันทึกรายรับได้
- [ ] เลือกวันที่ได้

### ✅ ทดสอบการอัปโหลดรูป
- [ ] อัปโหลดสลิปได้
- [ ] อัปโหลดใบกำกับภาษีได้
- [ ] รูปแสดงผลได้
- [ ] เช็คใน Supabase Storage ว่ามีไฟล์

### ✅ ทดสอบ Dashboard
- [ ] แสดงสถิติได้
- [ ] แสดงกราฟได้
- [ ] แสดงรายการล่าสุดได้

---

## 🐛 Troubleshooting

### ปัญหา: อัปโหลดรูปไม่ได้

```
POST /api/upload 500 (Internal Server Error)
```

**วิธีแก้**:
1. ตรวจสอบว่าตั้งค่า Supabase Environment Variables แล้ว
2. ตรวจสอบว่าสร้าง bucket `bill-tracker` แล้ว
3. ตรวจสอบว่าตั้งค่า Storage Policies แล้ว
4. ดู Vercel Logs: `vercel logs`

### ปัญหา: Database connection error

```
Error: P1001: Can't reach database server
```

**วิธีแก้**:
1. ตรวจสอบ `DATABASE_URL` ใน Vercel
2. ตรวจสอบว่า Database ยังทำงานอยู่
3. ตรวจสอบ IP Whitelist (ถ้ามี)

### ปัญหา: Auth error

```
Error: [auth][error] MissingSecret
```

**วิธีแก้**:
1. ตั้งค่า `AUTH_SECRET` ใน Vercel
2. ตั้งค่า `NEXTAUTH_URL` เป็น production URL

---

## 📊 Monitoring

### Vercel Analytics
- ดู Performance metrics
- ดู Error logs
- ดู Function invocations

### Supabase Dashboard
- ดู Storage usage
- ดู Database queries
- ดู API requests

---

## 💰 Cost Estimation

### Free Tier (เพียงพอสำหรับ startup)

| Service | Free Tier | Limit |
|---------|-----------|-------|
| Vercel | ✅ | 100GB bandwidth/month |
| Supabase Database | ✅ | 500MB, 2 projects |
| Supabase Storage | ✅ | 1GB, 2GB bandwidth |
| Google Gemini | ✅ | 60 requests/minute |

**Total**: **$0/month** 🎉

---

## 🔐 Security Checklist

- [ ] ตั้งค่า AUTH_SECRET แบบ random
- [ ] ใช้ HTTPS เท่านั้น
- [ ] ตั้งค่า CORS ให้ถูกต้อง
- [ ] ไม่ commit `.env` ลง Git
- [ ] ตั้งค่า Rate Limiting
- [ ] Validate file uploads
- [ ] ตั้งค่า Supabase RLS (Row Level Security)

---

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)

---

**Happy Deploying! 🚀**
