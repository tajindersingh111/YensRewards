import TransactionList from '../TransactionList';

export default function TransactionListExample() {
  const transactions = [
    {
      id: "1",
      amount: 45,
      points: 4,
      location: "Yens Main Store",
      date: new Date(2025, 0, 15),
      type: "purchase" as const,
    },
    {
      id: "2",
      amount: 80,
      points: 8,
      location: "Market Stall - Night Bazaar",
      date: new Date(2025, 0, 12),
      type: "purchase" as const,
    },
  ];

  return <TransactionList transactions={transactions} />;
}
