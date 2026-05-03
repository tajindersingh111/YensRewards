import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export function KPICard({ title, value, icon: Icon, trend, trendValue }: { title: string, value: string, icon: LucideIcon, trend?: 'up' | 'down', trendValue?: string }) {
  return (
    <Card className="border-none shadow-xl rounded-[2rem] bg-white hover:shadow-2xl transition-all duration-500 group overflow-hidden relative">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-6 transition-transform">
            <Icon className="w-6 h-6 text-blue-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-blue-900 tracking-tighter italic">{value}</h3>
              {trendValue && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {trend === 'up' ? '↑' : '↓'} {trendValue}%
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-50">
        <div className="h-full bg-blue-900/10 group-hover:bg-yellow-400 transition-all duration-700 w-1/3" />
      </div>
    </Card>
  );
}
