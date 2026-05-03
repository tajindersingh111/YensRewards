import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Award,
  Calendar,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { useTranslation } from "react-i18next";

interface WeeklyOverview {
  thisWeek: {
    revenue: number;
    transactions: number;
    avgTransaction: number;
    pointsIssued: number;
    pointsRedeemed: number;
    newCustomers: number;
    returningCustomers: number;
  };
  lastWeek: {
    revenue: number;
    transactions: number;
    avgTransaction: number;
  };
  dailyData: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
  topProducts: Array<{
    productName: string;
    revenue: number;
    quantity: number;
  }>;
  bestDay: {
    date: string;
    revenue: number;
  };
}

export default function YensOverview() {
  const { t, i18n } = useTranslation();
  
  const { data: overview, isLoading } = useQuery<WeeklyOverview>({
    queryKey: ['/api/admin/weekly-overview'],
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest animate-pulse">{t('overview.loading')}</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('overview.noData')}</p>
      </div>
    );
  }

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueChange = calculateChange(overview.thisWeek.revenue, overview.lastWeek.revenue);
  const transactionsChange = calculateChange(overview.thisWeek.transactions, overview.lastWeek.transactions);
  const avgTransChange = calculateChange(overview.thisWeek.avgTransaction, overview.lastWeek.avgTransaction);

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    format = (v: number) => v.toString() 
  }: { 
    title: string; 
    value: number; 
    change?: number; 
    icon: any; 
    format?: (v: number) => string;
  }) => {
    const isPositive = change !== undefined && change > 0;
    const isNegative = change !== undefined && change < 0;
    
    return (
      <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center shrink-0 shadow-lg">
              <Icon className="w-5 h-5 text-blue-900" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-900 tracking-tighter" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {format(value)}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
              {isNegative && <ArrowDownRight className="h-3 w-3 text-red-500" />}
              <span className={`text-xs font-black ${isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-slate-400"}`}>
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{t('overview.vsLastWeek')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Branded Header */}
      <div className="bg-blue-900 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
        <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
          <BarChart3 className="w-5 h-5 text-blue-900" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">
            {t('overview.title')}
          </h2>
          <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest mt-1.5">
            {t('overview.subtitle')}
          </p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title={t('overview.totalRevenue')} value={overview.thisWeek.revenue} change={revenueChange} icon={DollarSign} format={formatCurrency} />
        <MetricCard title={t('overview.transactions')} value={overview.thisWeek.transactions} change={transactionsChange} icon={ShoppingCart} />
        <MetricCard title={t('overview.avgTransaction')} value={overview.thisWeek.avgTransaction} change={avgTransChange} icon={TrendingUp} format={formatCurrency} />
        <MetricCard title={t('overview.newCustomers')} value={overview.thisWeek.newCustomers} icon={Users} />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title={t('overview.pointsIssued')} value={overview.thisWeek.pointsIssued} icon={Award} />
        <MetricCard title={t('overview.pointsRedeemed')} value={overview.thisWeek.pointsRedeemed} icon={Award} />
        <MetricCard title={t('overview.returningCustomers')} value={overview.thisWeek.returningCustomers} icon={Users} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-black text-blue-900 uppercase tracking-tight">{t('overview.dailyRevenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={overview.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={formatDate} style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `฿${value}`} style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={formatDate} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#FCD34D" strokeWidth={3} dot={{ fill: '#FCD34D', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-black text-blue-900 uppercase tracking-tight">{t('overview.dailyTransactions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overview.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                <YAxis style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                <Tooltip labelFormatter={formatDate} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="transactions" fill="#1e3a8a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Channels */}
      {overview.topProducts && overview.topProducts.length > 0 && (
        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-black text-blue-900 uppercase tracking-tight flex items-center gap-2">
              <MapPin className="h-4 w-4 text-yellow-500" />
              {t('overview.topChannels', 'Top Channels (30 days)')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.topProducts.map((item, idx) => {
                const maxRev = overview.topProducts[0].revenue || 1;
                const pct = Math.round((item.revenue / maxRev) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-black text-blue-900 text-xs uppercase tracking-tight">{item.productName}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {formatCurrency(item.revenue)} &middot; {item.quantity} {t('overview.days', 'days')}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-blue-900 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Day */}
      {overview.bestDay.revenue > 0 && (
        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-blue-900">
          <CardHeader>
            <CardTitle className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-400" />
              {t('overview.bestDay')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-white">{formatDate(overview.bestDay.date)}</p>
                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1">{t('overview.bestDayDesc')}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-yellow-400">
                  {formatCurrency(overview.bestDay.revenue)}
                </p>
                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mt-1">{t('overview.revenue')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
