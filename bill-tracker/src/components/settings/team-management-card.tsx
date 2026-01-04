"use client";

/**
 * Team Management Card Component
 * 
 * Card displaying team members with ability to create new members
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { TeamMembersList } from "./team-members-list";
import { CreateMemberDialog } from "./create-member-dialog";
import { useIsOwner } from "@/components/guards/permission-guard";

interface TeamManagementCardProps {
  companyId: string;
}

export function TeamManagementCard({ companyId }: TeamManagementCardProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const isOwner = useIsOwner();

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                สมาชิกในทีม
              </CardTitle>
              <CardDescription>
                จัดการสมาชิกและสิทธิ์การเข้าถึง
              </CardDescription>
            </div>
            {isOwner && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                สร้างสมาชิกใหม่
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <TeamMembersList companyId={companyId} />
        </CardContent>
      </Card>

      {/* Create Member Dialog */}
      <CreateMemberDialog
        companyId={companyId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          // The TeamMembersList component will reload automatically
        }}
      />
    </>
  );
}
