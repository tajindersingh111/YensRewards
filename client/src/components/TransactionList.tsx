import { Card } from "@/components/ui/card";
import { IceCream, Coffee, Award } from "lucide-react";
import { format } from "date-fns";
import { th as thLocale } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface Transaction {
  id: string;
  amount: number;
  points: number;
  location: string;
  date: Date;
  type: string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  const { t, i18n } = useTranslation();
  const recentTransactions = transactions.slice(0, 2);
  const dateLocale = i18n.language === 'th' ? thLocale : undefined;
  
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">{t('customer.recentTransactions')}</h3>
      {recentTransactions.map((transaction) => (
        <Card key={transaction.id} className="p-3 hover-elevate" data-testid={`card-transaction-${transaction.id}`}>
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
                {format(transaction.date, "MMM dd, yyyy", { locale: dateLocale })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary" data-testid={`text-points-${transaction.id}`}>+{transaction.points} {t('customer.pointsAbbr')}</p>
              <p className="text-sm text-muted-foreground">฿{transaction.amount}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
