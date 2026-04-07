"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Tags } from "lucide-react";
import type { TransactionFieldsConfig, FormWatch, InternalCompanyOption } from "./transaction-fields-types";
import type { ContactSummary } from "@/types";
import { DocumentSettingsBlock } from "./DocumentSettingsBlock";
import { formatCurrency, formatThaiDateLong } from "@/lib/utils/tax-calculator";

interface TransactionFieldsViewModeProps {
  config: TransactionFieldsConfig;
  companyCode: string;
  watch: FormWatch;
  selectedContact: ContactSummary | null;
  oneTimeContactName?: string;
  selectedAccount: string | null;
  selectedCategory: string | null;
  referenceUrls: string[];
  renderAdditionalFields?: () => React.ReactNode;
  internalCompanyId?: string | null;
  accessibleCompanies: InternalCompanyOption[];
  isWht: boolean;
  whtDeliveryMethod?: string | null;
  whtDeliveryEmail?: string | null;
  whtDeliveryNotes?: string | null;
  taxInvoiceRequestMethod?: string | null;
  taxInvoiceRequestEmail?: string | null;
  taxInvoiceRequestNotes?: string | null;
  hasDocument?: boolean;
  layout?: "default" | "sectioned";
}

export function TransactionFieldsViewMode({
  config,
  companyCode,
  watch,
  selectedContact,
  oneTimeContactName,
  selectedAccount,
  selectedCategory,
  referenceUrls,
  renderAdditionalFields,
  internalCompanyId,
  accessibleCompanies,
  isWht,
  whtDeliveryMethod,
  whtDeliveryEmail,
  whtDeliveryNotes,
  taxInvoiceRequestMethod,
  taxInvoiceRequestEmail,
  taxInvoiceRequestNotes,
  hasDocument,
  layout = "default",
}: TransactionFieldsViewModeProps) {
  const watchDate = watch(config.dateField.name);

  const [accountDetails, setAccountDetails] = useState<{ code: string; name: string } | null>(null);
  const [categoryDetails, setCategoryDetails] = useState<{ name: string; parentName?: string } | null>(null);

  useEffect(() => {
    if (selectedAccount) {
      fetch(`/api/${companyCode}/accounts/${selectedAccount}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((json) => {
          const account = json.success ? json.data?.account : json;
          if (account?.code && account?.name) {
            setAccountDetails({ code: account.code, name: account.name });
          }
        })
        .catch(() => setAccountDetails(null));
    }
  }, [selectedAccount, companyCode]);

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryDetails(null);
      return;
    }
    fetch(`/api/${companyCode}/categories`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        const groups = json.success ? json.data?.categories : [];
        if (!Array.isArray(groups)) return;
        for (const group of groups) {
          if (group.id === selectedCategory) {
            setCategoryDetails({ name: group.name });
            return;
          }
          if (Array.isArray(group.Children)) {
            const child = group.Children.find((c: { id: string }) => c.id === selectedCategory);
            if (child) {
              setCategoryDetails({ name: child.name, parentName: group.name });
              return;
            }
          }
        }
        setCategoryDetails(null);
      })
      .catch(() => setCategoryDetails(null));
  }, [selectedCategory, companyCode]);

  const watchDocumentType = watch("documentType") as string | undefined;

  // -----------------------------------------------------------------------
  // Shared field blocks
  // -----------------------------------------------------------------------

  const dateField = (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{config.dateField.label}</p>
      <p className="text-base font-semibold text-foreground">
        {watchDate
          ? formatThaiDateLong(new Date(watchDate as string))
          : "-"}
      </p>
    </div>
  );

  const amountField = (
    <div>
      <p className="text-sm text-muted-foreground mb-1">
        {(watch("vatRate") as number) > 0 ? "จำนวนเงิน (ก่อน VAT)" : "จำนวนเงิน"}
      </p>
      <p className="text-xl font-bold text-foreground">
        {formatCurrency((watch("amount") as number) || 0)}
      </p>
    </div>
  );

  const contactField = (
    <div>
      <p className="text-sm text-muted-foreground mb-1">
        {config.type === "expense" ? "ผู้ติดต่อ / ร้านค้า" : "ลูกค้า / ผู้ติดต่อ"}
      </p>
      <p className="text-base font-semibold text-foreground">
        {selectedContact?.name || oneTimeContactName || (
          <span className="text-muted-foreground font-normal">-</span>
        )}
      </p>
    </div>
  );

  const accountField = (
    <div>
      <p className="text-sm text-muted-foreground mb-1">บัญชี</p>
      <p className="text-base font-semibold text-foreground">
        {accountDetails ? (
          `${accountDetails.code} ${accountDetails.name}`
        ) : (
          <span className="text-muted-foreground font-normal">-</span>
        )}
      </p>
    </div>
  );

  const categoryFieldBlock = selectedCategory ? (
    <div>
      <p className="text-sm text-muted-foreground mb-1">หมวดหมู่</p>
      <p className="text-base font-semibold text-foreground">
        {categoryDetails ? (
          categoryDetails.parentName
            ? `${categoryDetails.parentName} › ${categoryDetails.name}`
            : categoryDetails.name
        ) : (
          <span className="text-muted-foreground font-normal">-</span>
        )}
      </p>
    </div>
  ) : null;

  const internalCompanyField = config.type === "expense" && internalCompanyId ? (
    <div>
      <p className="text-sm text-muted-foreground mb-1">บริษัทภายใน (เป็นค่าใช้จ่ายจริงของ)</p>
      <p className="text-base font-semibold text-foreground">
        {accessibleCompanies.find((c) => c.id === internalCompanyId)?.name || (
          <span className="text-muted-foreground font-normal">-</span>
        )}
      </p>
    </div>
  ) : null;

  const descriptionFieldBlock = config.descriptionField ? (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{config.descriptionField.label}</p>
      <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
        {(watch(config.descriptionField.name) as string) || (
          <span className="text-muted-foreground">-</span>
        )}
      </p>
    </div>
  ) : null;

  const docSettingsBlock = (
    <DocumentSettingsBlock
      mode="view"
      configType={config.type}
      documentType={watchDocumentType}
      isWht={isWht}
      selectedContact={selectedContact}
      whtDeliveryMethod={whtDeliveryMethod ?? null}
      whtDeliveryEmail={whtDeliveryEmail ?? null}
      whtDeliveryNotes={whtDeliveryNotes ?? null}
      taxInvoiceRequestMethod={taxInvoiceRequestMethod ?? null}
      taxInvoiceRequestEmail={taxInvoiceRequestEmail ?? null}
      taxInvoiceRequestNotes={taxInvoiceRequestNotes ?? null}
      hasDocument={hasDocument}
      referenceUrls={referenceUrls}
    />
  );

  // -----------------------------------------------------------------------
  // Sectioned layout
  // -----------------------------------------------------------------------

  if (layout === "sectioned") {
    return (
      <div className="space-y-5">
        {/* Section 1: ข้อมูลรายการ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">ข้อมูลรายการ</span>
          </div>

          <div className="grid grid-cols-2 gap-x-12">
            {dateField}
            {contactField}
          </div>

          {descriptionFieldBlock}
        </div>

        {/* Section 2: การจำแนกทางบัญชี */}
        <div className="space-y-4">
          <div className="border-t border-border pt-5 flex items-center gap-2">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">การจำแนกทางบัญชี</span>
          </div>

          <div className="grid grid-cols-2 gap-x-12">
            {categoryFieldBlock || (
              <div>
                <p className="text-sm text-muted-foreground mb-1">หมวดหมู่</p>
                <p className="text-base text-muted-foreground font-normal">-</p>
              </div>
            )}
            {accountField}
          </div>

          {internalCompanyField}
          {renderAdditionalFields?.()}
        </div>

        {docSettingsBlock}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Default layout (backwards compatible)
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-x-12">
        {dateField}
        {amountField}
      </div>

      <div className="grid grid-cols-2 gap-x-12">
        {contactField}
        {accountField}
      </div>

      {categoryFieldBlock}
      {internalCompanyField}
      {descriptionFieldBlock}
      {renderAdditionalFields?.()}
      {docSettingsBlock}
    </div>
  );
}
