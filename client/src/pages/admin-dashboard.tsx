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
import AutomationsManager from "@/components/AutomationsManager";
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
  Megaphone, Wrench, ShieldCheck, Award, ChevronRight, Gift, PlusCircle,
  Send, UserPlus, ArrowUpRight
} from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { Customer } from "@shared/schema";

const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    subs: [{ id: 'overview', label: 'Overview', testId: 'tab-overview' }],
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
      { id: 'automations', label: 'Automations', testId: 'tab-automations' },
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

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function AdminOverview({ onNavigate }: { onNavigate: (section: string, tab: string) => void }) {
  const { data: metrics } = useQuery<any>({ queryKey: ['/api/admin/sales-tracker-metrics'] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ['/api/admin/customers'] });
  const { data: salesData = [] } = useQuery<any[]>({ queryKey: ['/api/admin/sales-overview'] });

  const fmt = (n: number) =>
    `฿${(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  const today = new Date();
  const todayBirthdays = (customers as any[]).filter(c => {
    if (!c.dateOfBirth) return false;
    const dob = new Date(c.dateOfBirth);
    return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
  });

  const recentSales = [...(salesData as any[])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const quickActions = [
    { label: 'Sales Tracker', icon: TrendingUp, section: 'sales', tab: 'salesTracker', color: 'bg-amber-50 text-amber-700' },
    { label: 'Send Message', icon: Send, section: 'marketing', tab: 'messages', color: 'bg-blue-50 text-blue-700' },
    { label: 'Customer List', icon: Users, section: 'customers', tab: 'customers', color: 'bg-green-50 text-green-700' },
    { label: 'Promotions', icon: Tag, section: 'marketing', tab: 'promotions', color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div className="space-y-8">
      {/* Birthday alert */}
      {todayBirthdays.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Gift className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {todayBirthdays.length === 1
              ? `${todayBirthdays[0].name} has a birthday today`
              : `${todayBirthdays.length} customers have birthdays today`}
          </p>
          <button
            onClick={() => onNavigate('customers', 'loyalty')}
            className="ml-auto text-xs text-amber-700 font-medium flex items-center gap-1 hover:text-amber-900 transition-colors shrink-0"
          >
            View <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="text-xl font-bold text-foreground mt-1">{fmt(metrics?.currentWeekSales)}</p>
              {metrics?.lastWeekSales > 0 && (
                <p className={`text-xs mt-1.5 font-medium ${metrics.currentWeekSales >= metrics.lastWeekSales ? 'text-green-600' : 'text-red-500'}`}>
                  {metrics.currentWeekSales >= metrics.lastWeekSales ? '↑' : '↓'}
                  {' '}{Math.abs(((metrics.currentWeekSales - metrics.lastWeekSales) / metrics.lastWeekSales) * 100).toFixed(1)}% vs last week
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-xl font-bold text-foreground mt-1">{fmt(metrics?.currentMonthSales)}</p>
              {metrics?.lastMonthSales > 0 && (
                <p className={`text-xs mt-1.5 font-medium ${metrics.currentMonthSales >= metrics.lastMonthSales ? 'text-green-600' : 'text-red-500'}`}>
                  {metrics.currentMonthSales >= metrics.lastMonthSales ? '↑' : '↓'}
                  {' '}{Math.abs(((metrics.currentMonthSales - metrics.lastMonthSales) / metrics.lastMonthSales) * 100).toFixed(1)}% vs last month
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Year to Date</p>
              <p className="text-xl font-bold text-foreground mt-1">{fmt(metrics?.ytdSales)}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Since Jan 1</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Loyalty Members</p>
              <p className="text-xl font-bold text-foreground mt-1">{customers.length}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Registered customers</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ label, icon: Icon, section, tab, color }) => (
            <button
              key={tab}
              onClick={() => onNavigate(section, tab)}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors text-left group"
              data-testid={`quick-action-${tab}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-foreground">{label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Top performers + Recent sales side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top performers */}
        {(metrics?.bestChannel || metrics?.bestDay || metrics?.bestMonth) && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Top Performers</h3>
            <div className="space-y-2">
              {metrics?.bestChannel && (
                <Card>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Best Channel</p>
                      <p className="text-sm font-semibold text-foreground truncate">{metrics.bestChannel.name}</p>
                    </div>
                    <p className="text-sm font-medium text-foreground shrink-0">{fmt(metrics.bestChannel.total)}</p>
                  </CardContent>
                </Card>
              )}
              {metrics?.bestDay && (
                <Card>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Best Day</p>
                      <p className="text-sm font-semibold text-foreground truncate">
                        {new Date(metrics.bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' '}({metrics.bestDay.dayOfWeek?.substring(0, 3) || ''})
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground shrink-0">{fmt(metrics.bestDay.total)}</p>
                  </CardContent>
                </Card>
              )}
              {metrics?.bestMonth && (
                <Card>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Best Month</p>
                      <p className="text-sm font-semibold text-foreground truncate">
                        {new Date(metrics.bestMonth.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground shrink-0">{fmt(metrics.bestMonth.total)}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {recentSales.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Sales</h3>
              <button
                onClick={() => onNavigate('sales', 'salesTracker')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentSales.map((sale: any, i: number) => (
                    <div key={sale.id || i} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {sale.salesChannel || sale.channel || 'Sale'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.date
                            ? new Date(sale.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                            : ''}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground shrink-0 ml-3">
                        {fmt(Number(sale.netSales || sale.totalSales || sale.total || 0))}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
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
      toast({ title: t('admin.toasts.authRequired'), description: t('admin.toasts.authRequiredDesc'), variant: "destructive" });
      setTimeout(() => setLocation("/admin/login"), 500);
      return;
    }
    if (!authLoading && isAuthenticated && user?.role !== "admin") {
      toast({ title: t('admin.toasts.accessDenied'), description: t('admin.toasts.accessDeniedDesc'), variant: "destructive" });
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

  // Header is ~57px, primary nav ~49px, secondary nav ~41px
  const primaryNavTop = "top-[57px]";
  const secondaryNavTop = "top-[106px]";

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[57px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button onClick={() => setLocation("/")} variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src={logoUrl} alt="Yens Logo" className="w-8 h-8 rounded-full shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground">{t('admin.title')}</h1>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 hidden sm:flex" data-testid="badge-version">
                  {t('common.version')}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate hidden md:block">
                {user?.email || user?.firstName || t('common.admin')}
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
      <div className={`bg-card border-b border-border sticky ${primaryNavTop} z-40`}>
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
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 shrink-0 ${
                    isActive
                      ? 'text-foreground border-amber-400 bg-amber-50/70'
                      : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-600' : ''}`} />
                  <span className="hidden sm:inline">{group.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Secondary Navigation ── */}
      {showSecondaryNav && (
        <div className={`bg-background border-b border-border/50 sticky ${secondaryNavTop} z-30`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none">
            <nav className="flex items-center w-max min-w-full" role="navigation" aria-label="Secondary navigation">
              {currentSubs.map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSecondaryNav(sub.id)}
                    data-testid={sub.testId}
                    className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 pt-6">

          {activeTab === 'overview' && (
            <AdminOverview key="overview" onNavigate={navigate} />
          )}

          {activeTab === 'customers' && (
            <div key="customers">
              <SectionHeader
                title={t('admin.customers.title')}
                subtitle={t('admin.customers.manage', 'Manage your loyalty members')}
                action={<CustomerCSVImport showTrigger={true} />}
              />
              <CustomerTable
                onMessage={(customer) => { setMessagingCustomer(customer as Customer); setIsMessageDialogOpen(true); }}
                onEdit={(customer) => { setEditingCustomer(customer as Customer); setIsEditDialogOpen(true); }}
              />
            </div>
          )}

          {activeTab === 'loyalty' && (
            <div key="loyalty">
              <SectionHeader
                title="Loyalty Programme"
                subtitle="Top spenders, birthdays, and tier insights"
              />
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

          {activeTab === 'automations' && <AutomationsManager key="automations" />}

          {activeTab === 'products' && <ProductManager key="products" />}

          {activeTab === 'sites' && <SitesManager key="sites" />}

          {activeTab === 'schedules' && <SchedulesManager key="schedules" />}

          {activeTab === 'users' && <UsersPage key="users" />}

          {activeTab === 'settings' && <SettingsPage key="settings" />}

        </main>
      )}

      {/* ── Dialogs ── */}
      {editingCustomer && (
        <CustomerEditDialog
          customer={editingCustomer}
          open={isEditDialogOpen}
          onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditingCustomer(null); }}
        />
      )}

      {messagingCustomer && (
        <CustomerMessageDialog
          customer={messagingCustomer as any}
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
