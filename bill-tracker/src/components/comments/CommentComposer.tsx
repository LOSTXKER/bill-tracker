import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentionInput } from "./MentionInput";
import { type TeamMember } from "./useComments";

interface CommentComposerProps {
  value: string;
  onChange: (v: string) => void;
  onMentionedUsersChange: (ids: string[]) => void;
  users: TeamMember[];
  onSubmit: () => void;
  submitting: boolean;
}

export function CommentComposer({
  value,
  onChange,
  onMentionedUsersChange,
  users,
  onSubmit,
  submitting,
}: CommentComposerProps) {
  return (
    <div className="space-y-2">
      <MentionInput
        value={value}
        onChange={onChange}
        onMentionedUsersChange={onMentionedUsersChange}
        users={users}
        placeholder="เขียนความคิดเห็น... พิมพ์ @ เพื่อ mention ทีม"
      />
      <div className="flex justify-end">
        <Button onClick={onSubmit} disabled={submitting || !value.trim()}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          ส่งความคิดเห็น
        </Button>
      </div>
    </div>
  );
}
