/* LEF'S PREMIER YENS ADMIN DASHBOARD - FINAL INTEGRATION */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
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
        <h2 className="text-base font-black uppercase tracking-tight text-blue-900">{title}</h2>
        {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">{subtitle}</p>}
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
    { label: 'Sales Tracker', icon: TrendingUp, section: 'sales', tab: 'salesTracker' },
    { label: 'Send Message', icon: Send, section: 'marketing', tab: 'messages' },
    { label: 'Customer List', icon: Users, section: 'customers', tab: 'customers' },
    { label: 'Promotions', icon: Tag, section: 'marketing', tab: 'promotions' },
  ];

  return (
    <div className="space-y-8">
      {todayBirthdays.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-900 rounded-[1.5rem] px-5 py-4 shadow-xl">
          <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center shrink-0">
            <Gift className="w-4 h-4 text-blue-900" />
          </div>
          <p className="text-sm font-black text-white uppercase tracking-tight flex-1">
            {todayBirthdays.length === 1
              ? `${todayBirthdays[0].name} has a birthday today`
              : `${todayBirthdays.length} customers have birthdays today`}
          </p>
          <button
            onClick={() => onNavigate('customers', 'loyalty')}
            className="text-[9px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1 shrink-0"
          >
            View <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-white">
            <CardContent className="p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">This Week</p>
              <p className="text-2xl font-black text-blue-900 mt-2 tracking-tighter">{fmt(metrics?.currentWeekSales)}</p>
              {renderTrend(metrics?.currentWeekSales, metrics?.lastWeekSales, 'last week')}
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-white">
            <CardContent className="p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">This Month</p>
              <p className="text-2xl font-black text-blue-900 mt-2 tracking-tighter">{fmt(metrics?.currentMonthSales)}</p>
              {renderTrend(metrics?.currentMonthSales, metrics?.lastMonthSales, 'last month')}
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-white">
            <CardContent className="p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Year to Date</p>
              <p className="text-2xl font-black text-blue-900 mt-2 tracking-tighter">{fmt(metrics?.ytdSales)}</p>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2">Running total</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-white">
            <CardContent className="p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Loyalty Members</p>
              <p className="text-2xl font-black text-blue-900 mt-2 tracking-tighter">{customers.length}</p>
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2">Total Database</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Executive Operations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(({ label, icon: Icon, section, tab }) => (
            <button
              key={tab}
              onClick={() => onNavigate(section, tab)}
              className="flex items-center gap-4 p-5 rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all text-left group active:scale-95"
              data-testid={`quick-action-${tab}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-900 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-black text-blue-900 uppercase tracking-tight leading-tight truncate">
                  {label}
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open Module
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-blue-900 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RECENT ACTIVITY LEDGER */}
        <div className="space-y-4">
          <SectionHeader title="Recent Ledger" subtitle="Live Transaction Feed" />
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardContent className="p-0">
              {recentSales.length === 0 ? (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest p-6 text-center">No recent transactions</p>
              ) : recentSales.map((sale: any, idx: number) => (
                <div key={sale.id || idx} className="flex items-center justify-between p-5 transition-all border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-900/5 flex items-center justify-center text-blue-900 font-black text-xs shrink-0">
                      {(sale.salesChannel || sale.channel || 'G').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-blue-900 uppercase truncate">{sale.salesChannel || sale.channel || 'Guest'}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">
                        {sale.date ? format(new Date(sale.date), "MMM dd, yyyy") : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-black text-blue-900">฿{Number(sale.netSales || sale.totalSales || sale.total || 0).toLocaleString()}</p>
                    <p className="text-[9px] font-black text-yellow-600 uppercase">{sale.salesChannel || 'Channel'}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* REVENUE INSIGHTS */}
        <div className="space-y-4">
          <SectionHeader title="Revenue Insights" subtitle="Top Performing Channels" />
          <Card className="border-none shadow-xl rounded-[2rem] bg-white p-6">
            <AnalyticsDashboard />
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD COMPONENT ───────────────────────────────────────────────────

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

  const currentSection = NAV_GROUPS.find(g => g.id === activeSection) || NAV_GROUPS[0];

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: t('admin.toasts.authRequired'), description: t('admin.toasts.authRequiredDesc'), variant: "destructive" });
      setTimeout(() => setLocation("/admin/login"), 500);
    }
    if (!authLoading && isAuthenticated && user?.role !== "admin") {
      toast({ title: t('admin.toasts.accessDenied'), description: t('admin.toasts.accessDeniedDesc'), variant: "destructive" });
      setTimeout(() => setLocation("/"), 500);
    }
  }, [isAuthenticated, authLoading, user, toast, setLocation, t]);

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* EXECUTIVE HEADER */}
      <header className="bg-blue-900 text-white sticky top-0 z-50 shadow-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoUrl}
              alt="Yens Logo"
              className="w-9 h-9 rounded-full shrink-0 ring-2 ring-yellow-400 border-2 border-blue-900 shadow-lg object-cover"
            />
            <div className="hidden sm:block min-w-0">
              <h1 className="text-sm font-black uppercase tracking-tight text-white">Executive Hub</h1>
              <p className="text-[8px] font-bold text-blue-300 uppercase tracking-[0.2em] mt-0.5 opacity-70">Yen's Thai Protocol v2.4</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <LanguageSwitcher />
            <div className="h-6 w-px bg-white/10" />
            <Button
              onClick={() => { window.location.href = "/api/logout"; }}
              variant="ghost"
              size="sm"
              className="text-red-400 font-black uppercase text-[10px] tracking-widest"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" /> {t('auth.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* PRIMARY SECTOR NAV */}
      <nav className="bg-blue-900/95 backdrop-blur-md sticky top-[64px] z-40 border-b border-white/5 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none">
          <div className="flex items-center h-[52px] w-max min-w-full">
            {NAV_GROUPS.map((group) => {
              const Icon = group.icon;
              const isActive = activeSection === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => navigate(group.id, group.subs[0].id)}
                  className={`flex items-center gap-2.5 px-6 h-full text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all shrink-0 ${
                    isActive ? 'text-yellow-400 border-yellow-400 bg-white/5' : 'text-blue-300/40 border-transparent hover:text-white'
                  }`}
                  data-testid={`nav-group-${group.id}`}
                >
                  <Icon className="w-4 h-4 shrink-0" /> {group.label}
                  {isActive && <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* SECONDARY ACTION NAV */}
      <div className="bg-white sticky top-[116px] z-30 border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none">
          <div className="flex items-center h-[48px] w-max min-w-full">
            {currentSection.subs.map((sub) => (
              <button
                key={sub.id}
                onClick={() => navigate(activeSection, sub.id)}
                className={`px-6 h-full text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all shrink-0 flex items-center gap-1 ${
                  activeTab === sub.id ? 'text-blue-900 border-yellow-400 bg-blue-900/5' : 'text-slate-400 border-transparent hover:text-blue-900'
                }`}
                data-testid={sub.testId}
              >
                {sub.label}
                {activeTab === sub.id && <span className="w-1 h-1 bg-yellow-400 rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 animate-in fade-in duration-700">
        {activeTab === 'overview' && <AdminOverview key="overview" onNavigate={navigate} />}
        {activeTab === 'salesTracker' && <SalesTrackerDashboard key="salesTracker" />}
        {activeTab === 'analytics' && <AnalyticsDashboard key="analytics" />}
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
