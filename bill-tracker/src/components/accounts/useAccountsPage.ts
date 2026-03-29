import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { type Account, type SortField, type SortOrder } from "./accounts-table-config";

function formatRelativeDate(dateString: string | null): { text: string; daysAgo: number } {
  if (!dateString) return { text: "ยังไม่เคย import", daysAgo: Infinity };

  const date = new Date(dateString);
  const now = new Date();
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo === 0) return { text: "วันนี้", daysAgo };
  if (daysAgo === 1) return { text: "เมื่อวาน", daysAgo };
  if (daysAgo < 7) return { text: `${daysAgo} วันที่แล้ว`, daysAgo };
  if (daysAgo < 30) return { text: `${Math.floor(daysAgo / 7)} สัปดาห์ที่แล้ว`, daysAgo };
  return { text: `${Math.floor(daysAgo / 30)} เดือนที่แล้ว`, daysAgo };
}

interface UseAccountsPageProps {
  companyCode: string;
  initialAccounts: Account[];
  lastAccountImportAt: string | null;
}

export function useAccountsPage({ companyCode, initialAccounts, lastAccountImportAt }: UseAccountsPageProps) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [refreshing, setRefreshing] = useState(false);

  const importStatus = formatRelativeDate(lastAccountImportAt);
  const needsUpdate = importStatus.daysAgo >= 30;

  const handleSort = (field: string) => {
    const sortKey = field as SortField;
    if (sortField === sortKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(sortKey);
      setSortOrder("asc");
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/${companyCode.toLowerCase()}/accounts`);
      if (response.ok) {
        const json = await response.json();
        const accountsData = json.success
          ? (json.data?.accounts || [])
          : Array.isArray(json) ? json : [];
        setAccounts(accountsData);
      }
    } catch (error) {
      console.error("Error refreshing accounts:", error);
    } finally {
      setRefreshing(false);
    }
  }, [companyCode]);

  const handleAccountCreated = useCallback((newAccount: Account) => {
    setAccounts((prev) => [...prev, newAccount].sort((a, b) => a.code.localeCompare(b.code)));
  }, []);

  const handleDelete = useCallback(
    async (account: Account) => {
      if (account.isSystem) {
        toast.error("ไม่สามารถลบบัญชีระบบได้");
        return;
      }
      if (!confirm(`ต้องการลบบัญชี "${account.code} - ${account.name}" ใช่หรือไม่?`)) return;

      try {
        const response = await fetch(`/api/${companyCode.toLowerCase()}/accounts/${account.id}`, {
          method: "DELETE",
        });
        const data = await response.json();
        if (data.success) {
          toast.success("ลบบัญชีสำเร็จ");
          setAccounts((prev) => prev.filter((a) => a.id !== account.id));
        } else {
          toast.error(data.error || "เกิดข้อผิดพลาดในการลบบัญชี");
        }
      } catch {
        toast.error("เกิดข้อผิดพลาดในการลบบัญชี");
      }
    },
    [companyCode],
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch =
        account.code.includes(searchQuery) ||
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (account.keywords || []).some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesClass = !selectedClass || account.class === selectedClass;
      const matchesSource =
        !selectedSource ||
        (selectedSource === "PEAK" ? account.source === "PEAK" : account.source !== "PEAK");
      const matchesStatus =
        !selectedStatus ||
        (selectedStatus === "active" ? account.isActive : !account.isActive);
      return matchesSearch && matchesClass && matchesSource && matchesStatus;
    });
  }, [accounts, searchQuery, selectedClass, selectedSource, selectedStatus]);

  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => {
      const comparison =
        sortField === "code"
          ? a.code.localeCompare(b.code)
          : a.name.localeCompare(b.name, "th");
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredAccounts, sortField, sortOrder]);

  const stats = {
    total: accounts.length,
    active: accounts.filter((a) => a.isActive).length,
    fromPeak: accounts.filter((a) => a.source === "PEAK").length,
    manual: accounts.filter((a) => a.source === "MANUAL" || !a.source).length,
  };

  return {
    accounts,
    searchQuery,
    setSearchQuery,
    selectedClass,
    setSelectedClass,
    selectedSource,
    setSelectedSource,
    selectedStatus,
    setSelectedStatus,
    sortField,
    sortOrder,
    handleSort,
    refreshing,
    handleRefresh,
    handleAccountCreated,
    handleDelete,
    sortedAccounts,
    stats,
    importStatus,
    needsUpdate,
  };
}
