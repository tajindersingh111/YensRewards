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
    <Card className="p-6 sm:p-8" data-testid="card-transaction-confirm">
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-chart-3/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-chart-3" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">Confirm Transaction</h3>
        </div>

        <div className="space-y-4 bg-muted rounded-lg p-4 sm:p-5">
          <div className="flex justify-between items-center">
            <span className="text-base sm:text-lg text-muted-foreground">Customer</span>
            <span className="font-semibold text-base sm:text-lg text-foreground" data-testid="text-customer-name">
              {customerName}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-base sm:text-lg text-muted-foreground">Amount</span>
            <span className="font-semibold text-base sm:text-lg text-foreground" data-testid="text-amount">
              ฿{amount}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-base sm:text-lg text-muted-foreground">Points Earned</span>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <span className="font-bold text-primary text-xl sm:text-2xl" data-testid="text-points-earned">
                +{points}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 text-base sm:text-lg min-h-12"
            size="lg"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            className="flex-1 text-base sm:text-lg min-h-12" 
            size="lg"
            data-testid="button-confirm"
          >
            Confirm
          </Button>
        </div>
      </div>
    </Card>
  );
}
