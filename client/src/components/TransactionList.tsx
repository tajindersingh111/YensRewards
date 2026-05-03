import { Card } from "@/components/ui/card";
import { IceCream, Award } from "lucide-react";
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
      <h3 className="text-base font-black text-blue-900 uppercase tracking-tight">{t('customer.recentTransactions')}</h3>
      {recentTransactions.map((transaction) => (
        <Card key={transaction.id} className="p-3 hover-elevate border-none shadow-md rounded-2xl" data-testid={`card-transaction-${transaction.id}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-900/10 flex items-center justify-center shrink-0">
              {transaction.type === "purchase" ? (
                <IceCream className="w-5 h-5 text-blue-900" />
              ) : (
                <Award className="w-5 h-5 text-blue-900" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-blue-900 truncate">{transaction.location}</p>
              <p className="text-xs text-slate-400 font-medium">
                {format(transaction.date, "MMM dd, yyyy", { locale: dateLocale })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-blue-900" data-testid={`text-points-${transaction.id}`}>+{transaction.points} {t('customer.pointsAbbr')}</p>
              <p className="text-xs text-slate-400 font-medium">฿{transaction.amount}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
