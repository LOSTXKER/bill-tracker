"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserBadge } from "@/components/shared/UserBadge";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { DataTableSkeleton } from "@/components/shared/DataTableSkeleton";
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

  const handleRowClick = (member: TeamMember) => {
    router.push(`/${companyCode.toLowerCase()}/employees/${member.userId}`);
  };

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      if (statusFilter === "active" && !member.user.isActive) return false;
      if (statusFilter === "inactive" && member.user.isActive) return false;
      if (roleFilter === "owner" && !member.isOwner) return false;
      if (roleFilter === "staff" && member.isOwner) return false;
      return true;
    });
  }, [members, statusFilter, roleFilter]);

  // Stats
  const stats = {
    total: members.length,
    active: members.filter((m) => m.user.isActive).length,
    owners: members.filter((m) => m.isOwner).length,
    staff: members.filter((m) => !m.isOwner).length,
  };

  // Define columns for DataTable
  const columns: ColumnDef<TeamMember>[] = useMemo(() => [
    {
      key: "name",
      label: "ชื่อ-อีเมล",
      width: "250px",
      render: (member) => <UserBadge user={member.user} />,
    },
    {
      key: "role",
      label: "ตำแหน่ง",
      width: "150px",
      render: (member) => (
        member.isOwner ? (
          <Badge variant="default" className="gap-1">
            <Crown className="h-3 w-3" />
            ผู้จัดการ
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            พนักงาน
          </Badge>
        )
      ),
    },
    {
      key: "status",
      label: "สถานะ",
      width: "120px",
      render: (member) => (
        member.user.isActive ? (
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
        )
      ),
    },
    {
      key: "permissions",
      label: "สิทธิ์",
      width: "150px",
      render: (member) => (
        member.isOwner ? (
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            สิทธิ์ทั้งหมด
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            {member.permissions.length} สิทธิ์
          </Badge>
        )
      ),
    },
    {
      key: "lastLogin",
      label: "เข้าสู่ระบบล่าสุด",
      width: "180px",
      render: (member) => {
        const lastLogin = member.user.lastLoginAt
          ? new Date(member.user.lastLoginAt)
          : null;
        return (
          <span className="text-muted-foreground text-sm">
            {lastLogin ? (
              lastLogin.toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "2-digit",
              })
            ) : (
              "-"
            )}
          </span>
        );
      },
    },
  ], []);

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

      {/* Table with Filters */}
      {isLoading ? (
        <DataTableSkeleton title="รายชื่อพนักงาน" columns={5} rows={5} />
      ) : (
        <DataTable
          data={filteredMembers}
          columns={columns}
          keyField="id"
          title="รายชื่อพนักงาน"
          total={filteredMembers.length}
          onRowClick={handleRowClick}
          rowClassName={() => "cursor-pointer"}
          headerActions={
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                  <SelectItem value="active">ใช้งานอยู่</SelectItem>
                  <SelectItem value="inactive">ไม่ได้ใช้งาน</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ตำแหน่งทั้งหมด</SelectItem>
                  <SelectItem value="owner">ผู้จัดการ</SelectItem>
                  <SelectItem value="staff">พนักงาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          emptyState={{
            icon: Users,
            title: "ไม่พบพนักงาน",
            description: "ไม่มีพนักงานที่ตรงกับเงื่อนไขที่เลือก",
          }}
        />
      )}

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
