"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Company } from "@prisma/client";

interface CompanyWithAccess extends Company {
  isOwner?: boolean;
  permissions?: string[];
}

interface CompanyContextType {
  companies: CompanyWithAccess[];
  selectedCompany: CompanyWithAccess | null;
  setSelectedCompany: (company: CompanyWithAccess | null) => void;
  isLoading: boolean;
  error: string | null;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<CompanyWithAccess[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<CompanyWithAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/companies");
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Set selected company
  const setSelectedCompany = (company: CompanyWithAccess | null) => {
    setSelectedCompanyState(company);
    if (company) {
      localStorage.setItem("selectedCompanyId", company.id);
    } else {
      localStorage.removeItem("selectedCompanyId");
    }
  };

  // Load companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Restore selected company from localStorage
  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      const savedId = localStorage.getItem("selectedCompanyId");
      if (savedId) {
        const saved = companies.find((c) => c.id === savedId);
        if (saved) {
          setSelectedCompanyState(saved);
        }
      }
    }
  }, [companies, selectedCompany]);

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        setSelectedCompany,
        isLoading,
        error,
        refreshCompanies: fetchCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
