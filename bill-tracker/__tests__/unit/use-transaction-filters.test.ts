import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactionFilters, usePagination, useSorting } from "@/hooks/use-transaction-filters";

// Mock Next.js navigation hooks
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/test/path",
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("useTransactionFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockSearchParams completely
    mockSearchParams = new URLSearchParams();
  });

  describe("filters parsing", () => {
    it("should parse filters from URL search params", () => {
      mockSearchParams.set("search", "test");
      mockSearchParams.set("status", "PENDING");
      mockSearchParams.set("category", "MATERIAL");

      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.filters).toEqual({
        search: "test",
        status: "PENDING",
        category: "MATERIAL",
        contact: "",
        creator: "",
        dateFrom: "",
        dateTo: "",
      });
    });

    it("should return empty strings for missing params", () => {
      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.filters).toEqual({
        search: "",
        status: "",
        category: "",
        contact: "",
        creator: "",
        dateFrom: "",
        dateTo: "",
      });
    });
  });

  describe("updateFilter", () => {
    it("should update a single filter", () => {
      const { result } = renderHook(() => useTransactionFilters());

      act(() => {
        result.current.updateFilter("search", "new search");
      });

      expect(mockPush).toHaveBeenCalledWith("/test/path?search=new+search");
    });

    it("should remove filter when value is empty", () => {
      mockSearchParams.set("search", "test");
      mockSearchParams.set("status", "PENDING");

      const { result } = renderHook(() => useTransactionFilters());

      act(() => {
        result.current.updateFilter("search", "");
      });

      expect(mockPush).toHaveBeenCalledWith("/test/path?status=PENDING");
    });

    it("should reset page when filter changes", () => {
      mockSearchParams.set("page", "3");
      mockSearchParams.set("status", "PENDING");

      const { result } = renderHook(() => useTransactionFilters());

      act(() => {
        result.current.updateFilter("category", "MATERIAL");
      });

      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).not.toContain("page=");
      expect(calledUrl).toContain("status=PENDING");
      expect(calledUrl).toContain("category=MATERIAL");
    });
  });

  describe("updateFilters", () => {
    it("should update multiple filters at once", () => {
      const { result } = renderHook(() => useTransactionFilters());

      act(() => {
        result.current.updateFilters({
          search: "test",
          status: "PENDING",
          category: "MATERIAL",
        });
      });

      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).toContain("search=test");
      expect(calledUrl).toContain("status=PENDING");
      expect(calledUrl).toContain("category=MATERIAL");
    });

    it("should remove filters with empty values", () => {
      mockSearchParams.set("search", "test");
      mockSearchParams.set("status", "PENDING");
      mockSearchParams.set("category", "MATERIAL");

      const { result } = renderHook(() => useTransactionFilters());

      act(() => {
        result.current.updateFilters({
          search: "",
          status: "APPROVED",
        });
      });

      const calledUrl = mockPush.mock.calls[0][0];
      expect(calledUrl).not.toContain("search=");
      expect(calledUrl).toContain("status=APPROVED");
      expect(calledUrl).toContain("category=MATERIAL");
    });
  });

  describe("clearFilters", () => {
    it("should clear all filters", () => {
      mockSearchParams.set("search", "test");
      mockSearchParams.set("status", "PENDING");
      mockSearchParams.set("category", "MATERIAL");

      const { result } = renderHook(() => useTransactionFilters());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockPush).toHaveBeenCalledWith("/test/path");
    });
  });

  describe("hasActiveFilters", () => {
    it("should return true when filters are active", () => {
      mockSearchParams.set("search", "test");

      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("should return false when no filters are active", () => {
      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("activeFilterCount", () => {
    it("should count active filters", () => {
      mockSearchParams.set("search", "test");
      mockSearchParams.set("status", "PENDING");
      mockSearchParams.set("category", "MATERIAL");

      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.activeFilterCount).toBe(3);
    });

    it("should return 0 when no filters are active", () => {
      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe("activeFilters", () => {
    it("should return array of active filters", () => {
      mockSearchParams.set("search", "test");
      mockSearchParams.set("status", "PENDING");

      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.activeFilters).toEqual([
        { key: "search", value: "test" },
        { key: "status", value: "PENDING" },
      ]);
    });

    it("should return empty array when no filters are active", () => {
      const { result } = renderHook(() => useTransactionFilters());

      expect(result.current.activeFilters).toEqual([]);
    });
  });
});

describe("usePagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockSearchParams completely
    mockSearchParams = new URLSearchParams();
  });

  it("should parse page and limit from URL", () => {
    mockSearchParams.set("page", "5");
    mockSearchParams.set("limit", "50");

    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(5);
    expect(result.current.limit).toBe(50);
  });

  it("should use default values when not in URL", () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(20);
  });

  it("should update page", () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPage(3);
    });

    expect(mockPush).toHaveBeenCalledWith("/test/path?page=3");
  });

  it("should update limit and reset page", () => {
    mockSearchParams.set("page", "5");

    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setLimit(50);
    });

    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain("limit=50");
    expect(calledUrl).not.toContain("page=");
  });
});

describe("useSorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockSearchParams completely
    mockSearchParams = new URLSearchParams();
  });

  it("should parse sort params from URL", () => {
    mockSearchParams.set("sortBy", "amount");
    mockSearchParams.set("sortOrder", "asc");

    const { result } = renderHook(() => useSorting());

    expect(result.current.sortBy).toBe("amount");
    expect(result.current.sortOrder).toBe("asc");
  });

  it("should use default values", () => {
    const { result } = renderHook(() => useSorting());

    expect(result.current.sortBy).toBe("billDate");
    expect(result.current.sortOrder).toBe("desc");
  });

  it("should toggle sort order for same field", () => {
    mockSearchParams.set("sortBy", "amount");
    mockSearchParams.set("sortOrder", "asc");

    const { result } = renderHook(() => useSorting());

    act(() => {
      result.current.toggleSort("amount");
    });

    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain("sortBy=amount");
    expect(calledUrl).toContain("sortOrder=desc");
  });

  it("should set new field with desc order", () => {
    mockSearchParams.set("sortBy", "amount");
    mockSearchParams.set("sortOrder", "asc");

    const { result } = renderHook(() => useSorting());

    act(() => {
      result.current.toggleSort("billDate");
    });

    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain("sortBy=billDate");
    expect(calledUrl).toContain("sortOrder=desc");
  });

  it("should toggle from desc to asc", () => {
    mockSearchParams.set("sortBy", "amount");
    mockSearchParams.set("sortOrder", "desc");

    const { result } = renderHook(() => useSorting());

    act(() => {
      result.current.toggleSort("amount");
    });

    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain("sortOrder=asc");
  });
});
