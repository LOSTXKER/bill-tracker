/**
 * Migrate contact-level defaults (defaultVatRate, defaultWhtEnabled, etc.)
 * into TransactionPreset entries stored in descriptionPresets JSON.
 *
 * Usage:
 *   npx tsx scripts/migrations/migrate-defaults-to-presets.ts
 *
 * Requires DATABASE_URL in .env or .env.local
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PresetRow {
  label: string;
  description: string;
  accountId: string | null;
  categoryId: string | null;
  vatRate: number | null;
  whtEnabled: boolean | null;
  whtRate: number | null;
  whtType: string | null;
  documentType: string | null;
  notes: string | null;
}

async function main() {
  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { defaultVatRate: { not: null } },
        { defaultWhtEnabled: true },
        { defaultAccountId: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      defaultVatRate: true,
      defaultWhtEnabled: true,
      defaultWhtRate: true,
      defaultWhtType: true,
      defaultAccountId: true,
      descriptionPresets: true,
      descriptionTemplate: true,
    },
  });

  console.log(`Found ${contacts.length} contacts with legacy defaults`);

  let migrated = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const existingPresets: PresetRow[] = Array.isArray(contact.descriptionPresets)
      ? (contact.descriptionPresets as PresetRow[])
      : [];

    const newPreset: PresetRow = {
      label: "ค่าเริ่มต้น",
      description: typeof contact.descriptionTemplate === "string" ? contact.descriptionTemplate : "",
      accountId: contact.defaultAccountId || null,
      categoryId: null,
      vatRate: contact.defaultVatRate ?? null,
      whtEnabled: contact.defaultWhtEnabled ?? null,
      whtRate: contact.defaultWhtRate ? Number(contact.defaultWhtRate) : null,
      whtType: contact.defaultWhtType || null,
      documentType: null,
      notes: null,
    };

    const alreadyHas = existingPresets.some(
      (p) => p.label === "ค่าเริ่มต้น" && p.vatRate === newPreset.vatRate
    );

    if (alreadyHas) {
      skipped++;
      continue;
    }

    const updatedPresets = [newPreset, ...existingPresets];

    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        descriptionPresets: updatedPresets as unknown as any,
        defaultVatRate: null,
        defaultWhtEnabled: null,
        defaultWhtRate: null,
        defaultWhtType: null,
        defaultAccountId: null,
        descriptionTemplate: null,
        defaultsLastUpdatedAt: new Date(),
      },
    });

    migrated++;
    console.log(`  Migrated: ${contact.name} (${contact.id})`);
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} skipped (already had preset)`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
