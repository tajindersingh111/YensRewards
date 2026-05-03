import { LucideIcon } from "lucide-react";

export function SectionHeader({ title, subtitle, icon: Icon, actions }: { title: string, subtitle: string, icon: LucideIcon, actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center shrink-0 shadow-lg border-2 border-white">
          <Icon className="w-6 h-6 text-blue-900" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-blue-900 uppercase tracking-tight leading-none">{title}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
