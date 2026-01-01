// Database Types for Supabase

export type UserRole = 'ceo' | 'accounting' | 'admin';
export type ReceiptStatus = 'pending' | 'approved' | 'rejected';

export interface Company {
  id: string;
  name: string;
  tax_id?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  name_th: string;
  description?: string;
  company_id?: string; // null = default category
  created_at: string;
}

export interface Receipt {
  id: string;
  company_id: string;
  uploaded_by: string;
  image_url: string;
  file_type: 'image' | 'pdf';
  
  // AI Extracted Data
  vendor_name?: string;
  amount?: number;
  vat_amount?: number;
  total_amount?: number;
  has_vat: boolean;
  receipt_date?: string;
  category_id?: string;
  ai_confidence?: number;
  ai_raw_response?: Record<string, unknown>;
  
  // User Edited Data
  user_vendor_name?: string;
  user_amount?: number;
  user_receipt_date?: string;
  user_category_id?: string;
  user_notes?: string;
  
  // Status
  status: ReceiptStatus;
  approved_by?: string;
  approved_at?: string;
  
  // Timestamps
  period_month: number; // 1-12
  period_year: number;
  created_at: string;
  updated_at: string;
}

export interface PreAccountingEntry {
  id: string;
  receipt_id: string;
  company_id: string;
  
  // Entry Details
  description: string;
  debit_account?: string;
  credit_account?: string;
  amount: number;
  vat_amount?: number;
  
  // Status
  status: 'pending' | 'processed';
  processed_by?: string;
  processed_at?: string;
  
  created_at: string;
  updated_at: string;
}

// Form Types
export interface ReceiptFormData {
  vendor_name: string;
  amount: number;
  receipt_date: string;
  category_id: string;
  notes?: string;
  has_vat: boolean;
  vat_amount?: number;
}

// API Response Types
export interface AIReceiptAnalysis {
  vendor_name: string;
  amount: number;
  vat_amount?: number;
  total_amount: number;
  has_vat: boolean;
  receipt_date: string;
  suggested_category: string;
  confidence: number;
  raw_text: string;
}

// Dashboard Stats
export interface DashboardStats {
  total_receipts: number;
  pending_receipts: number;
  approved_receipts: number;
  total_amount: number;
  vat_amount: number;
  by_category: {
    category_name: string;
    count: number;
    amount: number;
  }[];
}
