import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import KPICard from "@/components/KPICard";
import SalesChart from "@/components/SalesChart";
import CustomerTable from "@/components/CustomerTable";
import PromotionCreator from "@/components/PromotionCreator";
import CustomerImportExport from "@/components/CustomerImportExport";
import ProductManager from "@/components/ProductManager";
import InstallPrompt from "@/components/InstallPrompt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, TrendingUp, Award, ArrowLeft } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import type { Customer } from "@shared/schema";

export default function AdminDashboard() {
  // Auto-update detection
  useAutoUpdate();
  const [, setLocationPath] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<{
    totalSales: number;
    totalCustomers: number;
    avgTransaction: number;
    pointsRedeemed: number;
    salesByLocation: Array<{ label: string; value: number }>;
  }>({
    queryKey: ['/api/admin/analytics'],
  });

  // Fetch all customers
  const { data: customersData = [], isLoading: customersLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/customers'],
  });

  // Transform customers to ensure proper tier types
  const customers = customersData.map(c => ({
    ...c,
    tier: (c.tier || 'bronze') as 'bronze' | 'silver' | 'gold',
  }));

  // Create promotion mutation
  const createPromotion = useMutation({
    mutationFn: async (data: { title: string; targetTier?: string; message: string }) => {
      return await apiRequest('POST', '/api/admin/promotions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions'] });
      toast({
        title: "Success",
        description: "Promotion sent successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send promotion",
        variant: "destructive",
      });
    },
  });

  const importCustomers = useMutation({
    mutationFn: async (customers: Array<{ phone: string; name: string; email?: string; birthdate?: string }>) => {
      return await apiRequest('POST', '/api/admin/import-customers', { customers });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({
        title: "Import Successful",
        description: `${data.imported || 0} customers imported successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import customers",
        variant: "destructive",
      });
    },
  });

  const handleImportCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row and parse data
      const customers = lines.slice(1).map(line => {
        const [name, phone, email, birthdate] = line.split(',').map(s => s.trim());
        return {
          phone,
          name,
          email: email || undefined,
          birthdate: birthdate || undefined,
        };
      }).filter(c => c.name && c.phone); // Filter out invalid rows
      
      if (customers.length === 0) {
        toast({
          title: "No Valid Data",
          description: "CSV file contains no valid customer data",
          variant: "destructive",
        });
        return;
      }
      
      importCustomers.mutate(customers);
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const csvContent = customers
      .map((c) => `${c.name},${c.phone},${c.email || ""},${c.birthday || ""}`)
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

  const handleSendPromotion = (message: string, tier?: string) => {
    createPromotion.mutate({
      title: "Special Promotion",
      targetTier: tier === 'all' ? undefined : tier,
      message,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLocationPath("/")}
              variant="ghost"
              size="icon"
              className="hover-elevate"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 rounded-full" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
                <span className="text-xs text-muted-foreground" data-testid="text-version">v54</span>
              </div>
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
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="promotions" data-testid="tab-promotions">Promotions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Sales"
                value={analyticsLoading ? "..." : `฿${analytics?.totalSales.toLocaleString() || 0}`}
                icon={DollarSign}
                subtitle="All time"
                data-testid="kpi-total-sales"
              />
              <KPICard
                title="Total Customers"
                value={analyticsLoading ? "..." : String(analytics?.totalCustomers || 0)}
                icon={Users}
                subtitle="Active members"
                data-testid="kpi-total-customers"
              />
              <KPICard
                title="Avg. Transaction"
                value={analyticsLoading ? "..." : `฿${Math.round(analytics?.avgTransaction || 0)}`}
                icon={TrendingUp}
                data-testid="kpi-avg-transaction"
              />
              <KPICard
                title="Points Redeemed"
                value={analyticsLoading ? "..." : String(analytics?.pointsRedeemed || 0)}
                icon={Award}
                subtitle="All time"
                data-testid="kpi-points-redeemed"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart 
                data={analytics?.salesByLocation || []} 
                title="Sales by Location" 
                data-testid="chart-sales-location"
              />
            </div>

            {/* Recent Customers */}
            <CustomerTable
              customers={customers.slice(0, 5)}
              onMessage={(id) => console.log("Message customer:", id)}
              data-testid="table-recent-customers"
            />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomerImportExport
              onImport={handleImportCSV}
              onExport={handleExportCSV}
              customerCount={customers.length}
              data-testid="customer-import-export"
            />
            <CustomerTable
              customers={customers}
              onMessage={(id) => console.log("Message customer:", id)}
              data-testid="table-all-customers"
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductManager />
          </TabsContent>

          <TabsContent value="promotions" className="space-y-6">
            <div className="max-w-2xl">
              <PromotionCreator
                onSend={handleSendPromotion}
                data-testid="promotion-creator"
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <InstallPrompt />
    </div>
  );
}
