"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionedUsersChange: (userIds: string[]) => void;
  users: User[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function MentionInput({
  value,
  onChange,
  onMentionedUsersChange,
  users,
  placeholder = "เขียนความคิดเห็น... พิมพ์ @ เพื่อ mention",
  className,
  disabled,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter users based on query
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Handle text change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      onChange(newValue);

      // Check if we're in mention mode
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        // Check if @ is at start or after whitespace
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
        if (charBeforeAt === " " || charBeforeAt === "\n" || lastAtIndex === 0) {
          const query = textBeforeCursor.substring(lastAtIndex + 1);
          // Only show suggestions if no space after @
          if (!query.includes(" ") && !query.includes("\n")) {
            setMentionQuery(query);
            setMentionStartIndex(lastAtIndex);
            setShowSuggestions(true);
            setSuggestionIndex(0);
            return;
          }
        }
      }

      setShowSuggestions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);
    },
    [onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || filteredUsers.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSuggestionIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
        break;
      case "Enter":
        if (showSuggestions) {
          e.preventDefault();
          selectUser(filteredUsers[suggestionIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
      case "Tab":
        if (showSuggestions) {
          e.preventDefault();
          selectUser(filteredUsers[suggestionIndex]);
        }
        break;
    }
  };

  // Select a user from suggestions
  const selectUser = (user: User) => {
    if (mentionStartIndex === -1) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const beforeMention = value.substring(0, mentionStartIndex);
    const afterMention = value.substring(
      mentionStartIndex + mentionQuery.length + 1
    );
    const newValue = `${beforeMention}@${user.name} ${afterMention}`;

    onChange(newValue);

    // Add to mentioned users if not already
    if (!mentionedUserIds.includes(user.id)) {
      const newMentionedIds = [...mentionedUserIds, user.id];
      setMentionedUserIds(newMentionedIds);
      onMentionedUsersChange(newMentionedIds);
    }

    // Hide suggestions
    setShowSuggestions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);

    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = beforeMention.length + user.name.length + 2; // +2 for @ and space
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Scroll suggestion into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selectedItem = suggestionsRef.current.children[suggestionIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [suggestionIndex, showSuggestions]);

  // Parse mentioned users from value
  useEffect(() => {
    const mentions = value.match(/@[\w\sก-๙]+/g) || [];
    const mentionNames = mentions.map((m) => m.substring(1).trim());
    const ids = users
      .filter((u) => mentionNames.some((name) => u.name === name))
      .map((u) => u.id);
    
    if (JSON.stringify(ids) !== JSON.stringify(mentionedUserIds)) {
      setMentionedUserIds(ids);
      onMentionedUsersChange(ids);
    }
  }, [value, users]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("min-h-[80px]", className)}
        disabled={disabled}
      />

      {/* Mention Suggestions Dropdown */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredUsers.slice(0, 8).map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors",
                index === suggestionIndex && "bg-muted"
              )}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mentioned Users Preview */}
      {mentionedUserIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {mentionedUserIds.map((id) => {
            const user = users.find((u) => u.id === id);
            if (!user) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
              >
                @{user.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
