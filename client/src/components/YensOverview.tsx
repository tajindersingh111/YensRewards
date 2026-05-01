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
  ArrowDownRight
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
        <p className="text-muted-foreground">{t('overview.loading')}</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('overview.noData')}</p>
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
    const isNeutral = change !== undefined && change === 0;
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {format(value)}
          </div>
          {change !== undefined && (
            <div className="flex items-center text-xs mt-1">
              {isPositive && (
                <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              )}
              {isNegative && (
                <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={
                isPositive ? "text-green-600" : 
                isNegative ? "text-red-600" : 
                "text-muted-foreground"
              }>
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">{t('overview.vsLastWeek')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('overview.title')}</h2>
        <p className="text-muted-foreground">{t('overview.subtitle')}</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('overview.totalRevenue')}
          value={overview.thisWeek.revenue}
          change={revenueChange}
          icon={DollarSign}
          format={formatCurrency}
        />
        <MetricCard
          title={t('overview.transactions')}
          value={overview.thisWeek.transactions}
          change={transactionsChange}
          icon={ShoppingCart}
        />
        <MetricCard
          title={t('overview.avgTransaction')}
          value={overview.thisWeek.avgTransaction}
          change={avgTransChange}
          icon={TrendingUp}
          format={formatCurrency}
        />
        <MetricCard
          title={t('overview.newCustomers')}
          value={overview.thisWeek.newCustomers}
          icon={Users}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title={t('overview.pointsIssued')}
          value={overview.thisWeek.pointsIssued}
          icon={Award}
        />
        <MetricCard
          title={t('overview.pointsRedeemed')}
          value={overview.thisWeek.pointsRedeemed}
          icon={Award}
        />
        <MetricCard
          title={t('overview.returningCustomers')}
          value={overview.thisWeek.returningCustomers}
          icon={Users}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('overview.dailyRevenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={overview.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  tickFormatter={(value) => `฿${value}`}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={formatDate}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#FCD34D" 
                  strokeWidth={2}
                  dot={{ fill: '#FCD34D', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Transactions Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('overview.dailyTransactions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overview.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  style={{ fontSize: '12px' }}
                />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip 
                  labelFormatter={formatDate}
                />
                <Bar 
                  dataKey="transactions" 
                  fill="#3B82F6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Channels / Locations */}
      {overview.topProducts && overview.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
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
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.revenue)} &middot; {item.quantity} {t('overview.days', 'days')}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Day Highlight */}
      {overview.bestDay.revenue > 0 && (
        <Card className="border-2 border-[#FCD34D]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#FCD34D]" />
              {t('overview.bestDay')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatDate(overview.bestDay.date)}</p>
                <p className="text-muted-foreground">{t('overview.bestDayDesc')}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-[#FCD34D]">
                  {formatCurrency(overview.bestDay.revenue)}
                </p>
                <p className="text-sm text-muted-foreground">{t('overview.revenue')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
