/**
 * Delivery Methods Constants
 * วิธีการส่งเอกสาร (ใบหัก ณ ที่จ่าย ฯลฯ)
 */

import {
  Mail,
  Package,
  MessageCircle,
  Building2,
  Cloud,
  ShoppingBag,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface DeliveryMethod {
  value: string;
  label: string;
  Icon: LucideIcon;
}

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { value: "email", label: "อีเมล", Icon: Mail },
  { value: "physical", label: "ส่งตัวจริง (ไปรษณีย์/messenger)", Icon: Package },
  { value: "line", label: "LINE", Icon: MessageCircle },
  { value: "pickup", label: "มารับเอง", Icon: Building2 },
  { value: "google_drive", label: "Google Drive", Icon: Cloud },
];

/**
 * Tax Invoice Request Methods
 * ช่องทางขอใบกำกับภาษี - รวม DELIVERY_METHODS + ช่องทางเพิ่มเติม (Shopee, อื่นๆ)
 */
export const TAX_INVOICE_REQUEST_METHODS: DeliveryMethod[] = [
  ...DELIVERY_METHODS,
  { value: "shopee", label: "Shopee", Icon: ShoppingBag },
  { value: "other", label: "อื่นๆ", Icon: MoreHorizontal },
];

/**
 * Get delivery method by value
 */
export function getDeliveryMethod(value: string | null | undefined): DeliveryMethod | undefined {
  if (!value) return undefined;
  return DELIVERY_METHODS.find((m) => m.value === value);
}

/**
 * Get tax invoice request method by value
 */
export function getTaxInvoiceRequestMethod(value: string | null | undefined): DeliveryMethod | undefined {
  if (!value) return undefined;
  return TAX_INVOICE_REQUEST_METHODS.find((m) => m.value === value);
}

/**
 * Get delivery method label
 */
export function getDeliveryMethodLabel(value: string | null | undefined): string {
  const method = getDeliveryMethod(value);
  return method?.label || value || "ไม่ระบุ";
}

/**
 * Get tax invoice request method label
 */
export function getTaxInvoiceRequestMethodLabel(value: string | null | undefined): string {
  const method = getTaxInvoiceRequestMethod(value);
  return method?.label || value || "ไม่ระบุ";
}
