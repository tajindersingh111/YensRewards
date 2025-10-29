import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

interface MessageCardProps {
  title: string;
  message: string;
  isNew?: boolean;
}

export default function MessageCard({ title, message, isNew }: MessageCardProps) {
  return (
    <div className="rounded-xl border-3 border-solid border-primary bg-primary/5 p-5" data-testid="card-message">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Megaphone className="w-6 h-6 text-primary flex-shrink-0" />
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
          </div>
          {isNew && (
            <Badge className="bg-red-500 text-white flex-shrink-0 text-base px-3 py-0.5" data-testid="badge-message-new">
              NEW
            </Badge>
          )}
        </div>
        <p className="text-base text-foreground pl-9">{message}</p>
      </div>
    </div>
  );
}
