import { prisma } from "@/lib/db";
import { AccountClass, DataSource } from "@prisma/client";
import * as XLSX from "xlsx";

export interface ParsedAccount {
  code: string;
  nameTh: string;
  nameEn: string;
  class: AccountClass;
}

export interface ImportResult {
  created: number;
  updated: number;
  deleted?: number;
}

export interface PreviewAccount extends ParsedAccount {
  status: "new" | "update" | "skip";
  existingName: string | null;
  existingSource: DataSource | null;
}

export interface PreviewResult {
  accounts: PreviewAccount[];
  stats: {
    total: number;
    new: number;
    update: number;
    skip: number;
  };
}

function mapCodeToAccountClass(code: string): AccountClass | null {
  const prefix = code.substring(0, 2);

  switch (prefix) {
    case "41":
      return "REVENUE";
    case "42":
      return "OTHER_INCOME";
    case "51":
      return "COST_OF_SALES";
    case "52":
    case "53":
    case "58":
      return "EXPENSE";
    case "54":
      return "OTHER_EXPENSE";
    default:
      return null;
  }
}

export function parseAccountsFromExcel(buffer: ArrayBuffer): ParsedAccount[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  });

  let startRow = 0;
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    if (
      row &&
      row.some(
        (cell) => typeof cell === "string" && cell.includes("รหัสบัญชี")
      )
    ) {
      startRow = i + 1;
      break;
    }
  }

  const accounts: ParsedAccount[] = [];

  for (let i = startRow; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length < 4) continue;

    const code = String(row[1]).trim();
    const nameTh = String(row[2]).trim();
    const nameEn = String(row[3]).trim();

    if (!code || !nameTh) continue;

    const accountClass = mapCodeToAccountClass(code);
    if (!accountClass) continue;

    accounts.push({ code, nameTh, nameEn, class: accountClass });
  }

  return accounts;
}

export async function previewAccounts(
  companyId: string,
  parsedAccounts: ParsedAccount[]
): Promise<PreviewResult> {
  const existingAccounts = await prisma.account.findMany({
    where: {
      companyId,
      code: { in: parsedAccounts.map((a) => a.code) },
    },
    select: { code: true, name: true, source: true },
  });

  const existingCodesMap = new Map(
    existingAccounts.map((a) => [a.code, { name: a.name, source: a.source }])
  );

  const accounts: PreviewAccount[] = parsedAccounts.map((account) => {
    const existing = existingCodesMap.get(account.code);
    let status: "new" | "update" | "skip" = "new";

    if (existing !== undefined) {
      status = existing.name !== account.nameTh ? "update" : "skip";
    }

    return {
      ...account,
      status,
      existingName: existing?.name || null,
      existingSource: existing?.source || null,
    };
  });

  return {
    accounts,
    stats: {
      total: accounts.length,
      new: accounts.filter((a) => a.status === "new").length,
      update: accounts.filter((a) => a.status === "update").length,
      skip: accounts.filter((a) => a.status === "skip").length,
    },
  };
}

export async function importAccountsReplace(
  companyId: string,
  parsedAccounts: ParsedAccount[]
): Promise<ImportResult> {
  const parsedCodes = new Set(parsedAccounts.map((a) => a.code));

  const result = await prisma.$transaction(
    async (tx) => {
      const usedAccountIds = await tx.account.findMany({
        where: {
          companyId,
          OR: [
            { Expense: { some: {} } },
            { Income: { some: {} } },
            { VendorMapping: { some: {} } },
          ],
        },
        select: { id: true, code: true, source: true },
      });

      const deleteResult = await tx.account.deleteMany({
        where: {
          companyId,
          source: DataSource.PEAK,
          id: { notIn: usedAccountIds.map((a) => a.id) },
          code: { notIn: Array.from(parsedCodes) },
        },
      });

      const existingAccounts = await tx.account.findMany({
        where: {
          companyId,
          code: { in: Array.from(parsedCodes) },
        },
        select: { code: true, source: true },
      });

      const existingCodesMap = new Map(
        existingAccounts.map((a) => [a.code, a.source])
      );

      const accountsToCreate = parsedAccounts.filter(
        (a) => !existingCodesMap.has(a.code)
      );
      const accountsToUpdate = parsedAccounts.filter((a) =>
        existingCodesMap.has(a.code)
      );

      let created = 0;
      let updated = 0;

      if (accountsToCreate.length > 0) {
        const now = new Date();
        await tx.account.createMany({
          data: accountsToCreate.map((a) => ({
            id: crypto.randomUUID(),
            companyId,
            code: a.code,
            name: a.nameTh,
            nameTh: a.nameTh,
            class: a.class,
            keywords: [],
            isSystem: false,
            isActive: true,
            source: DataSource.PEAK,
            updatedAt: now,
          })),
          skipDuplicates: true,
        });
        created = accountsToCreate.length;
      }

      for (const account of accountsToUpdate) {
        await tx.account.updateMany({
          where: { companyId, code: account.code },
          data: {
            name: account.nameTh,
            nameTh: account.nameTh,
            class: account.class,
            source: DataSource.PEAK,
          },
        });
        updated++;
      }

      return { deleted: deleteResult.count, created, updated };
    },
    { timeout: 60000 }
  );

  await updateLastImportTimestamp(companyId);
  return result;
}

export async function importAccountsMerge(
  companyId: string,
  parsedAccounts: ParsedAccount[]
): Promise<ImportResult> {
  const existingAccounts = await prisma.account.findMany({
    where: {
      companyId,
      code: { in: parsedAccounts.map((a) => a.code) },
    },
    select: { code: true, name: true },
  });

  const existingCodesMap = new Map(
    existingAccounts.map((a) => [a.code, a.name])
  );

  const toCreate: ParsedAccount[] = [];
  const toUpdate: ParsedAccount[] = [];

  for (const account of parsedAccounts) {
    const existingName = existingCodesMap.get(account.code);
    if (existingName === undefined) {
      toCreate.push(account);
    } else if (existingName !== account.nameTh) {
      toUpdate.push(account);
    }
  }

  const result = await prisma.$transaction(
    async (tx) => {
      let created = 0;
      let updated = 0;

      if (toCreate.length > 0) {
        const now = new Date();
        await tx.account.createMany({
          data: toCreate.map((a) => ({
            id: crypto.randomUUID(),
            companyId,
            code: a.code,
            name: a.nameTh,
            nameTh: a.nameTh,
            class: a.class,
            keywords: [],
            isSystem: false,
            isActive: true,
            source: DataSource.PEAK,
            updatedAt: now,
          })),
          skipDuplicates: true,
        });
        created = toCreate.length;
      }

      for (const account of toUpdate) {
        await tx.account.updateMany({
          where: { companyId, code: account.code },
          data: {
            name: account.nameTh,
            nameTh: account.nameTh,
            source: DataSource.PEAK,
          },
        });
        updated++;
      }

      return { created, updated };
    },
    { timeout: 60000 }
  );

  await updateLastImportTimestamp(companyId);
  return result;
}

async function updateLastImportTimestamp(companyId: string) {
  try {
    await prisma.company.update({
      where: { id: companyId },
      data: { lastAccountImportAt: new Date() },
    });
  } catch (error) {
    console.warn("Could not update lastAccountImportAt:", error);
  }
}
