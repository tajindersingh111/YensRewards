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

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    momGrowth: number;
    avgTransaction: number;
    totalTransactions: number;
  };
  monthlyTrends: MonthlyTrend[];
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

      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white" data-testid="card-current-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.currentRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-[#FCD34D]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500 text-white" data-testid="card-mom-growth">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">{t('analytics.momGrowth')}</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.momGrowth >= 0 ? '+' : ''}{summary.momGrowth.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500 text-white" data-testid="card-avg-transaction">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">{t('analytics.avgTransaction')}</CardTitle>
            <ShoppingCart className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{summary.avgTransaction.toLocaleString('en-US', { minimumFractionDigits: 3 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white" data-testid="card-transactions-month">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.transactionsMonth')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTransactions}</div>
          </CardContent>
        </Card>
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
              <CardTitle>{t('analytics.monthlyTrends.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics?.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) =>
                      `฿${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalSales"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name={t('analytics.monthlyTrends.totalSales')}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netSales"
                    stroke="#FCD34D"
                    strokeWidth={2}
                    name={t('analytics.monthlyTrends.netSales')}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
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

            {/* Pie Chart */}
            <Card className="bg-white/95" data-testid="card-channel-distribution">
              <CardHeader>
                <CardTitle>{t('analytics.channels.distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={analytics?.channelPerformance || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.channel}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {(analytics?.channelPerformance || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) =>
                        `฿${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
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
                  <Tooltip />
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
                  {analytics?.topPerformers.channels[0]?.channel || 'N/A'}
                </div>
                <p className="text-sm mt-2">
                  ฿{(analytics?.topPerformers.channels[0]?.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                  {analytics?.topPerformers.bestDay || 'N/A'}
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
                  {analytics?.topPerformers.bestMonth || 'N/A'}
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
                {(analytics?.topPerformers.channels || []).slice(0, 5).map((channel, index) => (
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
