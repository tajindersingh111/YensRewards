import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Banknote, Coins } from "lucide-react";

export function TransactionConfirm({ customer, amount, points, onConfirm, onCancel, isPending }: any) {
  return (
    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden animate-in fade-in zoom-in">
      <CardContent className="p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-blue-900 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"><Check className="w-6 h-6 text-yellow-400" /></div>
          <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight italic">Verify Transaction</h2>
        </div>
        <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4 border border-slate-100">
          <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member</span><span className="text-sm font-black text-blue-900 uppercase">{customer.name}</span></div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-200/50"><div className="flex items-center gap-2"><Banknote className="w-4 h-4 text-blue-900" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale Value</span></div><span className="text-xl font-black text-blue-900">฿{amount}</span></div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-200/50"><div className="flex items-center gap-2"><Coins className="w-4 h-4 text-blue-900" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points Yield</span></div><span className="text-2xl font-black text-blue-900">+{points} <span className="text-xs uppercase text-yellow-600 italic">Pts</span></span></div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Button onClick={onConfirm} disabled={isPending} className="h-14 bg-yellow-400 text-blue-900 font-black uppercase text-sm rounded-2xl shadow-xl">Authorize Deposit</Button>
          <Button variant="ghost" onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abort Transaction</Button>
        </div>
      </CardContent>
    </Card>
  );
}
