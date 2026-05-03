import { User, MapPin } from "lucide-react";

export function TransactionItem({ customerName, location, points, date, amount }: any) {
  return (
    <div className="group flex items-center justify-between p-5 hover:bg-blue-900/5 transition-all rounded-[1.5rem] border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-blue-900/10 flex items-center justify-center shrink-0 group-hover:bg-blue-900 transition-colors">
          <User className="w-5 h-5 text-blue-900 group-hover:text-yellow-400 transition-colors" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight truncate leading-none">{customerName}</h4>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] font-bold text-blue-900 uppercase tracking-widest flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 opacity-50" />{location}
            </span>
            <span className="text-slate-300 text-[9px]">•</span>
            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{date}</span>
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-blue-900">฿{amount}</p>
        <p className="text-[10px] font-black text-blue-900 uppercase tracking-tighter mt-0.5">+{points} <span className="text-yellow-600">Pts</span></p>
      </div>
    </div>
  );
}
