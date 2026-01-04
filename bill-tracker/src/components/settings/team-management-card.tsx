"use client";

/**
 * Team Management Card Component
 * 
 * Card displaying team members with ability to invite new members
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { TeamMembersList } from "./team-members-list";
import { InviteMemberDialog } from "./invite-member-dialog";
import { useIsOwner } from "@/components/guards/permission-guard";

interface TeamManagementCardProps {
  companyId: string;
}

export function TeamManagementCard({ companyId }: TeamManagementCardProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const isOwner = useIsOwner();

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                สมาชิกในทีม
              </CardTitle>
              <CardDescription>
                จัดการสมาชิกและสิทธิ์การเข้าถึง
              </CardDescription>
            </div>
            {isOwner && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                เชิญสมาชิกใหม่
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <TeamMembersList companyId={companyId} />
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteMemberDialog
        companyId={companyId}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={() => {
          setInviteDialogOpen(false);
          // The TeamMembersList component will reload automatically
        }}
      />
    </>
  );
}
