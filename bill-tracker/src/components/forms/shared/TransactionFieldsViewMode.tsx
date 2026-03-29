"use client";

import { useState, useEffect } from "react";
import type { TransactionFieldsConfig, FormWatch, InternalCompanyOption } from "./transaction-fields-types";
import type { ContactSummary } from "@/types";
import { WhtDeliverySection } from "./WhtDeliverySection";
import { TaxInvoiceRequestSection } from "./TaxInvoiceRequestSection";
import { ReferenceUrlsSection } from "./ReferenceUrlsSection";

interface TransactionFieldsViewModeProps {
  config: TransactionFieldsConfig;
  companyCode: string;
  watch: FormWatch;
  selectedContact: ContactSummary | null;
  oneTimeContactName?: string;
  selectedAccount: string | null;
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
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function TransactionFieldsViewMode({
  config,
  companyCode,
  watch,
  selectedContact,
  oneTimeContactName,
  selectedAccount,
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
}: TransactionFieldsViewModeProps) {
  const watchDate = watch(config.dateField.name);

  const [accountDetails, setAccountDetails] = useState<{ code: string; name: string } | null>(null);

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

  const showWhtDelivery = config.type === "expense" && isWht && (
    whtDeliveryMethod || (selectedContact && (selectedContact.preferredDeliveryMethod || selectedContact.deliveryNotes))
  );

  const showTaxInvoice = config.type === "expense" && (
    taxInvoiceRequestMethod || (selectedContact && (selectedContact.taxInvoiceRequestMethod || selectedContact.taxInvoiceRequestNotes))
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-x-12">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{config.dateField.label}</p>
          <p className="text-base font-semibold text-foreground">
            {watchDate
              ? new Date(watchDate as string).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "-"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">จำนวนเงิน (ก่อน VAT)</p>
          <p className="text-xl font-bold text-foreground">
            ฿{formatCurrency((watch("amount") as number) || 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-12">
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
      </div>

      {config.type === "expense" && internalCompanyId && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">บริษัทภายใน (เป็นค่าใช้จ่ายจริงของ)</p>
          <p className="text-base font-semibold text-foreground">
            {accessibleCompanies.find((c) => c.id === internalCompanyId)?.name || (
              <span className="text-muted-foreground font-normal">-</span>
            )}
          </p>
        </div>
      )}

      {config.descriptionField && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">{config.descriptionField.label}</p>
          <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
            {(watch(config.descriptionField.name) as string) || (
              <span className="text-muted-foreground">-</span>
            )}
          </p>
        </div>
      )}

      {renderAdditionalFields?.()}

      {showWhtDelivery && (
        <WhtDeliverySection
          mode="view"
          whtDeliveryMethod={whtDeliveryMethod}
          whtDeliveryEmail={whtDeliveryEmail}
          whtDeliveryNotes={whtDeliveryNotes}
          selectedContact={selectedContact}
        />
      )}

      {showTaxInvoice && (
        <TaxInvoiceRequestSection
          mode="view"
          taxInvoiceRequestMethod={taxInvoiceRequestMethod}
          taxInvoiceRequestEmail={taxInvoiceRequestEmail}
          taxInvoiceRequestNotes={taxInvoiceRequestNotes}
          selectedContact={selectedContact}
        />
      )}

      <ReferenceUrlsSection mode="view" referenceUrls={referenceUrls} />
    </div>
  );
}
