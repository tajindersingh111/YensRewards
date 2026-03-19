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
import MessageTemplates from "@/components/MessageTemplates";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, LogOut, TrendingUp, BarChart3, Users, Package, Tag, Star, MessageSquare, UserCog, MapPin, Calendar, Settings2 } from "lucide-react";
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
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="icon"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src={logoUrl} alt="Yens Logo" className="w-8 h-8 rounded-full shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-semibold text-foreground">{t('admin.title')}</h1>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0" data-testid="badge-version">{t('common.version')}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                {t('admin.overview.loggedInAs')} {user?.email || user?.firstName || t('common.admin')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageSwitcher />
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1.5">{t('auth.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* Navigation bar */}
          <div className="border-b border-border -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-none sticky top-[53px] bg-background z-40">
            <TabsList className="flex w-max min-w-full bg-transparent p-0 h-auto gap-0">
              {[
                { value: 'salesTracker', label: t('admin.tabs.salesTracker'), icon: TrendingUp, testId: 'tab-sales-tracker' },
                { value: 'analytics', label: t('admin.tabs.analytics'), icon: BarChart3, testId: 'tab-analytics' },
                { value: 'customers', label: t('admin.tabs.customers'), icon: Users, testId: 'tab-customers' },
                { value: 'products', label: t('admin.tabs.products'), icon: Package, testId: 'tab-products' },
                { value: 'promotions', label: t('admin.tabs.promotions'), icon: Tag, testId: 'tab-promotions' },
                { value: 'specials', label: t('admin.tabs.specials'), icon: Star, testId: 'tab-specials' },
                { value: 'messages', label: t('admin.tabs.messages'), icon: MessageSquare, testId: 'tab-messages' },
                { value: 'users', label: t('admin.tabs.users'), icon: UserCog, testId: 'tab-users' },
                { value: 'sites', label: t('admin.tabs.sites'), icon: MapPin, testId: 'tab-sites' },
                { value: 'schedules', label: t('admin.tabs.schedules'), icon: Calendar, testId: 'tab-schedules' },
                { value: 'settings', label: t('admin.tabs.settings'), icon: Settings2, testId: 'tab-settings' },
              ].map(({ value, label, icon: Icon, testId }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  data-testid={testId}
                  className="flex items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-medium whitespace-nowrap text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent transition-colors shrink-0"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="mt-6">

          <TabsContent value="salesTracker" className="mt-0">
            <SalesTrackerDashboard />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="customers" className="mt-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t('admin.customers.title')}</h2>
                <p className="text-xs text-muted-foreground">{t('admin.customers.manage', 'Manage your loyalty members')}</p>
              </div>
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
            <div className="grid gap-6">
              <div className="max-w-2xl">
                <PromotionCreator onSend={handleSendPromotion} />
              </div>
              <MessageTemplates />
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

          <TabsContent value="settings" className="mt-0 space-y-6">
            <SettingsPage />
          </TabsContent>

          </div>
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
