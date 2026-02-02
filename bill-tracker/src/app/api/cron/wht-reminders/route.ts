/**
 * Cron Job: WHT & Document Reminders
 * ควรรันทุกวัน เช่น 09:00
 * 
 * สำหรับ Vercel: ใช้ vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/cron/wht-reminders",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api/response";
import { createApiLogger } from "@/lib/utils/logger";
import { getErrorMessage } from "@/lib/utils/error-helpers";
import { sendWhtDeadlineReminders, sendPendingDocsReminders } from "@/lib/notifications/wht-reminder";

const log = createApiLogger("cron/wht-reminders");

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Check authorization
  const authHeader = request.headers.get("authorization");
  
  // Allow if CRON_SECRET is set and matches, or if no secret is configured (dev mode)
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return apiResponse.forbidden("Unauthorized");
  }

  try {
    log.info("Starting WHT & Document reminders");

    // Send WHT deadline reminders
    const whtResult = await sendWhtDeadlineReminders();
    log.info("WHT reminders sent", whtResult);

    // Send pending documents reminders
    const docsResult = await sendPendingDocsReminders();
    log.info("Document reminders sent", docsResult);

    return apiResponse.success({
      whtReminders: whtResult,
      docReminders: docsResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error("Cron job error", error);
    return apiResponse.error(getErrorMessage(error, "Unknown error"));
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
