import KPICard from '../KPICard';
import { DollarSign } from 'lucide-react';

export default function KPICardExample() {
  return (
    <KPICard
      title="Total Sales"
      value="฿24,580"
      icon={DollarSign}
      trend={{ value: 12.5, isPositive: true }}
      subtitle="This month"
    />
  );
}
