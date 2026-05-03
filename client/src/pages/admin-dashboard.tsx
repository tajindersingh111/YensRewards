/* LEF'S PREMIUM ADMIN DASHBOARD UPDATE - CLEAN VERSION */
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
import BaristaManager from "@/components/BaristaManager";
import WeeklySpecialsManager from "@/pages/admin/WeeklySpecialsManager";
import AutomationsManager from "@/components/AutomationsManager";
import ShopCalendar from "@/components/ShopCalendar";
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
  Send, UserPlus, ArrowUpRight, CalendarDays
} from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { Customer } from "@shared/schema";

const NAV_GROUPS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, subs: [{ id: 'overview', label: 'Overview', testId: 'tab-overview' }] },
  { id: 'sales', label: 'Sales', icon: TrendingUp, subs: [{ id: 'salesTracker', label: 'Sales Tracker', testId: 'tab-sales-tracker' }, { id: 'analytics', label: 'Analytics', testId: 'tab-analytics' }] },
  { id: 'customers', label: 'Customers', icon: Users, subs: [{ id: 'customers', label: 'Customer List', testId: 'tab-customers' }, { id: 'loyalty', label: 'Loyalty', testId: 'tab-loyalty' }] },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, subs: [{ id: 'messages', label: 'Messages', testId: 'tab-messages' }, { id: 'promotions', label: 'Promotions', testId: 'tab-promotions' }, { id: 'specials', label: 'Weekly Specials', testId: 'tab-specials' }, { id: 'automations', label: 'Automations', testId: 'tab-automations' }] },
  { id: 'operations', label: 'Operations', icon: Wrench, subs: [{ id: 'products', label: 'Products', testId: 'tab-products' }, { id: 'sites', label: 'Sites', testId: 'tab-sites' }, { id: 'schedules', label: 'Schedules', testId: 'tab-schedules' }, { id: 'barista', label: 'Barista', testId: 'tab-barista' }] },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, subs: [{ id: 'shopCalendar', label: 'Events', testId: 'tab-shop-calendar' }] },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, subs: [{ id: 'users', label: 'Users', testId: 'tab-users' }, { id: 'settings', label: 'Settings', testId: 'tab-settings' }] },
];

function findSectionForTab(tabId: string): string {
  for (const group of NAV_GROUPS) {
    if (group.subs.some(s => s.id === tabId)) return group.id;
  }
  return 'dashboard';
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
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

  const fmt = (n: number) => `฿${(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  const renderTrend = (current: number, previous: number, label: string) => {
    if (!previous || previous <= 0) return <p className="text-xs text-muted-foreground mt-1.5 italic">Collecting data...</p>;
    const diff = ((current - previous) / previous) * 100;
    if (diff < -90) return <p className="text-xs text-muted-foreground mt-1.5">New period started</p>;
    const isUp = diff >= 0;
    return (
      <p className={`text-xs mt-1.5 font-medium ${isUp ? 'text-green-600' : 'text-red-500'}`}>
        {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}% vs {label}
      </p>
    );
  };

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
    { label: 'Sales Tracker', icon: TrendingUp, section: 'sales', tab: 'salesTracker', color: 'bg-yellow-400/20 text-yellow-600' },
    { label: 'Send Message', icon: Send, section: 'marketing', tab: 'messages', color: 'bg-blue-900/10 text-blue-900' },
    { label: 'Customer List', icon: Users, section: 'customers', tab: 'customers', color: 'bg-blue-900/10 text-blue-900' },
    { label: 'Promotions', icon: Tag, section: 'marketing', tab: 'promotions', color: 'bg-yellow-400/20 text-yellow-600' },
  ];

  return (
    <div className="space-y-8">
      {todayBirthdays.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-900/5 border border-blue-100 rounded-lg px-4 py-3 shadow-sm">
          <Gift className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-sm text-blue-900 font-medium">
            {todayBirthdays.length === 1 ? `${todayBirthdays[0].name} has a birthday today` : `${todayBirthdays.length} customers have birthdays today`}
          </p>
          <button onClick={() => onNavigate('customers', 'loyalty')} className="ml-auto text-xs text-blue-900 font-bold flex items-center gap-1 hover:underline shrink-0">
            View <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold text-foreground mt-1">{fmt(metrics?.currentWeekSales)}</p>
              {renderTrend(metrics?.currentWeekSales, metrics?.lastWeekSales, 'last week')}
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-foreground mt-1">{fmt(metrics?.currentMonthSales)}</p>
              {renderTrend(metrics?.currentMonthSales, metrics?.lastMonthSales, 'last month')}
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Year to Date</p>
              <p className="text-2xl font-bold text-foreground mt-1">{fmt(metrics?.ytdSales)}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Running total</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Loyalty Members</p>
              <p className="text-2xl font-bold text-foreground mt-1">{customers.length}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Total Database</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(({ label, icon: Icon, section, tab, color }) => (
            <button
              key={tab}
              onClick={() => onNavigate(section, tab)}
              className="flex items-center gap-3 p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-left group active:scale-95"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color} group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {(metrics?.bestChannel || metrics?.bestDay || metrics?.bestMonth) && (
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Top Performers</h3>
            <div className="space-y-3">
              {metrics?.bestChannel && (
                <Card className="hover:bg-accent/5 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center shrink-0 border border-yellow-200">
                      <Award className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Best Channel</p>
                      <p className="text-sm font-bold text-foreground truncate">{metrics.bestChannel.name}</p>
                    </div>
                    <p className="text-sm font-bold text-amber-700 shrink-0">{fmt(metrics.bestChannel.total)}</p>
                  </CardContent>
                </Card>
              )}
              {metrics?.bestDay && (
                <Card className="hover:bg-accent/5 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0 border border-blue-100">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Best Sales Day</p>
                      <p className="text-sm font-bold text-foreground truncate">
                        {new Date(metrics.bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({metrics.bestDay.dayOfWeek?.substring(0, 3)})
                      </p>
                    </div>
                    <p className="text-sm font-bold text-blue-700 shrink-0">{fmt(metrics.bestDay.total)}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {recentSales.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent Activity</h3>
              <button onClick={() => onNavigate('sales', 'salesTracker')} className="text-xs font-bold text-blue-900 hover:text-blue-700 flex items-center gap-1">
                Full Log <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {recentSales.map((sale: any, i: number) => (
                    <div key={sale.id || i} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{sale.salesChannel || sale.channel || 'Sale'}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.date ? new Date(sale.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                        </p>
                      </div>
                      <p className="text-sm font-black text-foreground shrink-0 ml-3">{fmt(Number(sale.netSales || sale.totalSales || sale.total || 0))}</p>
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
        <p className="text-lg text-muted-foreground font-medium">{t('common.loading')}</p>
      </div>
    );
  }

  const isFullBleed = activeTab === 'salesTracker' || activeTab === 'analytics';
  const primaryNavTop = "top-[64px]";
  const secondaryNavTop = "top-[116px]";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-blue-900 text-white border-b border-white/5 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img
              src={logoUrl}
              alt="Yens Logo"
              className="w-9 h-9 rounded-full shrink-0 ring-2 ring-yellow-400 border-2 border-blue-900 shadow-lg object-cover"
            />
            <div className="min-w-0 ml-1">
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-black uppercase tracking-tight text-white">
                  {t('admin.title')}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase px-2 py-0.5 bg-white/10 text-yellow-400 border-white/10 tracking-widest hidden sm:flex"
                >
                  {t('common.version')} v2.4
                </Badge>
              </div>
              <p className="text-[8px] font-bold text-blue-300 uppercase tracking-[0.2em] mt-0.5 opacity-70">
                Executive Administration Suite
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <div className="h-6 w-px bg-white/10 mx-1" />
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 font-black uppercase text-[10px] tracking-widest rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-2">{t('auth.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className={`bg-blue-900 border-b border-white/10 sticky ${primaryNavTop} z-40 shadow-xl`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none">
          <nav className="flex items-center w-max min-w-full h-[52px]">
            {NAV_GROUPS.map((group) => {
              const Icon = group.icon;
              const isActive = activeSection === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => handlePrimaryNav(group.id)}
                  className={`flex items-center gap-2.5 px-6 h-full text-[10px] font-black uppercase tracking-[0.15em] transition-all shrink-0 border-b-2 ${
                    isActive
                      ? 'text-yellow-400 border-yellow-400 bg-white/5'
                      : 'text-blue-300/40 border-transparent hover:text-white hover:bg-white/5'
                  }`}
                  data-testid={`nav-group-${group.id}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-yellow-400' : 'text-blue-300/40'}`} />
                  <span className="whitespace-nowrap">{group.label}</span>
                  {isActive && <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse ml-0.5" />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {showSecondaryNav && (
        <div className={`bg-background border-b border-border/50 sticky ${secondaryNavTop} z-30`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none">
            <nav className="flex items-center w-max min-w-full">
              {currentSubs.map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSecondaryNav(sub.id)}
                    className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                      isActive ? 'text-foreground border-yellow-400 bg-white' : 'text-muted-foreground border-transparent hover:text-foreground'
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

      {isFullBleed ? (
        <div className="pb-8">
          {activeTab === 'salesTracker' && <SalesTrackerDashboard key="salesTracker" />}
          {activeTab === 'analytics' && <AnalyticsDashboard key="analytics" />}
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 pt-8">
          {activeTab === 'overview' && <AdminOverview key="overview" onNavigate={navigate} />}
          {activeTab === 'customers' && (
            <div key="customers">
              <SectionHeader title={t('admin.customers.title')} subtitle="Your loyal community members" action={<CustomerCSVImport showTrigger={true} />} />
              <CustomerTable
                onMessage={(customer) => { setMessagingCustomer(customer as Customer); setIsMessageDialogOpen(true); }}
                onEdit={(customer) => { setEditingCustomer(customer as Customer); setIsEditDialogOpen(true); }}
              />
            </div>
          )}
          {activeTab === 'loyalty' && (
            <div key="loyalty">
              <SectionHeader title="Loyalty Programme" subtitle="Track your most valuable fans" />
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
          {activeTab === 'barista' && <BaristaManager key="barista" />}
          {activeTab === 'shopCalendar' && (
            <div key="shopCalendar" className="h-[70vh]">
              <ShopCalendar />
            </div>
          )}
          {activeTab === 'users' && <UsersPage key="users" />}
          {activeTab === 'settings' && <SettingsPage key="settings" />}
        </main>
      )}

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
            <DialogTitle>Send Birthday Greetings</DialogTitle>
            <DialogDescription>
              Personalize a message for {birthdayCustomers.length} loyalty members celebrating today.
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
