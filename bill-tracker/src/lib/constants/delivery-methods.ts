/**
 * Delivery Methods Constants
 * วิธีการส่งเอกสาร (ใบหัก ณ ที่จ่าย ฯลฯ)
 * Values match the Prisma DeliveryMethod enum
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

export interface DeliveryMethodOption {
  value: string;
  label: string;
  Icon: LucideIcon;
}

export const DELIVERY_METHODS: DeliveryMethodOption[] = [
  { value: "EMAIL", label: "อีเมล", Icon: Mail },
  { value: "PHYSICAL", label: "ส่งตัวจริง (ไปรษณีย์/messenger)", Icon: Package },
  { value: "LINE", label: "LINE", Icon: MessageCircle },
  { value: "PICKUP", label: "มารับเอง", Icon: Building2 },
  { value: "GOOGLE_DRIVE", label: "Google Drive", Icon: Cloud },
];

/**
 * Tax Invoice Request Methods
 * ช่องทางขอใบกำกับภาษี - รวม DELIVERY_METHODS + ช่องทางเพิ่มเติม (Shopee, อื่นๆ)
 */
export const TAX_INVOICE_REQUEST_METHODS: DeliveryMethodOption[] = [
  ...DELIVERY_METHODS,
  { value: "SHOPEE", label: "Shopee", Icon: ShoppingBag },
  { value: "OTHER", label: "อื่นๆ", Icon: MoreHorizontal },
];

/**
 * Get delivery method by value
 */
export function getDeliveryMethod(value: string | null | undefined): DeliveryMethodOption | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return DELIVERY_METHODS.find((m) => m.value === value || m.value === upper);
}

/**
 * Get tax invoice request method by value
 */
export function getTaxInvoiceRequestMethod(value: string | null | undefined): DeliveryMethodOption | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return TAX_INVOICE_REQUEST_METHODS.find((m) => m.value === value || m.value === upper);
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
