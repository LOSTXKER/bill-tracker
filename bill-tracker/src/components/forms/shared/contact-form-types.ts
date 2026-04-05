export interface DescriptionPreset {
  label: string;
  description: string;
  accountId: string;
  categoryId: string;
}

export interface ContactFormData {
  peakCode: string;
  contactCategory: string;
  entityType: string;
  businessType: string;
  nationality: string;
  prefix: string;
  firstName: string;
  lastName: string;
  name: string;
  taxId: string;
  branchCode: string;
  address: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  country: string;
  contactPerson: string;
  phone: string;
  email: string;
  bankAccount: string;
  bankName: string;
  creditLimit: string;
  paymentTerms: string;
  notes: string;
  defaultVatRate: string;
  defaultWhtEnabled: boolean;
  defaultWhtRate: string;
  defaultWhtType: string;
  descriptionTemplate: string;
  descriptionPresets: DescriptionPreset[];
  defaultAccountId: string;
  preferredDeliveryMethod: string;
  deliveryEmail: string;
  deliveryNotes: string;
  taxInvoiceRequestMethod: string;
  taxInvoiceRequestEmail: string;
  taxInvoiceRequestNotes: string;
}

export interface Contact {
  id: string;
  name: string;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  bankAccount?: string | null;
  bankName?: string | null;
  creditLimit?: number | null;
  paymentTerms?: number | null;
  notes?: string | null;
  source?: "PEAK" | "MANUAL" | "AI" | null;
  peakCode?: string | null;
  contactCategory?: string | null;
  entityType?: string | null;
  businessType?: string | null;
  nationality?: string | null;
  prefix?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  branchCode?: string | null;
  subDistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactPerson?: string | null;
  defaultVatRate?: number | null;
  defaultWhtEnabled?: boolean | null;
  defaultWhtRate?: number | null;
  defaultWhtType?: string | null;
  descriptionTemplate?: string | null;
  descriptionPresets?: DescriptionPreset[] | null;
  defaultAccountId?: string | null;
  preferredDeliveryMethod?: string | null;
  deliveryEmail?: string | null;
  deliveryNotes?: string | null;
  taxInvoiceRequestMethod?: string | null;
  taxInvoiceRequestEmail?: string | null;
  taxInvoiceRequestNotes?: string | null;
}

export interface ContactFormSectionProps {
  formData: ContactFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContactFormData>>;
  companyCode?: string;
}

export const defaultFormData: ContactFormData = {
  peakCode: "",
  contactCategory: "VENDOR",
  entityType: "COMPANY",
  businessType: "",
  nationality: "ไทย",
  prefix: "",
  firstName: "",
  lastName: "",
  name: "",
  taxId: "",
  branchCode: "00000",
  address: "",
  subDistrict: "",
  district: "",
  province: "",
  postalCode: "",
  country: "Thailand",
  contactPerson: "",
  phone: "",
  email: "",
  bankAccount: "",
  bankName: "",
  creditLimit: "",
  paymentTerms: "",
  notes: "",
  defaultVatRate: "",
  defaultWhtEnabled: false,
  defaultWhtRate: "",
  defaultWhtType: "",
  descriptionTemplate: "",
  descriptionPresets: [],
  defaultAccountId: "",
  preferredDeliveryMethod: "",
  deliveryEmail: "",
  deliveryNotes: "",
  taxInvoiceRequestMethod: "",
  taxInvoiceRequestEmail: "",
  taxInvoiceRequestNotes: "",
};

function parsePresets(raw: unknown): DescriptionPreset[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object" && typeof p.label === "string")
    .map((p) => ({
      label: p.label || "",
      description: p.description || "",
      accountId: p.accountId || "",
      categoryId: p.categoryId || "",
    }));
}

export function contactToFormData(contact: Contact): ContactFormData {
  const presets = parsePresets(contact.descriptionPresets);

  // Auto-migrate legacy descriptionTemplate into presets if presets are empty
  if (presets.length === 0 && contact.descriptionTemplate) {
    presets.push({
      label: contact.descriptionTemplate,
      description: contact.descriptionTemplate,
      accountId: "",
      categoryId: "",
    });
  }

  return {
    peakCode: contact.peakCode || "",
    contactCategory: contact.contactCategory || "VENDOR",
    entityType: contact.entityType || "COMPANY",
    businessType: contact.businessType || "",
    nationality: contact.nationality || "ไทย",
    prefix: contact.prefix || "",
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    name: contact.name || "",
    taxId: contact.taxId || "",
    branchCode: contact.branchCode || "00000",
    address: contact.address || "",
    subDistrict: contact.subDistrict || "",
    district: contact.district || "",
    province: contact.province || "",
    postalCode: contact.postalCode || "",
    country: contact.country || "Thailand",
    contactPerson: contact.contactPerson || "",
    phone: contact.phone || "",
    email: contact.email || "",
    bankAccount: contact.bankAccount || "",
    bankName: contact.bankName || "",
    creditLimit: contact.creditLimit?.toString() || "",
    paymentTerms: contact.paymentTerms?.toString() || "",
    notes: contact.notes || "",
    defaultVatRate: contact.defaultVatRate?.toString() || "",
    defaultWhtEnabled: contact.defaultWhtEnabled || false,
    defaultWhtRate: contact.defaultWhtRate?.toString() || "",
    defaultWhtType: contact.defaultWhtType || "",
    descriptionTemplate: contact.descriptionTemplate || "",
    descriptionPresets: presets,
    defaultAccountId: contact.defaultAccountId || "",
    preferredDeliveryMethod: contact.preferredDeliveryMethod || "",
    deliveryEmail: contact.deliveryEmail || "",
    deliveryNotes: contact.deliveryNotes || "",
    taxInvoiceRequestMethod: contact.taxInvoiceRequestMethod || "",
    taxInvoiceRequestEmail: contact.taxInvoiceRequestEmail || "",
    taxInvoiceRequestNotes: contact.taxInvoiceRequestNotes || "",
  };
}
