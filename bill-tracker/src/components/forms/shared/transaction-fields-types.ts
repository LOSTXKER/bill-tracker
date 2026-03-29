export interface TransactionFieldsConfig {
  type: "expense" | "income";
  dateField: {
    name: string;
    label: string;
  };
  descriptionField?: {
    name: string;
    label: string;
    placeholder: string;
  };
  statusOptions: Array<{
    value: string;
    label: string;
    color: string;
    condition?: (formData: Record<string, unknown>) => boolean;
  }>;
  showDueDate?: boolean;
}

export type FormRegister = (name: string) => Record<string, unknown>;
export type FormWatch = (name?: string) => unknown;
export type FormSetValue = (name: string, value: unknown) => void;

export type AmountInputMode = "beforeVat" | "includingVat" | "afterWht";

export interface InternalCompanyOption {
  id: string;
  name: string;
  code: string;
}

export interface TransactionFieldsSectionProps {
  config: TransactionFieldsConfig;
  companyCode: string;
  mode: "create" | "view" | "edit";

  register: FormRegister;
  watch: FormWatch;
  setValue: FormSetValue;

  vatRate?: number;

  renderAdditionalFields?: () => React.ReactNode;

  isWht?: boolean;

  onAiSuggestAccount?: (suggestion: {
    accountId: string | null;
    alternatives: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      confidence: number;
      reason: string;
    }>;
  }) => void;
}
