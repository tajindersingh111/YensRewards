import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAutoUpdate } from "@/hooks/use-auto-update";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import SalesTrackerDashboard from "@/components/SalesTrackerDashboard";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import CustomerTable from "@/components/CustomerTable";
import CustomerEditDialog from "@/components/CustomerEditDialog";
import CustomerMessageDialog from "@/components/CustomerMessageDialog";
import CustomerCSVImport from "@/components/CustomerCSVImport";
import CustomerInsights from "@/components/CustomerInsights";
import ProductManager from "@/components/ProductManager";
import PromotionCreator from "@/components/PromotionCreator";
import MessagesPage from "@/components/MessagesPage";
import BulkMessageComposer from "@/components/BulkMessageComposer";
import UsersPage from "@/pages/admin/UsersPage";
import SitesManager from "@/components/SitesManager";
import { SchedulesManager } from "@/components/SchedulesManager";
import WeeklySpecialsManager from "@/pages/admin/WeeklySpecialsManager";
import SettingsPage from "@/components/SettingsPage";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, LogOut } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { Customer } from "@shared/schema";

export default function AdminDashboard() {
  useAutoUpdate();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Parse URL query params and manage active tab state
  const params = new URLSearchParams(location.split('?')[1] || '');
  const urlTab = params.get('tab') || 'salesTracker';
  const [activeTab, setActiveTab] = useState(urlTab);

  // Sync activeTab with URL changes
  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  // Customer dialog states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [messagingCustomer, setMessagingCustomer] = useState<Customer | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [birthdayCustomers, setBirthdayCustomers] = useState<Customer[]>([]);
  const [isBirthdayMessageDialogOpen, setIsBirthdayMessageDialogOpen] = useState(false);

  // Handle tab change - update both state and URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams();
    if (value !== 'salesTracker') {
      newParams.set('tab', value);
    }
    const newUrl = newParams.toString() ? `/admin?${newParams.toString()}` : '/admin';
    setLocation(newUrl);
  };

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t('admin.toasts.authRequired'),
        description: t('admin.toasts.authRequiredDesc'),
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/admin/login");
      }, 500);
      return;
    }

    if (!authLoading && isAuthenticated && user?.role !== "admin") {
      toast({
        title: t('admin.toasts.accessDenied'),
        description: t('admin.toasts.accessDeniedDesc'),
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, user, toast, setLocation, t]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

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
      toast({
        title: t('common.error'),
        description: t('admin.toasts.promotionError'),
        variant: "destructive",
      });
    },
  });

  const handleSendPromotion = (message: string, tier?: string) => {
    createPromotion.mutate({
      title: t('admin.toasts.specialPromotion'),
      targetTier: tier === 'all' ? undefined : tier,
      message,
    });
  };

  // Show loading state
  if (authLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLocation("/")}
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
                <Badge variant="outline" className="text-xs" data-testid="badge-version">{t('common.version')}</Badge>
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

      {/* Main Content with Tabs */}
      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex flex-wrap gap-2 mb-6 bg-transparent h-auto p-0">
            <TabsTrigger 
              value="salesTracker" 
              data-testid="tab-sales-tracker"
              className="bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.salesTracker')}
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              data-testid="tab-analytics"
              className="bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.analytics')}
            </TabsTrigger>
            <TabsTrigger 
              value="customers" 
              data-testid="tab-customers"
              className="bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.customers')}
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              data-testid="tab-products"
              className="bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.products')}
            </TabsTrigger>
            <TabsTrigger 
              value="promotions" 
              data-testid="tab-promotions"
              className="bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.promotions')}
            </TabsTrigger>
            <TabsTrigger 
              value="specials" 
              data-testid="tab-specials"
              className="bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.specials')}
            </TabsTrigger>
            <TabsTrigger 
              value="messages" 
              data-testid="tab-messages"
              className="bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.messages')}
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              data-testid="tab-users"
              className="bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.users')}
            </TabsTrigger>
            <TabsTrigger 
              value="sites" 
              data-testid="tab-sites"
              className="bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.sites')}
            </TabsTrigger>
            <TabsTrigger 
              value="schedules" 
              data-testid="tab-schedules"
              className="bg-yellow-200 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.schedules')}
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              data-testid="tab-settings"
              className="bg-yellow-300 hover-elevate active-elevate-2 rounded-lg px-4 py-2 data-[state=active]:bg-yellow-400 data-[state=active]:shadow-md"
            >
              {t('admin.tabs.settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="salesTracker" className="mt-0">
            <SalesTrackerDashboard />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{t('admin.customers.title')}</h2>
              <CustomerCSVImport showTrigger={true} />
            </div>
            
            {/* Customer Insights: Top Spenders & Birthdays */}
            <CustomerInsights 
              onMessage={(customer) => {
                setMessagingCustomer(customer as Customer);
                setIsMessageDialogOpen(true);
              }}
              onEdit={(customer) => {
                setEditingCustomer(customer as Customer);
                setIsEditDialogOpen(true);
              }}
              onSendBirthdayMessages={(customers) => {
                setBirthdayCustomers(customers);
                setIsBirthdayMessageDialogOpen(true);
              }}
            />
            
            {/* Customer List Table */}
            <CustomerTable
              onMessage={(customer) => {
                setMessagingCustomer(customer as Customer);
                setIsMessageDialogOpen(true);
              }}
              onEdit={(customer) => {
                setEditingCustomer(customer as Customer);
                setIsEditDialogOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductManager />
          </TabsContent>

          <TabsContent value="promotions" className="space-y-6">
            <div className="max-w-2xl">
              <PromotionCreator onSend={handleSendPromotion} />
            </div>
          </TabsContent>

          <TabsContent value="specials" className="space-y-6">
            <WeeklySpecialsManager />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <MessagesPage />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersPage />
          </TabsContent>

          <TabsContent value="sites" className="space-y-6">
            <SitesManager />
          </TabsContent>

          <TabsContent value="schedules" className="space-y-6">
            <SchedulesManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SettingsPage />
          </TabsContent>
        </Tabs>
      </main>

      {/* Customer Edit Dialog */}
      {editingCustomer && (
        <CustomerEditDialog
          customer={editingCustomer}
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setEditingCustomer(null);
          }}
        />
      )}

      {/* Customer Message Dialog */}
      {messagingCustomer && (
        <CustomerMessageDialog
          customer={messagingCustomer}
          open={isMessageDialogOpen}
          onOpenChange={(open) => {
            setIsMessageDialogOpen(open);
            if (!open) setMessagingCustomer(null);
          }}
        />
      )}

      {/* Birthday Message Dialog */}
      <Dialog open={isBirthdayMessageDialogOpen} onOpenChange={setIsBirthdayMessageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Birthday Messages</DialogTitle>
            <DialogDescription>
              Send birthday wishes to {birthdayCustomers.length} customer{birthdayCustomers.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <BulkMessageComposer 
            selectedCustomers={birthdayCustomers}
            onSuccess={() => {
              setIsBirthdayMessageDialogOpen(false);
              setBirthdayCustomers([]);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
