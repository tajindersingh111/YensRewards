import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, LogOut, TrendingUp, BarChart3, Users, Package, Tag, Star,
  MessageSquare, UserCog, MapPin, Calendar, Settings2, LayoutDashboard,
  Megaphone, Wrench, ShieldCheck, Award
} from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { Customer } from "@shared/schema";

const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    subs: [
      { id: 'overview', label: 'Overview', testId: 'tab-overview' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: TrendingUp,
    subs: [
      { id: 'salesTracker', label: 'Sales Tracker', testId: 'tab-sales-tracker' },
      { id: 'analytics', label: 'Analytics', testId: 'tab-analytics' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    subs: [
      { id: 'customers', label: 'Customer List', testId: 'tab-customers' },
      { id: 'loyalty', label: 'Loyalty', testId: 'tab-loyalty' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    subs: [
      { id: 'messages', label: 'Messages', testId: 'tab-messages' },
      { id: 'promotions', label: 'Promotions', testId: 'tab-promotions' },
      { id: 'specials', label: 'Weekly Specials', testId: 'tab-specials' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Wrench,
    subs: [
      { id: 'products', label: 'Products', testId: 'tab-products' },
      { id: 'sites', label: 'Sites', testId: 'tab-sites' },
      { id: 'schedules', label: 'Schedules', testId: 'tab-schedules' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    subs: [
      { id: 'users', label: 'Users', testId: 'tab-users' },
      { id: 'settings', label: 'Settings', testId: 'tab-settings' },
    ],
  },
];

function findSectionForTab(tabId: string): string {
  for (const group of NAV_GROUPS) {
    if (group.subs.some(s => s.id === tabId)) return group.id;
  }
  return 'dashboard';
}

function AdminOverview() {
  const { data: metrics } = useQuery<any>({ queryKey: ['/api/admin/sales-tracker-metrics'] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ['/api/admin/customers'] });

  const fmt = (n: number) =>
    `฿${(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Business Overview</h2>
        <p className="text-xs text-muted-foreground">Key performance metrics at a glance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">This Week</p>
            <p className="text-2xl font-bold text-foreground">{fmt(metrics?.currentWeekSales)}</p>
            {metrics?.lastWeekSales > 0 && (
              <p className={`text-xs mt-1 font-medium ${metrics.currentWeekSales >= metrics.lastWeekSales ? 'text-green-600' : 'text-red-500'}`}>
                {metrics.currentWeekSales >= metrics.lastWeekSales ? '↑' : '↓'}
                {Math.abs(((metrics.currentWeekSales - metrics.lastWeekSales) / metrics.lastWeekSales) * 100).toFixed(1)}% vs last week
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className="text-2xl font-bold text-foreground">{fmt(metrics?.currentMonthSales)}</p>
            {metrics?.lastMonthSales > 0 && (
              <p className={`text-xs mt-1 font-medium ${metrics.currentMonthSales >= metrics.lastMonthSales ? 'text-green-600' : 'text-red-500'}`}>
                {metrics.currentMonthSales >= metrics.lastMonthSales ? '↑' : '↓'}
                {Math.abs(((metrics.currentMonthSales - metrics.lastMonthSales) / metrics.lastMonthSales) * 100).toFixed(1)}% vs last month
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Year to Date</p>
            <p className="text-2xl font-bold text-foreground">{fmt(metrics?.ytdSales)}</p>
            <p className="text-xs text-muted-foreground mt-1">Since Jan 1</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Customers</p>
            <p className="text-2xl font-bold text-foreground">{customers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Loyalty members</p>
          </CardContent>
        </Card>
      </div>

      {(metrics?.bestChannel || metrics?.bestDay || metrics?.bestMonth) && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Top Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics?.bestChannel && (
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best Channel</p>
                    <p className="font-semibold text-foreground">{metrics.bestChannel.name}</p>
                    <p className="text-sm text-muted-foreground">{fmt(metrics.bestChannel.total)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {metrics?.bestDay && (
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best Day</p>
                    <p className="font-semibold text-foreground">
                      {new Date(metrics.bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' '}({metrics.bestDay.dayOfWeek.substring(0, 3)})
                    </p>
                    <p className="text-sm text-muted-foreground">{fmt(metrics.bestDay.total)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {metrics?.bestMonth && (
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best Month</p>
                    <p className="font-semibold text-foreground">
                      {new Date(metrics.bestMonth.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-muted-foreground">{fmt(metrics.bestMonth.total)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  useAutoUpdate();
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const params = new URLSearchParams(location.split('?')[1] || '');
  const rawSection = params.get('section');
  const rawTab = params.get('tab');

  const resolvedSection = rawSection || (rawTab ? findSectionForTab(rawTab) : 'dashboard');
  const resolvedTab = rawTab || (resolvedSection === 'dashboard' ? 'overview' : (NAV_GROUPS.find(g => g.id === resolvedSection)?.subs[0]?.id || 'overview'));

  const [activeSection, setActiveSection] = useState(resolvedSection);
  const [activeTab, setActiveTab] = useState(resolvedTab);

  useEffect(() => {
    setActiveSection(resolvedSection);
    setActiveTab(resolvedTab);
  }, [resolvedSection, resolvedTab]);

  const currentGroup = NAV_GROUPS.find(g => g.id === activeSection);
  const currentSubs = currentGroup?.subs || [];
  const showSecondaryNav = currentSubs.length > 1;

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [messagingCustomer, setMessagingCustomer] = useState<Customer | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [birthdayCustomers, setBirthdayCustomers] = useState<Customer[]>([]);
  const [isBirthdayMessageDialogOpen, setIsBirthdayMessageDialogOpen] = useState(false);

  const navigate = (section: string, tab: string) => {
    setActiveSection(section);
    setActiveTab(tab);
    const p = new URLSearchParams();
    if (section !== 'dashboard' || tab !== 'overview') {
      p.set('section', section);
      p.set('tab', tab);
    }
    setLocation(p.toString() ? `/admin?${p.toString()}` : '/admin');
  };

  const handlePrimaryNav = (sectionId: string) => {
    const group = NAV_GROUPS.find(g => g.id === sectionId);
    const firstSub = group?.subs[0]?.id || 'overview';
    navigate(sectionId, firstSub);
  };

  const handleSecondaryNav = (tabId: string) => {
    navigate(activeSection, tabId);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t('admin.toasts.authRequired'),
        description: t('admin.toasts.authRequiredDesc'),
        variant: "destructive",
      });
      setTimeout(() => setLocation("/admin/login"), 500);
      return;
    }
    if (!authLoading && isAuthenticated && user?.role !== "admin") {
      toast({
        title: t('admin.toasts.accessDenied'),
        description: t('admin.toasts.accessDeniedDesc'),
        variant: "destructive",
      });
      setTimeout(() => setLocation("/"), 500);
      return;
    }
  }, [isAuthenticated, authLoading, user, toast, setLocation, t]);

  const handleLogout = () => { window.location.href = "/api/logout"; };

  const createPromotion = useMutation({
    mutationFn: async (data: { title: string; targetTier?: string; message: string }) =>
      await apiRequest('POST', '/api/admin/promotions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promotions'] });
      toast({ title: t('admin.toasts.promotionSuccess'), description: t('admin.toasts.promotionSent') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('admin.toasts.promotionError'), variant: "destructive" });
    },
  });

  const handleSendPromotion = (message: string, tier?: string) => {
    createPromotion.mutate({
      title: t('admin.toasts.specialPromotion'),
      targetTier: tier === 'all' ? undefined : tier,
      message,
    });
  };

  if (authLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  const isFullBleed = activeTab === 'salesTracker' || activeTab === 'analytics';

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button onClick={() => setLocation("/")} variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src={logoUrl} alt="Yens Logo" className="w-8 h-8 rounded-full shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-semibold text-foreground">{t('admin.title')}</h1>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0" data-testid="badge-version">
                  {t('common.version')}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                {t('admin.overview.loggedInAs')} {user?.email || user?.firstName || t('common.admin')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageSwitcher />
            <Button onClick={handleLogout} variant="outline" size="sm" data-testid="button-logout">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1.5">{t('auth.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Primary Navigation ── */}
      <div className="bg-card border-b border-border sticky top-[53px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none">
          <nav className="flex items-center w-max min-w-full" role="navigation" aria-label="Primary navigation">
            {NAV_GROUPS.map((group) => {
              const Icon = group.icon;
              const isActive = activeSection === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => handlePrimaryNav(group.id)}
                  data-testid={`nav-${group.id}`}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                    isActive
                      ? 'text-foreground border-amber-400'
                      : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{group.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Secondary Navigation ── */}
      {showSecondaryNav && (
        <div className="bg-background border-b border-border/60 sticky top-[101px] z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none">
            <nav className="flex items-center w-max min-w-full gap-1" role="navigation" aria-label="Secondary navigation">
              {currentSubs.map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSecondaryNav(sub.id)}
                    data-testid={sub.testId}
                    className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                      isActive
                        ? 'text-foreground border-amber-400'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {isFullBleed ? (
        <div className="pb-8">
          {activeTab === 'salesTracker' && <SalesTrackerDashboard key="salesTracker" />}
          {activeTab === 'analytics' && <AnalyticsDashboard key="analytics" />}
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 pt-6">

          {activeTab === 'overview' && <AdminOverview key="overview" />}

          {activeTab === 'customers' && (
            <div key="customers" className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{t('admin.customers.title')}</h2>
                  <p className="text-xs text-muted-foreground">{t('admin.customers.manage', 'Manage your loyalty members')}</p>
                </div>
                <CustomerCSVImport showTrigger={true} />
              </div>
              <CustomerTable
                onMessage={(customer) => { setMessagingCustomer(customer as Customer); setIsMessageDialogOpen(true); }}
                onEdit={(customer) => { setEditingCustomer(customer as Customer); setIsEditDialogOpen(true); }}
              />
            </div>
          )}

          {activeTab === 'loyalty' && (
            <div key="loyalty" className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-foreground">Loyalty Programme</h2>
                <p className="text-xs text-muted-foreground">Top spenders, birthdays, and tier insights</p>
              </div>
              <CustomerInsights
                onMessage={(customer) => { setMessagingCustomer(customer as Customer); setIsMessageDialogOpen(true); }}
                onEdit={(customer) => { setEditingCustomer(customer as Customer); setIsEditDialogOpen(true); }}
                onSendBirthdayMessages={(customers) => { setBirthdayCustomers(customers); setIsBirthdayMessageDialogOpen(true); }}
              />
            </div>
          )}

          {activeTab === 'messages' && <MessagesPage key="messages" />}

          {activeTab === 'promotions' && (
            <div key="promotions" className="grid gap-6">
              <div className="max-w-2xl">
                <PromotionCreator onSend={handleSendPromotion} />
              </div>
              <MessageTemplates />
            </div>
          )}

          {activeTab === 'specials' && <WeeklySpecialsManager key="specials" />}

          {activeTab === 'products' && <ProductManager key="products" />}

          {activeTab === 'sites' && <SitesManager key="sites" />}

          {activeTab === 'schedules' && <SchedulesManager key="schedules" />}

          {activeTab === 'users' && <UsersPage key="users" />}

          {activeTab === 'settings' && <SettingsPage key="settings" />}

        </main>
      )}

      {/* ── Dialogs (unchanged) ── */}
      {editingCustomer && (
        <CustomerEditDialog
          customer={editingCustomer}
          open={isEditDialogOpen}
          onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingCustomer(null); }}
        />
      )}

      {messagingCustomer && (
        <CustomerMessageDialog
          customer={messagingCustomer}
          open={isMessageDialogOpen}
          onOpenChange={(open) => { setIsMessageDialogOpen(open); if (!open) setMessagingCustomer(null); }}
        />
      )}

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
            onSuccess={() => { setIsBirthdayMessageDialogOpen(false); setBirthdayCustomers([]); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
