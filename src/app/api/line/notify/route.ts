import { NextRequest, NextResponse } from 'next/server';
import { sendReceiptNotification } from '@/lib/line';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      groupId, 
      vendor_name, 
      total_amount, 
      category, 
      uploaded_by, 
      receipt_date,
      receipt_id 
    } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: 'No LINE group ID provided' },
        { status: 400 }
      );
    }

    // Get the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://account-ceo.vercel.app';

    await sendReceiptNotification(groupId, {
      vendor_name: vendor_name || 'ไม่ระบุ',
      total_amount: total_amount || 0,
      category: category || 'อื่นๆ',
      uploaded_by: uploaded_by || 'User',
      receipt_date: receipt_date || new Date().toISOString().split('T')[0],
      view_url: `${baseUrl}/dashboard/receipts`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LINE notify error:', error);
    return NextResponse.json(
      { error: 'Failed to send LINE notification' },
      { status: 500 }
    );
  }
}
