-- Add exchange rates field to Company table
ALTER TABLE "Company" ADD COLUMN "exchangeRates" JSONB NOT NULL DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN "Company"."exchangeRates" IS 'Currency exchange rates to THB, e.g. {"USD": 35.50, "AED": 9.65}';
