"use client";

import { useState, use } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Loader2,
  Upload,
  Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { CreateContactDialog, Contact } from "@/components/forms/shared/CreateContactDialog";
import { useContacts } from "@/hooks/use-contacts";
import { mutate } from "swr";
import { swrKeys } from "@/lib/swr-config";

interface ContactsPageProps {
  params: Promise<{ company: string }>;
}

export default function ContactsPage({ params }: ContactsPageProps) {
  const { company: companyCode } = use(params);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Use SWR hook for data fetching and caching
  const { contacts, isLoading, refetch } = useContacts(companyCode);

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.taxId?.toLowerCase().includes(searchLower) ||
      contact.phone?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower)
    );
  });

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

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบผู้ติดต่อนี้ใช่หรือไม่?")) return;

    try {
      const res = await fetch(
        `/api/contacts?id=${id}&company=${companyCode.toUpperCase()}`,
        { 
          method: "DELETE",
          cache: "no-store" // Prevent caching DELETE requests
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("ลบสำเร็จ");
        // Immediately revalidate cache
        await mutate(swrKeys.contacts(companyCode));
        refetch();
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ผู้ติดต่อ</h1>
          <p className="text-muted-foreground">
            จัดการรายชื่อลูกค้าและผู้ขาย
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.href = `/api/contacts/export?company=${companyCode.toUpperCase()}&format=peak`}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Peak
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = `/${companyCode}/contacts/import`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import จาก Peak
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มผู้ติดต่อ
          </Button>
        </div>
      </div>

      {/* Create/Edit Contact Dialog */}
      <CreateContactDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        companyCode={companyCode}
        editingContact={editingContact}
        onSuccess={handleContactSuccess}
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อ, เลขภาษี, เบอร์โทร..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            รายชื่อผู้ติดต่อ ({filteredContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {search ? "ไม่พบผู้ติดต่อที่ค้นหา" : "ยังไม่มีผู้ติดต่อ"}
              </p>
              {!search && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มผู้ติดต่อแรก
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส Peak</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>เลขภาษี</TableHead>
                    <TableHead>ติดต่อ</TableHead>
                    <TableHead>เครดิต</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {(contact as any).peakCode || "-"}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.taxId || "-"}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        {contact.creditLimit ? (
                          <div className="text-sm">
                            {formatCurrency(Number(contact.creditLimit))}
                            {contact.paymentTerms && (
                              <span className="text-muted-foreground ml-1">
                                ({contact.paymentTerms} วัน)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
