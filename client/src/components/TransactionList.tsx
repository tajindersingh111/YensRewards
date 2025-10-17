import { Card } from "@/components/ui/card";
import { IceCream, Coffee, Award } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  points: number;
  location: string;
  date: Date;
  type: "purchase" | "reward";
}

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-foreground">Recent Transactions</h3>
      {transactions.map((transaction) => (
        <Card key={transaction.id} className="p-4 hover-elevate" data-testid={`card-transaction-${transaction.id}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {transaction.type === "purchase" ? (
                <IceCream className="w-5 h-5 text-primary" />
              ) : (
                <Award className="w-5 h-5 text-chart-3" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{transaction.location}</p>
              <p className="text-sm text-muted-foreground">
                {format(transaction.date, "MMM dd, yyyy")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary" data-testid={`text-points-${transaction.id}`}>+{transaction.points} pts</p>
              <p className="text-sm text-muted-foreground">฿{transaction.amount}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
