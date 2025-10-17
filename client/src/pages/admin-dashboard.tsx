import { useState } from "react";
import KPICard from "@/components/KPICard";
import SalesChart from "@/components/SalesChart";
import CustomerTable from "@/components/CustomerTable";
import PromotionCreator from "@/components/PromotionCreator";
import CustomerImportExport from "@/components/CustomerImportExport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, TrendingUp, Award } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";

export default function AdminDashboard() {
  //todo: remove mock functionality
  const [activeTab, setActiveTab] = useState("overview");

  const mockCustomers = [
    { id: "1", name: "Somchai", phone: "+66 81 234 5678", points: 1250, tier: "gold" as const, totalSpent: 12500 },
    { id: "2", name: "Jaruwan", phone: "+66 82 345 6789", points: 980, tier: "silver" as const, totalSpent: 9800 },
    { id: "3", name: "Orapan", phone: "+66 83 456 7890", points: 875, tier: "silver" as const, totalSpent: 8750 },
    { id: "4", name: "Phongthep", phone: "+66 84 567 8901", points: 720, tier: "bronze" as const, totalSpent: 7200 },
    { id: "5", name: "Wanida", phone: "+66 85 678 9012", points: 450, tier: "bronze" as const, totalSpent: 4500 },
  ];

  const salesData = [
    { label: "Main Store", value: 15400 },
    { label: "Night Bazaar", value: 6800 },
    { label: "Weekend Market", value: 2380 },
  ];

  const categoryData = [
    { label: "Ice Cream", value: 12500 },
    { label: "Beverages", value: 8900 },
    { label: "Toppings", value: 3180 },
  ];

  const handleImportCSV = (file: File) => {
    //todo: remove mock functionality
    console.log("Importing CSV:", file.name);
  };

  const handleExportCSV = () => {
    //todo: remove mock functionality
    const csvContent = mockCustomers
      .map((c) => `${c.name},${c.phone},"",""`)
      .join("\n");
    const blob = new Blob([`name,phone,email,birthday\n${csvContent}`], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yens-customers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Yens Loyalty System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="customers" data-testid="tab-customers">Customers</TabsTrigger>
            <TabsTrigger value="promotions" data-testid="tab-promotions">Promotions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Sales"
                value="฿24,580"
                icon={DollarSign}
                trend={{ value: 12.5, isPositive: true }}
                subtitle="This month"
              />
              <KPICard
                title="Total Customers"
                value="156"
                icon={Users}
                trend={{ value: 8.3, isPositive: true }}
                subtitle="Active members"
              />
              <KPICard
                title="Avg. Transaction"
                value="฿158"
                icon={TrendingUp}
                trend={{ value: 5.2, isPositive: true }}
              />
              <KPICard
                title="Points Redeemed"
                value="2,340"
                icon={Award}
                subtitle="This month"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart data={salesData} title="Sales by Location" />
              <SalesChart data={categoryData} title="Sales by Category" />
            </div>

            {/* Recent Customers */}
            <CustomerTable
              customers={mockCustomers.slice(0, 3)}
              onMessage={(id) => console.log("Message customer:", id)}
            />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomerImportExport
              onImport={handleImportCSV}
              onExport={handleExportCSV}
              customerCount={mockCustomers.length}
            />
            <CustomerTable
              customers={mockCustomers}
              onMessage={(id) => console.log("Message customer:", id)}
            />
          </TabsContent>

          <TabsContent value="promotions" className="space-y-6">
            <div className="max-w-2xl">
              <PromotionCreator
                onSend={(message, tier) => console.log("Send promotion:", { message, tier })}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
