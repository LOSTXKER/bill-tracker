"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { getDeliveryMethod, DELIVERY_METHODS } from "@/lib/constants/delivery-methods";
import type { ContactSummary } from "@/types";

interface WhtDeliverySectionEditProps {
  mode: "edit";
  whtDeliveryMethod: string | null;
  onWhtDeliveryMethodChange: (method: string | null) => void;
  whtDeliveryEmail?: string | null;
  onWhtDeliveryEmailChange?: (email: string | null) => void;
  whtDeliveryNotes?: string | null;
  onWhtDeliveryNotesChange?: (notes: string | null) => void;
  updateContactDelivery?: boolean;
  onUpdateContactDeliveryChange?: (update: boolean) => void;
  selectedContact: ContactSummary | null;
}

interface WhtDeliverySectionViewProps {
  mode: "view";
  whtDeliveryMethod?: string | null;
  whtDeliveryNotes?: string | null;
  whtDeliveryEmail?: string | null;
  selectedContact: ContactSummary | null;
}

type WhtDeliverySectionProps = WhtDeliverySectionEditProps | WhtDeliverySectionViewProps;

export function WhtDeliverySection(props: WhtDeliverySectionProps) {
  if (props.mode === "view") {
    return <WhtDeliveryView {...props} />;
  }
  return <WhtDeliveryEdit {...props} />;
}

function WhtDeliveryView({
  whtDeliveryMethod,
  whtDeliveryEmail,
  whtDeliveryNotes,
  selectedContact,
}: WhtDeliverySectionViewProps) {
  const displayMethod = whtDeliveryMethod || selectedContact?.preferredDeliveryMethod;
  const displayEmail = whtDeliveryMethod === "EMAIL" ? whtDeliveryEmail : selectedContact?.deliveryEmail;
  const displayNotes = whtDeliveryNotes || selectedContact?.deliveryNotes;

  if (!displayMethod && !displayNotes) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          วิธีส่งเอกสาร (ใบหัก ณ ที่จ่าย)
        </p>
      </div>
      <div className="space-y-2 text-sm">
        {displayMethod && (() => {
          const method = getDeliveryMethod(displayMethod);
          if (!method) return null;
          const Icon = method.Icon;
          return (
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-foreground font-medium">{method.label}</span>
              {displayMethod === "EMAIL" && displayEmail && (
                <span className="text-muted-foreground">({displayEmail})</span>
              )}
            </div>
          );
        })()}
        {displayNotes && (
          <p className="text-muted-foreground pl-6 whitespace-pre-wrap">
            {displayNotes}
          </p>
        )}
      </div>
    </div>
  );
}

function WhtDeliveryEdit({
  whtDeliveryMethod,
  onWhtDeliveryMethodChange,
  whtDeliveryEmail,
  onWhtDeliveryEmailChange,
  whtDeliveryNotes,
  onWhtDeliveryNotesChange,
  updateContactDelivery,
  onUpdateContactDeliveryChange,
  selectedContact,
}: WhtDeliverySectionEditProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
          วิธีส่งเอกสาร (ใบหัก ณ ที่จ่าย)
        </Label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DELIVERY_METHODS.map((method) => {
          const Icon = method.Icon;
          const isSelected = whtDeliveryMethod === method.value;
          return (
            <Button
              key={method.value}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className={`justify-start gap-2 h-auto py-3 ${
                isSelected
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              }`}
              onClick={() => onWhtDeliveryMethodChange(isSelected ? null : method.value)}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{method.label}</span>
            </Button>
          );
        })}
      </div>

      {whtDeliveryMethod === "EMAIL" && onWhtDeliveryEmailChange && (
        <div className="space-y-2">
          <Label className="text-sm text-blue-900 dark:text-blue-100">
            อีเมลสำหรับส่งเอกสาร
          </Label>
          <Input
            type="email"
            placeholder="email@example.com"
            value={whtDeliveryEmail || ""}
            onChange={(e) => onWhtDeliveryEmailChange(e.target.value || null)}
            className="h-10 bg-white dark:bg-background border-blue-200 dark:border-blue-800"
          />
        </div>
      )}

      {onWhtDeliveryNotesChange && (
        <div className="space-y-2">
          <Label className="text-sm text-blue-900 dark:text-blue-100">
            หมายเหตุการส่ง (ถ้ามี)
          </Label>
          <Textarea
            placeholder="เช่น ส่งทุกวันศุกร์, ต้องแนบสำเนาบัตรประชาชน..."
            value={whtDeliveryNotes || ""}
            onChange={(e) => onWhtDeliveryNotesChange(e.target.value || null)}
            className="min-h-[60px] bg-white dark:bg-background border-blue-200 dark:border-blue-800"
          />
        </div>
      )}

      {selectedContact && onUpdateContactDeliveryChange && whtDeliveryMethod && (
        <div className="flex items-center space-x-2 pt-2 border-t border-blue-200 dark:border-blue-800">
          <Checkbox
            id="updateContactDelivery"
            checked={updateContactDelivery}
            onCheckedChange={(checked) => onUpdateContactDeliveryChange(checked === true)}
          />
          <label
            htmlFor="updateContactDelivery"
            className="text-sm text-blue-900 dark:text-blue-100 cursor-pointer"
          >
            บันทึกเป็นค่าเริ่มต้นของ &quot;{selectedContact.name}&quot;
          </label>
        </div>
      )}
    </div>
  );
}
