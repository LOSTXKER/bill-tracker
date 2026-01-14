"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  MessageSquare, 
  Send, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  CheckCircle, 
  Circle,
  Reply,
  Loader2,
  AlertCircle,
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
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface Author {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface CommentReply {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
  isResolved: boolean;
}

interface Comment {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
  isResolved: boolean;
  resolvedAt: string | null;
  replies: CommentReply[];
}

interface CommentSectionProps {
  companyCode: string;
  entityType: "expense" | "income" | "reimbursement";
  entityId: string;
  currentUserId: string;
}

// =============================================================================
// Component
// =============================================================================

export function CommentSection({ 
  companyCode, 
  entityType, 
  entityId,
  currentUserId,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/${companyCode}/comments?entityType=${entityType}&entityId=${entityId}`
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.data.comments || []);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [companyCode, entityType, entityId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Create comment
  const handleSubmit = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/${companyCode}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          content: content.trim(),
          parentId,
        }),
      });

      if (res.ok) {
        if (parentId) {
          setReplyContent("");
          setReplyingTo(null);
        } else {
          setNewComment("");
        }
        fetchComments();
      }
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Update comment
  const handleUpdate = async (id: string, content?: string, isResolved?: boolean) => {
    try {
      const res = await fetch(`/api/${companyCode}/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, isResolved }),
      });

      if (res.ok) {
        setEditingId(null);
        setEditContent("");
        fetchComments();
      }
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  // Delete comment
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/${companyCode}/comments/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeleteConfirm(null);
        fetchComments();
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "เมื่อกี้";
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชม.ที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;
    return date.toLocaleDateString("th-TH", { 
      day: "numeric", 
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render single comment
  const renderComment = (comment: Comment | CommentReply, isReply = false) => {
    const isAuthor = comment.author.id === currentUserId;
    const isEditing = editingId === comment.id;

    return (
      <div 
        key={comment.id}
        className={cn(
          "group",
          isReply && "ml-10 pl-4 border-l-2 border-muted"
        )}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {comment.author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{comment.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(comment.createdAt)}
                </span>
                {"isResolved" in comment && comment.isResolved && (
                  <Badge variant="outline" className="text-xs gap-1 text-emerald-600">
                    <CheckCircle className="h-3 w-3" />
                    แก้ไขแล้ว
                  </Badge>
                )}
              </div>

              {/* Actions */}
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
                      onClick={() => handleUpdate(comment.id, undefined, !comment.isResolved)}
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
                        onClick={() => setDeleteConfirm(comment.id)}
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

            {/* Comment content */}
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleUpdate(comment.id, editContent)}
                  >
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

            {/* Reply form */}
            {!isReply && replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="เขียนตอบกลับ..."
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleSubmit(comment.id)}
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
                    }}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {"replies" in comment && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          ความคิดเห็น
          {comments.length > 0 && (
            <Badge variant="secondary">{comments.length}</Badge>
          )}
        </h3>
      </div>

      {/* New comment form */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="เขียนความคิดเห็น... (ถามเอกสาร, ทวงตาม, แจ้งปัญหา)"
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button 
            onClick={() => handleSubmit()}
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            ส่งความคิดเห็น
          </Button>
        </div>
      </div>

      {/* Comments list */}
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
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}

      {/* Delete confirmation dialog */}
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
