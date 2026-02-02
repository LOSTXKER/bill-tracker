-- Add delivery preferences fields to Contact table
ALTER TABLE "Contact" ADD COLUMN "preferredDeliveryMethod" TEXT;
ALTER TABLE "Contact" ADD COLUMN "deliveryEmail" TEXT;
ALTER TABLE "Contact" ADD COLUMN "deliveryNotes" TEXT;
