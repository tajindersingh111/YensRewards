import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  ArrowLeft,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface MonthlyTrend {
  month: string;
  totalSales: number;
  netSales: number;
}

interface ChannelData {
  channel: string;
  revenue: number;
  transactions: number;
  avgTransaction: number;
}

interface DayData {
  day: string;
  revenue: number;
  transactions: number;
}

interface CombinedMonthlyTrend {
  month: string;
  currentYearSales: number;
  lastYearSales: number;
  currentYearTotal: number;
  lastYearTotal: number;
}

interface CFOMetrics {
  ytdRevenue: number;
  ytdTransactions: number;
  annualTarget: number;
  monthlyTarget: number;
  projectedMonthEnd: number;
  projectedAnnual: number;
  monthlyTargetPercent: number;
  annualTargetPercent: number;
  yoyMonthGrowth: number;
  yoyYtdGrowth: number;
  dailyAverage: number;
  daysElapsedMonth: number;
  daysInMonth: number;
  daysElapsedYear: number;
  sameMonthLastYear: number;
  ytdLastYear: number;
  bestSingleDay: { date: string; total: number } | null;
}

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    momGrowth: number;
    avgTransaction: number;
    totalTransactions: number;
  };
  cfoMetrics: CFOMetrics;
  monthlyTrends: MonthlyTrend[];
  combinedMonthlyTrends: CombinedMonthlyTrend[];
  channelPerformance: ChannelData[];
  dayAnalysis: DayData[];
  topPerformers: {
    channels: ChannelData[];
    bestDay: string;
    bestMonth: string;
  };
}

const CHANNEL_COLORS = [
  "#FCD34D", // Yens Yellow
  "#3B82F6", // Blue
  "#10B981", // Green
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#A855F7", // Violet
];

const DAY_COLORS = ["#3B82F6", "#10B981", "#FCD34D", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6"];

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("monthly");

  const { data: analytics, isLoading, isError, error } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics'],
  });

  const summary = analytics?.summary || {
    totalRevenue: 0,
    momGrowth: 0,
    avgTransaction: 0,
    totalTransactions: 0,
  };

  // Calculate sum of day-of-week revenues for verification
  const dayOfWeekTotal = (analytics?.dayAnalysis || []).reduce(
    (sum, day) => sum + day.revenue,
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">{t('sales.loading')}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="bg-destructive/10 border-destructive" data-testid="card-analytics-error">
        <CardHeader>
          <CardTitle className="text-destructive">{t('sales.metricsError')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : t('sales.metricsErrorDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FCD34D] rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-blue-900" data-testid="heading-analytics">
              {t('analytics.title')}
            </h1>
            <p className="text-muted-foreground">{t('analytics.subtitle')}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2" data-testid="badge-total-sales">
          <TrendingUp className="w-4 h-4 mr-2" />
          {summary.totalTransactions} {t('analytics.totalSales')}
        </Badge>
      </div>

      {/* CFO-Level KPI Cards - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-12 gap-2">
        {/* Current Month Card (Blue) - 3 columns */}
        <Card className="col-span-1 md:col-span-3 bg-blue-500 text-white rounded-xl" data-testid="card-current-month">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-white/80">Current Month</p>
              <DollarSign className="w-4 h-4 text-white/80" />
            </div>
            <p className="text-xl font-bold mb-2">
              ฿{summary.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">vs Target</span>
                <span className={`font-medium ${(analytics?.cfoMetrics?.monthlyTargetPercent ?? 0) >= 100 ? 'text-green-300' : 'text-white'}`}>
                  {(analytics?.cfoMetrics?.monthlyTargetPercent ?? 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">Projection</span>
                <span className="text-white font-medium">฿{((analytics?.cfoMetrics?.projectedMonthEnd ?? 0) / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">YoY Growth</span>
                <span className={`font-medium flex items-center gap-0.5 ${(analytics?.cfoMetrics?.yoyMonthGrowth ?? 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {(analytics?.cfoMetrics?.yoyMonthGrowth ?? 0) >= 0 ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />}
                  {Math.abs(analytics?.cfoMetrics?.yoyMonthGrowth ?? 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">Transactions</span>
                <span className="text-white font-medium">{summary.totalTransactions}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* YTD Card (Green) - 3 columns */}
        <Card className="col-span-1 md:col-span-3 bg-green-500 text-white rounded-xl" data-testid="card-ytd">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-white/80">Year to Date</p>
              <TrendingUp className="w-4 h-4 text-white/80" />
            </div>
            <p className="text-xl font-bold mb-2">
              ฿{((analytics?.cfoMetrics?.ytdRevenue ?? 0) / 1000).toFixed(1)}k
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">vs Annual Target</span>
                <span className={`font-medium ${(analytics?.cfoMetrics?.annualTargetPercent ?? 0) >= (analytics?.cfoMetrics?.daysElapsedYear ?? 0) / 365 * 100 ? 'text-green-300' : 'text-white'}`}>
                  {(analytics?.cfoMetrics?.annualTargetPercent ?? 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">Annual Projection</span>
                <span className="text-white font-medium">฿{((analytics?.cfoMetrics?.projectedAnnual ?? 0) / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">Annual Target</span>
                <span className="text-white font-medium">฿{((analytics?.cfoMetrics?.annualTarget ?? 0) / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">YoY Growth</span>
                <span className={`font-medium flex items-center gap-0.5 ${(analytics?.cfoMetrics?.yoyYtdGrowth ?? 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {(analytics?.cfoMetrics?.yoyYtdGrowth ?? 0) >= 0 ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />}
                  {Math.abs(analytics?.cfoMetrics?.yoyYtdGrowth ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projections Card (Purple) - 3 columns */}
        <Card className="col-span-1 md:col-span-3 bg-purple-500 text-white rounded-xl" data-testid="card-projections">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-white/80">Projections & Targets</p>
              <Target className="w-4 h-4 text-white/80" />
            </div>
            <p className="text-xl font-bold mb-2">
              ฿{((analytics?.cfoMetrics?.projectedAnnual ?? 0) / 1000000).toFixed(2)}M
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">vs FY Target</span>
                <span className={`font-medium ${(analytics?.cfoMetrics?.projectedAnnual ?? 0) >= (analytics?.cfoMetrics?.annualTarget ?? 0) ? 'text-green-300' : 'text-yellow-300'}`}>
                  {(analytics?.cfoMetrics?.annualTarget ?? 0) > 0 
                    ? ((analytics?.cfoMetrics?.projectedAnnual ?? 0) / (analytics?.cfoMetrics?.annualTarget ?? 1) * 100).toFixed(0) 
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">Daily Average</span>
                <span className="text-white font-medium">฿{(analytics?.cfoMetrics?.dailyAverage ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">Month Progress</span>
                <span className="text-white font-medium">{analytics?.cfoMetrics?.daysElapsedMonth ?? 0}/{analytics?.cfoMetrics?.daysInMonth ?? 0} days</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-white/70">MoM Growth</span>
                <span className={`font-medium flex items-center gap-0.5 ${summary.momGrowth >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {summary.momGrowth >= 0 ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />}
                  {Math.abs(summary.momGrowth).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smaller Yellow Cards Container (3/12 total) */}
        <div className="col-span-1 md:col-span-3 grid grid-rows-3 gap-2">
          {/* Best Channel - Smaller */}
          <Card className="bg-yellow-400 rounded-lg">
            <CardContent className="p-2">
              <p className="text-[8px] font-medium text-gray-700 mb-0.5">Best Channel</p>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-900" data-testid="text-best-channel">
                  {analytics?.topPerformers?.channels?.[0]?.channel || 'N/A'}
                </p>
                <p className="text-xs font-bold text-gray-800">
                  {analytics?.topPerformers?.channels?.[0] 
                    ? `฿${(analytics.topPerformers.channels[0].revenue / 1000).toFixed(0)}k` 
                    : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Best Day - Smaller */}
          <Card className="bg-blue-400 rounded-lg">
            <CardContent className="p-2">
              <p className="text-[8px] font-medium text-white/80 mb-0.5">Best Day</p>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white" data-testid="text-best-day">
                  {analytics?.cfoMetrics?.bestSingleDay?.date 
                    ? new Date(analytics.cfoMetrics.bestSingleDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'N/A'}
                </p>
                <p className="text-xs font-bold text-white">
                  {analytics?.cfoMetrics?.bestSingleDay 
                    ? `฿${(analytics.cfoMetrics.bestSingleDay.total / 1000).toFixed(1)}k` 
                    : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Avg Transaction - Smaller */}
          <Card className="bg-green-400 rounded-lg">
            <CardContent className="p-2">
              <p className="text-[8px] font-medium text-white/80 mb-0.5">Avg Transaction</p>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white" data-testid="text-avg-transaction">
                  ฿{summary.avgTransaction.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs font-bold text-white">
                  {analytics?.cfoMetrics?.ytdTransactions || 0} txns
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/80">
          <TabsTrigger value="monthly" data-testid="tab-monthly-trends">
            {t('analytics.tabs.monthlyTrends')}
          </TabsTrigger>
          <TabsTrigger value="channels" data-testid="tab-channels">
            {t('analytics.tabs.channels')}
          </TabsTrigger>
          <TabsTrigger value="days" data-testid="tab-day-analysis">
            {t('analytics.tabs.dayAnalysis')}
          </TabsTrigger>
          <TabsTrigger value="performers" data-testid="tab-top-performers">
            {t('analytics.tabs.topPerformers')}
          </TabsTrigger>
        </TabsList>

        {/* Monthly Trends Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card className="bg-white/95" data-testid="card-monthly-trends">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('analytics.monthlyTrends.title')}
                <Badge variant="outline" className="text-xs">YoY Comparison</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics?.combinedMonthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `฿${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
                      name
                    ]}
                  />
                  <Legend />
                  <ReferenceLine
                    y={analytics?.cfoMetrics?.monthlyTarget ?? 0}
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    label={{ value: (analytics?.cfoMetrics?.monthlyTarget ?? 0) > 0 ? `Monthly Target ฿${((analytics?.cfoMetrics?.monthlyTarget ?? 0) / 1000).toFixed(0)}k` : "", position: "right", fill: "#EF4444", fontSize: 12, fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="currentYearSales"
                    stroke="#FCD34D"
                    strokeWidth={3}
                    name={`${new Date().getFullYear()} Sales`}
                    dot={{ r: 5, fill: '#FCD34D' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lastYearSales"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name={`${new Date().getFullYear() - 1} Sales`}
                    dot={{ r: 3, fill: '#9CA3AF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Target Progress Card */}
          <Card className="bg-white/95" data-testid="card-target-progress">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Annual Target Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">YTD vs Annual Target (฿{((analytics?.cfoMetrics?.annualTarget ?? 0) / 1000000).toFixed(2)}M)</span>
                    <span className="text-sm font-bold text-purple-600">
                      {(analytics?.cfoMetrics?.annualTargetPercent ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-purple-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(analytics?.cfoMetrics?.annualTargetPercent ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-500">YTD Revenue</p>
                    <p className="text-lg font-bold text-blue-600">
                      ฿{((analytics?.cfoMetrics?.ytdRevenue ?? 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500">Projected Annual</p>
                    <p className="text-lg font-bold text-green-600">
                      ฿{((analytics?.cfoMetrics?.projectedAnnual ?? 0) / 1000000).toFixed(2)}M
                    </p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-gray-500">Target Gap</p>
                    <p className={`text-lg font-bold ${(analytics?.cfoMetrics?.projectedAnnual ?? 0) >= (analytics?.cfoMetrics?.annualTarget ?? 0) ? 'text-green-600' : 'text-orange-600'}`}>
                      {(analytics?.cfoMetrics?.projectedAnnual ?? 0) >= (analytics?.cfoMetrics?.annualTarget ?? 0) 
                        ? `+฿${(((analytics?.cfoMetrics?.projectedAnnual ?? 0) - (analytics?.cfoMetrics?.annualTarget ?? 0)) / 1000).toFixed(0)}k`
                        : `-฿${(((analytics?.cfoMetrics?.annualTarget ?? 0) - (analytics?.cfoMetrics?.projectedAnnual ?? 0)) / 1000).toFixed(0)}k`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Bar Chart */}
            <Card className="bg-white/95" data-testid="card-channel-revenue">
              <CardHeader>
                <CardTitle>{t('analytics.channels.revenueByChannel')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics?.channelPerformance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) =>
                        `฿${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Bar dataKey="revenue" fill="#FCD34D" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart - Improved with grouping and legend */}
            <Card className="bg-white/95" data-testid="card-channel-distribution">
              <CardHeader>
                <CardTitle>{t('analytics.channels.distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const rawData = analytics?.channelPerformance || [];
                  const totalRevenue = rawData.reduce((sum, c) => sum + c.revenue, 0);
                  
                  // Group channels: top 6 + "Others"
                  const sortedData = [...rawData].sort((a, b) => b.revenue - a.revenue);
                  const topChannels = sortedData.slice(0, 6);
                  const otherChannels = sortedData.slice(6);
                  const othersRevenue = otherChannels.reduce((sum, c) => sum + c.revenue, 0);
                  
                  const chartData = othersRevenue > 0 
                    ? [...topChannels, { channel: 'Others', revenue: othersRevenue, transactions: 0, avgTransaction: 0 }]
                    : topChannels;

                  return (
                    <div className="flex flex-col items-center">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="revenue"
                            paddingAngle={2}
                          >
                            {chartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.channel === 'Others' ? '#9CA3AF' : CHANNEL_COLORS[index % CHANNEL_COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [
                              `฿${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                              'Revenue'
                            ]}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Center total */}
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: '-180px' }}>
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-lg font-bold">฿{totalRevenue.toLocaleString()}</span>
                      </div>
                      
                      {/* Legend */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm w-full">
                        {chartData.map((entry, index) => {
                          const percentage = totalRevenue > 0 ? ((entry.revenue / totalRevenue) * 100).toFixed(1) : '0';
                          return (
                            <div key={entry.channel} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-sm flex-shrink-0" 
                                style={{ backgroundColor: entry.channel === 'Others' ? '#9CA3AF' : CHANNEL_COLORS[index % CHANNEL_COLORS.length] }}
                              />
                              <span className="truncate text-muted-foreground">{entry.channel}</span>
                              <span className="ml-auto font-medium">{percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Channel Details Table */}
          <Card className="bg-white/95" data-testid="card-channel-details">
            <CardHeader>
              <CardTitle>{t('analytics.channels.details')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">{t('analytics.channels.channel')}</th>
                      <th className="text-right p-2 font-medium">{t('analytics.channels.revenue')}</th>
                      <th className="text-right p-2 font-medium">{t('analytics.channels.transactions')}</th>
                      <th className="text-right p-2 font-medium">{t('analytics.channels.avgTransaction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.channelPerformance || []).map((channel, index) => (
                      <tr key={channel.channel} className="border-b hover-elevate" data-testid={`row-channel-${index}`}>
                        <td className="p-2 font-medium text-[#FCD34D]">{channel.channel}</td>
                        <td className="p-2 text-right">
                          ฿{channel.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right">{channel.transactions}</td>
                        <td className="p-2 text-right">
                          ฿{channel.avgTransaction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Day Analysis Tab */}
        <TabsContent value="days" className="space-y-4">
          <Card className="bg-white/95" data-testid="card-day-analysis">
            <CardHeader>
              <CardTitle>{t('analytics.dayAnalysis.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics?.dayAnalysis || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#FCD34D" />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name.includes('Revenue') || name.includes('revenue') || name === t('analytics.dayAnalysis.revenue')
                        ? `฿${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : value.toLocaleString(),
                      name
                    ]}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="transactions"
                    fill="#3B82F6"
                    name={t('analytics.dayAnalysis.transactions')}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    fill="#FCD34D"
                    name={t('analytics.dayAnalysis.revenue')}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Day Details Table */}
          <Card className="bg-white/95" data-testid="card-day-details">
            <CardHeader>
              <CardTitle>{t('analytics.dayAnalysis.details')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">{t('analytics.dayAnalysis.dayOfWeek')}</th>
                      <th className="text-right p-2 font-medium">{t('analytics.dayAnalysis.revenue')}</th>
                      <th className="text-right p-2 font-medium">{t('analytics.dayAnalysis.transactions')}</th>
                      <th className="text-right p-2 font-medium">{t('analytics.dayAnalysis.avgPerTransaction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.dayAnalysis || []).map((day, index) => (
                      <tr key={day.day} className="border-b hover-elevate" data-testid={`row-day-${index}`}>
                        <td className="p-2 font-medium">{day.day}</td>
                        <td className="p-2 text-right">
                          ฿{day.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right">{day.transactions}</td>
                        <td className="p-2 text-right">
                          ฿{(day.revenue / day.transactions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Performers Tab */}
        <TabsContent value="performers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Best Channel */}
            <Card className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-black" data-testid="card-best-channel">
              <CardHeader>
                <CardTitle className="text-black">{t('analytics.topPerformers.bestChannel')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics?.topPerformers?.channels?.[0]?.channel || 'N/A'}
                </div>
                <p className="text-sm mt-2">
                  ฿{(analytics?.topPerformers?.channels?.[0]?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            {/* Best Day */}
            <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-white" data-testid="card-best-day">
              <CardHeader>
                <CardTitle className="text-white">{t('analytics.topPerformers.bestDay')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics?.topPerformers?.bestDay || 'N/A'}
                </div>
              </CardContent>
            </Card>

            {/* Best Month */}
            <Card className="bg-gradient-to-br from-green-400 to-green-500 text-white" data-testid="card-best-month">
              <CardHeader>
                <CardTitle className="text-white">{t('analytics.topPerformers.bestMonth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics?.topPerformers?.bestMonth || 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top 5 Channels */}
          <Card className="bg-white/95" data-testid="card-top-channels">
            <CardHeader>
              <CardTitle>{t('analytics.topPerformers.topChannels')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analytics?.topPerformers?.channels || []).slice(0, 5).map((channel, index) => (
                  <div key={channel.channel} className="flex items-center gap-4" data-testid={`top-channel-${index + 1}`}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FCD34D] text-black font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{channel.channel}</div>
                      <div className="text-sm text-muted-foreground">
                        {channel.transactions} {t('analytics.topPerformers.transactions')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#FCD34D]">
                        ฿{channel.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ฿{channel.avgTransaction.toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('analytics.topPerformers.avg')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
