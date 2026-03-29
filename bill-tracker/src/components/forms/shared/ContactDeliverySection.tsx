"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Send, FileText } from "lucide-react";
import { DELIVERY_METHODS, TAX_INVOICE_REQUEST_METHODS } from "@/lib/constants/delivery-methods";
import type { ContactFormSectionProps } from "./contact-form-types";

export function ContactDeliverySection({ formData, setFormData }: ContactFormSectionProps) {
  return (
    <>
      {/* Delivery Preferences */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-blue-500" />
          <h3 className="font-medium text-sm">วิธีส่งเอกสาร</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          กำหนดวิธีการส่งเอกสาร (ใบหัก ณ ที่จ่าย ฯลฯ) ให้ผู้ติดต่อนี้
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-deliveryMethod">วิธีส่งที่ต้องการ</Label>
            <Select
              value={formData.preferredDeliveryMethod || "__NONE__"}
              onValueChange={(value) => setFormData({ ...formData, preferredDeliveryMethod: value === "__NONE__" ? "" : value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="ไม่ระบุ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">ไม่ระบุ</SelectItem>
                {DELIVERY_METHODS.map((method) => {
                  const Icon = method.Icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {method.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {formData.preferredDeliveryMethod === "EMAIL" && (
            <div className="space-y-2">
              <Label htmlFor="contact-deliveryEmail">อีเมลสำหรับส่งเอกสาร</Label>
              <Input
                id="contact-deliveryEmail"
                type="email"
                value={formData.deliveryEmail}
                onChange={(e) => setFormData({ ...formData, deliveryEmail: e.target.value })}
                placeholder={formData.email || "email@example.com"}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                หากไม่ระบุจะใช้อีเมลหลักของผู้ติดต่อ
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contact-deliveryNotes">หมายเหตุการส่ง</Label>
            <Input
              id="contact-deliveryNotes"
              value={formData.deliveryNotes}
              onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
              placeholder="เช่น ส่งถึงคุณสมชาย ฝ่ายบัญชี"
              className="h-10"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Tax Invoice Request Preferences */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-500" />
          <h3 className="font-medium text-sm">วิธีขอใบกำกับภาษี</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          กำหนดช่องทางการขอใบกำกับภาษีจากผู้ติดต่อนี้ (เพื่อให้พนักงานบัญชีรู้ว่าต้องติดต่อทางไหน)
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-taxInvoiceRequestMethod">ช่องทางขอใบกำกับ</Label>
            <Select
              value={formData.taxInvoiceRequestMethod || "__NONE__"}
              onValueChange={(value) => setFormData({ ...formData, taxInvoiceRequestMethod: value === "__NONE__" ? "" : value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="ไม่ระบุ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">ไม่ระบุ</SelectItem>
                {TAX_INVOICE_REQUEST_METHODS.map((method) => {
                  const Icon = method.Icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {method.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {formData.taxInvoiceRequestMethod === "EMAIL" && (
            <div className="space-y-2">
              <Label htmlFor="contact-taxInvoiceRequestEmail">อีเมลสำหรับขอใบกำกับ</Label>
              <Input
                id="contact-taxInvoiceRequestEmail"
                type="email"
                value={formData.taxInvoiceRequestEmail}
                onChange={(e) => setFormData({ ...formData, taxInvoiceRequestEmail: e.target.value })}
                placeholder={formData.email || "email@example.com"}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                หากไม่ระบุจะใช้อีเมลหลักของผู้ติดต่อ
              </p>
            </div>
          )}

          {formData.taxInvoiceRequestMethod === "SHOPEE" && (
            <div className="space-y-2">
              <Label htmlFor="contact-taxInvoiceRequestNotes">
                ชื่อแชทร้าน / ลิงค์ Shopee <span className="text-orange-500">(จำเป็น)</span>
              </Label>
              <Input
                id="contact-taxInvoiceRequestNotes"
                value={formData.taxInvoiceRequestNotes}
                onChange={(e) => setFormData({ ...formData, taxInvoiceRequestNotes: e.target.value })}
                placeholder="เช่น ชื่อร้าน Shopee หรือ https://shopee.co.th/..."
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                ระบุชื่อแชทร้านหรือลิงค์ เพื่อให้บัญชีไปตามทวงใบกำกับได้
              </p>
            </div>
          )}

          {formData.taxInvoiceRequestMethod !== "SHOPEE" && (
            <div className="space-y-2">
              <Label htmlFor="contact-taxInvoiceRequestNotes">
                {formData.taxInvoiceRequestMethod === "OTHER" ? "ระบุช่องทาง / รายละเอียด" : "หมายเหตุการขอใบกำกับ"}
              </Label>
              <Input
                id="contact-taxInvoiceRequestNotes"
                value={formData.taxInvoiceRequestNotes}
                onChange={(e) => setFormData({ ...formData, taxInvoiceRequestNotes: e.target.value })}
                placeholder={
                  formData.taxInvoiceRequestMethod === "OTHER"
                    ? "ระบุช่องทาง เช่น Facebook, Lazada, เว็บไซต์ร้านค้า..."
                    : "เช่น ติดต่อคุณสมชาย 081-xxx-xxxx ฝ่ายบัญชี"
                }
                className="h-10"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
