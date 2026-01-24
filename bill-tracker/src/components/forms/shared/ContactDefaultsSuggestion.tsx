"use client";

import { Button } from "@/components/ui/button";
import { Lightbulb, Check, X } from "lucide-react";
import type { ContactDefaults } from "@/hooks/use-contact-defaults";

// WHT Type labels
const WHT_TYPE_LABELS: Record<string, string> = {
  SERVICE: "ค่าบริการ",
  RENT: "ค่าเช่า",
  TRANSPORT: "ค่าขนส่ง",
  ADVERTISING: "ค่าโฆษณา",
  OTHER: "อื่นๆ",
};

interface ContactDefaultsSuggestionProps {
  contactName: string;
  defaults: ContactDefaults;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * Component to display contact defaults suggestion banner
 * Shows when a contact with saved defaults is selected
 */
export function ContactDefaultsSuggestion({
  contactName,
  defaults,
  onApply,
  onDismiss,
}: ContactDefaultsSuggestionProps) {
  // Build suggestion items
  const suggestions: string[] = [];

  if (defaults.defaultVatRate !== null) {
    suggestions.push(`VAT ${defaults.defaultVatRate}%`);
  }

  if (defaults.defaultWhtEnabled && defaults.defaultWhtRate !== null) {
    const whtTypeLabel = defaults.defaultWhtType 
      ? WHT_TYPE_LABELS[defaults.defaultWhtType] || defaults.defaultWhtType
      : "";
    suggestions.push(`WHT ${defaults.defaultWhtRate}%${whtTypeLabel ? ` ${whtTypeLabel}` : ""}`);
  }

  if (defaults.descriptionTemplate) {
    // Truncate description if too long
    const desc = defaults.descriptionTemplate.length > 30
      ? defaults.descriptionTemplate.substring(0, 30) + "..."
      : defaults.descriptionTemplate;
    suggestions.push(`"${desc}"`);
  }

  // Don't show if no suggestions
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            คำแนะนำจากรายการก่อนหน้า
          </p>
          <p className="text-amber-700 dark:text-amber-300 mt-1 text-xs">
            ข้อมูลจากรายการล่าสุดของ <span className="font-medium">{contactName}</span>
          </p>
          
          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((suggestion, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
              >
                {suggestion}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              type="button"
              size="sm"
              onClick={onApply}
              className="gap-1 h-7 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Check className="h-3 w-3" />
              ใช้ค่าแนะนำ
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="gap-1 h-7 text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-100 dark:hover:bg-amber-900/50"
            >
              <X className="h-3 w-3" />
              ข้าม
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
