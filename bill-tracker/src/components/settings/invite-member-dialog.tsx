"use client";

/**
 * Invite Member Dialog Component
 * 
 * Dialog for inviting new team members with custom permissions
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PermissionBuilder } from "./permission-builder";
import { UserPlus } from "lucide-react";

interface InviteMemberDialogProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteMemberDialog({
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("กรุณากรอกอีเมล");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/companies/${companyId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          permissions,
          isOwner,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to invite member");
      }

      toast.success(`เชิญ ${email} เข้าร่วมทีมแล้ว`);
      onSuccess();
      
      // Reset form
      setEmail("");
      setPermissions([]);
      setIsOwner(false);
    } catch (error: any) {
      console.error("Error inviting member:", error);
      toast.error(error.message || "ไม่สามารถเชิญสมาชิกได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            เชิญสมาชิกใหม่
          </DialogTitle>
          <DialogDescription>
            กรอกอีเมลและกำหนดสิทธิ์สำหรับสมาชิกใหม่
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* OWNER Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-owner"
              checked={isOwner}
              onCheckedChange={(checked) => setIsOwner(checked as boolean)}
            />
            <div className="space-y-1">
              <Label
                htmlFor="is-owner"
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
              {loading ? "กำลังเชิญ..." : "เชิญเข้าทีม"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
