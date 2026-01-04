"use client";

import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactSummary } from "@/types";

interface ContactSelectorProps {
  contacts: ContactSummary[];
  isLoading: boolean;
  selectedContact: ContactSummary | null;
  onSelect: (contact: ContactSummary | null) => void;
  label?: string;
  placeholder?: string;
}

export function ContactSelector({
  contacts,
  isLoading,
  selectedContact,
  onSelect,
  label = "ผู้ติดต่อ",
  placeholder = "เลือกผู้ติดต่อ...",
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label className="text-foreground font-medium">{label}</Label>
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
    </div>
  );
}
