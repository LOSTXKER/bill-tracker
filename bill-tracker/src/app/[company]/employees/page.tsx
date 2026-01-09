"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserBadge } from "@/components/shared/UserBadge";
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  CheckCircle,
  Clock,
} from "lucide-react";
import { CreateMemberDialog } from "@/components/settings/create-member-dialog";
import { useIsOwner } from "@/components/guards/permission-guard";

interface TeamMember {
  id: string;
  userId: string;
  isOwner: boolean;
  permissions: string[];
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    lastLoginAt?: Date | null;
    isActive: boolean;
  };
}

export default function EmployeesPage() {
  const params = useParams();
  const router = useRouter();
  const companyCode = (params.company as string).toUpperCase();
  const isOwner = useIsOwner();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Fetch company ID
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies?code=${companyCode}`);
        const result = await response.json();
        // Handle both old format (data.companies) and new format (data.data.companies)
        const companies = result.data?.companies || result.companies;
        if (companies?.[0]) {
          setCompanyId(companies[0].id);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };
    fetchCompany();
  }, [companyCode]);

  // Fetch members
  const fetchMembers = async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/members`);
      const result = await response.json();
      // Handle both old format (data.members) and new format (data.data.members)
      const members = result.data?.members || result.members || [];
      setMembers(members);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [companyId]);

  const handleRowClick = (userId: string) => {
    router.push(`/${companyCode.toLowerCase()}/employees/${userId}`);
  };

  // Filter members
  const filteredMembers = members.filter((member) => {
    if (statusFilter === "active" && !member.user.isActive) return false;
    if (statusFilter === "inactive" && member.user.isActive) return false;
    if (roleFilter === "owner" && !member.isOwner) return false;
    if (roleFilter === "staff" && member.isOwner) return false;
    return true;
  });

  // Stats
  const stats = {
    total: members.length,
    active: members.filter((m) => m.user.isActive).length,
    owners: members.filter((m) => m.isOwner).length,
    staff: members.filter((m) => !m.isOwner).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="พนักงาน"
        description="จัดการข้อมูลและสิทธิ์ของพนักงานในบริษัท"
        actions={
          isOwner ? (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              เพิ่มพนักงาน
            </Button>
          ) : null
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ทั้งหมด</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ใช้งานอยู่</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.active}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ผู้จัดการ</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.owners}
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Crown className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">พนักงาน</p>
                <p className="text-2xl font-bold text-blue-600">{stats.staff}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">รายชื่อพนักงาน</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                  <SelectItem value="active">ใช้งานอยู่</SelectItem>
                  <SelectItem value="inactive">ไม่ได้ใช้งาน</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ตำแหน่งทั้งหมด</SelectItem>
                  <SelectItem value="owner">ผู้จัดการ</SelectItem>
                  <SelectItem value="staff">พนักงาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">ไม่พบพนักงาน</h3>
              <p className="text-muted-foreground">
                ไม่มีพนักงานที่ตรงกับเงื่อนไขที่เลือก
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[250px]">ชื่อ-อีเมล</TableHead>
                    <TableHead className="w-[150px]">ตำแหน่ง</TableHead>
                    <TableHead className="w-[120px]">สถานะ</TableHead>
                    <TableHead className="w-[150px]">สิทธิ์</TableHead>
                    <TableHead className="w-[180px]">เข้าสู่ระบบล่าสุด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const lastLogin = member.user.lastLoginAt
                      ? new Date(member.user.lastLoginAt)
                      : null;

                    return (
                      <TableRow
                        key={member.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleRowClick(member.userId)}
                      >
                        <TableCell>
                          <UserBadge user={member.user} />
                        </TableCell>
                        <TableCell>
                          {member.isOwner ? (
                            <Badge variant="default" className="gap-1">
                              <Crown className="h-3 w-3" />
                              ผู้จัดการ
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Users className="h-3 w-3" />
                              พนักงาน
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.user.isActive ? (
                            <Badge
                              variant="outline"
                              className="gap-1 text-emerald-600 border-emerald-600"
                            >
                              <CheckCircle className="h-3 w-3" />
                              ใช้งานอยู่
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              รอยืนยัน
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.isOwner ? (
                            <Badge variant="outline" className="gap-1">
                              <Shield className="h-3 w-3" />
                              สิทธิ์ทั้งหมด
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Shield className="h-3 w-3" />
                              {member.permissions.length} สิทธิ์
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lastLogin ? (
                            <span className="text-sm">
                              {lastLogin.toLocaleDateString("th-TH", {
                                day: "numeric",
                                month: "short",
                                year: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Member Dialog */}
      {companyId && (
        <CreateMemberDialog
          companyId={companyId}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            setCreateDialogOpen(false);
            fetchMembers();
          }}
        />
      )}
    </div>
  );
}
