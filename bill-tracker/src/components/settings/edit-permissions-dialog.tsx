"use client";

/**
 * Edit Permissions Dialog Component
 * 
 * Dialog for editing an existing member's permissions
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PermissionBuilder } from "./permission-builder";
import { Edit } from "lucide-react";

interface TeamMember {
  id: string;
  userId: string;
  isOwner: boolean;
  permissions: string[];
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface EditPermissionsDialogProps {
  member: TeamMember;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPermissionsDialog({
  member,
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: EditPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<string[]>(member.permissions);
  const [isOwner, setIsOwner] = useState(member.isOwner);
  const [loading, setLoading] = useState(false);

  // Update permissions when member changes
  useEffect(() => {
    setPermissions(member.permissions);
    setIsOwner(member.isOwner);
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch(
        `/api/companies/${companyId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            permissions,
            isOwner,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update permissions");
      }

      toast.success(`อัพเดตสิทธิ์ของ ${member.user.name} แล้ว`);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating permissions:", error);
      toast.error(error.message || "ไม่สามารถอัพเดตสิทธิ์ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            แก้ไขสิทธิ์: {member.user.name}
          </DialogTitle>
          <DialogDescription>{member.user.email}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OWNER Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-owner-edit"
              checked={isOwner}
              onCheckedChange={(checked) => setIsOwner(checked as boolean)}
            />
            <div className="space-y-1">
              <Label
                htmlFor="is-owner-edit"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                กำหนดเป็น OWNER
              </Label>
              <p className="text-sm text-muted-foreground">
                OWNER มีสิทธิ์ทั้งหมดและสามารถจัดการทีมได้
              </p>
            </div>
          </div>

          {/* Permission Builder (only if not owner) */}
          {!isOwner && (
            <div className="space-y-2">
              <Label>กำหนดสิทธิ์</Label>
              <PermissionBuilder
                value={permissions}
                onChange={setPermissions}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
