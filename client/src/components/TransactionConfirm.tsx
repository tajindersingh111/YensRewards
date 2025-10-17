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
    <Card className="p-6" data-testid="card-transaction-confirm">
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-chart-3/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-chart-3" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Confirm Transaction</h3>
        </div>

        <div className="space-y-3 bg-muted rounded-lg p-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-semibold text-foreground" data-testid="text-customer-name">
              {customerName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold text-foreground" data-testid="text-amount">
              ฿{amount}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Points Earned</span>
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4 text-primary" />
              <span className="font-bold text-primary text-lg" data-testid="text-points-earned">
                +{points}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1" data-testid="button-confirm">
            Confirm
          </Button>
        </div>
      </div>
    </Card>
  );
}
