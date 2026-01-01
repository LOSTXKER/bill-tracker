-- SlipSync Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'ceo' CHECK (role IN ('ceo', 'accounting', 'admin')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  file_type VARCHAR(10) DEFAULT 'image' CHECK (file_type IN ('image', 'pdf')),
  
  -- AI Extracted Data
  vendor_name VARCHAR(255),
  amount DECIMAL(15, 2),
  vat_amount DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  has_vat BOOLEAN DEFAULT FALSE,
  receipt_date DATE,
  category_id UUID REFERENCES expense_categories(id),
  ai_confidence DECIMAL(5, 2),
  ai_raw_response JSONB,
  
  -- User Edited Data
  user_vendor_name VARCHAR(255),
  user_amount DECIMAL(15, 2),
  user_receipt_date DATE,
  user_category_id UUID REFERENCES expense_categories(id),
  user_notes TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Period
  period_month INTEGER CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pre-Accounting Entries Table
CREATE TABLE IF NOT EXISTS pre_accounting_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  debit_account VARCHAR(50),
  credit_account VARCHAR(50),
  amount DECIMAL(15, 2) NOT NULL,
  vat_amount DECIMAL(15, 2),
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed')),
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_receipts_company_id ON receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_by ON receipts(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_period ON receipts(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_company_id ON expense_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_pre_accounting_company_id ON pre_accounting_entries(company_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_accounting_entries ENABLE ROW LEVEL SECURITY;

-- Companies Policies
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Profiles Policies
CREATE POLICY "Users can view profiles in their company" ON profiles
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Expense Categories Policies
CREATE POLICY "Users can view categories" ON expense_categories
  FOR SELECT USING (
    is_default = TRUE 
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Receipts Policies
CREATE POLICY "Users can view receipts in their company" ON receipts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert receipts" ON receipts
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can update receipts in their company" ON receipts
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Pre-Accounting Entries Policies
CREATE POLICY "Users can view entries in their company" ON pre_accounting_entries
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert entries" ON pre_accounting_entries
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update entries in their company" ON pre_accounting_entries
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_accounting_updated_at BEFORE UPDATE ON pre_accounting_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a new company if company_name is provided
  IF NEW.raw_user_meta_data->>'company_name' IS NOT NULL AND NEW.raw_user_meta_data->>'company_name' != '' THEN
    INSERT INTO companies (name)
    VALUES (NEW.raw_user_meta_data->>'company_name')
    RETURNING id INTO new_company_id;
  END IF;

  -- Create profile
  INSERT INTO profiles (id, email, full_name, company_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    new_company_id,
    'ceo'
  );
  
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default expense categories
INSERT INTO expense_categories (name, name_th, is_default) VALUES
  ('food', 'ค่าอาหาร', TRUE),
  ('transportation', 'ค่าเดินทาง', TRUE),
  ('office_supplies', 'อุปกรณ์สำนักงาน', TRUE),
  ('utilities', 'ค่าสาธารณูปโภค', TRUE),
  ('marketing', 'ค่าการตลาด', TRUE),
  ('entertainment', 'ค่ารับรอง', TRUE),
  ('equipment', 'อุปกรณ์/เครื่องมือ', TRUE),
  ('services', 'ค่าบริการ', TRUE),
  ('rent', 'ค่าเช่า', TRUE),
  ('other', 'อื่นๆ', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- ============================================

-- Create bucket for receipts
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Storage Policies (uncomment and run in Supabase Dashboard)
/*
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their company receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
*/
