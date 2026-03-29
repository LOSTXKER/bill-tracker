/**
 * Retry migrating the 12 files that failed in the first pass.
 * Uses service role keys for both old and new projects.
 */

import { createClient } from "@supabase/supabase-js";

const OLD_URL = "https://dovdfnsvggqejhjzfnvv.supabase.co";
const OLD_KEY = process.env.OLD_KEY!;
const NEW_URL = "https://wbplmfahkzseolgmowvu.supabase.co";
const NEW_KEY = process.env.NEW_KEY!;

const FAILED_FILES = [
  "ANAJAK/settlements/1769938134149-S__25608213.jpg",
  "ANAJAK/settlements/1771237519316-S__25952315.jpg",
  "ANAJAK/settlements/1771529991183-IMG_6868.JPG",
  "ANAJAK/settlements/1771758907150-S__26091536.jpg",
  "ANAJAK/settlements/1771758924150-S__26091536.jpg",
  "ANAJAK/settlements/1771760503718-S__26091536.jpg",
  "ANAJAK/settlements/1771972206699-S__26148867.jpg",
  "ANAJAK/settlements/1772396759499-IMG_7055.JPG",
  "MEELIKE/expenses/16227929-f9a9-4e14-af75-7f40f3feb22d/invoices/1772692021460_MTAuMi4yNTY5IEZlYjI2LjAyNTkgLSDguJrguKPguLTguKnguLHguJcg4Lia.pdf",
  "MEELIKE/settlements/1770580240198-slip-fund-transferTRTS260209971735095.JPG",
  "MEELIKE/settlements/1771795016204-S__26107907_0.jpg",
  "MEELIKE/settlements/1771795030654-S__26107908_0.jpg",
];

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", pdf: "application/pdf",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

async function main() {
  console.log("🔄 Retrying 12 failed files with service role keys...\n");

  const oldClient = createClient(OLD_URL, OLD_KEY);
  const newClient = createClient(NEW_URL, NEW_KEY);

  let success = 0;
  let failed = 0;

  for (const filePath of FAILED_FILES) {
    try {
      // Try download
      const { data, error: dlErr } = await oldClient.storage.from("bill-tracker").download(filePath);
      if (dlErr || !data) {
        console.log(`  ❌ Download failed: ${filePath}`);
        console.log(`     Error: ${dlErr?.message || "no data"}`);

        // Try via public URL as fallback
        const publicUrl = `${OLD_URL}/storage/v1/object/public/bill-tracker/${filePath}`;
        console.log(`     Trying public URL...`);
        const resp = await fetch(publicUrl);
        if (!resp.ok) {
          console.log(`     ❌ Public URL also failed (${resp.status})`);
          failed++;
          continue;
        }
        const blob = await resp.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());

        const { error: upErr } = await newClient.storage.from("bill-tracker").upload(filePath, buffer, {
          contentType: getContentType(filePath),
          upsert: true,
        });
        if (upErr) {
          console.log(`     ❌ Upload failed: ${upErr.message}`);
          failed++;
        } else {
          console.log(`     ✅ Recovered via public URL: ${filePath}`);
          success++;
        }
        continue;
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const { error: upErr } = await newClient.storage.from("bill-tracker").upload(filePath, buffer, {
        contentType: getContentType(filePath),
        upsert: true,
      });
      if (upErr) {
        console.log(`  ❌ Upload failed: ${filePath} — ${upErr.message}`);
        failed++;
      } else {
        console.log(`  ✅ ${filePath}`);
        success++;
      }
    } catch (err: unknown) {
      console.log(`  ❌ Error: ${filePath} — ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${success} success, ${failed} failed out of ${FAILED_FILES.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
