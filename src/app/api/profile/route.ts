import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// GET profile
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      include: { company: true },
    });

    return NextResponse.json({ success: true, profile, email: user.email });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PUT update profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, company, lineSettings } = body;

    // Update profile
    await prisma.profile.update({
      where: { id: user.id },
      data: {
        fullName: fullName,
      },
    });

    // Get or create company
    const existingProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { companyId: true },
    });

    if (existingProfile?.companyId) {
      // Update company
      await prisma.company.update({
        where: { id: existingProfile.companyId },
        data: {
          name: company.name,
          taxId: company.taxId,
          address: company.address,
          lineGroupId: lineSettings?.groupId,
          lineNotifications: lineSettings?.notificationsEnabled,
        },
      });
    } else if (company.name) {
      // Create company and link to profile
      const newCompany = await prisma.company.create({
        data: {
          name: company.name,
          taxId: company.taxId,
          address: company.address,
          lineGroupId: lineSettings?.groupId,
          lineNotifications: lineSettings?.notificationsEnabled,
        },
      });

      await prisma.profile.update({
        where: { id: user.id },
        data: { companyId: newCompany.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
