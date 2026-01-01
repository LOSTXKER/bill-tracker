-- ============================================
-- STORAGE BUCKET สำหรับเก็บรูปสลิป
-- รันใน Supabase SQL Editor
-- ============================================

-- 1. สร้าง Bucket ชื่อ receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts', 
  'receipts', 
  false,  -- private bucket
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: ให้ user ที่ login แล้วอัปโหลดได้
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- 3. Policy: ให้ user ดูไฟล์ของตัวเองได้
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Policy: ให้ user ลบไฟล์ของตัวเองได้
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Policy: ให้ user อัปเดตไฟล์ของตัวเองได้
CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
