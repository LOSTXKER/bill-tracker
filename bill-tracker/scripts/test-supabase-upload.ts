/**
 * Script to test Supabase Storage upload
 * 
 * Usage:
 * 1. Set environment variables in .env.local
 * 2. Run: npx tsx scripts/test-supabase-upload.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
  console.log("\nPlease set in .env.local:");
  console.log("NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co");
  console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("🔗 Testing Supabase connection...\n");
  console.log(`📍 URL: ${supabaseUrl}`);
  console.log(`🔑 Key: ${supabaseKey!.substring(0, 20)}...\n`);

  try {
    // Test 1: List buckets
    console.log("📋 Test 1: List buckets");
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      throw bucketsError;
    }

    console.log(`✅ Found ${buckets?.length || 0} buckets`);
    buckets?.forEach((bucket) => {
      console.log(`  - ${bucket.name} (${bucket.public ? "public" : "private"})`);
    });

    // Test 2: Check if bill-tracker bucket exists
    console.log("\n🪣 Test 2: Check bill-tracker bucket");
    const billTrackerBucket = buckets?.find((b) => b.name === "bill-tracker");
    
    if (!billTrackerBucket) {
      console.log("❌ Bucket 'bill-tracker' not found!");
      console.log("\n💡 Please create it:");
      console.log("1. Go to Supabase Dashboard > Storage");
      console.log("2. Click 'New bucket'");
      console.log("3. Name: bill-tracker");
      console.log("4. Make it public ✅");
      console.log("5. Create bucket");
      return;
    }

    console.log(`✅ Bucket 'bill-tracker' exists (${billTrackerBucket.public ? "public" : "private"})`);

    // Test 3: Upload test file
    console.log("\n📤 Test 3: Upload test file");
    const testContent = "Hello from Bill Tracker!";
    const testPath = `test/test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("bill-tracker")
      .upload(testPath, testContent, {
        contentType: "text/plain",
      });

    if (uploadError) {
      throw uploadError;
    }

    console.log(`✅ Uploaded: ${testPath}`);

    // Test 4: Get public URL
    console.log("\n🔗 Test 4: Get public URL");
    const { data: urlData } = supabase.storage
      .from("bill-tracker")
      .getPublicUrl(testPath);

    console.log(`✅ Public URL: ${urlData.publicUrl}`);

    // Test 5: Delete test file
    console.log("\n🗑️  Test 5: Delete test file");
    const { error: deleteError } = await supabase.storage
      .from("bill-tracker")
      .remove([testPath]);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`✅ Deleted: ${testPath}`);

    // All tests passed!
    console.log("\n✨ All tests passed!");
    console.log("\n🎉 Your Supabase Storage is ready to use!");
    console.log("\n💡 Next steps:");
    console.log("1. Set up Storage Policies (see SUPABASE_SETUP.md)");
    console.log("2. Add environment variables to Vercel");
    console.log("3. Deploy!");

  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    
    if (error.message.includes("JWT")) {
      console.log("\n💡 Possible issues:");
      console.log("- Invalid SUPABASE_ANON_KEY");
      console.log("- Key expired or revoked");
    } else if (error.message.includes("not found")) {
      console.log("\n💡 Possible issues:");
      console.log("- Bucket doesn't exist");
      console.log("- Wrong bucket name");
    } else if (error.message.includes("policy")) {
      console.log("\n💡 Possible issues:");
      console.log("- Storage policies not set up");
      console.log("- See SUPABASE_SETUP.md for policy setup");
    }
    
    process.exit(1);
  }
}

testConnection();
