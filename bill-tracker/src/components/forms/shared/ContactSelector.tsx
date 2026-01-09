"use client";

import { useState } from "react";
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
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateContactDialog, Contact } from "./CreateContactDialog";
import type { ContactSummary } from "@/types";

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
}

export function ContactSelector({
  contacts,
  isLoading,
  selectedContact,
  onSelect,
  label = "ผู้ติดต่อ",
  placeholder = "เลือกผู้ติดต่อ...",
  companyCode,
  onContactCreated,
  allowCreate = true,
  required = false,
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleContactCreated = (contact: Contact) => {
    // Select the newly created contact
    const contactSummary: ContactSummary = {
      id: contact.id,
      name: contact.name,
      taxId: contact.taxId || undefined,
    };

    onSelect(contactSummary);
    onContactCreated?.(contactSummary);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-foreground font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-11 justify-between bg-muted/30 border-border hover:bg-background"
          >
            {selectedContact ? selectedContact.name : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="ค้นหาผู้ติดต่อ..." />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "กำลังโหลด..." : "ไม่พบผู้ติดต่อ"}
              </CommandEmpty>
              
              {/* Create new contact option - at top */}
              {allowCreate && companyCode && (
                <>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setShowCreateDialog(true);
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
              
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !selectedContact ? "opacity-100" : "opacity-0"
                    )}
                  />
                  ไม่ระบุผู้ติดต่อ
                </CommandItem>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    onSelect={() => {
                      onSelect(contact);
                      setOpen(false);
                    }}
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

      {/* Create Contact Dialog - uses shared component */}
      {companyCode && (
        <CreateContactDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          companyCode={companyCode}
          onSuccess={handleContactCreated}
        />
      )}
    </div>
  );
}
