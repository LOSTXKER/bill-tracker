"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactSelector } from "./ContactSelector";
import { HierarchicalCategorySelector as CategorySelector } from "./HierarchicalCategorySelector";
import { DatePicker } from "./DatePicker";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import { AmountInput } from "./AmountInput";
import type { ContactSummary, CategorySummary } from "@/types";

// =============================================================================
// Types
// =============================================================================

export interface TransactionFieldValues {
  amount: number;
  vatRate: number;
  billDate?: Date;
  receiveDate?: Date;
  dueDate?: Date | null;
  description?: string;
  source?: string;
  invoiceNumber?: string;
  referenceNo?: string;
  paymentMethod: string;
  notes?: string;
  status?: string;
}

export interface SharedTransactionFieldsProps {
  // Mode
  mode: "create" | "edit" | "view";
  transactionType: "expense" | "income";

  // Data
  values: Partial<TransactionFieldValues>;
  onChange: (field: string, value: any) => void;

  // Contact
  contacts: ContactSummary[];
  contactsLoading: boolean;
  selectedContact: ContactSummary | null;
  onContactSelect: (contact: ContactSummary | null) => void;
  onContactCreated?: (contact: ContactSummary) => void;
  companyCode: string;

  // Category
  categories: CategorySummary[];
  categoriesLoading: boolean;
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onCategoryCreated?: (category: CategorySummary) => void;

  // Optional configs
  showDueDate?: boolean;
  showInvoiceNumber?: boolean;
  showReferenceNo?: boolean;
  showNotes?: boolean;
  showStatus?: boolean;
  statusOptions?: { value: string; label: string }[];

  // Form register (for create mode with react-hook-form)
  register?: any;
}

// =============================================================================
// Component
// =============================================================================

export function SharedTransactionFields({
  mode,
  transactionType,
  values,
  onChange,
  contacts,
  contactsLoading,
  selectedContact,
  onContactSelect,
  onContactCreated,
  companyCode,
  categories,
  categoriesLoading,
  selectedCategory,
  onCategorySelect,
  onCategoryCreated,
  showDueDate = true,
  showInvoiceNumber = true,
  showReferenceNo = true,
  showNotes = true,
  showStatus = false,
  statusOptions = [],
  register,
}: SharedTransactionFieldsProps) {
  const isEditable = mode !== "view";
  const dateFieldName = transactionType === "expense" ? "billDate" : "receiveDate";
  const dateLabel = transactionType === "expense" ? "วันที่จ่ายเงิน" : "วันที่รับเงิน";
  const descriptionFieldName = transactionType === "expense" ? "description" : "source";
  const descriptionLabel = transactionType === "expense" ? "รายละเอียด" : "แหล่งที่มา/รายละเอียด";
  const contactLabel = transactionType === "expense" ? "ผู้ติดต่อ / ร้านค้า" : "ลูกค้า / ผู้ติดต่อ";
  const paymentLabel = transactionType === "expense" ? "วิธีชำระเงิน" : "วิธีรับเงิน";

  const dateValue = values[dateFieldName] as Date | undefined;
  const descriptionValue = values[descriptionFieldName] as string | undefined;

  return (
    <div className="space-y-6">
      {/* Row 1: Date & Amount */}
      <div className="grid sm:grid-cols-2 gap-4">
        {isEditable ? (
          <DatePicker
            label={dateLabel}
            value={dateValue}
            onChange={(date) => onChange(dateFieldName, date || new Date())}
            required
          />
        ) : (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{dateLabel}</Label>
            <p className="text-sm font-medium">
              {dateValue
                ? new Date(dateValue).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "-"}
            </p>
          </div>
        )}

        {isEditable && register ? (
          <AmountInput register={register} name="amount" />
        ) : isEditable ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              จำนวนเงิน (ก่อน VAT) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={values.amount || ""}
              onChange={(e) => onChange("amount", parseFloat(e.target.value) || 0)}
              className="h-11 bg-muted/30 text-lg font-semibold"
              placeholder="0.00"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">จำนวนเงิน (ก่อน VAT)</Label>
            <p className="text-lg font-semibold">
              {new Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
              }).format(values.amount || 0)}
            </p>
          </div>
        )}
      </div>

      {/* Row 2: Contact & Category */}
      <div className="grid sm:grid-cols-2 gap-4">
        {isEditable ? (
          <ContactSelector
            contacts={contacts}
            isLoading={contactsLoading}
            selectedContact={selectedContact}
            onSelect={onContactSelect}
            label={contactLabel}
            placeholder="เลือกผู้ติดต่อ..."
            companyCode={companyCode}
            onContactCreated={onContactCreated}
            required
          />
        ) : (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{contactLabel}</Label>
            <p className="text-sm font-medium">
              {selectedContact?.name || "-"}
            </p>
          </div>
        )}

        {isEditable ? (
          <CategorySelector
            categories={categories}
            isLoading={categoriesLoading}
            selectedCategory={selectedCategory}
            onSelect={onCategorySelect}
            label="หมวดหมู่"
            placeholder="เลือกหมวดหมู่"
            companyCode={companyCode}
            categoryType={transactionType.toUpperCase() as "EXPENSE" | "INCOME"}
            onCategoryCreated={onCategoryCreated}
            required
          />
        ) : (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">หมวดหมู่</Label>
            <p className="text-sm font-medium">
              {categories.find((c) => c.id === selectedCategory)?.name || "-"}
            </p>
          </div>
        )}
      </div>

      {/* Row 3: Description */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          {descriptionLabel} <span className="text-red-500">*</span>
        </Label>
        {isEditable ? (
          register ? (
            <Input
              placeholder={`เช่น ${transactionType === "expense" ? "ค่าหมึกพิมพ์ DTF" : "ค่าสกรีนเสื้อ 100 ตัว"}`}
              className="h-11 bg-muted/30 border-border focus:bg-background transition-colors"
              {...register(descriptionFieldName)}
              required
            />
          ) : (
            <Input
              value={descriptionValue || ""}
              onChange={(e) => onChange(descriptionFieldName, e.target.value)}
              placeholder={descriptionLabel}
              className="h-11 bg-muted/30"
              required
            />
          )
        ) : (
          <p className="text-sm font-medium">{descriptionValue || "-"}</p>
        )}
      </div>

      {/* Row 4: Due Date & Payment Method */}
      <div className="grid sm:grid-cols-2 gap-4">
        {showDueDate && (
          isEditable ? (
            <DatePicker
              label="วันครบกำหนด (ถ้ามี)"
              value={values.dueDate as Date | undefined}
              onChange={(date) => onChange("dueDate", date || null)}
            />
          ) : (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">วันครบกำหนด</Label>
              <p className="text-sm font-medium">
                {values.dueDate
                  ? new Date(values.dueDate).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </p>
            </div>
          )
        )}

        {isEditable ? (
          <PaymentMethodSelect
            value={values.paymentMethod || "BANK_TRANSFER"}
            onChange={(value) => onChange("paymentMethod", value)}
            label={paymentLabel}
          />
        ) : (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{paymentLabel}</Label>
            <p className="text-sm font-medium">
              {values.paymentMethod === "CASH" ? "เงินสด" :
               values.paymentMethod === "BANK_TRANSFER" ? "โอนเงิน" :
               values.paymentMethod === "CREDIT_CARD" ? "บัตรเครดิต" :
               values.paymentMethod === "PROMPTPAY" ? "พร้อมเพย์" :
               values.paymentMethod === "CHEQUE" ? "เช็ค" : "-"}
            </p>
          </div>
        )}
      </div>

      {/* Row 5: Invoice Number & Reference No */}
      {(showInvoiceNumber || showReferenceNo) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {showInvoiceNumber && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">เลขที่ใบกำกับ</Label>
              {isEditable ? (
                register ? (
                  <Input
                    placeholder="เลขที่ใบกำกับภาษี"
                    className="h-11 bg-muted/30"
                    {...register("invoiceNumber")}
                  />
                ) : (
                  <Input
                    value={values.invoiceNumber || ""}
                    onChange={(e) => onChange("invoiceNumber", e.target.value)}
                    placeholder="เลขที่ใบกำกับภาษี"
                    className="h-11 bg-muted/30"
                  />
                )
              ) : (
                <p className="text-sm font-medium">{values.invoiceNumber || "-"}</p>
              )}
            </div>
          )}

          {showReferenceNo && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">เลขอ้างอิง</Label>
              {isEditable ? (
                register ? (
                  <Input
                    placeholder="เลขอ้างอิง"
                    className="h-11 bg-muted/30"
                    {...register("referenceNo")}
                  />
                ) : (
                  <Input
                    value={values.referenceNo || ""}
                    onChange={(e) => onChange("referenceNo", e.target.value)}
                    placeholder="เลขอ้างอิง"
                    className="h-11 bg-muted/30"
                  />
                )
              ) : (
                <p className="text-sm font-medium">{values.referenceNo || "-"}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Row 6: Status */}
      {showStatus && statusOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">สถานะเอกสาร</Label>
          {isEditable ? (
            <Select
              value={values.status || ""}
              onValueChange={(v) => onChange("status", v)}
            >
              <SelectTrigger className="h-11 bg-muted/30">
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium">
              {statusOptions.find((o) => o.value === values.status)?.label || "-"}
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {showNotes && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">หมายเหตุ</Label>
          {isEditable ? (
            register ? (
              <Textarea
                placeholder="หมายเหตุเพิ่มเติม..."
                className="min-h-[80px] bg-muted/30"
                {...register("notes")}
              />
            ) : (
              <Textarea
                value={values.notes || ""}
                onChange={(e) => onChange("notes", e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม..."
                className="min-h-[80px] bg-muted/30"
              />
            )
          ) : (
            <p className="text-sm font-medium whitespace-pre-wrap">
              {values.notes || "-"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
