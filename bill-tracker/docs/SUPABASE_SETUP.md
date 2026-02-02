# Supabase Storage Setup Guide

## ปัญหา: Vercel ไม่สามารถอัปโหลดไฟล์ได้

เนื่องจาก Vercel เป็น **Serverless Platform** ที่ไม่มี file system แบบถาวร การเขียนไฟล์ลง `/public/uploads` จะไม่ทำงานใน production

## วิธีแก้: ใช้ Supabase Storage

### 1. สร้าง Supabase Project

1. ไปที่ https://supabase.com
2. สร้าง project ใหม่ (ฟรี)
3. จดบันทึก:
   - `Project URL`
   - `anon public` API key

### 2. สร้าง Storage Bucket

1. ไปที่ **Storage** ในเมนูด้านซ้าย
2. คลิก **New bucket**
3. ตั้งชื่อ: `bill-tracker`
4. เลือก **Public bucket** (เพื่อให้เข้าถึงรูปได้)
5. คลิก **Create bucket**

### 3. ตั้งค่า Policies (สำคัญ!)

ไปที่ **Storage > Policies** และสร้าง policies ดังนี้:

#### Policy 1: Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bill-tracker');
```

#### Policy 2: Allow public read access
```sql
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bill-tracker');
```

#### Policy 3: Allow authenticated users to delete their files
```sql
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bill-tracker');
```

### 4. เพิ่ม Environment Variables

เพิ่มใน `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. เพิ่มใน Vercel Environment Variables

1. ไปที่ Vercel Dashboard > Project Settings > Environment Variables
2. เพิ่ม:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy ใหม่

### 6. ทดสอบ

1. Deploy ไปยัง Vercel
2. ลองอัปโหลดรูปภาพ
3. ตรวจสอบใน Supabase Storage ว่ามีไฟล์หรือไม่

## โครงสร้างไฟล์ที่อัปโหลด

```
bill-tracker/
├── receipts/
│   ├── 1234567890-abc123.jpg
│   └── 1234567891-def456.png
├── invoices/
└── wht-certs/
```

## ข้อดีของ Supabase Storage

✅ ทำงานบน Vercel ได้
✅ มี CDN ในตัว (เร็ว)
✅ มี Free tier 1GB
✅ รองรับ Image Transformation
✅ Automatic backups
✅ มี API สำหรับจัดการไฟล์

## Pricing

- **Free tier**: 1GB storage, 2GB bandwidth/month
- **Pro**: $25/month (100GB storage, 200GB bandwidth)

สำหรับ Bill Tracker ขนาดเล็ก Free tier น่าจะเพียงพอครับ!
