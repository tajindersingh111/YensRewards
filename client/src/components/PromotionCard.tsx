import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Clock } from "lucide-react";
import { format } from "date-fns";

interface PromotionCardProps {
  title: string;
  description: string;
  validUntil: Date;
  isNew?: boolean;
}

export default function PromotionCard({ title, description, validUntil, isNew }: PromotionCardProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-primary to-chart-2 text-primary-foreground hover-elevate" data-testid="card-promotion">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          {isNew && (
            <Badge className="bg-chart-4 text-white" data-testid="badge-new">
              NEW
            </Badge>
          )}
        </div>

        <p className="text-sm opacity-90">{description}</p>

        <div className="flex items-center gap-1 text-xs opacity-80">
          <Clock className="w-3 h-3" />
          <span>Valid until {format(validUntil, "MMM dd, yyyy")}</span>
        </div>
      </div>
    </Card>
  );
}
