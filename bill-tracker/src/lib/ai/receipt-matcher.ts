import { findBestMatchingContact } from "@/lib/utils/string-similarity";
import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/utils/logger";
import type { AnalyzedAccount, AccountAlternative } from "./types";

const log = createLogger("ai-receipt");

export type AccountRecord = { id: string; code: string; name: string };
export type ContactRecord = { id: string; name: string; taxId: string | null };

export interface NewAccountSuggestion {
  code?: string;
  name?: string;
  class?: string;
  reason?: string;
}

export function findAccountInList(
  aiAccount: { id?: string; code?: string; name?: string } | null,
  accounts: AccountRecord[]
): AccountRecord | null {
  if (!aiAccount) return null;

  if (aiAccount.id) {
    const byId = accounts.find(a => a.id === aiAccount.id);
    if (byId) return byId;
  }

  if (aiAccount.code) {
    const byCode = accounts.find(a => a.code === aiAccount.code);
    if (byCode) return byCode;
  }

  if (aiAccount.name) {
    const normalizedName = aiAccount.name.toLowerCase().trim();
    const byName = accounts.find(a =>
      a.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(a.name.toLowerCase())
    );
    if (byName) return byName;
  }

  return null;
}

export function resolveAccount(
  parsedAccount: any,
  parsedConfidence: any,
  accounts: AccountRecord[]
): AnalyzedAccount {
  const matchedAccount = findAccountInList(parsedAccount, accounts);

  if (matchedAccount) {
    return {
      id: matchedAccount.id,
      code: matchedAccount.code,
      name: matchedAccount.name,
      confidence: parsedAccount?.confidence || parsedConfidence?.account || 0,
      reason: parsedAccount?.reason || "AI วิเคราะห์จากเอกสาร",
    };
  }

  if (parsedAccount) {
    log.debug("Account not matched", {
      aiSent: { id: parsedAccount.id, code: parsedAccount.code, name: parsedAccount.name },
    });
  }

  return { id: null, code: null, name: null };
}

const VALID_ACCOUNT_CLASSES = [
  "ASSET", "LIABILITY", "EQUITY", "REVENUE",
  "COST_OF_SALES", "EXPENSE", "OTHER_INCOME", "OTHER_EXPENSE",
] as const;

export async function autoCreateAccount(
  companyId: string,
  newAccount: NewAccountSuggestion
): Promise<{ id: string; code: string; name: string } | null> {
  const code = newAccount.code?.trim();
  const name = newAccount.name?.trim();
  const accountClass = newAccount.class?.toUpperCase().trim();

  if (!code || !name || !accountClass) return null;
  if (!VALID_ACCOUNT_CLASSES.includes(accountClass as any)) {
    log.debug("Invalid account class from AI", { accountClass });
    return null;
  }

  let finalCode = code;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const account = await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          code: finalCode,
          name,
          class: accountClass as any,
          keywords: [],
          isSystem: false,
          isActive: true,
          source: "AI" as any,
          updatedAt: new Date(),
        },
      });
      return { id: account.id, code: account.code, name: account.name };
    } catch (err: any) {
      if (err?.code === "P2002") {
        finalCode = `${code}-${attempt + 1}`;
        log.debug("Account code collision, retrying", { finalCode });
        continue;
      }
      log.error("autoCreateAccount error", err);
      return null;
    }
  }
  return null;
}

export async function resolveAccountWithAutoCreate(
  parsedAccount: any,
  parsedNewAccount: NewAccountSuggestion | null | undefined,
  parsedConfidence: any,
  accounts: AccountRecord[],
  companyId: string | null
): Promise<AnalyzedAccount> {
  const result = resolveAccount(parsedAccount, parsedConfidence, accounts);
  if (result.id) return result;

  if (parsedNewAccount?.code && parsedNewAccount?.name && companyId) {
    const created = await autoCreateAccount(companyId, parsedNewAccount);
    if (created) {
      log.debug("Auto-created new account", { code: created.code, name: created.name });
      return {
        id: created.id,
        code: created.code,
        name: created.name,
        confidence: parsedAccount?.confidence || parsedConfidence?.account || 70,
        reason: parsedNewAccount.reason || "AI สร้างบัญชีใหม่อัตโนมัติ",
        isNewAccount: true,
      };
    }
  }

  return result;
}

export function resolveAccountAlternatives(
  parsedAlternatives: any[] | undefined,
  accounts: AccountRecord[],
  primaryAccountId: string | null
): AccountAlternative[] {
  const alternatives: AccountAlternative[] = [];
  if (!parsedAlternatives || !Array.isArray(parsedAlternatives)) return alternatives;

  for (const alt of parsedAlternatives) {
    const matchedAlt = findAccountInList(alt, accounts);
    if (matchedAlt && matchedAlt.id !== primaryAccountId) {
      alternatives.push({
        id: matchedAlt.id,
        code: matchedAlt.code,
        name: matchedAlt.name,
        confidence: alt.confidence || 50,
        reason: alt.reason || "ทางเลือกอื่น",
      });
    }
  }

  return alternatives;
}

export interface ContactMatchResult {
  matchedContactId: string | null;
  matchedContactName: string | null;
}

export function matchContact(
  vendor: { matchedContactId?: string; taxId?: string; name?: string } | null,
  contacts: ContactRecord[]
): ContactMatchResult {
  if (!vendor) return { matchedContactId: null, matchedContactName: null };

  if (vendor.matchedContactId) {
    const matchedContact = contacts.find(c => c.id === vendor.matchedContactId);
    if (matchedContact) {
      return { matchedContactId: matchedContact.id, matchedContactName: matchedContact.name };
    }
  }

  if (vendor.taxId) {
    const normalizedTaxId = vendor.taxId.replace(/[^0-9]/g, "");
    const foundByTaxId = contacts.find(c =>
      c.taxId?.replace(/[^0-9]/g, "") === normalizedTaxId
    );
    if (foundByTaxId) {
      log.debug("Contact matched by taxId", { name: foundByTaxId.name });
      return { matchedContactId: foundByTaxId.id, matchedContactName: foundByTaxId.name };
    }
  }

  if (vendor.name) {
    const foundByName = findBestMatchingContact(vendor.name, contacts, 0.85);
    if (foundByName) {
      log.debug("Contact matched by fuzzy name", { original: vendor.name, matched: foundByName.name });
      return { matchedContactId: foundByName.id, matchedContactName: foundByName.name };
    }
  }

  return { matchedContactId: null, matchedContactName: null };
}

export function validateVendorTaxId(
  vendorTaxId: string | null,
  companyTaxId: string | null
): string | null {
  if (!vendorTaxId || !companyTaxId) return vendorTaxId;

  const normalizedVendor = vendorTaxId.replace(/[^0-9]/g, "");
  const normalizedCompany = companyTaxId.replace(/[^0-9]/g, "");

  if (normalizedVendor === normalizedCompany) {
    log.debug("Rejected vendor tax ID - matches company tax ID");
    return null;
  }

  return vendorTaxId;
}
