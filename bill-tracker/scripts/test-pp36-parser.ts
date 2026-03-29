/**
 * Test PP36 parser with both multi-line and single-line input (simulating unpdf).
 */

// Simulate the single-line output that unpdf actually produces
const SINGLE_LINE_TEXT = `ชืѷอรายงาน : รายงานใบกํากับภาษีซืҟอ ชืѷอผู้ประกอบการ : บริษัท มี-ไลค์ โซเชียล จํากัด เลขประจําตัวผู้เสียภาษี : 0505568000960 สาขา : สํานักงานใหญ่, 00000 ทีѷอยู่ : บ้านเลขทีѷ39/12 หมู่ทีѷ8 วันทีѷออกรายงาน : 10/03/2026 17:07:19 ช่วงวันทีѷ : 01/02/2026-31/03/2026 ลําดับทีѷ วัน/เดือน/ปี เลขทีѷบันทึกภายใน ชืѷอ เลขประจําตัวผู้เสียภาษีอากร สกุลเงิน จํานวนเงินรวม Ex Rate มูลค่าสินค้า หรือบริการ จํานวนเงิน ภาษีมูลค่าเพิѷม 1 01/02/2026 EXP-20260200104 Meta Platforms Ireland Limited 0993000454995 THB 11,109.81 - 10,383.00 726.81 2 02/02/2026 EXP-20260200027 Lovable Labs Incorporated 932794405 USD 878.27 32.8322 820.81 57.46 3 02/02/2026 EXP-20260200031 Perfect Panel DMCC AED 1,752.46 8.6588 1,637.81 114.65 4 02/02/2026 EXP-20260200032 Just Another Panel 1810306 USD 362,642.27 31.7994 338,918.01 23,724.26 5 03/02/2026 EXP-20260200021 Cursor 87-4436547 USD 6,776.16 31.6643 6,332.86 443.30 6 03/02/2026 EXP-20260200033 SuperSMM - Social Media Marketing USD 224,053.74 31.6643 209,396.02 14,657.72 7 05/02/2026 EXP-20260200022 Namecheap, Inc. 262368289 USD 3,073.85 31.9231 2,872.76 201.09 8 05/02/2026 EXP-20260200023 MailerSend, Inc 85-2404697 USD 2,322.72 31.9231 2,170.77 151.95 9 09/02/2026 EXP-20260200025 Meta Platforms Ireland Limited 0993000454995 THB 12,395.95 - 11,585.00 810.95 10 09/02/2026 EXP-20260200026 Adobe Systems Software Ireland Ltd IE6364992H THB 1,334.29 - 1,247.00 87.29 11 11/02/2026 EXP-20260200030 Cursor 87-4436547 USD 1,234.00 32.3045 1,153.27 80.73 12 11/02/2026 EXP-20260200035 Cursor 87-4436547 USD 670.11 31.3133 626.27 43.84 13 11/02/2026 EXP-20260200036 Cursor 87-4436547 USD 1,372.26 32.3045 1,282.49 89.77 14 14/02/2026 EXP-20260200040 Cursor 87-4436547 USD 4,341.47 32.3045 4,057.45 284.02 15 20/02/2026 EXP-20260200046 Perfect Panel DMCC AED 2,590.87 8.5344 2,421.37 169.50 16 21/02/2026 EXP-20260200105 Meta Platforms Ireland Limited 0993000454995 THB 1,635.18 - 1,528.21 106.97 17 21/02/2026 EXP-20260200106 Meta Platforms Ireland Limited 0993000454995 THB 3,270.37 - 3,056.42 213.95 18 21/02/2026 EXP-20260200107 Meta Platforms Ireland Limited 0993000454995 THB 6,540.74 - 6,112.84 427.90 19 22/02/2026 EXP-20260200059 Canva Pty. Ltd. EU372042198 THB 577.80 - 540.00 37.80 20 23/02/2026 EXP-20260200049 Cursor 87-4436547 USD 6,676.03 31.1964 6,239.28 436.75 21 23/02/2026 EXP-20260200050 Cursor 87-4436547 USD 6,676.03 31.1964 6,239.28 436.75 22 23/02/2026 EXP-20260200108 Meta Platforms Ireland Limited 0993000454995 THB 1,651.59 - 1,543.54 108.05 23 25/02/2026 EXP-20260200110 1Moby 0105550113634 USD 1,669.33 31.2024 1,560.12 109.21 24 28/02/2026 EXP-20260200109 Meta Platforms Ireland Limited 0993000454995 THB 6,185.87 - 5,781.19 404.68 671,431.17 627,505.77 43,925.40 มูลค่าทางภาษี ข้อมูลทัѷวไป ข้อมูลผู้ขายสินค้า/ผู้ให้บริการ`;

// Replicate the parser logic
const ROW_START_RE = /\b(\d{1,3})\s+(\d{1,2}\/\d{1,2}\/\d{4})/;
const INTERNAL_REF_RE = /^((?:EXP|PA|INV|REC|REV|JV)[-]?\w+)\s*/;
const PP36_AMOUNTS_RE = /\s+(THB|USD|AED|EUR|GBP|JPY|CNY|SGD|HKD|MYR)\s+([\d,]+\.\d{2,4})\s+(?:([\d.]+)|-)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/;
const PP36_HEADER_RE = /สกุลเงิน|Ex\s*Rate/i;

function parseMoney(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

function convertDate(dmy: string): string {
  const [d, m, y] = dmy.split("/").map(Number);
  const year = y > 2400 ? y - 543 : y;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizePP36Text(text: string): string {
  if (text.split("\n").length >= 10) return text;
  return text.replace(
    /\s+(\d{1,3}\s+\d{1,2}\/\d{1,2}\/\d{4})/g,
    "\n$1"
  );
}

function testParse(label: string, text: string) {
  console.log(`\n=== ${label} ===`);

  const headerArea = text.substring(0, 500);
  const isPP36 = PP36_HEADER_RE.test(headerArea);
  console.log("Detected PP36:", isPP36);
  console.log("Input lines:", text.split("\n").length);

  const normalized = normalizePP36Text(text);
  console.log("After normalization:", normalized.split("\n").length, "lines");

  const lines = normalized.split("\n");
  let rowCount = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, " ").trim();
    if (!line) continue;
    if (/(?:^|\s)รวม\s|\btotal\b|ยกมา|ยกไป/i.test(line)) continue;

    const rowMatch = line.match(ROW_START_RE);
    if (!rowMatch) continue;

    const amountsMatch = line.match(PP36_AMOUNTS_RE);
    if (!amountsMatch) {
      console.log(`  NO MATCH: ${line.slice(0, 80)}...`);
      continue;
    }

    const date = convertDate(rowMatch[2]);
    const baseAmount = parseMoney(amountsMatch[4]);
    const vatAmount = parseMoney(amountsMatch[5]);

    const coreEnd = amountsMatch.index!;
    const coreStart = rowMatch.index! + rowMatch[0].length;
    let core = line.substring(coreStart, coreEnd).trim();
    const refMatch = core.match(INTERNAL_REF_RE);
    if (refMatch) core = core.substring(refMatch[0].length).trim();

    let vendorName = core;
    let taxId = "";
    const taxIdMatch = core.match(/\s+([\w][\w\-]*[\w])\s*$/);
    if (taxIdMatch) {
      const candidate = taxIdMatch[1];
      if (/\d/.test(candidate) && candidate.length >= 5) {
        taxId = candidate.replace(/-/g, "");
        vendorName = core.substring(0, taxIdMatch.index!).trim();
      }
    }

    rowCount++;
    console.log(
      `  ${String(rowCount).padStart(2)} | ${date} | ${vendorName.slice(0, 35).padEnd(35)} | base: ${baseAmount.toFixed(2).padStart(12)} | vat: ${vatAmount.toFixed(2).padStart(10)}`
    );
  }

  console.log(`Total: ${rowCount} rows`);
  console.log(rowCount === 24 ? "SUCCESS" : `FAIL (expected 24)`);
}

testParse("SINGLE-LINE (simulating unpdf)", SINGLE_LINE_TEXT);
