import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

interface MessageCardProps {
  title: string;
  message: string;
  isNew?: boolean;
}

export default function MessageCard({ title, message, isNew }: MessageCardProps) {
  return (
    <div className="rounded-2xl border-4 border-solid border-primary bg-primary/5 p-6" data-testid="card-message">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Megaphone className="w-7 h-7 text-primary flex-shrink-0" />
            <h3 className="text-xl font-bold text-foreground">{title}</h3>
          </div>
          {isNew && (
            <Badge className="bg-red-500 text-white flex-shrink-0 text-lg px-4 py-1" data-testid="badge-message-new">
              NEW
            </Badge>
          )}
        </div>
        <p className="text-lg text-foreground pl-10">{message}</p>
      </div>
    </div>
  );
}
