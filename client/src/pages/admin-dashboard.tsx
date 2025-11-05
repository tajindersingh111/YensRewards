import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Users, TrendingUp, Award, ArrowLeft, LogOut, Home, Search, UserPlus, Upload, Trophy } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError, isForbiddenError } from "@/lib/authUtils";
import type { Customer } from "@shared/schema";

export default function AdminDashboard() {
  // Auto-update detection
  useAutoUpdate();
  const [, setLocationPath] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [memberStatus, setMemberStatus] = useState<"active" | "inactive">("active");
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the admin dashboard",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (!authLoading && isAuthenticated && user?.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocationPath("/");
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, user, toast, setLocationPath]);

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<{
    totalSales: number;
    totalCustomers: number;
    avgTransaction: number;
    pointsRedeemed: number;
    salesByLocation: Array<{ label: string; value: number }>;
  }>({
    queryKey: ['/api/admin/analytics'],
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
  });

  // Fetch all customers
  const { data: customersData = [], isLoading: customersLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/customers'],
    enabled: isAuthenticated && user?.role === "admin",
    retry: false,
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
    onError: (error: Error) => {
      if (isUnauthorizedError(error) || isForbiddenError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
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
    onError: (error: Error) => {
      if (isUnauthorizedError(error) || isForbiddenError(error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
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

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin (will redirect)
  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

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
              <span className="text-xs text-muted-foreground" data-testid="text-version">v88</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Logged in as: {user?.email || user?.firstName || "Admin"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
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
            {/* Branch Selector */}
            <div className="bg-card rounded-lg p-4 border">
              <Select defaultValue="all">
                <SelectTrigger className="w-full md:w-64" data-testid="select-branch">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Member Count and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="text-sm text-muted-foreground" data-testid="text-member-count">
                All members {customers.length} of 1,000
              </p>
              <div className="flex gap-2">
                <Button variant="default" className="gap-2" data-testid="button-add-member">
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </Button>
                <Button variant="outline" className="gap-2" data-testid="button-upload-member">
                  <Upload className="w-4 h-4" />
                  Upload Member
                </Button>
              </div>
            </div>

            {/* Top Spenders */}
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-lg">10 Top Spenders</h3>
              </div>
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-4 min-w-max">
                  {[...customers]
                    .sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent))
                    .slice(0, 10)
                    .map((customer, index) => (
                      <div 
                        key={customer.id} 
                        className="flex flex-col items-center gap-2 w-24"
                        data-testid={`top-spender-${index + 1}`}
                      >
                        <div className="relative">
                          <Avatar className="w-16 h-16 border-2 border-primary">
                            <AvatarImage src={customer.photo} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {customer.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-1 -left-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <p className="text-xs font-medium text-center line-clamp-1">
                          {customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ฿{Number(customer.totalSpent).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Active/Inactive Tabs and Search */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={memberStatus === "active" ? "default" : "outline"}
                  onClick={() => setMemberStatus("active")}
                  data-testid="button-filter-active"
                >
                  Active
                </Button>
                <Button
                  variant={memberStatus === "inactive" ? "default" : "outline"}
                  onClick={() => setMemberStatus("inactive")}
                  data-testid="button-filter-inactive"
                >
                  Inactive
                </Button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search member"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-member"
                />
              </div>
            </div>

            {/* Customer Table */}
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Member</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tier</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Phone</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Birthday</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Spending</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter(c => {
                        // Filter by active/inactive status (active = has spent money)
                        const isActive = Number(c.totalSpent) > 0;
                        const matchesStatus = memberStatus === "active" ? isActive : !isActive;
                        
                        // Filter by search query
                        const matchesSearch = searchQuery === "" || 
                          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.phone.includes(searchQuery) ||
                          (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
                        
                        return matchesStatus && matchesSearch;
                      })
                      .slice(0, 10)
                      .map((customer) => (
                        <tr key={customer.id} className="border-b hover-elevate" data-testid={`row-customer-${customer.id}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={customer.photo} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {customer.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{customer.name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge 
                              variant="outline" 
                              className={
                                customer.tier === "gold" ? "border-yellow-500 text-yellow-700 dark:text-yellow-500" :
                                customer.tier === "silver" ? "border-gray-400 text-gray-700 dark:text-gray-400" :
                                "border-orange-600 text-orange-700 dark:text-orange-500"
                              }
                            >
                              {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{customer.phone}</td>
                          <td className="p-4 text-sm text-muted-foreground">{customer.email || "-"}</td>
                          <td className="p-4 text-sm text-muted-foreground">{customer.birthday || "-"}</td>
                          <td className="p-4 text-sm font-medium">฿{Number(customer.totalSpent).toLocaleString()}</td>
                          <td className="p-4 text-sm font-medium">{customer.points}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
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
