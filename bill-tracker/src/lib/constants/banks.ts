/**
 * รายชื่อธนาคารไทยหลัก
 * สำหรับ dropdown ในหน้าเบิกจ่าย
 */

export interface ThaiBank {
  code: string;
  name: string;
  nameFull: string;
}

export const THAI_BANKS: ThaiBank[] = [
  {
    code: "KBANK",
    name: "กสิกรไทย",
    nameFull: "ธนาคารกสิกรไทย",
  },
  {
    code: "BBL",
    name: "กรุงเทพ",
    nameFull: "ธนาคารกรุงเทพ",
  },
  {
    code: "KTB",
    name: "กรุงไทย",
    nameFull: "ธนาคารกรุงไทย",
  },
  {
    code: "SCB",
    name: "ไทยพาณิชย์",
    nameFull: "ธนาคารไทยพาณิชย์",
  },
  {
    code: "BAY",
    name: "กรุงศรีอยุธยา",
    nameFull: "ธนาคารกรุงศรีอยุธยา",
  },
  {
    code: "TTB",
    name: "ทหารไทยธนชาต",
    nameFull: "ธนาคารทหารไทยธนชาต",
  },
  {
    code: "GSB",
    name: "ออมสิน",
    nameFull: "ธนาคารออมสิน",
  },
  {
    code: "KKP",
    name: "เกียรตินาคินภัทร",
    nameFull: "ธนาคารเกียรตินาคินภัทร",
  },
  {
    code: "CIMB",
    name: "ซีไอเอ็มบีไทย",
    nameFull: "ธนาคารซีไอเอ็มบีไทย",
  },
  {
    code: "UOB",
    name: "ยูโอบี",
    nameFull: "ธนาคารยูโอบี",
  },
];

/**
 * Get bank name by code
 */
export function getBankName(code: string): string {
  const bank = THAI_BANKS.find((b) => b.code === code);
  return bank ? bank.name : code;
}

/**
 * Get bank full name by code
 */
export function getBankFullName(code: string): string {
  const bank = THAI_BANKS.find((b) => b.code === code);
  return bank ? bank.nameFull : code;
}
