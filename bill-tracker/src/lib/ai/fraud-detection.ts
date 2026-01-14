/**
 * AI Fraud Detection Service
 * ตรวจจับการโกงในการเบิกจ่ายพนักงาน
 */

import { prisma } from "@/lib/db";
import { analyzeImage } from "./gemini";
import { Prisma } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export interface FraudFlag {
  type: "DUPLICATE" | "FAKE_RECEIPT" | "PERSONAL_EXPENSE" | "SUSPICIOUS_AMOUNT";
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  confidence: number; // 0-100
}

export interface FraudAnalysisResult {
  overallScore: number; // 0-100 (0=clean, 100=fraud)
  flags: FraudFlag[];
  recommendation: "APPROVE" | "REVIEW" | "REJECT";
  analyzedAt: Date;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * วิเคราะห์ความเสี่ยงการโกงจากข้อมูลเบิกจ่าย
 */
export async function analyzeForFraud(
  companyId: string,
  data: {
    amount: number;
    description?: string;
    receiptUrls: string[];
    requesterId: string;
    invoiceNumber?: string;
    billDate: Date;
    accountId?: string;
  }
): Promise<FraudAnalysisResult> {
  const flags: FraudFlag[] = [];

  // Run all checks in parallel
  const [duplicateFlags, fakeReceiptFlags, personalExpenseFlags] = await Promise.all([
    checkDuplicateReceipt(companyId, data),
    checkFakeReceipt(data.receiptUrls),
    checkPersonalExpense(data.description || "", data.receiptUrls),
  ]);

  flags.push(...duplicateFlags);
  flags.push(...fakeReceiptFlags);
  flags.push(...personalExpenseFlags);

  // Calculate overall score
  const overallScore = calculateOverallScore(flags);

  // Determine recommendation
  const recommendation = getRecommendation(overallScore);

  return {
    overallScore,
    flags,
    recommendation,
    analyzedAt: new Date(),
  };
}

// =============================================================================
// Duplicate Detection
// =============================================================================

/**
 * ตรวจสอบใบเสร็จซ้ำ
 * - เทียบ invoice number
 * - เทียบยอดเงิน + วันที่ + requester
 */
async function checkDuplicateReceipt(
  companyId: string,
  data: {
    invoiceNumber?: string;
    amount: number;
    billDate: Date;
    requesterId: string;
    receiptUrls: string[];
  }
): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  // Check by invoice number
  if (data.invoiceNumber) {
    const existingByInvoice = await prisma.expense.findFirst({
      where: {
        companyId,
        invoiceNumber: data.invoiceNumber,
        isReimbursement: true,
        deletedAt: null,
        reimbursementStatus: { not: "REJECTED" },
      },
      select: { id: true, billDate: true, netPaid: true, requester: { select: { name: true } } },
    });

    if (existingByInvoice) {
      flags.push({
        type: "DUPLICATE",
        severity: "HIGH",
        description: `พบใบเสร็จเลขที่ ${data.invoiceNumber} เคยถูกเบิกแล้ว`,
        confidence: 95,
      });
    }
  }

  // Check by same amount + date + requester (within 7 days)
  const sevenDaysAgo = new Date(data.billDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const similarExpenses = await prisma.expense.findMany({
    where: {
      companyId,
      requesterId: data.requesterId,
      isReimbursement: true,
      netPaid: data.amount,
      billDate: {
        gte: sevenDaysAgo,
        lte: data.billDate,
      },
      deletedAt: null,
      reimbursementStatus: { not: "REJECTED" },
    },
    select: { id: true, billDate: true, description: true },
  });

  if (similarExpenses.length > 0) {
    flags.push({
      type: "DUPLICATE",
      severity: "MEDIUM",
      description: `พบรายการยอดเงินเท่ากัน ${similarExpenses.length} รายการใน 7 วันที่ผ่านมา`,
      confidence: 70,
    });
  }

  return flags;
}

// =============================================================================
// Fake Receipt Detection
// =============================================================================

/**
 * ใช้ AI ตรวจสอบความน่าเชื่อถือของใบเสร็จ
 */
async function checkFakeReceipt(receiptUrls: string[]): Promise<FraudFlag[]> {
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

  // Analyze first receipt with AI
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
      console.error("AI receipt analysis error:", response.error);
      return flags;
    }

    // Parse response
    let jsonText = response.data.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }

    try {
      const result = JSON.parse(jsonText);

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
          severity: result.confidence > 70 ? "HIGH" : "MEDIUM",
          description: "AI ตรวจพบว่าใบเสร็จอาจไม่ใช่ของจริง",
          confidence: result.confidence || 50,
        });
      }

      // Add specific issues
      if (result.issues && result.issues.length > 0) {
        for (const issue of result.issues) {
          flags.push({
            type: "FAKE_RECEIPT",
            severity: issue.severity || "MEDIUM",
            description: issue.issue,
            confidence: result.confidence || 50,
          });
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }
  } catch (error) {
    console.error("Fake receipt check error:", error);
  }

  return flags;
}

// =============================================================================
// Personal Expense Detection
// =============================================================================

/**
 * ตรวจสอบว่าเป็นค่าใช้จ่ายส่วนตัวหรือไม่
 */
async function checkPersonalExpense(
  description: string,
  receiptUrls: string[]
): Promise<FraudFlag[]> {
  const flags: FraudFlag[] = [];

  // Keywords that suggest personal expense
  const personalKeywords = [
    // Entertainment
    "เกม", "game", "netflix", "spotify", "youtube premium",
    // Beauty
    "เครื่องสำอาง", "ครีม", "makeup", "skincare",
    // Luxury food
    "บุฟเฟ่ต์", "buffet", "โรงแรม", "สปา", "spa",
    // Personal items
    "เสื้อผ้า", "รองเท้า", "กระเป๋า", "นาฬิกา", "แว่นตา",
    // Alcohol
    "เหล้า", "เบียร์", "ไวน์", "wine", "beer", "alcohol",
  ];

  const descLower = description.toLowerCase();
  const foundKeywords = personalKeywords.filter((kw) =>
    descLower.includes(kw.toLowerCase())
  );

  if (foundKeywords.length > 0) {
    flags.push({
      type: "PERSONAL_EXPENSE",
      severity: "MEDIUM",
      description: `พบคำที่อาจเป็นค่าใช้จ่ายส่วนตัว: ${foundKeywords.join(", ")}`,
      confidence: 60 + foundKeywords.length * 10,
    });
  }

  // Use AI to analyze if we have receipt
  if (receiptUrls.length > 0) {
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
        let jsonText = response.data.trim();
        if (jsonText.startsWith("```")) {
          jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
        }

        try {
          const result = JSON.parse(jsonText);

          if (result.category === "PERSONAL") {
            flags.push({
              type: "PERSONAL_EXPENSE",
              severity: result.confidence > 70 ? "HIGH" : "MEDIUM",
              description: `AI ตรวจพบว่าน่าจะเป็นค่าใช้จ่ายส่วนตัว: ${result.reason}`,
              confidence: result.confidence,
            });
          } else if (result.category === "AMBIGUOUS" && result.confidence > 60) {
            flags.push({
              type: "PERSONAL_EXPENSE",
              severity: "LOW",
              description: `รายการอาจไม่เกี่ยวกับธุรกิจ: ${result.reason}`,
              confidence: result.confidence,
            });
          }
        } catch (parseError) {
          console.error("Failed to parse personal expense AI response:", parseError);
        }
      }
    } catch (error) {
      console.error("Personal expense check error:", error);
    }
  }

  return flags;
}

// =============================================================================
// Scoring & Recommendation
// =============================================================================

/**
 * คำนวณคะแนนความเสี่ยงรวม
 */
function calculateOverallScore(flags: FraudFlag[]): number {
  if (flags.length === 0) return 0;

  // Weight by severity
  const severityWeights = {
    HIGH: 40,
    MEDIUM: 20,
    LOW: 10,
  };

  let totalScore = 0;
  for (const flag of flags) {
    const baseScore = severityWeights[flag.severity];
    const adjustedScore = (baseScore * flag.confidence) / 100;
    totalScore += adjustedScore;
  }

  // Cap at 100
  return Math.min(100, Math.round(totalScore));
}

/**
 * กำหนดคำแนะนำจากคะแนน
 */
function getRecommendation(
  score: number
): "APPROVE" | "REVIEW" | "REJECT" {
  if (score >= 70) return "REJECT";
  if (score >= 30) return "REVIEW";
  return "APPROVE";
}

// =============================================================================
// Integration: Auto-analyze on create
// =============================================================================

/**
 * วิเคราะห์และอัพเดท reimbursement request record
 * เรียกใช้ใน background หลัง create
 */
export async function analyzeReimbursementRequest(
  requestId: string
): Promise<FraudAnalysisResult | null> {
  try {
    const request = await prisma.reimbursementRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        companyId: true,
        netAmount: true,
        description: true,
        receiptUrls: true,
        requesterName: true,
        invoiceNumber: true,
        billDate: true,
      },
    });

    if (!request) {
      return null;
    }

    const receiptUrls = Array.isArray(request.receiptUrls)
      ? (request.receiptUrls as string[])
      : [];

    // Check for duplicates using requester name as identifier
    const result = await analyzeForFraud(request.companyId, {
      amount: Number(request.netAmount),
      description: request.description || undefined,
      receiptUrls,
      requesterId: request.requesterName, // Use requester name as identifier
      invoiceNumber: request.invoiceNumber || undefined,
      billDate: request.billDate,
      accountId: undefined,
    });

    // Update reimbursement request with fraud analysis
    await prisma.reimbursementRequest.update({
      where: { id: requestId },
      data: {
        fraudScore: result.overallScore,
        fraudFlags: JSON.parse(JSON.stringify(result.flags)),
        fraudAnalyzedAt: result.analyzedAt,
        // Auto-flag if high risk (keep PENDING but flag for review)
        // Note: We don't auto-reject, just flag for human review
      },
    });

    console.log(`[Fraud Detection] Analyzed request ${requestId}: score=${result.overallScore}, recommendation=${result.recommendation}`);

    return result;
  } catch (error) {
    console.error("Error analyzing reimbursement request:", error);
    return null;
  }
}

/**
 * วิเคราะห์และอัพเดท expense record
 */
export async function analyzeAndUpdateExpense(
  expenseId: string
): Promise<FraudAnalysisResult | null> {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        companyId: true,
        netPaid: true,
        description: true,
        slipUrls: true,
        requesterId: true,
        invoiceNumber: true,
        billDate: true,
        accountId: true,
        isReimbursement: true,
      },
    });

    if (!expense || !expense.isReimbursement) {
      return null;
    }

    const receiptUrls = Array.isArray(expense.slipUrls)
      ? (expense.slipUrls as string[])
      : [];

    const result = await analyzeForFraud(expense.companyId, {
      amount: Number(expense.netPaid),
      description: expense.description || undefined,
      receiptUrls,
      requesterId: expense.requesterId || "",
      invoiceNumber: expense.invoiceNumber || undefined,
      billDate: expense.billDate,
      accountId: expense.accountId || undefined,
    });

    // Update expense with fraud analysis
    await prisma.expense.update({
      where: { id: expenseId },
      data: {
        fraudScore: result.overallScore,
        fraudFlags: JSON.parse(JSON.stringify(result.flags)),
        fraudAnalyzedAt: result.analyzedAt,
        // Auto-flag if high risk
        ...(result.recommendation === "REJECT" && {
          reimbursementStatus: "FLAGGED",
        }),
      },
    });

    return result;
  } catch (error) {
    console.error("Error analyzing expense:", error);
    return null;
  }
}
