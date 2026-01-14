"use client";

import { useState, useRef, useEffect } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookUser, Check, Lightbulb, Plus, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateContactDialog, Contact } from "./CreateContactDialog";
import type { ContactSummary } from "@/types";

// AI-detected new vendor suggestion
export interface AiVendorSuggestion {
  name: string;
  taxId?: string | null;
  branchNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface ContactSelectorProps {
  contacts: ContactSummary[];
  isLoading: boolean;
  selectedContact: ContactSummary | null;
  onSelect: (contact: ContactSummary | null) => void;
  label?: string;
  placeholder?: string;
  companyCode?: string;
  onContactCreated?: (contact: ContactSummary) => void;
  allowCreate?: boolean;
  required?: boolean;
  // One-time contact name (typed manually, not saved)
  contactName?: string;
  onContactNameChange?: (name: string) => void;
  // AI-detected new vendor suggestion
  aiVendorSuggestion?: AiVendorSuggestion | null;
  // Contact suggestions (when AI found similar but not exact matches)
  contactSuggestions?: Array<{
    id: string;
    name: string;
    confidence: number;
  }>;
  onContactSuggestionSelect?: (contact: ContactSummary) => void;
  // Mode for showing/hiding required indicator
  mode?: "create" | "edit" | "view";
}

export function ContactSelector({
  contacts,
  isLoading,
  selectedContact,
  onSelect,
  label = "ผู้ติดต่อ",
  placeholder = "พิมพ์ชื่อหรือเลือกจากรายชื่อ...",
  companyCode,
  onContactCreated,
  allowCreate = true,
  required = false,
  contactName = "",
  onContactNameChange,
  aiVendorSuggestion,
  contactSuggestions = [],
  onContactSuggestionSelect,
  mode = "create",
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Display value: selected contact name OR typed name
  const displayValue = selectedContact?.name || contactName;
  const hasValue = displayValue.trim() !== "";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // When typing, clear selected contact and use typed name
    if (selectedContact) {
      onSelect(null);
    }
    onContactNameChange?.(value);
  };

  const handleSelectContact = (contact: ContactSummary | null) => {
    onSelect(contact);
    // Clear typed name when selecting a contact
    onContactNameChange?.("");
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    onContactNameChange?.("");
    inputRef.current?.focus();
  };

  const handleContactCreated = (contact: Contact) => {
    const contactSummary: ContactSummary = {
      id: contact.id,
      name: contact.name,
      taxId: contact.taxId || undefined,
    };
    onSelect(contactSummary);
    onContactNameChange?.("");
    onContactCreated?.(contactSummary);
    setOpen(false);
  };

  // State for AI suggestion dialog
  const [showAiSuggestionDialog, setShowAiSuggestionDialog] = useState(false);

  // Convert AI suggestion to Contact format for dialog
  const aiSuggestionContact: Contact | null = aiVendorSuggestion ? {
    id: "",
    name: aiVendorSuggestion.name,
    taxId: aiVendorSuggestion.taxId,
    address: aiVendorSuggestion.address,
    phone: aiVendorSuggestion.phone,
    email: aiVendorSuggestion.email,
  } : null;

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-foreground font-medium">
          {label} {mode !== "view" && required && !hasValue && <span className="text-red-500">*</span>}
        </Label>
      )}

      {/* AI Vendor Suggestion Banner */}
      {aiVendorSuggestion && !selectedContact && companyCode && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                AI ตรวจพบผู้ติดต่อใหม่
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                <span className="font-medium">{aiVendorSuggestion.name}</span>
                {aiVendorSuggestion.taxId && (
                  <span className="text-xs ml-2 font-mono">({aiVendorSuggestion.taxId})</span>
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 gap-1 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
                onClick={() => setShowAiSuggestionDialog(true)}
              >
                <Plus className="h-3 w-3" />
                บันทึกผู้ติดต่อนี้
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Suggestions from AI (when no exact match found) */}
      {contactSuggestions.length > 0 && !selectedContact && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                AI พบผู้ติดต่อที่คล้ายกัน
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                เลือกผู้ติดต่อที่ถูกต้อง หรือพิมพ์ชื่อใหม่
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {contactSuggestions.map((suggestion) => {
                  const contact = contacts.find(c => c.id === suggestion.id);
                  if (!contact) return null;
                  return (
                    <Button
                      key={suggestion.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
                      onClick={() => onContactSuggestionSelect?.(contact)}
                    >
                      <span>{suggestion.name}</span>
                      <span className="text-xs opacity-60">({suggestion.confidence}%)</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex gap-1">
        {/* Text Input */}
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={displayValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={cn(
              "h-11 pr-8 bg-muted/30 border-border",
              selectedContact && "text-foreground"
            )}
          />
          {/* Clear button */}
          {hasValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-sm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {/* Indicator when using saved contact */}
          {selectedContact && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
          )}
        </div>

        {/* Contacts Book Button */}
        <Popover open={open} onOpenChange={setOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0 bg-muted/30 border-border hover:bg-background"
                  >
                    <BookUser className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>เลือกจากรายชื่อที่บันทึกไว้</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <PopoverContent className="w-72 p-0" align="end">
            <Command>
              <CommandInput placeholder="ค้นหาผู้ติดต่อ..." />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "กำลังโหลด..." : "ไม่พบผู้ติดต่อ"}
                </CommandEmpty>

                {/* Create new contact option */}
                {allowCreate && companyCode && (
                  <>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setShowCreateDialog(true);
                          setOpen(false);
                        }}
                        className="text-primary font-medium"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>สร้างผู้ติดต่อใหม่...</span>
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                <CommandGroup heading="รายชื่อที่บันทึกไว้">
                  {contacts.length === 0 && !isLoading && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      ยังไม่มีผู้ติดต่อ
                    </div>
                  )}
                  {contacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      onSelect={() => handleSelectContact(contact)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedContact?.id === contact.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{contact.name}</span>
                        {contact.taxId && (
                          <span className="text-xs text-muted-foreground">
                            {contact.taxId}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Helper text */}
      {selectedContact && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          ผู้ติดต่อที่บันทึกไว้
        </p>
      )}

      {/* Create Contact Dialog */}
      {companyCode && (
        <CreateContactDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          companyCode={companyCode}
          onSuccess={handleContactCreated}
        />
      )}

      {/* AI Suggestion Contact Dialog - pre-filled with AI data */}
      {companyCode && aiSuggestionContact && (
        <CreateContactDialog
          open={showAiSuggestionDialog}
          onOpenChange={setShowAiSuggestionDialog}
          companyCode={companyCode}
          editingContact={aiSuggestionContact}
          onSuccess={handleContactCreated}
        />
      )}
    </div>
  );
}
