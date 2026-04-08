"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { getDeliveryMethod, DELIVERY_METHODS } from "@/lib/constants/delivery-methods";
import { MethodDropdown } from "./MethodDropdown";
import { useTransactionFormContext } from "../TransactionFormContext";
import type { ContactSummary } from "@/types";

interface WhtDeliverySectionViewProps {
  mode: "view";
  whtDeliveryMethod?: string | null;
  whtDeliveryNotes?: string | null;
  whtDeliveryEmail?: string | null;
  selectedContact: ContactSummary | null;
}

interface WhtDeliverySectionEditProps {
  mode: "edit";
}

type WhtDeliverySectionProps = WhtDeliverySectionEditProps | WhtDeliverySectionViewProps;

export function WhtDeliverySection(props: WhtDeliverySectionProps) {
  if (props.mode === "view") {
    return <WhtDeliveryView {...props} />;
  }
  return <WhtDeliveryEdit />;
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

function WhtDeliveryEdit() {
  const {
    selectedContact,
    whtDeliveryMethod,
    onWhtDeliveryMethodChange,
    whtDeliveryEmail,
    onWhtDeliveryEmailChange,
    whtDeliveryNotes,
    onWhtDeliveryNotesChange,
    updateContactDelivery,
    onUpdateContactDeliveryChange,
  } = useTransactionFormContext();

  const isAutoFilled = !!(whtDeliveryMethod && selectedContact?.preferredDeliveryMethod &&
    whtDeliveryMethod.toUpperCase() === selectedContact.preferredDeliveryMethod.toUpperCase());

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <Label className="text-sm font-medium">วิธีส่งเอกสาร (ใบหัก ณ ที่จ่าย)</Label>
        {isAutoFilled && (
          <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-full">
            จากผู้ติดต่อ
          </span>
        )}
      </div>

      <MethodDropdown
        value={whtDeliveryMethod ?? null}
        onValueChange={(v) => onWhtDeliveryMethodChange?.(v || null)}
        options={DELIVERY_METHODS}
        placeholder="เลือกวิธีส่งเอกสาร *"
        className="bg-background"
      />

      {whtDeliveryMethod === "EMAIL" && onWhtDeliveryEmailChange && (
        <Input
          type="email"
          placeholder="อีเมลสำหรับส่งเอกสาร"
          value={whtDeliveryEmail || ""}
          onChange={(e) => onWhtDeliveryEmailChange(e.target.value || null)}
          className="h-9 bg-background"
        />
      )}

      {onWhtDeliveryNotesChange && (
        <Textarea
          placeholder="หมายเหตุการส่ง (ถ้ามี)"
          value={whtDeliveryNotes || ""}
          onChange={(e) => onWhtDeliveryNotesChange(e.target.value || null)}
          className="min-h-[40px] bg-background resize-none"
          rows={1}
        />
      )}

      {selectedContact && onUpdateContactDeliveryChange && whtDeliveryMethod && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="updateContactDelivery"
            checked={updateContactDelivery}
            onCheckedChange={(checked) => onUpdateContactDeliveryChange(checked === true)}
          />
          <label
            htmlFor="updateContactDelivery"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            บันทึกเป็นค่าเริ่มต้นของ &quot;{selectedContact.name}&quot;
          </label>
        </div>
      )}
    </div>
  );
}
