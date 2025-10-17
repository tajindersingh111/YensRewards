import SalesChart from '../SalesChart';

export default function SalesChartExample() {
  const data = [
    { label: "Main Store", value: 15400 },
    { label: "Night Bazaar", value: 6800 },
    { label: "Weekend Market", value: 2380 },
  ];

  return <SalesChart data={data} title="Sales by Location" />;
}
