-- Add isForeign flag to Contact for marking foreign vendors / customers.
-- Used to identify ค่าใช้จ่ายต่างประเทศ (e.g. ภ.พ.36 reconcile, foreign currency).
ALTER TABLE "Contact" ADD COLUMN "isForeign" BOOLEAN NOT NULL DEFAULT false;
