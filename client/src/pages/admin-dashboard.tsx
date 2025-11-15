import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import KPICard from "@/components/KPICard";
import SalesChart from "@/components/SalesChart";
import CustomerTable from "@/components/CustomerTable";
import CustomerEditDialog from "@/components/CustomerEditDialog";
import CustomerMessageDialog from "@/components/CustomerMessageDialog";
import PromotionCreator from "@/components/PromotionCreator";
import CustomerCSVImport from "@/components/CustomerCSVImport";
import ProductManager from "@/components/ProductManager";
import MessagesPage from "@/components/MessagesPage";
import EnhancedMessaging from "@/components/EnhancedMessaging";
import UsersPage from "@/pages/admin/UsersPage";
import YensOverview from "@/components/YensOverview";
import InstallPrompt from "@/components/InstallPrompt";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Users, TrendingUp, Award, ArrowLeft, LogOut, Home, Search, UserPlus, Upload, Trophy, Cake, Send, Settings } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import { useToast } from "@/hooks/use-toast";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError, isForbiddenError } from "@/lib/authUtils";
import type { Customer } from "@shared/schema";

export default function AdminDashboard() {
  // Auto-update detection
  useAutoUpdate();
  const { t } = useTranslation();
  const [, setLocationPath] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [memberStatus, setMemberStatus] = useState<"active" | "inactive">("active");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [messagingCustomer, setMessagingCustomer] = useState<Customer | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log('🔍 Admin Dashboard - Auth State:', {
      authLoading,
      isAuthenticated,
      user,
      userRole: user?.role,
      userEmail: user?.email,
    });
  }, [authLoading, isAuthenticated, user]);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('❌ Not authenticated - redirecting to login');
      toast({
        title: t('admin.toasts.authRequired'),
        description: t('admin.toasts.authRequiredDesc'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (!authLoading && isAuthenticated && user?.role !== "admin") {
      console.log('❌ Access denied - User role:', user?.role, 'Expected: admin');
      toast({
        title: t('admin.toasts.accessDenied'),
        description: t('admin.toasts.accessDeniedDesc'),
        variant: "destructive",
      });
      setTimeout(() => {
        setLocationPath("/");
      }, 500);
      return;
    }

    if (!authLoading && isAuthenticated && user?.role === "admin") {
      console.log('✅ Admin access granted');
    }
  }, [isAuthenticated, authLoading, user, toast, setLocationPath, t]);

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
        title: t('admin.toasts.promotionSuccess'),
        description: t('admin.toasts.promotionSent'),
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error) || isForbiddenError(error)) {
        toast({
          title: t('admin.toasts.sessionExpired'),
          description: t('admin.toasts.sessionExpiredDesc'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('admin.toasts.promotionError'),
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
        title: t('admin.toasts.importSuccess'),
        description: `${data.imported || 0} ${t('admin.toasts.importSuccessDesc')}`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error) || isForbiddenError(error)) {
        toast({
          title: t('admin.toasts.sessionExpired'),
          description: t('admin.toasts.sessionExpiredDesc'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('admin.toasts.importFailed'),
        description: error.message || t('admin.toasts.importFailedDesc'),
        variant: "destructive",
      });
    },
  });

  // Send birthday messages mutation
  const sendBirthdayMessagesMutation = useMutation({
    mutationFn: async (customerIds: string[]) => {
      const response = await apiRequest('POST', '/api/admin/send-birthday-messages', { customerIds });
      return await response.json();
    },
    onSuccess: (data: any) => {
      // Invalidate messages queries to refresh statistics
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/messages/stats'] });
      
      const sentCount = data?.sent || data?.total || 0;
      toast({
        title: t('admin.toasts.birthdayMessagesSent'),
        description: t('admin.toasts.birthdayMessagesSentDesc', { count: sentCount }),
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error) || isForbiddenError(error)) {
        toast({
          title: t('admin.toasts.sessionExpired'),
          description: t('admin.toasts.sessionExpiredDesc'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('admin.toasts.sendMessagesFailed'),
        description: error.message || t('admin.toasts.sendMessagesError'),
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
          title: t('admin.toasts.noValidData'),
          description: t('admin.toasts.noValidDataDesc'),
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
      title: t('admin.toasts.specialPromotion'),
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
          <div className="text-lg text-muted-foreground">{t('common.loading')}</div>
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
                <h1 className="text-xl font-bold text-foreground">{t('admin.title')}</h1>
              <span className="text-xs text-muted-foreground" data-testid="text-version">{t('common.version')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('admin.overview.loggedInAs')} {user?.email || user?.firstName || t('common.admin')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">{t('admin.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="customers" data-testid="tab-customers">{t('admin.tabs.customers')}</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">{t('admin.tabs.products')}</TabsTrigger>
            <TabsTrigger value="promotions" data-testid="tab-promotions">{t('admin.tabs.promotions')}</TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">{t('admin.tabs.messages')}</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">{t('admin.tabs.users')}</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">{t('admin.tabs.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <YensOverview />
          </TabsContent>


          <TabsContent value="customers" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{t('admin.customers.title')}</h2>
              <CustomerCSVImport showTrigger={true} />
            </div>
            <CustomerTable
              customers={customers}
              onMessage={(id) => {
                const customer = customers.find((c) => c.id === id);
                if (customer) {
                  setMessagingCustomer(customer as Customer);
                  setIsMessageDialogOpen(true);
                }
              }}
              onEdit={(customer) => {
                setEditingCustomer(customer as any);
                setIsEditDialogOpen(true);
              }}
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

          <TabsContent value="messages" className="space-y-6">
            <MessagesPage />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersPage />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('admin.settings.comingSoon')}</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Global Dialogs - Available from all tabs */}
        <CustomerEditDialog
          customer={editingCustomer}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
        
        <CustomerEditDialog
          customer={null}
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
        />
        
        <CustomerCSVImport
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          showTrigger={false}
        />
        
        <CustomerMessageDialog
          customer={messagingCustomer as any}
          open={isMessageDialogOpen}
          onOpenChange={setIsMessageDialogOpen}
        />
      </main>
      <InstallPrompt />
    </div>
  );
}
