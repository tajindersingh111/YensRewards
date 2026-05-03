import { LucideIcon } from "lucide-react";

export function SalesProgressRow({ label, value, percentage, icon: Icon }: { label: string, value: string, percentage: number, icon: LucideIcon }) {
  return (
    <div className="group space-y-2 p-2 rounded-xl transition-all hover:bg-slate-50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="w-4 h-4 text-blue-900 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-black text-blue-900 uppercase tracking-tight truncate">{label}</span>
        </div>
        <span className="text-sm font-black text-blue-900 tracking-tighter italic">{value}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div className="h-full bg-blue-900 rounded-full transition-all duration-1000 group-hover:bg-yellow-400" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
