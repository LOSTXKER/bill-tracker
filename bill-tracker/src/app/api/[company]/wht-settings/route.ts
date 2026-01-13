/**
 * WHT Settings API
 * จัดการการตั้งค่า WHT และ Reminder
 */

import { prisma } from "@/lib/db";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

// =============================================================================
// GET: ดึงการตั้งค่า WHT
// =============================================================================

export const GET = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const settings = await prisma.company.findUnique({
      where: { id: company.id },
      select: {
        whtDeadlineDay: true,
        whtReminderDays: true,
        docReminderDays: true,
        whtReminderEnabled: true,
        docReminderEnabled: true,
        lineNotifyEnabled: true,
      },
    });

    return apiResponse.success(settings);
  }
);

// =============================================================================
// PATCH: อัปเดตการตั้งค่า WHT
// =============================================================================

export const PATCH = withCompanyAccessFromParams(
  async (req, { session, company }) => {
    const body = await req.json();
    const {
      whtDeadlineDay,
      whtReminderDays,
      docReminderDays,
      whtReminderEnabled,
      docReminderEnabled,
    } = body;

    const updateData: any = {};

    if (whtDeadlineDay !== undefined) {
      if (whtDeadlineDay < 1 || whtDeadlineDay > 28) {
        return apiResponse.badRequest("whtDeadlineDay must be between 1 and 28");
      }
      updateData.whtDeadlineDay = whtDeadlineDay;
    }

    if (whtReminderDays !== undefined) {
      if (whtReminderDays < 1 || whtReminderDays > 14) {
        return apiResponse.badRequest("whtReminderDays must be between 1 and 14");
      }
      updateData.whtReminderDays = whtReminderDays;
    }

    if (docReminderDays !== undefined) {
      if (docReminderDays < 1 || docReminderDays > 30) {
        return apiResponse.badRequest("docReminderDays must be between 1 and 30");
      }
      updateData.docReminderDays = docReminderDays;
    }

    if (whtReminderEnabled !== undefined) {
      updateData.whtReminderEnabled = Boolean(whtReminderEnabled);
    }

    if (docReminderEnabled !== undefined) {
      updateData.docReminderEnabled = Boolean(docReminderEnabled);
    }

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: updateData,
      select: {
        whtDeadlineDay: true,
        whtReminderDays: true,
        docReminderDays: true,
        whtReminderEnabled: true,
        docReminderEnabled: true,
      },
    });

    return apiResponse.success(updated);
  },
  { requireOwner: true }
);
