import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

interface MessageCardProps {
  title: string;
  message: string;
  isNew?: boolean;
}

export default function MessageCard({ title, message, isNew }: MessageCardProps) {
  return (
    <div className="rounded-lg border-2 border-solid border-primary bg-primary/5 p-4" data-testid="card-message">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Megaphone className="w-5 h-5 text-primary flex-shrink-0" />
            <h3 className="text-base font-bold text-foreground">{title}</h3>
          </div>
          {isNew && (
            <Badge className="bg-red-500 text-white flex-shrink-0" data-testid="badge-message-new">
              NEW
            </Badge>
          )}
        </div>
        <p className="text-sm text-foreground pl-7">{message}</p>
      </div>
    </div>
  );
}
