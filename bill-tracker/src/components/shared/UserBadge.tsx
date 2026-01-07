import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UserBadgeProps {
  user: {
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
  showEmail?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function UserBadge({ 
  user, 
  showEmail = false, 
  size = "sm",
  onClick 
}: UserBadgeProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md py-1 transition-colors",
        onClick && "cursor-pointer hover:bg-accent"
      )}
      onClick={onClick}
    >
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
        <AvatarFallback className="text-xs font-medium">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium text-foreground">
        {user.name}
      </span>
    </div>
  );

  if (showEmail && user.email) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-medium">{user.name}</p>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
