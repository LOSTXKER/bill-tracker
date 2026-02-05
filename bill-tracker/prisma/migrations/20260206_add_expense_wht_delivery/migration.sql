-- Add WHT delivery method fields to Expense
-- วิธีส่งใบหัก ณ ที่จ่าย (Override จาก Contact)
ALTER TABLE "Expense" ADD COLUMN "whtDeliveryMethod" TEXT;
ALTER TABLE "Expense" ADD COLUMN "whtDeliveryEmail" TEXT;
ALTER TABLE "Expense" ADD COLUMN "whtDeliveryNotes" TEXT;
