import { Card } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

export default function KPICard({ title, value, icon: Icon, trend, subtitle }: KPICardProps) {
  return (
    <Card className="p-6" data-testid={`card-kpi-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div>
          <p className="text-3xl font-bold text-foreground" data-testid="text-kpi-value">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>

        {trend && (
          <div className="flex items-center gap-1">
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4 text-chart-3" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span
              className={`text-sm font-medium ${
                trend.isPositive ? "text-chart-3" : "text-destructive"
              }`}
              data-testid="text-trend"
            >
              {trend.value}%
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        )}
      </div>
    </Card>
  );
}
