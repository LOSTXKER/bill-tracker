import { analyzeImage } from "./gemini";
import { parseAIJsonResponse } from "./utils/parse-ai-json";
import { createLogger } from "@/lib/utils/logger";
import type { FraudFlag } from "./fraud-types";

interface FakeReceiptAIResponse {
  isLikelyAuthentic?: boolean;
  confidence?: number;
  documentType?: string;
  issues?: Array<{ issue: string; severity?: string }>;
}

interface PersonalExpenseAIResponse {
  category?: string;
  confidence?: number;
  items?: string[];
  reason?: string;
}

const log = createLogger("fraud-ai-check");

export async function checkFakeReceipt(receiptUrls: string[]): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  if (receiptUrls.length === 0) {
    flags.push({
      type: "FAKE_RECEIPT",
      severity: "HIGH",
      description: "ไม่มีรูปใบเสร็จแนบมา",
      confidence: 100,
    });
    return flags;
  }

  const receiptUrl = receiptUrls[0];

  try {
    const prompt = `คุณเป็น AI ผู้เชี่ยวชาญในการตรวจสอบความถูกต้องของใบเสร็จรับเงินและใบกำกับภาษี

โปรดวิเคราะห์ภาพใบเสร็จที่ให้มาและตรวจสอบความน่าเชื่อถือ:

**ตรวจสอบ:**
1. ความคมชัดของภาพ - ภาพชัดพอที่จะอ่านข้อมูลได้หรือไม่
2. รูปแบบใบเสร็จ - ดูเหมือนใบเสร็จจริงหรือไม่ (มีชื่อร้าน, วันที่, รายการ, ยอดเงิน)
3. เลขผู้เสียภาษี - มีหรือไม่ (13 หลัก)
4. สัญญาณปลอม - มีลักษณะตัดต่อ, font แปลก, หรือข้อมูลไม่สมเหตุสมผลหรือไม่
5. ประเภทเอกสาร - เป็นใบเสร็จจริงหรือแค่รูปอื่นๆ

ตอบเป็น JSON เท่านั้น:
{
  "isLikelyAuthentic": true/false,
  "confidence": 0-100,
  "issues": [
    {"issue": "ปัญหาที่พบ", "severity": "LOW/MEDIUM/HIGH"}
  ],
  "documentType": "RECEIPT" | "TAX_INVOICE" | "UNKNOWN" | "NOT_DOCUMENT"
}`;

    const response = await analyzeImage(receiptUrl, prompt, {
      temperature: 0.2,
      maxTokens: 512,
    });

    if (response.error) {
      log.error("AI receipt analysis error", response.error);
      return flags;
    }

    try {
      const result = parseAIJsonResponse<FakeReceiptAIResponse>(response.data);

      if (result.documentType === "NOT_DOCUMENT") {
        flags.push({
          type: "FAKE_RECEIPT",
          severity: "HIGH",
          description: "ไฟล์ที่แนบมาไม่ใช่เอกสารใบเสร็จ",
          confidence: result.confidence || 90,
        });
      } else if (result.documentType === "UNKNOWN") {
        flags.push({
          type: "FAKE_RECEIPT",
          severity: "MEDIUM",
          description: "ไม่สามารถระบุประเภทเอกสารได้",
          confidence: result.confidence || 60,
        });
      }

      if (!result.isLikelyAuthentic) {
        flags.push({
          type: "FAKE_RECEIPT",
          severity: (result.confidence ?? 0) > 70 ? "HIGH" : "MEDIUM",
          description: "AI ตรวจพบว่าใบเสร็จอาจไม่ใช่ของจริง",
          confidence: result.confidence || 50,
        });
      }

      if (result.issues && result.issues.length > 0) {
        for (const issue of result.issues) {
          const sev = issue.severity;
          const severity: FraudFlag["severity"] =
            sev === "LOW" || sev === "MEDIUM" || sev === "HIGH" ? sev : "MEDIUM";
          flags.push({
            type: "FAKE_RECEIPT",
            severity,
            description: issue.issue,
            confidence: result.confidence || 50,
          });
        }
      }
    } catch (parseError) {
      log.error("Failed to parse AI response", parseError);
    }
  } catch (error) {
    log.error("Fake receipt check error", error);
  }

  return flags;
}

export async function checkPersonalExpenseAI(
  description: string,
  receiptUrls: string[]
): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  if (receiptUrls.length === 0) return flags;

  try {
    const prompt = `คุณเป็น AI ผู้เชี่ยวชาญในการตรวจสอบค่าใช้จ่ายบริษัท

ดูจากภาพใบเสร็จนี้ ประเมินว่ารายการซื้อเป็น:
1. ค่าใช้จ่ายเกี่ยวกับธุรกิจ (เช่น อุปกรณ์สำนักงาน, วัตถุดิบ, ค่าขนส่ง)
2. ค่าใช้จ่ายส่วนตัว (เช่น เครื่องสำอาง, เกม, ของใช้ส่วนตัว)
3. ค่าใช้จ่ายที่อาจเป็นได้ทั้งสองแบบ (เช่น อาหาร, เครื่องดื่ม)

หมายเหตุ: ${description || "ไม่มีคำอธิบายเพิ่มเติม"}

ตอบเป็น JSON เท่านั้น:
{
  "category": "BUSINESS" | "PERSONAL" | "AMBIGUOUS",
  "confidence": 0-100,
  "items": ["รายการที่เห็น"],
  "reason": "เหตุผลสั้นๆ"
}`;

    const response = await analyzeImage(receiptUrls[0], prompt, {
      temperature: 0.2,
      maxTokens: 256,
    });

    if (!response.error) {
      try {
        const result = parseAIJsonResponse<PersonalExpenseAIResponse>(response.data);

        if (result.category === "PERSONAL") {
          flags.push({
            type: "PERSONAL_EXPENSE",
            severity: (result.confidence ?? 0) > 70 ? "HIGH" : "MEDIUM",
            description: `AI ตรวจพบว่าน่าจะเป็นค่าใช้จ่ายส่วนตัว: ${result.reason}`,
            confidence: result.confidence ?? 0,
          });
        } else if (result.category === "AMBIGUOUS" && (result.confidence ?? 0) > 60) {
          flags.push({
            type: "PERSONAL_EXPENSE",
            severity: "LOW",
            description: `รายการอาจไม่เกี่ยวกับธุรกิจ: ${result.reason}`,
            confidence: result.confidence ?? 0,
          });
        }
      } catch (parseError) {
        log.error("Failed to parse personal expense AI response", parseError);
      }
    }
  } catch (error) {
    log.error("Personal expense check error", error);
  }

  return flags;
}
