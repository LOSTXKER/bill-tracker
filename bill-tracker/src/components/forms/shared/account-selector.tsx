"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Sparkles, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";

export interface Account {
  id: string;
  code: string;
  name: string;
  class: string;
  keywords?: string[];
  isSystem: boolean;
}

interface AlternativeAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  confidence: number;
  reason: string;
}

interface AccountSelectorProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  companyCode: string;
  className?: string;
  placeholder?: string;
  suggestedAccountId?: string; // From AI
  alternatives?: AlternativeAccount[]; // Alternative suggestions from AI
  disabled?: boolean;
  label?: string;
}

const ACCOUNT_CLASS_LABELS: Record<string, string> = {
  ASSET: "สินทรัพย์",
  LIABILITY: "หนี้สิน",
  EQUITY: "ส่วนของเจ้าของ",
  REVENUE: "รายได้",
  COST_OF_SALES: "ต้นทุนขาย",
  EXPENSE: "ค่าใช้จ่าย",
  OTHER_INCOME: "รายได้อื่น",
  OTHER_EXPENSE: "ค่าใช้จ่ายอื่น",
};

export function AccountSelector({
  value,
  onValueChange,
  companyCode,
  className,
  placeholder = "เลือกบัญชี...",
  suggestedAccountId,
  alternatives = [],
  disabled = false,
  label,
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${companyCode.toLowerCase()}/accounts?activeOnly=true`);
      if (res.ok) {
        const json = await res.json();
        const accountsData = json.success ? (json.data?.accounts || []) : (Array.isArray(json) ? json : []);
        setAccounts(accountsData);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setLoading(false);
    }
  }, [companyCode]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle new account created
  const handleAccountCreated = useCallback((newAccount: Account) => {
    setAccounts((prev) => [...prev, newAccount].sort((a, b) => a.code.localeCompare(b.code)));
    onValueChange(newAccount.id);
    setOpen(false);
  }, [onValueChange]);

  // Group accounts by class
  const groupedAccounts = accounts.reduce((acc, account) => {
    const classLabel = ACCOUNT_CLASS_LABELS[account.class] || account.class;
    if (!acc[classLabel]) {
      acc[classLabel] = [];
    }
    acc[classLabel].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  // Filter accounts based on search
  const filteredGroups = Object.entries(groupedAccounts).reduce((acc, [classLabel, accs]) => {
    const filtered = accs.filter(
      (account) =>
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.code.includes(searchQuery) ||
        (account.keywords || []).some((keyword) =>
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
    if (filtered.length > 0) {
      acc[classLabel] = filtered;
    }
    return acc;
  }, {} as Record<string, Account[]>);

  const selectedAccount = accounts.find((a) => a.id === value);
  const suggestedAccount = accounts.find((a) => a.id === suggestedAccountId);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
            disabled={disabled || loading}
          >
            <div className="flex items-center gap-2 flex-1 truncate">
              {selectedAccount ? (
                <>
                  <span className="font-mono text-xs">{selectedAccount.code}</span>
                  <span className="truncate">{selectedAccount.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            {suggestedAccountId && !value && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="ค้นหาด้วยรหัส ชื่อ หรือคีย์เวิร์ด..."
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <CommandList>
              <CommandEmpty>
                <div className="py-4 text-center">
                  <p className="text-muted-foreground mb-2">ไม่พบบัญชีที่ตรงกัน</p>
                  <CreateAccountDialog
                    companyCode={companyCode}
                    onAccountCreated={handleAccountCreated}
                    trigger={
                      <Button type="button" variant="outline" size="sm" className="gap-1">
                        <Plus className="h-3 w-3" />
                        สร้างบัญชีใหม่
                      </Button>
                    }
                  />
                </div>
              </CommandEmpty>
              
              {/* AI Suggestion + Alternatives - แสดงเสมอเมื่อมี suggestion */}
              {suggestedAccount && (
                <CommandGroup heading="✨ AI แนะนำ">
                  {/* Main Suggestion */}
                  <CommandItem
                    key={suggestedAccount.id}
                    value={`${suggestedAccount.code}-${suggestedAccount.name}`}
                    onSelect={() => {
                      onValueChange(suggestedAccount.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "border-l-2 border-primary",
                      value === suggestedAccount.id ? "bg-primary/10" : "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-xs font-semibold">
                        {suggestedAccount.code}
                      </span>
                      <span className="flex-1">{suggestedAccount.name}</span>
                      <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                    {value === suggestedAccount.id && (
                      <Check className="ml-2 h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                  
                  {/* Alternative Suggestions */}
                  {alternatives.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1">
                        ทางเลือกอื่น:
                      </div>
                      {alternatives.map((alt) => {
                        const altAccount = accounts.find(a => a.id === alt.accountId);
                        if (!altAccount) return null;
                        const isSelected = value === alt.accountId;
                        return (
                          <CommandItem
                            key={alt.accountId}
                            value={`${altAccount.code}-${altAccount.name}-alt`}
                            onSelect={() => {
                              onValueChange(alt.accountId);
                              setOpen(false);
                            }}
                            className={cn(
                              "border-l-2 border-muted-foreground/30",
                              isSelected && "bg-muted border-l-primary"
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-mono text-xs text-muted-foreground">
                                {altAccount.code}
                              </span>
                              <span className="flex-1 text-sm">{altAccount.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {alt.confidence}%
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="ml-2 h-4 w-4 text-primary" />
                            )}
                          </CommandItem>
                        );
                      })}
                    </>
                  )}
                </CommandGroup>
              )}

              {/* Grouped Accounts */}
              {Object.entries(filteredGroups).map(([classLabel, accs]) => (
                <CommandGroup key={classLabel} heading={classLabel}>
                  {accs.map((account) => (
                    <CommandItem
                      key={account.id}
                      value={`${account.code}-${account.name}`}
                      onSelect={() => {
                        onValueChange(account.id === value ? null : account.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-mono text-xs text-muted-foreground w-16">
                          {account.code}
                        </span>
                        <span className="flex-1">{account.name}</span>
                      </div>
                      {value === account.id && (
                        <Check className="ml-2 h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}

              {/* Create New Account Button */}
              <div className="p-2 border-t">
                <CreateAccountDialog
                  companyCode={companyCode}
                  onAccountCreated={handleAccountCreated}
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      สร้างบัญชีใหม่
                    </Button>
                  }
                />
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
