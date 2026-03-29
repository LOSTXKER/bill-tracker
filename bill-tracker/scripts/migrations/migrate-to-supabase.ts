/**
 * Script to migrate local uploads to Supabase Storage
 * 
 * Usage:
 * 1. Set environment variables in .env.local
 * 2. Run: npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.log("Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateFolder(folderName: string) {
  const localPath = join(process.cwd(), "public", "uploads", folderName);
  
  if (!existsSync(localPath)) {
    console.log(`⏭️  Skipping ${folderName} (folder doesn't exist)`);
    return;
  }

  console.log(`\n📁 Migrating ${folderName}...`);
  
  const files = await readdir(localPath);
  let successCount = 0;
  let errorCount = 0;

  for (const filename of files) {
    try {
      const filePath = join(localPath, filename);
      const fileBuffer = await readFile(filePath);
      const storagePath = `${folderName}/${filename}`;

      // Upload to Supabase
      const { error } = await supabase.storage
        .from("bill-tracker")
        .upload(storagePath, fileBuffer, {
          contentType: getContentType(filename),
          upsert: false,
        });

      if (error) {
        if (error.message.includes("already exists")) {
          console.log(`  ⏭️  ${filename} (already exists)`);
        } else {
          throw error;
        }
      } else {
        console.log(`  ✅ ${filename}`);
        successCount++;
      }
    } catch (error) {
      console.error(`  ❌ ${filename}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 ${folderName} Summary:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
}

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function main() {
  console.log("🚀 Starting migration to Supabase Storage...\n");
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🪣 Bucket: bill-tracker\n`);

  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === "bill-tracker");

  if (!bucketExists) {
    console.error("❌ Bucket 'bill-tracker' not found!");
    console.log("\nPlease create the bucket first:");
    console.log("1. Go to Supabase Dashboard > Storage");
    console.log("2. Create a new bucket named 'bill-tracker'");
    console.log("3. Make it public");
    console.log("4. Set up policies (see SUPABASE_SETUP.md)");
    process.exit(1);
  }

  // Migrate folders
  await migrateFolder("receipts");
  await migrateFolder("invoices");
  await migrateFolder("wht-certs");

  console.log("\n✨ Migration completed!");
  console.log("\n💡 Next steps:");
  console.log("1. Verify files in Supabase Dashboard > Storage");
  console.log("2. Update database URLs if needed");
  console.log("3. Deploy to Vercel");
}

main().catch((error) => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});
