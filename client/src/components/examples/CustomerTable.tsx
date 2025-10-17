import CustomerTable from '../CustomerTable';

export default function CustomerTableExample() {
  const customers = [
    { id: "1", name: "Somchai", phone: "+66 81 234 5678", points: 1250, tier: "gold" as const, totalSpent: 12500 },
    { id: "2", name: "Jaruwan", phone: "+66 82 345 6789", points: 980, tier: "silver" as const, totalSpent: 9800 },
    { id: "3", name: "Orapan", phone: "+66 83 456 7890", points: 875, tier: "silver" as const, totalSpent: 8750 },
  ];

  return <CustomerTable customers={customers} onMessage={(id) => console.log("Message:", id)} />;
}
