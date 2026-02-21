import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateText } from "@/lib/ai/gemini";

export interface ReconcileItem {
  id?: string;
  vendorName: string;
  amount: number;
  vatAmount: number;
  date: string;
  taxId?: string;
  invoiceNumber?: string;
}

export interface AISuggestion {
  systemId: string;
  accountingIndex: number;
  confidence: number;
  reason: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ company: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await params;

  try {
    const body = await req.json();
    const { systemItems, accountingItems } = body as {
      systemItems: ReconcileItem[];
      accountingItems: ReconcileItem[];
    };

    if (!systemItems?.length || !accountingItems?.length) {
      return NextResponse.json({ suggestions: [] });
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

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Reconcile AI match error:", error);
    return NextResponse.json({ error: "AI matching failed" }, { status: 500 });
  }
}

function buildMatchingPrompt(
  systemItems: ReconcileItem[],
  accountingItems: ReconcileItem[]
): string {
  const systemList = systemItems
    .map(
      (item, i) =>
        `[${i}] id="${item.id}" ชื่อ="${item.vendorName}" ยอด=${item.amount} VAT=${item.vatAmount} วันที่=${item.date} taxId="${item.taxId ?? ""}"`
    )
    .join("\n");

  const accountingList = accountingItems
    .map(
      (item, i) =>
        `[${i}] ชื่อ="${item.vendorName}" ยอด=${item.amount} VAT=${item.vatAmount} วันที่=${item.date} taxId="${item.taxId ?? ""}"`
    )
    .join("\n");

  return `คุณเป็นผู้เชี่ยวชาญด้านการบัญชีไทย ช่วยจับคู่รายการระหว่างระบบเว็บกับรายงานภาษีของพนักงานบัญชี

ชื่อบริษัทอาจเขียนต่างกัน เช่น "บ.ชมอรรถ การ์เม้นท์ จำกัด" กับ "บริษัท ชมอรรถ การ์เม้นท์ จำกัด" ถือว่าเหมือนกัน
ให้ใช้ยอดเงิน (amount) เป็นตัวหลักในการจับคู่ แล้วใช้ชื่อและวันที่ช่วยยืนยัน

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
