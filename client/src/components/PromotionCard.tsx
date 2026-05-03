import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, ArrowUpRight } from "lucide-react";

export function PromotionCard({ title, type, status, targetCount }: { title: string, type: string, status: string, targetCount: number }) {
  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden group transition-all duration-500">
      <div className="h-44 bg-gradient-to-br from-blue-900 to-blue-800 relative p-6 flex flex-col justify-between overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
          <div className="bg-white/20 rounded-xl p-2.5 backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform">
            <Megaphone className="w-5 h-5 text-yellow-400" />
          </div>
          <Badge className="bg-yellow-400 text-blue-900 font-black uppercase text-[9px] tracking-widest border-none shadow-lg">{status}</Badge>
        </div>
        <div className="relative z-10">
          <p className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1">{type}</p>
          <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight italic">{title}</h3>
        </div>
      </div>
      <CardContent className="p-6 bg-white flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Broadcast Audience</p>
          <p className="text-sm font-black text-blue-900 uppercase">{targetCount} Members</p>
        </div>
        <button className="text-blue-900 hover:bg-blue-900/5 p-2 rounded-xl transition-colors"><ArrowUpRight className="w-5 h-5" /></button>
      </CardContent>
    </Card>
  );
}
