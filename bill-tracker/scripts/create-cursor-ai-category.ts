/**
 * Script: Create "Cursor Ai" category and reassign all Cursor-related expenses
 *
 * Usage: npx tsx --env-file=.env.local scripts/create-cursor-ai-category.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const COMPANY_ID = "cmk0ci1pt000ay8vc0u6ucle9"; // MEELIKE
const NEW_CATEGORY_NAME = "Cursor Ai";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("DRY RUN — no changes will be saved\n");

  // 1. Find Cursor contacts
  const cursorContacts = await prisma.contact.findMany({
    where: { name: { contains: "cursor", mode: "insensitive" }, companyId: COMPANY_ID },
    select: { id: true, name: true },
  });
  console.log(`Found ${cursorContacts.length} Cursor contact(s):`, cursorContacts.map((c) => c.name));

  // 2. Find all expenses linked to those contacts
  const contactIds = cursorContacts.map((c) => c.id);
  const expenses = await prisma.expense.findMany({
    where: { contactId: { in: contactIds }, deletedAt: null, companyId: COMPANY_ID },
    select: { id: true, description: true, categoryId: true },
  });
  console.log(`\nFound ${expenses.length} expense(s) linked to Cursor contacts`);

  if (expenses.length === 0) {
    console.log("Nothing to update.");
    await prisma.$disconnect();
    return;
  }

  // 3. Check if "Cursor Ai" category already exists
  const existing = await prisma.transactionCategory.findFirst({
    where: { companyId: COMPANY_ID, name: NEW_CATEGORY_NAME, type: "EXPENSE" },
  });

  let categoryId: string;

  if (existing) {
    categoryId = existing.id;
    console.log(`\nCategory "${NEW_CATEGORY_NAME}" already exists (id: ${categoryId})`);
  } else {
    // Find the "เทคโนโลยีและซอฟต์แวร์" parent group to nest under, as the best fit
    const techParent = await prisma.transactionCategory.findFirst({
      where: { companyId: COMPANY_ID, name: "เทคโนโลยีและซอฟต์แวร์", type: "EXPENSE", parentId: null },
      select: { id: true, name: true },
    });

    if (!techParent) {
      console.warn('Parent group "เทคโนโลยีและซอฟต์แวร์" not found, creating "Cursor Ai" as a top-level category.');
    }

    console.log(`\nCreating new EXPENSE category "${NEW_CATEGORY_NAME}"` +
      (techParent ? ` under "${techParent.name}"` : " (top-level)"));

    if (!dryRun) {
      const newCategory = await prisma.transactionCategory.create({
        data: {
          companyId: COMPANY_ID,
          name: NEW_CATEGORY_NAME,
          type: "EXPENSE",
          parentId: techParent?.id ?? null,
          sortOrder: 99,
          isActive: true,
        },
      });
      categoryId = newCategory.id;
      console.log(`Created category id: ${categoryId}`);
    } else {
      categoryId = "(new-id-will-be-generated)";
      console.log("[DRY RUN] Would create category");
    }
  }

  // 4. Update all matching expenses
  console.log(`\nUpdating ${expenses.length} expense(s) to category "${NEW_CATEGORY_NAME}"...`);

  if (!dryRun) {
    const result = await prisma.expense.updateMany({
      where: { id: { in: expenses.map((e) => e.id) } },
      data: { categoryId },
    });
    console.log(`Updated ${result.count} expense(s).`);
  } else {
    console.log(`[DRY RUN] Would update ${expenses.length} expense(s).`);
    expenses.slice(0, 5).forEach((e) =>
      console.log(`  - "${e.description}" (was: ${e.categoryId})`)
    );
    if (expenses.length > 5) console.log(`  ... and ${expenses.length - 5} more`);
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
