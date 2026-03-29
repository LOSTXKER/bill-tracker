"use client";

import { useState, useEffect } from "react";
import type { ContactSummary } from "@/types";
import type { AccountSuggestion, AiVendorSuggestion } from "./transaction-form-types";

interface UseContactAccountStateProps {
  contacts: ContactSummary[];
}

export function useContactAccountState({ contacts }: UseContactAccountStateProps) {
  const [selectedContact, setSelectedContact] = useState<ContactSummary | null>(null);
  const [oneTimeContactName, setOneTimeContactName] = useState("");
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  const [aiVendorSuggestion, setAiVendorSuggestion] = useState<AiVendorSuggestion | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [accountSuggestion, setAccountSuggestion] = useState<AccountSuggestion | null>(null);

  useEffect(() => {
    if (pendingContactId && contacts.length > 0 && !selectedContact) {
      const contact = contacts.find((c) => c.id === pendingContactId);
      if (contact) {
        setSelectedContact(contact);
        setPendingContactId(null);
      }
    }
  }, [pendingContactId, contacts, selectedContact]);

  return {
    selectedContact,
    setSelectedContact,
    oneTimeContactName,
    setOneTimeContactName,
    aiVendorSuggestion,
    setAiVendorSuggestion,
    selectedAccount,
    setSelectedAccount,
    accountSuggestion,
    setAccountSuggestion,
    setPendingContactId,
  };
}
