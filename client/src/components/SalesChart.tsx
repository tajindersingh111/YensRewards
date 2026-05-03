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
    <Card className="p-6 border-none shadow-xl rounded-[2rem]" data-testid="card-sales-chart">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
            <BarChart3 className="w-5 h-5 text-blue-900" />
          </div>
          <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight leading-none">{title}</h3>
        </div>

        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="space-y-1" data-testid={`chart-item-${index}`}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">{item.label}</span>
                <span className="font-black text-blue-900">฿{item.value.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-900 h-2 rounded-full transition-all"
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
