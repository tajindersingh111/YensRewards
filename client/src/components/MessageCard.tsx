import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MessageCardProps {
  title: string;
  message: string;
  isNew?: boolean;
}

export default function MessageCard({ title, message, isNew }: MessageCardProps) {
  const { t } = useTranslation();
  
  return (
    <div className="rounded-xl border-2 border-solid border-primary bg-primary/5 p-3" data-testid="card-message">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <Megaphone className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
          </div>
          {isNew && (
            <Badge className="bg-red-500 text-white flex-shrink-0 text-xs px-2 py-0" data-testid="badge-message-new">
              {t('common.new')}
            </Badge>
          )}
        </div>
        <p className="text-xs text-foreground pl-5">{message}</p>
      </div>
    </div>
  );
}
