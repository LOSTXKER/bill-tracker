"use client";

import { useState, use, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Building2,
  Download,
  CalendarDays,
  AlertTriangle,
  RefreshCw,
  Cloud,
  PenTool,
  Filter,
  X,
  UserCheck,
  Truck,
  HelpCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreateContactDialog, Contact } from "@/components/forms/shared/CreateContactDialog";
import { ImportContactsDialog } from "@/components/contacts/import-contacts-dialog";
import { useContacts } from "@/hooks/use-contacts";
import { mutate } from "swr";
import { swrKeys } from "@/lib/swr-config";
import useSWR from "swr";
import { formatDistanceToNowStrict } from "date-fns";
import { th } from "date-fns/locale";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";

interface ContactsPageProps {
  params: Promise<{ company: string }>;
}

// Fetcher for company data
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Helper to format relative date like "วันนี้", "เมื่อวาน", "3 วันที่แล้ว"
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (daysAgo === 0) return "วันนี้";
  if (daysAgo === 1) return "เมื่อวาน";
  if (daysAgo < 7) return `${daysAgo} วันที่แล้ว`;
  if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} สัปดาห์ที่แล้ว`;
  return `${Math.floor(daysAgo / 30)} เดือนที่แล้ว`;
}

type SortField = "peakCode" | "name" | "taxId";
type SortOrder = "asc" | "desc";

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof UserCheck }> = {
  CUSTOMER: { label: "ลูกค้า", icon: UserCheck },
  VENDOR: { label: "ผู้ขาย/ผู้จำหน่าย", icon: Truck },
  OTHER: { label: "อื่นๆ", icon: HelpCircle },
};

export default function ContactsPage({ params }: ContactsPageProps) {
  const { company: companyCode } = use(params);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("peakCode");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Use SWR hook for data fetching and caching
  const { contacts, isLoading, refetch } = useContacts(companyCode);

  // Fetch company data for lastContactImportAt
  const { data: companyData, mutate: mutateCompany } = useSWR(
    `/api/companies?code=${companyCode.toUpperCase()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // API returns { success: true, data: { companies: [...] } }
  const company = companyData?.data?.companies?.[0];
  const lastContactImportAt = company?.lastContactImportAt
    ? new Date(company.lastContactImportAt)
    : null;

  const isImportOutdated = lastContactImportAt &&
    (new Date().getTime() - lastContactImportAt.getTime()) > (30 * 24 * 60 * 60 * 1000);

  // Handle sort toggle
  const handleSort = (field: string) => {
    const sortKey = field as SortField;
    if (sortField === sortKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(sortKey);
      setSortOrder("asc");
    }
  };

  // Filter contacts based on search and filters
  const filteredContacts = contacts.filter((contact) => {
    // Search filter
    const matchesSearch = !search || (
      contact.name?.toLowerCase().includes(search.toLowerCase()) ||
      contact.taxId?.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(search.toLowerCase()) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      (contact as any).peakCode?.toLowerCase().includes(search.toLowerCase())
    );

    // Category filter
    const matchesCategory = !selectedCategory || 
      (contact as any).contactCategory === selectedCategory;

    // Source filter
    const matchesSource = !selectedSource ||
      (selectedSource === "PEAK" ? contact.source === "PEAK" : contact.source !== "PEAK");

    return matchesSearch && matchesCategory && matchesSource;
  });

  // Sort contacts
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      let comparison = 0;
      if (sortField === "peakCode") {
        const aCode = (a as any).peakCode || "";
        const bCode = (b as any).peakCode || "";
        comparison = aCode.localeCompare(bCode);
      } else if (sortField === "name") {
        comparison = (a.name || "").localeCompare(b.name || "", "th");
      } else if (sortField === "taxId") {
        comparison = (a.taxId || "").localeCompare(b.taxId || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredContacts, sortField, sortOrder]);

  const handleOpenDialog = (contact?: Contact) => {
    setEditingContact(contact || null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingContact(null);
    }
  };

  const handleContactSuccess = async () => {
    // Revalidate cache after successful mutation
    await mutate(swrKeys.contacts(companyCode));
    refetch();
  };

  const handleImportComplete = async () => {
    // Revalidate contacts and company data - force refetch from server
    await Promise.all([
      mutate(swrKeys.contacts(companyCode), undefined, { revalidate: true }),
      mutateCompany(undefined, { revalidate: true }),
    ]);
    refetch();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        mutate(swrKeys.contacts(companyCode), undefined, { revalidate: true }),
        mutateCompany(undefined, { revalidate: true }),
      ]);
      refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบผู้ติดต่อนี้ใช่หรือไม่?")) return;

    try {
      const res = await fetch(
        `/api/contacts?id=${id}&company=${companyCode.toUpperCase()}`,
        { 
          method: "DELETE",
          cache: "no-store"
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("ลบสำเร็จ");
        await mutate(swrKeys.contacts(companyCode));
        refetch();
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    }
  };

  // Define columns for DataTable
  const columns: ColumnDef<Contact>[] = useMemo(() => [
    {
      key: "peakCode",
      label: "รหัส Peak",
      sortable: true,
      render: (contact) => (
        <span className="font-mono text-sm text-muted-foreground">
          {(contact as any).peakCode || "-"}
        </span>
      ),
    },
    {
      key: "name",
      label: "ชื่อ",
      sortable: true,
      render: (contact) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{contact.name}</p>
            {contact.address && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {contact.address}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "ประเภท",
      render: (contact) => {
        const category = (contact as any).contactCategory;
        const info = CATEGORY_LABELS[category];
        if (!info) return <span className="text-muted-foreground">-</span>;
        const Icon = info.icon;
        return (
          <Badge variant="outline" className="gap-1">
            <Icon className="h-3 w-3" />
            {info.label}
          </Badge>
        );
      },
    },
    {
      key: "taxId",
      label: "เลขภาษี",
      sortable: true,
      render: (contact) => (
        <span className="text-muted-foreground font-mono text-sm">
          {contact.taxId || "-"}
        </span>
      ),
    },
    {
      key: "contact",
      label: "ติดต่อ",
      render: (contact) => (
        <div className="space-y-1">
          {contact.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {contact.phone}
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {contact.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "source",
      label: "แหล่งที่มา",
      render: (contact) => (
        contact.source === "PEAK" ? (
          <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Cloud className="h-3 w-3" />
            Peak
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <PenTool className="h-3 w-3" />
            สร้างเอง
          </Badge>
        )
      ),
    },
    {
      key: "actions",
      label: "",
      width: "50px",
      render: (contact) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenDialog(contact)}>
              <Pencil className="h-4 w-4 mr-2" />
              แก้ไข
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(contact.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              ลบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ผู้ติดต่อ</h1>
          <p className="text-muted-foreground">
            จัดการรายชื่อลูกค้าและผู้ขาย
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Import จาก Peak ล่าสุด:{" "}
              <span className={isImportOutdated ? "text-amber-600 font-medium" : "text-foreground"}>
                {lastContactImportAt 
                  ? formatRelativeDate(lastContactImportAt)
                  : "ยังไม่เคย import"}
              </span>
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/api/contacts/export?company=${companyCode.toUpperCase()}&format=peak`}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Peak
          </Button>
          <ImportContactsDialog
            companyCode={companyCode}
            onImportComplete={handleImportComplete}
          />
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มผู้ติดต่อ
          </Button>
        </div>
      </div>

      {/* Outdated Import Alert */}
      {isImportOutdated && (
        <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">ควรอัปเดตผู้ติดต่อจาก Peak</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            ข้อมูลผู้ติดต่อไม่ได้ถูก Import จาก Peak มานานกว่า 30 วันแล้ว 
            (ล่าสุดเมื่อ {formatDistanceToNowStrict(lastContactImportAt!, { addSuffix: true, locale: th })}) 
            โปรด Import ไฟล์ใหม่เพื่อให้ข้อมูลเป็นปัจจุบัน
          </AlertDescription>
        </Alert>
      )}

      {/* Create/Edit Contact Dialog */}
      <CreateContactDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        companyCode={companyCode}
        editingContact={editingContact}
        onSuccess={handleContactSuccess}
      />

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อ, เลขภาษี, เบอร์โทร, รหัส Peak..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filters & Sort */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">กรอง:</span>
            </div>
            
            {/* Category Filter */}
            <Select
              value={selectedCategory || "all"}
              onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="ประเภท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                <SelectItem value="CUSTOMER">
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> ลูกค้า
                  </span>
                </SelectItem>
                <SelectItem value="VENDOR">
                  <span className="flex items-center gap-1">
                    <Truck className="h-3 w-3" /> ผู้ขาย/ผู้จำหน่าย
                  </span>
                </SelectItem>
                <SelectItem value="OTHER">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" /> อื่นๆ
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Source Filter */}
            <Select
              value={selectedSource || "all"}
              onValueChange={(value) => setSelectedSource(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="แหล่งที่มา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกแหล่งที่มา</SelectItem>
                <SelectItem value="PEAK">
                  <span className="flex items-center gap-1">
                    <Cloud className="h-3 w-3" /> Peak
                  </span>
                </SelectItem>
                <SelectItem value="MANUAL">
                  <span className="flex items-center gap-1">
                    <PenTool className="h-3 w-3" /> สร้างเอง
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(selectedCategory || selectedSource) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedSource(null);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contacts List - Using DataTable */}
      <DataTable
        data={sortedContacts}
        columns={columns}
        keyField="id"
        title="รายชื่อผู้ติดต่อ"
        total={sortedContacts.length}
        isLoading={isLoading}
        sortBy={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyState={{
          icon: Users,
          title: search || selectedCategory || selectedSource 
            ? "ไม่พบผู้ติดต่อที่ตรงกับเงื่อนไข" 
            : "ยังไม่มีผู้ติดต่อ",
          action: !search && !selectedCategory && !selectedSource ? (
            <Button variant="outline" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มผู้ติดต่อแรก
            </Button>
          ) : undefined,
        }}
      />
    </div>
  );
}
