export interface LineNotifyConfig {
  token: string;
}

export interface ExpenseNotification {
  companyName: string;
  vendorName?: string;
  amount: number;
  vatAmount?: number;
  whtRate?: number;
  whtAmount?: number;
  netPaid: number;
  description?: string;
  status: string;
}

export interface IncomeNotification {
  companyName: string;
  customerName?: string;
  amount: number;
  vatAmount?: number;
  whtRate?: number;
  whtAmount?: number;
  netReceived: number;
  source?: string;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  WAITING_FOR_DOC: "รอใบเสร็จ",
  PENDING_PHYSICAL: "รอส่งบัญชี",
  READY_TO_SEND: "พร้อมส่ง",
  SENT_TO_ACCOUNT: "ส่งแล้ว",
  NO_DOC_REQUIRED: "ไม่ต้องทำเอกสาร",
  WAITING_ISSUE: "รอออกบิล",
  WAITING_WHT_CERT: "รอใบ 50 ทวิ",
  PENDING_COPY_SEND: "รอส่งสำเนา",
  SENT_COPY: "ส่งแล้ว",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function sendLineNotify(
  message: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`LINE Notify failed: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("LINE Notify error:", error);
    return false;
  }
}

export function formatExpenseNotification(data: ExpenseNotification): string {
  const lines = [
    `\n[${data.companyName}] 💸 รายจ่าย`,
    `${data.vendorName || "ไม่ระบุผู้ขาย"}${data.description ? ` - ${data.description}` : ""}`,
    ``,
    `จำนวน: ฿${formatCurrency(data.amount)}`,
  ];

  if (data.vatAmount && data.vatAmount > 0) {
    lines.push(`VAT 7%: +฿${formatCurrency(data.vatAmount)}`);
  }

  if (data.whtAmount && data.whtAmount > 0) {
    lines.push(
      `หัก ณ ที่จ่าย ${data.whtRate}%: -฿${formatCurrency(data.whtAmount)}`
    );
  }

  lines.push(
    ``,
    `โอนจริง: ฿${formatCurrency(data.netPaid)}`,
    `สถานะ: ${STATUS_LABELS[data.status] || data.status}`
  );

  if (data.status === "WAITING_FOR_DOC") {
    lines.push(`⚠️ อย่าลืมขอใบเสร็จ!`);
  }

  if (data.whtAmount && data.whtAmount > 0) {
    lines.push(`📄 ต้องได้ใบ 50 ทวิ มาด้วย!`);
  }

  return lines.join("\n");
}

export function formatIncomeNotification(data: IncomeNotification): string {
  const lines = [
    `\n[${data.companyName}] 💰 รายรับ`,
    `${data.customerName || "ไม่ระบุลูกค้า"}${data.source ? ` - ${data.source}` : ""}`,
    ``,
    `จำนวน: ฿${formatCurrency(data.amount)}`,
  ];

  if (data.vatAmount && data.vatAmount > 0) {
    lines.push(`VAT 7%: +฿${formatCurrency(data.vatAmount)}`);
  }

  if (data.whtAmount && data.whtAmount > 0) {
    lines.push(
      `โดนหัก ${data.whtRate}%: -฿${formatCurrency(data.whtAmount)}`
    );
  }

  lines.push(
    ``,
    `รับจริง: ฿${formatCurrency(data.netReceived)}`,
    `สถานะ: ${STATUS_LABELS[data.status] || data.status}`
  );

  if (data.whtAmount && data.whtAmount > 0) {
    lines.push(`🔴 ต้องทวงใบ 50 ทวิ จากลูกค้า!`);
  }

  return lines.join("\n");
}

export async function notifyExpense(
  data: ExpenseNotification,
  token: string
): Promise<boolean> {
  const message = formatExpenseNotification(data);
  return await sendLineNotify(message, token);
}

export async function notifyIncome(
  data: IncomeNotification,
  token: string
): Promise<boolean> {
  const message = formatIncomeNotification(data);
  return await sendLineNotify(message, token);
}

// Budget alert
export async function notifyBudgetAlert(
  companyName: string,
  category: string,
  spent: number,
  budget: number,
  percentage: number,
  token: string
): Promise<boolean> {
  const message = [
    `\n[${companyName}] ⚠️ แจ้งเตือนงบประมาณ`,
    ``,
    `หมวด: ${category}`,
    `ใช้ไป: ฿${formatCurrency(spent)}`,
    `งบประมาณ: ฿${formatCurrency(budget)}`,
    ``,
    `📊 ใช้แล้ว ${percentage.toFixed(0)}%`,
    percentage >= 100
      ? `🔴 เกินงบประมาณแล้ว!`
      : percentage >= 80
        ? `🟠 ใกล้เกินงบแล้ว!`
        : "",
  ].join("\n");

  return await sendLineNotify(message, token);
}
