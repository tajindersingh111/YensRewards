/* LEF'S BRANDED ANALYTICS UPDATE */
/* Changes: Softened Yens Yellow accents, improved chart legibility, and premium spacing */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, BarChart3, Target, ArrowUpRight, ArrowDownRight, Activity, Award
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";

const CHANNEL_COLORS = ["#FCD34D", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6", "#F59E0B"];

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("monthly");

  const { data: analytics, isLoading, isError } = useQuery<any>({
    queryKey: ['/api/admin/analytics'],
  });

  if (isLoading) return <div className="flex items-center justify-center py-20 text-slate-400 font-bold">LOADING YENS INSIGHTS...</div>;

  const summary = analytics?.summary || { totalRevenue: 0, momGrowth: 0, avgTransaction: 0, totalTransactions: 0 };

  return (
    <div className="min-h-screen bg-slate-50/30 pb-12">
      {/* Branded Header */}
      <div className="max-w-7xl mx-auto px-6 pt-6 mb-8">
        <div className="bg-blue-900 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-400 rounded-xl p-3 shadow-lg">
              <Activity className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">Performance Analytics</h1>
              <p className="text-blue-300 text-[11px] font-bold uppercase tracking-[0.15em] mt-1.5 opacity-90">Growth &amp; Projections</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white/10 border-white/20 text-white font-black px-4 py-2 text-sm">
            {summary.totalTransactions} TOTAL SALES LOGGED
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Modern KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-blue-600 text-white rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-20"><DollarSign className="w-12 h-12" /></div>
            <CardContent className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Monthly Revenue</p>
              <h3 className="text-3xl font-black mt-1">฿{summary.totalRevenue.toLocaleString()}</h3>
              <div className="mt-4 pt-4 border-t border-blue-400/30 flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-blue-100 font-bold uppercase">Projection</p>
                  <p className="font-bold text-sm">฿{((analytics?.cfoMetrics?.projectedMonthEnd ?? 0) / 1000).toFixed(0)}k</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-blue-100 font-bold uppercase">Growth</p>
                   <p className="font-bold text-sm flex items-center gap-1">
                     {summary.momGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                     {Math.abs(summary.momGrowth).toFixed(1)}%
                   </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-emerald-600 text-white rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-20"><TrendingUp className="w-12 h-12" /></div>
            <CardContent className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Year to Date</p>
              <h3 className="text-3xl font-black mt-1">฿{((analytics?.cfoMetrics?.ytdRevenue ?? 0) / 1000).toFixed(1)}k</h3>
              <div className="mt-4 pt-4 border-t border-emerald-400/30 flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-emerald-100 font-bold uppercase">Target Progress</p>
                  <p className="font-bold text-sm">{(analytics?.cfoMetrics?.annualTargetPercent ?? 0).toFixed(1)}%</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-emerald-100 font-bold uppercase">YoY Pace</p>
                   <p className="font-bold text-sm text-emerald-200">฿{((analytics?.cfoMetrics?.projectedAnnual ?? 0) / 1000000).toFixed(2)}M / Projected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-blue-900 text-white rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Target className="w-12 h-12" /></div>
            <CardContent className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Best Performance</p>
              <h3 className="text-2xl font-black mt-1 uppercase text-[#FCD34D] truncate">{analytics?.topPerformers?.channels?.[0]?.channel || 'N/A'}</h3>
              <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Avg Ticket</p>
                  <p className="font-bold text-sm">฿{summary.avgTransaction.toLocaleString()}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-slate-400 font-bold uppercase">Best Single Day</p>
                   <p className="font-bold text-sm text-[#FCD34D]">฿{((analytics?.cfoMetrics?.bestSingleDay?.total ?? 0) / 1000).toFixed(1)}k</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl mb-6">
            <TabsTrigger value="monthly" className="rounded-lg font-bold text-xs uppercase">Monthly Trends</TabsTrigger>
            <TabsTrigger value="channels" className="rounded-lg font-bold text-xs uppercase">Channel Breakdown</TabsTrigger>
            <TabsTrigger value="performers" className="rounded-lg font-bold text-xs uppercase">Top Performers</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
              <CardHeader className="px-0 pt-0 pb-6 border-b border-slate-50 mb-6">
                <CardTitle className="text-lg font-black text-slate-800">YEAR-ON-YEAR SALES COMPARISON</CardTitle>
              </CardHeader>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.combinedMonthlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                      formatter={(val: number) => [`฿${val.toLocaleString()}`, '']}
                    />
                    <Legend iconType="circle" />
                    <Line type="monotone" dataKey="currentYearSales" stroke="#FCD34D" strokeWidth={4} name="2026 Sales" dot={{r: 6, fill: '#FCD34D', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                    <Line type="monotone" dataKey="lastYearSales" stroke="#64748b" strokeWidth={2} name="2025 Sales" strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="channels">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
                 <CardHeader className="px-0 pt-0 pb-6"><CardTitle className="text-lg font-black text-slate-800">REVENUE SHARE</CardTitle></CardHeader>
                 <div className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={analytics?.channelPerformance || []} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="revenue" nameKey="channel">
                         {(analytics?.channelPerformance || []).map((_: any, i: number) => <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />)}
                       </Pie>
                       <Tooltip />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
                 <CardHeader className="px-0 pt-0 pb-6"><CardTitle className="text-lg font-black text-slate-800">CHANNEL EFFICIENCY</CardTitle></CardHeader>
                 <div className="space-y-4">
                   {(analytics?.channelPerformance || []).map((ch: any, i: number) => (
                     <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full" style={{backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length]}} />
                         <span className="font-bold text-slate-700 text-sm">{ch.channel}</span>
                       </div>
                       <div className="text-right">
                         <p className="font-black text-slate-900 text-sm">฿{ch.revenue.toLocaleString()}</p>
                         <p className="text-[10px] font-bold text-slate-400">{ch.transactions} TXNS</p>
                       </div>
                     </div>
                   ))}
                 </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performers">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Best Channel", val: analytics?.topPerformers?.channels?.[0]?.channel, sub: "High Volume", icon: Award },
                { title: "Peak Day", val: analytics?.topPerformers?.bestDay, sub: "Weekly Spike", icon: TrendingUp },
                { title: "Golden Month", val: analytics?.topPerformers?.bestMonth, sub: "Record Breaking", icon: Target },
              ].map((item, i) => (
                <Card key={i} className="border-none shadow-sm rounded-2xl bg-white p-6 text-center">
                  <div className="mx-auto w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-[#FCD34D]">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.title}</p>
                  <h4 className="text-xl font-black text-slate-900 mt-1 uppercase">{item.val || 'N/A'}</h4>
                  <p className="text-xs text-amber-600 font-bold mt-1">{item.sub}</p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
