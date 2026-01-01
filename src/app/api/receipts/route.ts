import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// POST - Create new receipt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      company_id,
      image_url,
      file_type,
      vendor_name,
      amount,
      vat_amount,
      total_amount,
      has_vat,
      receipt_date,
      ai_confidence,
      suggested_category,
    } = body;

    // Create company if not provided
    let finalCompanyId = company_id;
    if (!finalCompanyId) {
      const newCompany = await prisma.company.create({
        data: {
          name: 'บริษัทของฉัน',
        },
      });
      finalCompanyId = newCompany.id;

      // Update user's company_id
      await prisma.profile.update({
        where: { id: user_id },
        data: { companyId: finalCompanyId },
      });
    }

    // Create receipt
    const receipt = await prisma.receipt.create({
      data: {
        companyId: finalCompanyId,
        uploadedBy: user_id,
        imageUrl: image_url,
        fileType: file_type || 'image',
        vendorName: vendor_name,
        amount: amount ? parseFloat(amount) : null,
        vatAmount: vat_amount ? parseFloat(vat_amount) : null,
        totalAmount: total_amount ? parseFloat(total_amount) : null,
        hasVat: has_vat || false,
        receiptDate: receipt_date ? new Date(receipt_date) : null,
        aiConfidence: ai_confidence ? parseFloat(ai_confidence) : null,
        status: 'pending',
        periodMonth: new Date().getMonth() + 1,
        periodYear: new Date().getFullYear(),
      },
    });

    return NextResponse.json({ success: true, data: receipt });
  } catch (error) {
    console.error('Create receipt error:', error);
    return NextResponse.json(
      { error: 'Failed to create receipt', details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Get receipts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;

    const receipts = await prisma.receipt.findMany({
      where: {
        companyId: companyId || undefined,
        periodMonth: month ? parseInt(month) : undefined,
        periodYear: year ? parseInt(year) : undefined,
        status: status || undefined,
      },
      include: {
        category: true,
        uploader: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: receipts });
  } catch (error) {
    console.error('Get receipts error:', error);
    return NextResponse.json(
      { error: 'Failed to get receipts' },
      { status: 500 }
    );
  }
}
