/**
 * Document Event Management for Transactions
 * Extracted from transaction-routes.ts for better modularity
 */

import { prisma } from "@/lib/db";
import { DocumentEventType } from "@prisma/client";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("transaction-document-events");

export interface CreateDocumentEventParams {
  expenseId?: string;
  incomeId?: string;
  eventType: DocumentEventType;
  fromStatus?: string | null;
  toStatus?: string | null;
  notes?: string | null;
  metadata?: any;
  createdBy: string;
}

/**
 * Create a document event for tracking transaction lifecycle
 * Non-blocking - errors are logged but not thrown
 */
export async function createDocumentEvent(params: CreateDocumentEventParams): Promise<void> {
  try {
    await prisma.documentEvent.create({
      data: {
        id: crypto.randomUUID(),
        expenseId: params.expenseId || null,
        incomeId: params.incomeId || null,
        eventType: params.eventType,
        eventDate: new Date(),
        fromStatus: params.fromStatus || null,
        toStatus: params.toStatus || null,
        notes: params.notes || null,
        metadata: params.metadata || null,
        createdBy: params.createdBy,
      },
    });
  } catch (error) {
    // Log error but don't throw - document events should not break the main flow
    log.error("Failed to create document event", error);
  }
}
