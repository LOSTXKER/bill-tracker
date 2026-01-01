-- Add LINE integration columns to companies table
-- Run this in Supabase SQL Editor

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS line_group_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS line_notifications BOOLEAN DEFAULT FALSE;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_companies_line_group_id ON companies(line_group_id) WHERE line_group_id IS NOT NULL;
