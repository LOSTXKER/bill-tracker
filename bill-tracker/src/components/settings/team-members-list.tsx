"use client";

/**
 * Team Members List Component
 * 
 * Displays all members of a company with their permissions
 * Allows editing and removing members (for OWNERs only)
 */

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Shield, Edit, Trash2, Crown } from "lucide-react";
import { toast } from "sonner";
import { EditPermissionsDialog } from "./edit-permissions-dialog";
import { usePermissions } from "@/components/providers/permission-provider";

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

interface TeamMembersListProps {
  companyId: string;
}

export function TeamMembersList({ companyId }: TeamMembersListProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const { isOwner } = usePermissions();

  useEffect(() => {
    loadMembers();
  }, [companyId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/members`);
      
      if (!response.ok) {
        throw new Error("Failed to load members");
      }
      
      const data = await response.json();
      setMembers(data.members);
    } catch (error) {
      console.error("Error loading members:", error);
      toast.error("ไม่สามารถโหลดรายชื่อสมาชิกได้");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!confirm(`ต้องการลบ ${member.user.name} ออกจากทีม?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/companies/${companyId}/members/${member.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }

      toast.success(`ลบ ${member.user.name} ออกจากทีมแล้ว`);
      loadMembers();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error(error.message || "ไม่สามารถลบสมาชิกได้");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
              <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        ยังไม่มีสมาชิกในทีม
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {member.user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{member.user.name}</p>
                {member.isOwner && (
                  <Badge variant="default" className="gap-1">
                    <Crown className="h-3 w-3" />
                    OWNER
                  </Badge>
                )}
                {!member.user.isActive && (
                  <Badge variant="secondary">รอการยืนยัน</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {member.user.email}
              </p>
            </div>

            {/* Permissions Badge */}
            <div className="flex items-center gap-2">
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
            </div>

            {/* Actions (only for OWNER) */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>จัดการสมาชิก</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setEditingMember(member)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    แก้ไขสิทธิ์
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleRemoveMember(member)}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    ลบออกจากทีม
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {/* Edit Permissions Dialog */}
      {editingMember && (
        <EditPermissionsDialog
          member={editingMember}
          companyId={companyId}
          open={!!editingMember}
          onOpenChange={(open) => {
            if (!open) setEditingMember(null);
          }}
          onSuccess={() => {
            loadMembers();
            setEditingMember(null);
          }}
        />
      )}
    </>
  );
}
