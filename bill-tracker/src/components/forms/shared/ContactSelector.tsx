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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronsUpDown, Check, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    taxId: "",
    phone: "",
    email: "",
  });

  const handleCreateContact = async () => {
    if (!newContact.name.trim()) {
      toast.error("กรุณากรอกชื่อผู้ติดต่อ");
      return;
    }

    if (!companyCode) {
      toast.error("ไม่พบรหัสบริษัท");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch(`/api/contacts?company=${companyCode.toUpperCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "สร้างผู้ติดต่อล้มเหลว");
      }

      const result = await res.json();
      const createdContact = result.data?.contact || result.contact;

      // Select the newly created contact
      const contactSummary: ContactSummary = {
        id: createdContact.id,
        name: createdContact.name,
        taxId: createdContact.taxId,
      };

      onSelect(contactSummary);
      onContactCreated?.(contactSummary);
      
      // Reset form and close dialogs
      setNewContact({ name: "", taxId: "", phone: "", email: "" });
      setShowCreateDialog(false);
      setOpen(false);
      
      toast.success("สร้างผู้ติดต่อสำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-foreground font-medium">{label}</Label>}
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
              
              {/* Create new contact option */}
              {allowCreate && companyCode && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setShowCreateDialog(true);
                      }}
                      className="text-primary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>สร้างผู้ติดต่อใหม่...</span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Contact Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>สร้างผู้ติดต่อใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลเพื่อเพิ่มผู้ติดต่อใหม่ในระบบ
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">ชื่อ *</Label>
              <Input
                id="contact-name"
                placeholder="ชื่อบริษัท หรือชื่อบุคคล"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-taxId">เลขประจำตัวผู้เสียภาษี</Label>
              <Input
                id="contact-taxId"
                placeholder="13 หลัก"
                value={newContact.taxId}
                onChange={(e) => setNewContact({ ...newContact, taxId: e.target.value })}
                className="h-11"
                maxLength={13}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-phone">เบอร์โทร</Label>
                <Input
                  id="contact-phone"
                  placeholder="0xx-xxx-xxxx"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact-email">อีเมล</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="email@example.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewContact({ name: "", taxId: "", phone: "", email: "" });
              }}
              disabled={creating}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleCreateContact} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                "สร้างผู้ติดต่อ"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
