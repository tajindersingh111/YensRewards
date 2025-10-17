import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface SalesData {
  label: string;
  value: number;
}

interface SalesChartProps {
  data: SalesData[];
  title: string;
}

export default function SalesChart({ data, title }: SalesChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <Card className="p-6" data-testid="card-sales-chart">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>

        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="space-y-1" data-testid={`chart-item-${index}`}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">฿{item.value.toLocaleString()}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
