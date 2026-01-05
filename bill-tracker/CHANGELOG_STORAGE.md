# 📦 Storage Migration: Local → Supabase

## 🎯 เหตุผลในการเปลี่ยนแปลง

### ปัญหาเดิม
```
POST /api/upload 500 (Internal Server Error)
Error: การอัพโหลดล้มเหลว
```

**สาเหตุ**: Vercel เป็น **Serverless Platform** ที่:
- ❌ ไม่มี persistent file system
- ❌ ไฟล์ที่เขียนลง `/public/uploads` จะหายหลัง request จบ
- ❌ ไม่สามารถใช้ `fs.writeFile()` ได้ใน production

### วิธีแก้
✅ ใช้ **Supabase Storage** (Cloud Storage with CDN)

---

## 📝 สิ่งที่เปลี่ยนแปลง

### 1. ไฟล์ใหม่ที่สร้าง

```
bill-tracker/
├── src/
│   └── lib/
│       └── storage/
│           └── supabase.ts          # ✨ NEW: Supabase Storage client
├── scripts/
│   ├── test-supabase-upload.ts     # ✨ NEW: ทดสอบการเชื่อมต่อ
│   └── migrate-to-supabase.ts      # ✨ NEW: Migrate ไฟล์เก่า
├── SUPABASE_SETUP.md               # ✨ NEW: คู่มือตั้งค่า Supabase
├── DEPLOYMENT_GUIDE.md             # ✨ NEW: คู่มือ Deploy
└── CHANGELOG_STORAGE.md            # ✨ NEW: เอกสารนี้
```

### 2. ไฟล์ที่แก้ไข

#### `src/app/api/upload/route.ts`
```diff
- import { writeFile, mkdir } from "fs/promises";
- import { join } from "path";
+ import { uploadToSupabase } from "@/lib/storage/supabase";

  export async function POST(request: Request) {
-   // Save to local file system
-   await writeFile(filepath, buffer);
-   const url = `/uploads/${folder}/${filename}`;
    
+   // Upload to Supabase Storage
+   const { url, path } = await uploadToSupabase(file, folder);
    
    return NextResponse.json({ url });
  }
```

#### `package.json`
```diff
  "dependencies": {
+   "@supabase/supabase-js": "^2.x.x"
  },
  "scripts": {
+   "storage:test": "tsx scripts/test-supabase-upload.ts",
+   "storage:migrate": "tsx scripts/migrate-to-supabase.ts"
  }
```

#### `env.example.txt`
```diff
+ # Supabase Storage (for file uploads)
+ NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
+ NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

---

## 🚀 วิธีใช้งาน

### สำหรับ Development (Local)

1. **ตั้งค่า Supabase** (ครั้งเดียว)
   ```bash
   # อ่านคู่มือที่ SUPABASE_SETUP.md
   ```

2. **เพิ่ม Environment Variables** ใน `.env.local`
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   ```

3. **ทดสอบการเชื่อมต่อ**
   ```bash
   npm run storage:test
   ```

4. **Migrate ไฟล์เก่า** (ถ้ามี)
   ```bash
   npm run storage:migrate
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

### สำหรับ Production (Vercel)

1. **เพิ่ม Environment Variables** ใน Vercel Dashboard
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Deploy**
   ```bash
   git push origin main
   ```

3. **ทดสอบ**
   - เข้า https://your-app.vercel.app
   - ลองอัปโหลดรูป
   - ตรวจสอบใน Supabase Dashboard > Storage

---

## 📊 เปรียบเทียบ

| Feature | Local Storage | Supabase Storage |
|---------|---------------|------------------|
| ทำงานบน Vercel | ❌ | ✅ |
| CDN | ❌ | ✅ |
| Backup | ❌ | ✅ |
| Scalable | ❌ | ✅ |
| Free Tier | - | 1GB |
| Setup | ง่าย | ต้องตั้งค่า |

---

## 🧪 การทดสอบ

### ทดสอบ Local
```bash
npm run storage:test
```

**Output ที่คาดหวัง**:
```
✅ Found 1 buckets
  - bill-tracker (public)
✅ Bucket 'bill-tracker' exists
✅ Uploaded: test/test-xxx.txt
✅ Public URL: https://xxx.supabase.co/...
✅ Deleted: test/test-xxx.txt
✨ All tests passed!
```

### ทดสอบ Production
1. Deploy ไปยัง Vercel
2. เข้าหน้าบันทึกรายจ่าย/รายรับ
3. อัปโหลดรูป
4. ตรวจสอบ Console (ไม่ควรมี error)
5. ตรวจสอบใน Supabase Storage

---

## 🔧 Troubleshooting

### ❌ Error: Missing Supabase environment variables

**วิธีแก้**:
```bash
# เพิ่มใน .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### ❌ Error: Bucket 'bill-tracker' not found

**วิธีแก้**:
1. ไปที่ Supabase Dashboard > Storage
2. สร้าง bucket ชื่อ `bill-tracker`
3. เลือก **Public bucket**

### ❌ Error: new row violates row-level security policy

**วิธีแก้**:
1. ไปที่ Supabase Dashboard > Storage > Policies
2. สร้าง policies ตามที่ระบุใน `SUPABASE_SETUP.md`

### ❌ Error: 413 Payload Too Large

**วิธีแก้**:
- ไฟล์ใหญ่เกิน 5MB
- ระบบจะ compress อัตโนมัติ แต่ถ้ายังใหญ่เกินให้ลดขนาดก่อน

---

## 💰 ค่าใช้จ่าย

### Supabase Free Tier
- ✅ 1GB Storage
- ✅ 2GB Bandwidth/month
- ✅ 2 Projects
- ✅ Unlimited API requests

**เพียงพอสำหรับ**:
- ~200-500 รูป/เดือน (ถ้ารูปละ 2MB)
- Startup ขนาดเล็ก
- Development/Testing

**ถ้าเกิน**: อัพเกรดเป็น Pro ($25/month)

---

## 📚 เอกสารเพิ่มเติม

- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) - คู่มือตั้งค่า Supabase
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - คู่มือ Deploy ไปยัง Vercel
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)

---

## ✅ Checklist

### Development
- [ ] ติดตั้ง `@supabase/supabase-js`
- [ ] สร้าง Supabase Project
- [ ] สร้าง Storage Bucket `bill-tracker`
- [ ] ตั้งค่า Storage Policies
- [ ] เพิ่ม Environment Variables ใน `.env.local`
- [ ] Run `npm run storage:test`
- [ ] ทดสอบอัปโหลดรูป

### Production
- [ ] เพิ่ม Environment Variables ใน Vercel
- [ ] Deploy ไปยัง Vercel
- [ ] ทดสอบอัปโหลดรูปบน Production
- [ ] ตรวจสอบไฟล์ใน Supabase Storage
- [ ] Monitor usage ใน Supabase Dashboard

---

**Updated**: 2025-01-06  
**Version**: 1.0.0  
**Status**: ✅ Ready for Production
