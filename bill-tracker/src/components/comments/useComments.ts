import { useState, useEffect, useCallback } from "react";
import { formatThaiDateTimeShort } from "@/lib/utils/formatters";

export interface Author {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface CommentReply {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
  isResolved: boolean;
}

export interface Comment {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
  isResolved: boolean;
  resolvedAt: string | null;
  replies: CommentReply[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "เมื่อกี้";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  if (days < 7) return `${days} วันที่แล้ว`;
  return formatThaiDateTimeShort(date);
}

interface UseCommentsProps {
  companyCode: string;
  entityType: "expense" | "income" | "reimbursement";
  entityId: string;
}

export function useComments({ companyCode, entityType, entityId }: UseCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyMentionedUserIds, setReplyMentionedUserIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/${companyCode}/comments?entityType=${entityType}&entityId=${entityId}`,
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

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const companyRes = await fetch(`/api/companies?code=${companyCode.toUpperCase()}`);
        if (!companyRes.ok) return;
        const companyData = await companyRes.json();
        const companyId = companyData.data?.companies?.[0]?.id;
        if (!companyId) return;

        const membersRes = await fetch(`/api/companies/${companyId}/members`);
        if (!membersRes.ok) return;
        const membersData = await membersRes.json();
        const members = membersData.data?.members || membersData.members || [];
        setTeamMembers(
          members.map((m: { user: TeamMember }) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
          })),
        );
      } catch (error) {
        console.error("Failed to fetch team members:", error);
      }
    };
    fetchTeamMembers();
  }, [companyCode]);

  const handleSubmit = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    const mentions = parentId ? replyMentionedUserIds : mentionedUserIds;
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
          mentionedUserIds: mentions.length > 0 ? mentions : undefined,
        }),
      });
      if (res.ok) {
        if (parentId) {
          setReplyContent("");
          setReplyingTo(null);
          setReplyMentionedUserIds([]);
        } else {
          setNewComment("");
          setMentionedUserIds([]);
        }
        fetchComments();
      }
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/${companyCode}/comments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirm(null);
        fetchComments();
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  return {
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
  };
}
