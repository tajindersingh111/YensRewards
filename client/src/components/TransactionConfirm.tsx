import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Award } from "lucide-react";

interface TransactionConfirmProps {
  customerName: string;
  amount: number;
  points: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TransactionConfirm({
  customerName,
  amount,
  points,
  onConfirm,
  onCancel,
}: TransactionConfirmProps) {
  return (
    <Card className="p-4 border-none shadow-xl rounded-[2rem]" data-testid="card-transaction-confirm">
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <CheckCircle className="w-6 h-6 text-blue-900" />
          </div>
          <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight">Confirm Transaction</h3>
        </div>

        <div className="space-y-2 bg-slate-50 rounded-xl p-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 font-medium">Customer</span>
            <span className="font-black text-blue-900" data-testid="text-customer-name">
              {customerName}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 font-medium">Amount</span>
            <span className="font-black text-blue-900" data-testid="text-amount">
              ฿{amount}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-medium">Points Earned</span>
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3 text-blue-900" />
              <span className="font-black text-blue-900" data-testid="text-points-earned">
                +{points}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 font-black uppercase text-[10px] tracking-widest rounded-xl border-blue-900/10 text-blue-900"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl"
            data-testid="button-confirm"
          >
            Confirm
          </Button>
        </div>
      </div>
    </Card>
  );
}
