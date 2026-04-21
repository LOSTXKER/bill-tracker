/**
 * Document code (เลขที่เอกสาร) generation
 *
 * Format:
 *   - Expense: PV-YYYYMM-NNNN  (Payment Voucher / ใบสำคัญจ่าย)
 *   - Income : RV-YYYYMM-NNNN  (Receipt Voucher / ใบสำคัญรับ)
 *
 * Running number resets each month per company.
 *
 * NOTE: Use {@link generateDocumentCode} during a single insert,
 * or {@link generateDocumentCodeWithRetry} when you want automatic
 * retry on uniqueness collisions caused by concurrent inserts.
 */

import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";

export type DocumentKind = "expense" | "income";

export const DOCUMENT_CODE_PREFIX: Record<DocumentKind, string> = {
  expense: "PV",
  income: "RV",
};

export type DocCodeClient = PrismaClient | Prisma.TransactionClient;

function buildPrefix(kind: DocumentKind, date: Date): string {
  const prefix = DOCUMENT_CODE_PREFIX[kind];
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${prefix}-${year}${month}-`;
}

/**
 * Compute the next document code for a company/month.
 * Reads the highest existing code matching the prefix and increments.
 */
export async function generateDocumentCode(
  client: DocCodeClient,
  companyId: string,
  kind: DocumentKind,
  date: Date = new Date(),
): Promise<string> {
  const prefix = buildPrefix(kind, date);

  const model = (kind === "expense" ? client.expense : client.income) as {
    findFirst: (args: unknown) => Promise<{ documentCode: string | null } | null>;
  };

  const last = await model.findFirst({
    where: {
      companyId,
      documentCode: { startsWith: prefix },
    },
    orderBy: { documentCode: "desc" },
    select: { documentCode: true },
  });

  let next = 1;
  if (last?.documentCode) {
    const match = last.documentCode.match(/-(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }

  return `${prefix}${String(next).padStart(4, "0")}`;
}

/**
 * Run a create operation with auto-generated document code, retrying
 * on unique-constraint violation so concurrent inserts cannot collide.
 */
export async function withDocumentCode<T>(
  kind: DocumentKind,
  companyId: string,
  date: Date,
  doCreate: (code: string) => Promise<T>,
  options: { maxAttempts?: number; client?: DocCodeClient } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 5;
  const client = options.client ?? defaultPrisma;

  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = await generateDocumentCode(client, companyId, kind, date);
    try {
      return await doCreate(code);
    } catch (err) {
      // P2002 = unique constraint violation
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("Failed to generate unique document code");
}
