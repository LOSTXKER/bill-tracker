import {
  MoreHorizontal,
  Trash2,
  Edit,
  CheckCircle,
  Circle,
  Reply,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MentionInput } from "./MentionInput";
import { type Comment, type CommentReply, type TeamMember, formatTime } from "./useComments";

interface CommentItemProps {
  comment: Comment | CommentReply;
  isReply?: boolean;
  currentUserId: string;
  editingId: string | null;
  editContent: string;
  setEditingId: (id: string | null) => void;
  setEditContent: (content: string) => void;
  replyingTo: string | null;
  replyContent: string;
  setReplyingTo: (id: string | null) => void;
  setReplyContent: (content: string) => void;
  replyMentionedUserIds: string[];
  setReplyMentionedUserIds: (ids: string[]) => void;
  teamMembers: TeamMember[];
  submitting: boolean;
  onUpdate: (id: string, content?: string, isResolved?: boolean) => void;
  onDeleteConfirm: (id: string) => void;
  onSubmit: (parentId?: string) => void;
}

export function CommentItem({
  comment,
  isReply = false,
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
  onUpdate,
  onDeleteConfirm,
  onSubmit,
}: CommentItemProps) {
  const isAuthor = comment.author.id === currentUserId;
  const isEditing = editingId === comment.id;

  const sharedProps = {
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
    onUpdate,
    onDeleteConfirm,
    onSubmit,
  };

  return (
    <div className={cn("group", isReply && "ml-10 pl-4 border-l-2 border-muted")}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {comment.author.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">{formatTime(comment.createdAt)}</span>
              {"isResolved" in comment && comment.isResolved && (
                <Badge variant="outline" className="text-xs gap-1 text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  แก้ไขแล้ว
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isReply && (
                  <DropdownMenuItem onClick={() => setReplyingTo(comment.id)}>
                    <Reply className="h-4 w-4 mr-2" />
                    ตอบกลับ
                  </DropdownMenuItem>
                )}
                {"isResolved" in comment && !isReply && (
                  <DropdownMenuItem
                    onClick={() => onUpdate(comment.id, undefined, !comment.isResolved)}
                  >
                    {comment.isResolved ? (
                      <>
                        <Circle className="h-4 w-4 mr-2" />
                        ยกเลิกแก้ไขแล้ว
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        ทำเครื่องหมายแก้ไขแล้ว
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {isAuthor && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditContent(comment.content);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      แก้ไข
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteConfirm(comment.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      ลบ
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onUpdate(comment.id, editContent)}>
                  บันทึก
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setEditContent("");
                  }}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
          )}

          {!isReply && replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <MentionInput
                value={replyContent}
                onChange={setReplyContent}
                onMentionedUsersChange={setReplyMentionedUserIds}
                users={teamMembers}
                placeholder="เขียนตอบกลับ... พิมพ์ @ เพื่อ mention"
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onSubmit(comment.id)}
                  disabled={submitting || !replyContent.trim()}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  ตอบกลับ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                    setReplyMentionedUserIds([]);
                  }}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {"replies" in comment && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply {...sharedProps} />
          ))}
        </div>
      )}
    </div>
  );
}
