"use client";

import { useState, useEffect } from "react";
import type { ContactSummary } from "@/types";

interface UseContactsReturn {
  contacts: ContactSummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage contacts for a company
 * @param companyCode - The company code to fetch contacts for
 * @returns Object containing contacts, loading state, error, and refetch function
 */
export function useContacts(companyCode: string): UseContactsReturn {
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = async () => {
    if (!companyCode) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts?company=${companyCode.toUpperCase()}`);
      const data = await res.json();
      
      if (data.success) {
        setContacts(data.data.contacts || []);
      } else {
        setError(data.error || "Failed to fetch contacts");
        setContacts([]);
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch contacts");
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [companyCode]);

  return {
    contacts,
    isLoading,
    error,
    refetch: fetchContacts,
  };
}
