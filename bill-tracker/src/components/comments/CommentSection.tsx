"use client";

import { MessageSquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useComments } from "./useComments";
import { CommentItem } from "./CommentItem";
import { CommentComposer } from "./CommentComposer";

interface CommentSectionProps {
  companyCode: string;
  entityType: "expense" | "income" | "reimbursement";
  entityId: string;
  currentUserId: string;
}

export function CommentSection({
  companyCode,
  entityType,
  entityId,
  currentUserId,
}: CommentSectionProps) {
  const {
    comments,
    loading,
    newComment,
    setNewComment,
    mentionedUserIds,
    setMentionedUserIds,
    submitting,
    replyingTo,
    setReplyingTo,
    replyContent,
    setReplyContent,
    replyMentionedUserIds,
    setReplyMentionedUserIds,
    editingId,
    setEditingId,
    editContent,
    setEditContent,
    deleteConfirm,
    setDeleteConfirm,
    teamMembers,
    handleSubmit,
    handleUpdate,
    handleDelete,
  } = useComments({ companyCode, entityType, entityId });

  const itemProps = {
    currentUserId,
    editingId,
    editContent,
    setEditingId,
    setEditContent,
    replyingTo,
    replyContent,
    setReplyingTo,
    setReplyContent,
    replyMentionedUserIds,
    setReplyMentionedUserIds,
    teamMembers,
    submitting,
    onUpdate: handleUpdate,
    onDeleteConfirm: (id: string) => setDeleteConfirm(id),
    onSubmit: handleSubmit,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          ความคิดเห็น
          {comments.length > 0 && <Badge variant="secondary">{comments.length}</Badge>}
        </h3>
      </div>

      <CommentComposer
        value={newComment}
        onChange={setNewComment}
        onMentionedUsersChange={setMentionedUserIds}
        users={teamMembers}
        onSubmit={() => handleSubmit()}
        submitting={submitting}
      />

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          กำลังโหลด...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>ยังไม่มีความคิดเห็น</p>
          <p className="text-sm">เริ่มสนทนาเกี่ยวกับเอกสารนี้</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} {...itemProps} />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบความคิดเห็น?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบความคิดเห็นนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
