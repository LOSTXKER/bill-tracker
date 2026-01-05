# 🚀 Quick Start: แก้ปัญหาอัปโหลดรูปไม่ได้บน Vercel

## ⚡ แก้ไขใน 5 นาที!

### 📋 สิ่งที่ต้องทำ

1. ✅ สร้าง Supabase Account (ฟรี)
2. ✅ สร้าง Storage Bucket
3. ✅ ตั้งค่า Environment Variables
4. ✅ Deploy ใหม่

---

## 🎯 Step-by-Step

### Step 1: สร้าง Supabase Project (2 นาที)

1. ไปที่ https://supabase.com
2. คลิก **Start your project** (ใช้ GitHub login)
3. คลิก **New Project**
4. กรอกข้อมูล:
   - **Name**: `bill-tracker`
   - **Database Password**: สร้าง password (จดไว้)
   - **Region**: `Southeast Asia (Singapore)`
5. คลิก **Create new project** (รอ 1-2 นาที)

### Step 2: สร้าง Storage Bucket (1 นาที)

1. ไปที่ **Storage** ในเมนูซ้าย
2. คลิก **New bucket**
3. กรอก:
   - **Name**: `bill-tracker`
   - **Public bucket**: ✅ เลือก
4. คลิก **Create bucket**

### Step 3: ตั้งค่า Policies (1 นาที)

1. คลิกที่ bucket `bill-tracker`
2. ไปที่ tab **Policies**
3. คลิก **New Policy** → **For full customization**
4. วาง SQL นี้:

```sql
-- Policy 1: Allow authenticated users to upload
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bill-tracker');

-- Policy 2: Allow public read
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bill-tracker');

-- Policy 3: Allow authenticated delete
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bill-tracker');
```

5. คลิก **Review** → **Save policy**

### Step 4: Copy API Keys (30 วินาที)

1. ไปที่ **Settings** → **API**
2. Copy 2 ค่านี้:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public**: `eyJxxx...`

### Step 5: ตั้งค่า Vercel (1 นาที)

1. ไปที่ Vercel Dashboard
2. เลือก project **Bill Tracker**
3. ไปที่ **Settings** → **Environment Variables**
4. เพิ่ม 2 ตัวนี้:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxx...
```

5. คลิก **Save**

### Step 6: Deploy ใหม่ (30 วินาที)

1. ไปที่ **Deployments**
2. คลิก **...** ที่ deployment ล่าสุด
3. คลิก **Redeploy**
4. รอสักครู่...

---

## ✅ ทดสอบ

1. เข้า https://your-app.vercel.app
2. Login
3. ไปหน้าบันทึกรายจ่าย
4. ลองอัปโหลดรูป
5. ✨ ควรอัปโหลดได้แล้ว!

---

## 🎉 เสร็จแล้ว!

ตอนนี้คุณสามารถ:
- ✅ อัปโหลดรูปบน Vercel ได้
- ✅ เก็บไฟล์บน Cloud (ไม่หาย)
- ✅ มี CDN ในตัว (โหลดเร็ว)
- ✅ ฟรี 1GB

---

## 🐛 ถ้ายังไม่ได้

### ตรวจสอบ Console

กด `F12` → ไปที่ tab **Console**

#### เห็น: `Missing Supabase environment variables`
➡️ ตรวจสอบว่าเพิ่ม Environment Variables ใน Vercel แล้ว

#### เห็น: `Bucket 'bill-tracker' not found`
➡️ ตรวจสอบว่าสร้าง bucket แล้ว และชื่อถูกต้อง

#### เห็น: `row-level security policy`
➡️ ตรวจสอบว่าตั้งค่า Policies แล้ว (Step 3)

#### เห็น: `Invalid JWT`
➡️ ตรวจสอบว่า copy API Key ถูกต้อง (ไม่มีช่องว่าง)

---

## 💡 Tips

### ดูไฟล์ที่อัปโหลด
1. ไปที่ Supabase Dashboard
2. **Storage** → `bill-tracker`
3. เห็นโฟลเดอร์ `receipts/`, `invoices/`, `wht-certs/`

### ดู Usage
1. ไปที่ **Settings** → **Usage**
2. เห็น Storage usage (ใช้ไปเท่าไหร่จาก 1GB)

### Backup
- Supabase มี automatic backup
- ไม่ต้องกังวลเรื่องไฟล์หาย

---

## 📞 ต้องการความช่วยเหลือ?

อ่านเอกสารเพิ่มเติม:
- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) - คู่มือละเอียด
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - คู่มือ Deploy
- [`CHANGELOG_STORAGE.md`](./CHANGELOG_STORAGE.md) - รายละเอียดการเปลี่ยนแปลง

---

**Happy Uploading! 📸**
