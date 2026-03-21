import { generateText } from "@/lib/ai/gemini";
import { withCompanyAccessFromParams } from "@/lib/api/with-company-access";
import { apiResponse } from "@/lib/api/response";

export interface ReconcileItem {
  id?: string;
  vendorName: string;
  amount: number;
  vatAmount: number;
  date: string;
  taxId?: string;
  invoiceNumber?: string;
  description?: string;
  paymentMethod?: string;
  notes?: string;
  hasTaxInvoice?: boolean;
  hasSlip?: boolean;
  docCount?: number;
  isPayOnBehalf?: boolean;
  paidByCompany?: string;
}

export interface AISuggestion {
  systemId: string;
  accountingIndex: number;
  confidence: number;
  reason: string;
}

export const POST = withCompanyAccessFromParams(
  async (request, { company }) => {
    const body = await request.json();
    const { systemItems, accountingItems } = body as {
      systemItems: ReconcileItem[];
      accountingItems: ReconcileItem[];
    };

    if (!systemItems?.length || !accountingItems?.length) {
      return apiResponse.success({ suggestions: [] });
    }

    const prompt = buildMatchingPrompt(systemItems, accountingItems);
    const response = await generateText(prompt);
    const responseText = response.data;

    let suggestions: AISuggestion[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      suggestions = [];
    }

    return apiResponse.success({ suggestions });
  },
  {
    permission: "reports:read",
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  }
);

function buildMatchingPrompt(
  systemItems: ReconcileItem[],
  accountingItems: ReconcileItem[]
): string {
  const systemList = systemItems
    .map((item, i) => {
      let line = `[${i}] id="${item.id}" ชื่อ="${item.vendorName}" ยอด=${item.amount} VAT=${item.vatAmount} วันที่=${item.date} taxId="${item.taxId ?? ""}"`;
      if (item.description) line += ` รายละเอียด="${item.description}"`;
      if (item.paymentMethod) line += ` วิธีจ่าย="${item.paymentMethod}"`;
      if (item.notes) line += ` หมายเหตุ="${item.notes}"`;
      if (item.hasTaxInvoice) line += " [มีใบกำกับ]";
      if (item.hasSlip) line += " [มีสลิป]";
      if (item.docCount) line += ` [เอกสาร ${item.docCount} ชิ้น]`;
      if (item.isPayOnBehalf) line += ` [จ่ายแทน จาก ${item.paidByCompany ?? "?"}]`;
      return line;
    })
    .join("\n");

  const accountingList = accountingItems
    .map(
      (item, i) =>
        `[${i}] ชื่อ="${item.vendorName}" ยอด=${item.amount} VAT=${item.vatAmount} วันที่=${item.date} taxId="${item.taxId ?? ""}"`
    )
    .join("\n");

  return `คุณเป็นผู้เชี่ยวชาญด้านการบัญชีไทย ช่วยจับคู่รายการระหว่างระบบเว็บกับรายงานภาษีของพนักงานบัญชี

กฎการจับคู่:
1. ชื่อบริษัทอาจเขียนต่างกัน เช่น "บ.ชมอรรถ การ์เม้นท์ จำกัด" กับ "บริษัท ชมอรรถ การ์เม้นท์ จำกัด" ถือว่าเหมือนกัน
2. ใช้ยอดเงิน (amount) เป็นตัวหลักในการจับคู่ แล้วใช้ชื่อและวันที่ช่วยยืนยัน
3. รายการที่มีรายละเอียดหรือหมายเหตุ ให้ใช้ประกอบการพิจารณาด้วย
4. รายการที่มี "จ่ายแทน" อาจมีชื่อบริษัทผู้บันทึกแตกต่างจากชื่อในรายงานภาษี
5. ถ้ายอดต่างกันเล็กน้อย ให้พิจารณาว่าอาจเป็นผลต่างจาก WHT (หัก ณ ที่จ่าย)

**รายการจากระบบเว็บ:**
${systemList}

**รายการจากรายงานบัญชี:**
${accountingList}

ส่งคืน JSON array เฉพาะรายการที่ยังไม่ match และ AI มั่นใจ confidence >= 0.6 เท่านั้น:
[
  {
    "systemId": "id ของรายการจากระบบ",
    "accountingIndex": เลข index ของรายการจากรายงานบัญชี,
    "confidence": ค่าความมั่นใจ 0-1,
    "reason": "เหตุผลสั้นๆ เป็นภาษาไทย"
  }
]

ตอบด้วย JSON เท่านั้น ไม่ต้องอธิบาย`;
}
