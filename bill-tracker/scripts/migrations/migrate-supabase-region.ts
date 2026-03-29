/**
 * Supabase Region Migration Script
 *
 * Migrates all Storage files from an old Supabase project to a new one,
 * then updates all file URLs in the PostgreSQL database.
 *
 * Usage:
 *   1. Set the 4 environment variables below (old & new credentials)
 *   2. Run: npx tsx scripts/migrate-supabase-region.ts
 *
 * Phases:
 *   Phase 1 - Migrate Storage files (download from old → upload to new)
 *   Phase 2 - Update all URLs in the database (Expense, Income, etc.)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration — fill in before running
// ---------------------------------------------------------------------------

const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL ?? "";
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_KEY ?? "";
const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL ?? "";
const NEW_SUPABASE_KEY = process.env.NEW_SUPABASE_KEY ?? "";

const DATABASE_URL = process.env.DATABASE_URL ?? "";

const BUCKET = "bill-tracker";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateEnv() {
  const missing: string[] = [];
  if (!OLD_SUPABASE_URL) missing.push("OLD_SUPABASE_URL");
  if (!OLD_SUPABASE_KEY) missing.push("OLD_SUPABASE_KEY");
  if (!NEW_SUPABASE_URL) missing.push("NEW_SUPABASE_URL");
  if (!NEW_SUPABASE_KEY) missing.push("NEW_SUPABASE_KEY");
  if (!DATABASE_URL) missing.push("DATABASE_URL");

  if (missing.length > 0) {
    console.error("❌ Missing environment variables:");
    missing.forEach((v) => console.error(`   - ${v}`));
    console.log("\nExample:");
    console.log(
      '  OLD_SUPABASE_URL="https://old-project.supabase.co" \\'
    );
    console.log('  OLD_SUPABASE_KEY="old-anon-key" \\');
    console.log(
      '  NEW_SUPABASE_URL="https://new-project.supabase.co" \\'
    );
    console.log('  NEW_SUPABASE_KEY="new-anon-key" \\');
    console.log('  DATABASE_URL="postgresql://..." \\');
    console.log("  npx tsx scripts/migrate-supabase-region.ts");
    process.exit(1);
  }

  if (OLD_SUPABASE_URL === NEW_SUPABASE_URL) {
    console.error("❌ OLD_SUPABASE_URL and NEW_SUPABASE_URL are the same!");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

/**
 * Recursively list all files in a bucket folder.
 * Supabase list() returns max 1000 items; we paginate + recurse into folders.
 */
async function listAllFiles(
  client: SupabaseClient,
  folder: string = ""
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await client.storage
      .from(BUCKET)
      .list(folder, { limit, offset, sortBy: { column: "name", order: "asc" } });

    if (error) {
      console.error(`❌ Error listing ${folder}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = folder ? `${folder}/${item.name}` : item.name;

      if (item.id === null) {
        // It's a folder — recurse
        const subFiles = await listAllFiles(client, fullPath);
        paths.push(...subFiles);
      } else {
        paths.push(fullPath);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return paths;
}

// ---------------------------------------------------------------------------
// Phase 1: Migrate Storage Files
// ---------------------------------------------------------------------------

async function migrateStorage(
  oldClient: SupabaseClient,
  newClient: SupabaseClient
) {
  console.log("\n" + "=".repeat(60));
  console.log("📦 Phase 1: Migrate Storage Files");
  console.log("=".repeat(60));

  // Ensure new bucket exists
  const { data: buckets } = await newClient.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);
  if (!bucketExists) {
    console.log(`📁 Creating bucket "${BUCKET}" on new project...`);
    const { error } = await newClient.storage.createBucket(BUCKET, {
      public: true,
    });
    if (error) {
      console.error("❌ Failed to create bucket:", error.message);
      console.log("   Please create it manually in the Supabase Dashboard.");
      process.exit(1);
    }
    console.log("✅ Bucket created.");
  } else {
    console.log(`✅ Bucket "${BUCKET}" already exists on new project.`);
  }

  // List all files in old bucket
  console.log("\n🔍 Listing files in old bucket...");
  const files = await listAllFiles(oldClient);
  console.log(`   Found ${files.length} files.\n`);

  if (files.length === 0) {
    console.log("⚠️  No files to migrate.");
    return { success: 0, skipped: 0, failed: 0 };
  }

  let success = 0;
  let skipped = 0;
  let failed = 0;
  const failedFiles: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const progress = `[${i + 1}/${files.length}]`;

    try {
      // Download from old
      const { data: fileData, error: downloadError } = await oldClient.storage
        .from(BUCKET)
        .download(filePath);

      if (downloadError || !fileData) {
        console.error(`  ${progress} ❌ Download failed: ${filePath} — ${downloadError?.message}`);
        failed++;
        failedFiles.push(filePath);
        continue;
      }

      // Convert Blob to Buffer
      const buffer = Buffer.from(await fileData.arrayBuffer());

      // Upload to new
      const { error: uploadError } = await newClient.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
          contentType: getContentType(filePath),
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message?.includes("already exists") || uploadError.message?.includes("Duplicate")) {
          console.log(`  ${progress} ⏭️  Already exists: ${filePath}`);
          skipped++;
        } else {
          console.error(`  ${progress} ❌ Upload failed: ${filePath} — ${uploadError.message}`);
          failed++;
          failedFiles.push(filePath);
        }
      } else {
        console.log(`  ${progress} ✅ ${filePath}`);
        success++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ${progress} ❌ Error: ${filePath} — ${msg}`);
      failed++;
      failedFiles.push(filePath);
    }
  }

  console.log("\n" + "-".repeat(40));
  console.log("📊 Storage Migration Summary:");
  console.log(`   ✅ Success:  ${success}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);

  if (failedFiles.length > 0) {
    console.log("\n⚠️  Failed files:");
    failedFiles.forEach((f) => console.log(`   - ${f}`));
  }

  return { success, skipped, failed };
}

// ---------------------------------------------------------------------------
// Phase 2: Update Database URLs
// ---------------------------------------------------------------------------

async function updateDatabaseUrls() {
  console.log("\n" + "=".repeat(60));
  console.log("🗄️  Phase 2: Update Database URLs");
  console.log("=".repeat(60));

  // Extract the base URLs (e.g., https://xxx.supabase.co)
  const oldBase = OLD_SUPABASE_URL.replace(/\/$/, "");
  const newBase = NEW_SUPABASE_URL.replace(/\/$/, "");

  console.log(`   Old URL base: ${oldBase}`);
  console.log(`   New URL base: ${newBase}\n`);

  // Dynamic import for pg (already a dependency)
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log("✅ Connected to database.\n");

    // JSON array URL columns: table → columns[]
    const jsonColumns: { table: string; columns: string[] }[] = [
      {
        table: '"Expense"',
        columns: [
          '"slipUrls"',
          '"taxInvoiceUrls"',
          '"whtCertUrls"',
          '"otherDocUrls"',
          '"referenceUrls"',
        ],
      },
      {
        table: '"Income"',
        columns: [
          '"customerSlipUrls"',
          '"myBillCopyUrls"',
          '"whtCertUrls"',
          '"otherDocUrls"',
          '"referenceUrls"',
        ],
      },
      {
        table: '"ReimbursementRequest"',
        columns: ['"receiptUrls"', '"referenceUrls"'],
      },
      {
        table: '"ExpensePayment"',
        columns: ['"settlementSlipUrls"'],
      },
    ];

    // String URL columns
    const stringColumns: { table: string; column: string }[] = [
      { table: '"Company"', column: '"logoUrl"' },
      { table: '"User"', column: '"avatarUrl"' },
    ];

    let totalUpdated = 0;

    // Update JSON array columns using text replace on the JSON cast
    for (const { table, columns } of jsonColumns) {
      for (const col of columns) {
        const query = `
          UPDATE ${table}
          SET ${col} = REPLACE(${col}::text, $1, $2)::jsonb
          WHERE ${col}::text LIKE $3
        `;
        const result = await client.query(query, [
          oldBase,
          newBase,
          `%${oldBase}%`,
        ]);
        const count = result.rowCount ?? 0;
        if (count > 0) {
          console.log(`   ✅ ${table}.${col}: ${count} rows updated`);
          totalUpdated += count;
        }
      }
    }

    // Update string columns
    for (const { table, column } of stringColumns) {
      const query = `
        UPDATE ${table}
        SET ${column} = REPLACE(${column}, $1, $2)
        WHERE ${column} LIKE $3
      `;
      const result = await client.query(query, [
        oldBase,
        newBase,
        `%${oldBase}%`,
      ]);
      const count = result.rowCount ?? 0;
      if (count > 0) {
        console.log(`   ✅ ${table}.${column}: ${count} rows updated`);
        totalUpdated += count;
      }
    }

    console.log(`\n📊 Database Update Summary: ${totalUpdated} total rows updated`);

    if (totalUpdated === 0) {
      console.log("   ℹ️  No URLs found matching the old Supabase URL.");
      console.log("   This is fine if URLs were already updated or stored differently.");
    }
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🚀 Supabase Region Migration");
  console.log("=".repeat(60));
  console.log(`📍 Old project: ${OLD_SUPABASE_URL}`);
  console.log(`📍 New project: ${NEW_SUPABASE_URL}`);
  console.log(`🪣 Bucket: ${BUCKET}`);

  validateEnv();

  const oldClient = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
  const newClient = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

  // Phase 1: Migrate storage files
  const storageResult = await migrateStorage(oldClient, newClient);

  // Phase 2: Update database URLs
  await updateDatabaseUrls();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✨ Migration Complete!");
  console.log("=".repeat(60));
  console.log("\n📋 Next steps:");
  console.log("   1. Verify files in new Supabase Dashboard > Storage");
  console.log("   2. Update your .env.local:");
  console.log(`      NEXT_PUBLIC_SUPABASE_URL="${NEW_SUPABASE_URL}"`);
  console.log("      NEXT_PUBLIC_SUPABASE_ANON_KEY=\"<new-anon-key>\"");
  console.log("   3. Update Vercel environment variables");
  console.log("   4. Redeploy the app");
  console.log("   5. Set up Storage Policies on the new project (see docs/SUPABASE_SETUP.md)");
  console.log("   6. Test the app thoroughly");
  console.log("   7. Delete/pause the old Supabase project when confirmed working");

  if (storageResult.failed > 0) {
    console.log(
      `\n⚠️  ${storageResult.failed} files failed to migrate. Re-run the script to retry (existing files will be skipped).`
    );
  }
}

main().catch((error) => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});
