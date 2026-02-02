/**
 * Hook for managing item selection in lists
 * Extracted from TransactionListClient to reduce component complexity and improve reusability
 */

import { useState, useMemo } from "react";

export interface UseSelectionProps<T extends { id: string }> {
  data: T[];
}

export function useSelection<T extends { id: string }>({ data }: UseSelectionProps<T>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const selectedItems = useMemo(() => {
    return data.filter(item => selectedIds.includes(item.id));
  }, [data, selectedIds]);

  const isAllSelected = selectedIds.length === data.length && data.length > 0;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  return {
    selectedIds,
    setSelectedIds,
    selectedItems,
    toggleSelectAll,
    toggleSelect,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  };
}
